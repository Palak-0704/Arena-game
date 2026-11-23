// Flowbound: Masters of Four - Network Protocol & Packet Schemas

export const MSG_TYPES = {
  // Connection & Handshake
  JOIN: 'JOIN',
  JOIN_ACK: 'JOIN_ACK',
  SPAWN: 'SPAWN',
  
  // Game State Synchronization
  INPUT_CMD: 'INPUT_CMD',
  STATE_SYNC: 'STATE_SYNC',
  
  // Combat & Actions
  ABILITY_CAST: 'ABILITY_CAST',
  DAMAGE_EVENT: 'DAMAGE_EVENT',
  GUARD_BREAK: 'GUARD_BREAK',
  ELEMENTAL_CLASH: 'ELEMENTAL_CLASH',
  
  // World & Terraforming
  TERRAFORM_SPAWN: 'TERRAFORM_SPAWN',
  TERRAFORM_DESTROY: 'TERRAFORM_DESTROY',
  
  // Match Lifecycle
  ROUND_START: 'ROUND_START',
  FATAL_BLOW: 'FATAL_BLOW',
  OPEN_RECAP: 'OPEN_RECAP',
  ROUND_END: 'ROUND_END',
  NEXT_ROUND: 'NEXT_ROUND',
  MATCH_OVER: 'MATCH_OVER',
  REMATCH: 'REMATCH',
  LEAVE_ROOM: 'LEAVE_ROOM'
};

export class NetworkProtocol {
  static encode(type, payload) {
    return JSON.stringify({ t: type, d: payload, ts: Date.now() });
  }

  static decode(raw) {
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }
}
