// chat.js

// ─── Estado global ───
let socket     = null;
let cipher     = null;
let username   = null;

// ─── Conectar al servidor ───
async function connect() {
  username = document.getElementById("username").value.trim();
  const roomId = document.getElementById("room-id").value.trim();
  const x0 = parseFloat(document.getElementById("x0").value);
  const y0 = parseFloat(document.getElementById("y0").value);
  const z0 = parseFloat(document.getElementById("z0").value);

  if (!username || !roomId) {
    alert("Escribe tu nombre y el ID de sala");
    return;
  }

  if (isNaN(x0) || isNaN(y0) || isNaN(z0)) {
    alert("Debes ingresar una clave válida antes de conectar");
    return;
  }

  // Aplicar la clave automáticamente al conectar
  cipher = new LorenzCipher(x0, y0, z0);

  // Conectar al WebSocket
  const isLocal = window.location.hostname === "localhost" ||
                  window.location.hostname === "127.0.0.1";
  const url = isLocal
    ? `ws://localhost:8000/ws/${roomId}`
    : `wss://${window.location.hostname}/ws/${roomId}`;

  socket = new WebSocket(url);

  socket.onopen = () => {
    setStatus("conectado");
    document.getElementById("setup").style.display    = "none";
    document.getElementById("chatbox").style.display  = "flex";
    console.log("Conectado a sala:", roomId);
  };

  socket.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    receiveMessage(msg);
  };

  socket.onclose = () => {
    setStatus("desconectado");
  };

  socket.onerror = () => {
    setStatus("error");
  };
}

// ─── Enviar mensaje ───
function sendMessage() {
  const input = document.getElementById("msg-input");
  const text  = input.value.trim();
  if (!text || !socket || socket.readyState !== WebSocket.OPEN) return;

  const encrypted = cipher.encryptText(text);

  const packet = {
    sender:    username,
    timestamp: Date.now(),
    payload:   encrypted
  };

  appendMessage({
    sender:    username,
    text:      text,
    encrypted: encrypted,
    self:      true
  });

  socket.send(JSON.stringify(packet));
  input.value = "";
}

// ─── Recibir mensaje ───
function receiveMessage(msg) {
  const decrypted = cipher.decryptText(msg.payload);

  appendMessage({
    sender:    msg.sender,
    text:      decrypted,
    encrypted: msg.payload,
    self:      false
  });
}

// ─── Mostrar mensaje en pantalla ───
function appendMessage({ sender, text, encrypted, self }) {
  const feed = document.getElementById("msg-feed");

  const wrapper = document.createElement("div");
  wrapper.className = "msg-wrapper " + (self ? "self" : "other");

  const name = document.createElement("span");
  name.className   = "msg-sender";
  name.textContent = sender;

  const bubble = document.createElement("div");
  bubble.className   = "msg-bubble";
  bubble.textContent = text;

  const hex = document.createElement("span");
  hex.className   = "msg-hex";
  hex.textContent = encrypted.substring(0, 32) + "...";

  wrapper.appendChild(name);
  wrapper.appendChild(bubble);
  wrapper.appendChild(hex);
  feed.appendChild(wrapper);

  feed.scrollTop = feed.scrollHeight;
}

// ─── Cambiar clave en caliente ───
function applyKey() {
  const x0 = parseFloat(document.getElementById("x0-live").value);
  const y0 = parseFloat(document.getElementById("y0-live").value);
  const z0 = parseFloat(document.getElementById("z0-live").value);

  if (isNaN(x0) || isNaN(y0) || isNaN(z0)) {
    alert("Clave inválida");
    return;
  }

  cipher.reset(x0, y0, z0);

  const feed = document.getElementById("msg-feed");
  const notice = document.createElement("div");
  notice.className   = "key-notice";
  notice.textContent = `Clave cambiada — (${x0}, ${y0}, ${z0})`;
  feed.appendChild(notice);
  feed.scrollTop = feed.scrollHeight;
}

// ─── Generar clave aleatoria ───
function generateKey() {
  const x = (Math.random()*40 - 20).toFixed(8);
  const y = (Math.random()*40 - 20).toFixed(8);
  const z = (Math.random()*50).toFixed(8);
  ["x0", "x0-live"].forEach(id => {
    if (document.getElementById(id)) document.getElementById(id).value = x;
  });
  ["y0", "y0-live"].forEach(id => {
    if (document.getElementById(id)) document.getElementById(id).value = y;
  });
  ["z0", "z0-live"].forEach(id => {
    if (document.getElementById(id)) document.getElementById(id).value = z;
  });
}

// ─── Enter para enviar ───
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("msg-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendMessage();
  });
});

// ─── Estado de conexión ───
function setStatus(estado) {
  const dot  = document.getElementById("status-dot");
  const text = document.getElementById("status-text");
  const colores = {
    conectado:    "#1D9E75",
    desconectado: "#888",
    error:        "#E24B4A"
  };
  dot.style.background = colores[estado] || "#888";
  text.textContent     = estado;
}