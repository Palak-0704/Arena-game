// Flowbound: Masters of Four - WebSocket Network Client

import { NetworkProtocol, MSG_TYPES } from '../../shared/NetworkProtocol.js';

export class NetworkClient {
  constructor(serverUrl) {
    const envUrl = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_SERVER_URL : null;
    const globalUrl = typeof window !== 'undefined' ? window.__FLOWBOUND_SERVER_URL__ : null;
    this.serverUrl = serverUrl || envUrl || globalUrl || 'ws://localhost:8080';
    this.ws = null;
    this.isConnected = false;
    this.localPlayerId = null;

    // Callbacks
    this.onStateSync = null;
    this.onAbilityCast = null;
    this.onDamageEvent = null;
    this.onElementalClash = null;
    this.onRoundStart = null;
    this.onFatalBlow = null;
    this.onRoundEnd = null;
  }

  connect() {
    return new Promise((resolve) => {
      try {
        // Prevent insecure mixed-content error in production HTTPS environments
        if (typeof window !== 'undefined' && window.location.protocol === 'https:' && this.serverUrl.startsWith('ws://localhost')) {
          console.log('[Flowbound Client] HTTPS production detected. Standalone Campaign & AI Engine activated.');
          this.isConnected = false;
          resolve(false);
          return;
        }

        this.ws = new WebSocket(this.serverUrl);

        this.ws.onopen = () => {
          this.isConnected = true;
          console.log('[Flowbound Client] Connected to dedicated game server. Waiting for match commencement.');
          resolve(true);
        };

        this.ws.onmessage = (event) => {
          const packet = NetworkProtocol.decode(event.data);
          if (!packet) return;

          switch (packet.t) {
            case MSG_TYPES.JOIN_ACK:
              this.localPlayerId = packet.d.playerId;
              console.log(`[Flowbound Client] Joined room as player: ${this.localPlayerId}`);
              break;

            case MSG_TYPES.STATE_SYNC:
              if (this.onStateSync) this.onStateSync(packet.d);
              break;

            case MSG_TYPES.ABILITY_CAST:
              if (this.onAbilityCast) this.onAbilityCast(packet.d);
              break;

            case MSG_TYPES.DAMAGE_EVENT:
              if (this.onDamageEvent) this.onDamageEvent(packet.d);
              break;

            case MSG_TYPES.ELEMENTAL_CLASH:
              if (this.onElementalClash) this.onElementalClash(packet.d);
              break;

            case MSG_TYPES.ROUND_START:
              if (this.onRoundStart) this.onRoundStart(packet.d);
              break;

            case MSG_TYPES.FATAL_BLOW:
              if (this.onFatalBlow) this.onFatalBlow(packet.d);
              break;

            case MSG_TYPES.ROUND_END:
              if (this.onRoundEnd) this.onRoundEnd(packet.d);
              break;
          }
        };

        this.ws.onclose = () => {
          this.isConnected = false;
          console.log('[Flowbound Client] Disconnected from server. Running in offline standalone mode.');
          resolve(false);
        };

        this.ws.onerror = () => {
          this.isConnected = false;
          console.log('[Flowbound Client] Server offline. Initializing local single-player match with AI bot.');
          resolve(false);
        };
      } catch (e) {
        this.isConnected = false;
        resolve(false);
      }
    });
  }

  sendInput(player) {
    if (!this.isConnected || !this.ws) return;
    this.send(MSG_TYPES.INPUT_CMD, {
      x: player.position.x,
      y: player.position.y,
      z: player.position.z,
      vx: player.velocity.x,
      vy: player.velocity.y,
      vz: player.velocity.z,
      yaw: player.model.group.rotation.y,
      pitch: player.cameraController.pitch,
      isSurfing: player.isSurfing,
      isGuarding: player.isGuarding,
      isInvulnerable: player.isInvulnerable
    });
  }

  sendAbility(abilityData) {
    if (!this.isConnected || !this.ws) return;
    this.send(MSG_TYPES.ABILITY_CAST, abilityData);
  }

  joinMatch(playerName, element, opponent, arena, level = 1) {
    if (this.isConnected) {
      this.send(MSG_TYPES.JOIN, { name: playerName, element, opponent, arena, level });
    }
  }

  leaveMatch() {
    if (this.isConnected) {
      this.send(MSG_TYPES.LEAVE_ROOM, {});
    }
  }

  send(type, payload) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(NetworkProtocol.encode(type, payload));
    }
  }
}
