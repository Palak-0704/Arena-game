// Flowbound: Masters of Four - WebAssembly Performance Bridge
// Interfaces with C++ compiled WASM module for Zero-Allocation Physics & Combat Calculations

class WasmCoreManager {
  constructor() {
    this.isReady = false;
    this.exports = null;
    this.memory = null;
    this.memF32 = null;
    this.memI32 = null;
    this.initPromise = this.init();
  }

  async init() {
    try {
      const response = await fetch('/wasm/flowbound_core.wasm');
      if (!response.ok) {
        console.warn('[WasmCore] WebAssembly file not found, falling back to JS math.');
        return false;
      }
      const bytes = await response.arrayBuffer();
      const { instance } = await WebAssembly.instantiate(bytes);
      this.exports = instance.exports;
      this.memory = this.exports.memory;
      this.memF32 = new Float32Array(this.memory.buffer);
      this.memI32 = new Int32Array(this.memory.buffer);
      this.isReady = true;
      console.log('[WasmCore] C++ WebAssembly Performance Core successfully initialized!');
      return true;
    } catch (e) {
      console.warn('[WasmCore] Failed to initialize WebAssembly module:', e);
      return false;
    }
  }

  // Fast Continuous Collision Detection (CCD)
  checkSweptCollision(p1, p2, radiusSum) {
    if (this.isReady && this.exports) {
      return this.exports.checkSweptCollision(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z, radiusSum) === 1;
    }
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dz = p2.z - p1.z;
    return (dx * dx + dy * dy + dz * dz) <= (radiusSum * radiusSum);
  }

  // Absolver Poise & Damage Engine (Calculated in WASM with 80% block & 2.5x poise)
  calculateCombatHit(rawDamage, rawPoise, isHeavy, isGuarding, currentPoise) {
    if (this.isReady && this.exports) {
      this.exports.calculateAbsolverDamage(
        rawDamage,
        rawPoise,
        isHeavy ? 1 : 0,
        isGuarding ? 1 : 0,
        currentPoise
      );
      // Read zero-copy shared memory
      return {
        damage: this.memF32[0],
        poiseDamage: this.memF32[1],
        wasBlocked: this.memI32[2] === 1,
        guardBroken: this.memI32[3] === 1
      };
    }

    // JS Fallback
    const wasBlocked = !!isGuarding;
    const damage = wasBlocked ? rawDamage * 0.20 : rawDamage;
    const poiseDrain = (wasBlocked && isHeavy) ? rawPoise * 2.50 : rawPoise;
    const guardBroken = (currentPoise - poiseDrain) <= 0;
    return { damage, poiseDamage: poiseDrain, wasBlocked, guardBroken };
  }

  // Vectorized Arena Clamp
  clampArena(x, z, maxRadius = 26.5) {
    if (this.isReady && this.exports) {
      const ratio = this.exports.clampArena(x, z, maxRadius);
      return { x: x * ratio, z: z * ratio, clamped: ratio < 0.9999 };
    }
    const dist = Math.hypot(x, z);
    if (dist > maxRadius) {
      const r = maxRadius / dist;
      return { x: x * r, z: z * r, clamped: true };
    }
    return { x, z, clamped: false };
  }

  // Sparring AI Orbital Tangent Kinematics
  computeOrbitalVelocity(dx, dz, speed, isClockwise = true) {
    if (this.isReady && this.exports) {
      this.exports.computeOrbitalVelocity(dx, dz, speed, isClockwise ? 1 : 0);
      return { vx: this.memF32[4], vz: this.memF32[5] };
    }
    const dist = Math.hypot(dx, dz);
    if (dist <= 0.001) return { vx: 0, vz: 0 };
    const inv = 1.0 / dist;
    const dirFwdX = dx * inv;
    const dirFwdZ = dz * inv;
    const rightX = -dirFwdZ;
    const rightZ = dirFwdX;
    const sign = isClockwise ? 1.0 : -1.0;
    return { vx: rightX * speed * sign, vz: rightZ * speed * sign };
  }
}

export const wasmCore = new WasmCoreManager();
