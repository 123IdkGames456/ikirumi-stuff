import asyncio
import json
import os
import uuid
from websockets.asyncio.server import serve

clients = {}
rooms = {}

async def send(ws, payload):
    try:
        await ws.send(json.dumps(payload))
    except Exception:
        pass

def room_list():
    return [{"roomId": rid, "roomName": room["name"], "players": len(room["members"])}
            for rid, room in rooms.items() if room["host"] in clients]

async def publish_list():
    await asyncio.gather(*(send(ws, {"type": "server_list", "rooms": room_list()}) for ws in list(clients)))

async def remove_from_room(ws):
    info = clients.get(ws)
    if not info or not info.get("room"):
        return
    rid = info["room"]
    room = rooms.get(rid)
    old_id = info["id"]
    info.update(room=None, role=None)
    if not room:
        return
    room["members"].discard(ws)
    if ws is room["host"] or not room["members"]:
        for member in list(room["members"]):
            await send(member, {"type": "error", "message": "The host left the server."})
            await send(member, {"type": "left"})
            if member in clients:
                clients[member].update(room=None, role=None)
        rooms.pop(rid, None)
    else:
        await send(room["host"], {"type": "peer_left", "peerId": old_id})

async def handler(ws):
    client_id = str(uuid.uuid4())
    clients[ws] = {"id": client_id, "room": None, "role": None}
    await send(ws, {"type": "welcome", "clientId": client_id})
    await publish_list()
    try:
        async for raw in ws:
            try:
                msg = json.loads(raw)
            except (json.JSONDecodeError, TypeError):
                continue
            kind = msg.get("type")
            info = clients.get(ws)
            if not info:
                continue
            if kind == "list":
                await send(ws, {"type": "server_list", "rooms": room_list()})
            elif kind == "create":
                await remove_from_room(ws)
                rid = uuid.uuid4().hex[:8]
                name = str(msg.get("roomName") or "Subway Run")[:28]
                rooms[rid] = {"name": name, "host": ws, "members": {ws}}
                info.update(room=rid, role="host")
                await send(ws, {"type": "created", "roomId": rid, "roomName": name})
                await publish_list()
            elif kind == "join":
                rid = str(msg.get("roomId", ""))
                room = rooms.get(rid)
                if not room or room["host"] not in clients:
                    await send(ws, {"type": "error", "message": "That server is no longer available."})
                    continue
                await remove_from_room(ws)
                room["members"].add(ws)
                info.update(room=rid, role="player")
                await send(ws, {"type": "joined", "roomId": rid, "roomName": room["name"]})
                await send(room["host"], {"type": "peer_joined", "peerId": client_id})
                await publish_list()
            elif kind == "signal":
                target = str(msg.get("target", ""))
                signal = msg.get("signal")
                dest = next((peer for peer, data in clients.items() if data["id"] == target), None)
                if dest and isinstance(signal, dict):
                    await send(dest, {"type": "signal", "from": client_id, "signal": signal})
            elif kind == "leave":
                await remove_from_room(ws)
                await send(ws, {"type": "left"})
                await publish_list()
    finally:
        await remove_from_room(ws)
        clients.pop(ws, None)
        await publish_list()

async def main():
    port = int(os.environ.get("PORT", "8765"))
    async with serve(handler, "0.0.0.0", port, ping_interval=20, ping_timeout=20, max_size=2**20):
        print(f"Subway Surfers signaling server listening on port {port}")
        await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())
