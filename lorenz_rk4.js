// lorenz_rk4.js

function lorenzDerivatives(x, y, z, sigma, rho, beta) {
  return {
    dx: sigma * (y - x),
    dy: x * (rho - z) - y,
    dz: x * y - beta * z
  };
}

function rk4Step(x, y, z, dt, sigma, rho, beta) {
  const k1 = lorenzDerivatives(x, y, z, sigma, rho, beta);
  const k2 = lorenzDerivatives(
    x + 0.5*dt*k1.dx, y + 0.5*dt*k1.dy, z + 0.5*dt*k1.dz,
    sigma, rho, beta
  );
  const k3 = lorenzDerivatives(
    x + 0.5*dt*k2.dx, y + 0.5*dt*k2.dy, z + 0.5*dt*k2.dz,
    sigma, rho, beta
  );
  const k4 = lorenzDerivatives(
    x + dt*k3.dx, y + dt*k3.dy, z + dt*k3.dz,
    sigma, rho, beta
  );
  return {
    x: x + (dt/6) * (k1.dx + 2*k2.dx + 2*k3.dx + k4.dx),
    y: y + (dt/6) * (k1.dy + 2*k2.dy + 2*k3.dy + k4.dy),
    z: z + (dt/6) * (k1.dz + 2*k2.dz + 2*k3.dz + k4.dz)
  };
}

class LorenzCipher {
  constructor(x0, y0, z0, dt = 0.01, sigma = 10, rho = 28, beta = 8/3) {
    this.sigma = sigma;
    this.rho   = rho;
    this.beta  = beta;
    this.dt    = dt;
    this.x0 = x0; this.y0 = y0; this.z0 = z0;
    this.x  = x0; this.y  = y0; this.z  = z0;
  }

  reset(x0, y0, z0) {
    this.x0 = x0; this.y0 = y0; this.z0 = z0;
    this.x  = x0; this.y  = y0; this.z  = z0;
  }

  generateKeystream(n) {
    const keystream = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const next = rk4Step(
        this.x, this.y, this.z,
        this.dt, this.sigma, this.rho, this.beta
      );
      this.x = next.x; this.y = next.y; this.z = next.z;
      keystream[i] = this.x / 20.0;
    }
    return keystream;
  }

  encrypt(audioChunk) {
    const keystream = this.generateKeystream(audioChunk.length);
    const result = new Float32Array(audioChunk.length);
    for (let i = 0; i < audioChunk.length; i++) {
      result[i] = audioChunk[i] + keystream[i];
    }
    return result;
  }

  decrypt(encryptedChunk) {
    const keystream = this.generateKeystream(encryptedChunk.length);
    const result = new Float32Array(encryptedChunk.length);
    for (let i = 0; i < encryptedChunk.length; i++) {
      result[i] = encryptedChunk[i] - keystream[i];
    }
    return result;
  }

  encryptText(text) {
    // Reiniciar desde condición inicial para que cada mensaje
    // sea independiente del anterior
    this.x = this.x0;
    this.y = this.y0;
    this.z = this.z0;

    const bytes  = new TextEncoder().encode(text);
    const result = new Uint8Array(bytes.length);

    for (let i = 0; i < bytes.length; i++) {
      const next = rk4Step(
        this.x, this.y, this.z,
        this.dt, this.sigma, this.rho, this.beta
      );
      this.x = next.x; this.y = next.y; this.z = next.z;

      // Convertir x del atractor a byte (0-255)
    const keyByte = Math.floor(
      (Math.abs(this.x) + Math.abs(this.y) + Math.abs(this.z)) / 3
    ) % 256;

      // XOR con el byte del texto
      result[i] = bytes[i] ^ keyByte;
    }

    // Devolver como hexadecimal
    return Array.from(result)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  decryptText(hex) {
    // Reiniciar desde condición inicial — mismo punto que encryptText
    this.x = this.x0;
    this.y = this.y0;
    this.z = this.z0;

    const bytes  = new Uint8Array(
      hex.match(/.{1,2}/g).map(b => parseInt(b, 16))
    );
    const result = new Uint8Array(bytes.length);

    for (let i = 0; i < bytes.length; i++) {
      const next = rk4Step(
        this.x, this.y, this.z,
        this.dt, this.sigma, this.rho, this.beta
      );
      this.x = next.x; this.y = next.y; this.z = next.z;

      const keyByte = Math.abs(Math.floor(this.x * 1000)) % 256;
      result[i] = bytes[i] ^ keyByte;
    }

    try {
      return new TextDecoder().decode(result);
    } catch {
      return hex;
    }
  }
}