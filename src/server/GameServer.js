// Flowbound: Masters of Four - Authoritative WebSocket Server

import { WebSocketServer } from 'ws';
import { RoomManager } from './RoomManager.js';
import { NetworkProtocol, MSG_TYPES } from '../shared/NetworkProtocol.js';

const PORT = process.env.PORT || 8080;
const wss = new WebSocketServer({ port: PORT });
const activeRooms = new Map(); // ws -> RoomManager

console.log(`[Flowbound Server] Dedicated 60Hz Game Server active on ws://localhost:${PORT}`);

wss.on('connection', (ws) => {
  let currentRoom = null;
  let currentPlayer = null;

  ws.on('message', (message) => {
    const packet = NetworkProtocol.decode(message);
    if (!packet) return;

    switch (packet.t) {
      case MSG_TYPES.JOIN: {
        // Enforce strict 1v1: Clean up any prior room for this client
        if (currentRoom) {
          currentRoom.destroy();
          activeRooms.delete(ws);
        }

        const roomId = 'room_' + Math.random().toString(36).substr(2, 8);
        currentRoom = new RoomManager(roomId);
        activeRooms.set(ws, currentRoom);

        currentPlayer = currentRoom.addPlayer(ws, packet.d || {});
        ws.send(NetworkProtocol.encode(MSG_TYPES.JOIN_ACK, {
          playerId: currentPlayer.id,
          element: currentPlayer.element,
          round: currentRoom.currentRound,
          playerWins: currentRoom.playerWins,
          botWins: currentRoom.botWins
        }));
        console.log(`[Flowbound Server] 1v1 Arena initialized (${roomId}): Player ${currentPlayer.name} (${currentPlayer.element}) vs Rival.`);
        break;
      }

      case MSG_TYPES.INPUT_CMD:
        if (currentPlayer) {
          const cmd = packet.d;
          currentPlayer.x = cmd.x;
          currentPlayer.y = cmd.y;
          currentPlayer.z = cmd.z;
          currentPlayer.vx = cmd.vx || 0;
          currentPlayer.vy = cmd.vy || 0;
          currentPlayer.vz = cmd.vz || 0;
          currentPlayer.yaw = cmd.yaw || 0;
          currentPlayer.pitch = cmd.pitch || 0;
          currentPlayer.isSurfing = !!cmd.isSurfing;
          currentPlayer.isGuarding = !!cmd.isGuarding;
          currentPlayer.isInvulnerable = !!cmd.isInvulnerable;
        }
        break;

      case MSG_TYPES.ABILITY_CAST:
        if (currentRoom && currentPlayer) {
          const abilityData = packet.d;
          abilityData.casterId = currentPlayer.id;
          currentRoom.broadcastAbility(abilityData);
        }
        break;

      case MSG_TYPES.REMATCH:
        if (currentRoom) {
          console.log(`[Flowbound Server] Rematch requested for room: ${currentRoom.roomId}`);
          currentRoom.restartMatch();
        }
        break;

      case MSG_TYPES.NEXT_ROUND:
        if (currentRoom) {
          console.log(`[Flowbound Server] Next round requested for room: ${currentRoom.roomId}`);
          currentRoom.advanceToNextRound(currentPlayer?.id, packet.d?.perkId);
        }
        break;

      case MSG_TYPES.OPEN_RECAP:
        if (currentRoom) {
          currentRoom.openRoundRecap();
        }
        break;

      case MSG_TYPES.LEAVE_ROOM:
        if (currentRoom) {
          console.log(`[Flowbound Server] Client left room: ${currentRoom.roomId}`);
          currentRoom.destroy();
          activeRooms.delete(ws);
          currentRoom = null;
          currentPlayer = null;
        }
        break;
    }
  });

  ws.on('close', () => {
    if (currentRoom) {
      console.log(`[Flowbound Server] Client disconnected. Destroying 1v1 room ${currentRoom.roomId}.`);
      currentRoom.destroy();
      activeRooms.delete(ws);
      currentRoom = null;
      currentPlayer = null;
    }
  });
});

// 60 Hz Server Simulation Loop
const TICK_RATE = 60;
const DT = 1 / TICK_RATE;

setInterval(() => {
  for (const room of activeRooms.values()) {
    room.update(DT);
  }
}, 1000 / TICK_RATE);
