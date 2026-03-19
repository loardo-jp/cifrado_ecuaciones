from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from typing import Dict

app = FastAPI()
salas: Dict[str, list[WebSocket]] = {}

@app.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):
    await websocket.accept()
    if room_id not in salas:
        salas[room_id] = []
    salas[room_id].append(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            for cliente in salas[room_id]:
                if cliente != websocket:
                    await cliente.send_text(data)
    except WebSocketDisconnect:
        salas[room_id].remove(websocket)
        if len(salas[room_id]) == 0:
            del salas[room_id]

app.mount("/", StaticFiles(directory=".", html=True), name="static")
