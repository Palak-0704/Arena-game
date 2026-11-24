// Flowbound: Masters of Four - Absolver-Style Sparring AI
// Features Aggressive Close-Range Pressure, Orbital Footwork, Reactive Guarding, Evasive Slipping, Combo Strikes & Elemental Arts

import { COMBAT_CONSTANTS, MOVEMENT_CONSTANTS } from '../shared/Constants.js';

export class BotAI {
  constructor(id, name, element = 'EARTH', room) {
    this.id = id;
    this.name = name || 'PCNASTYX';
    this.element = element;
    this.room = room;
    this.isBot = true;
    
    // Character Attributes - Formidable, durable sparring opponent (Equally matched to player)
    this.health = 300;
    this.maxHealth = 300;
    this.poise = 200;
    this.maxPoise = 200;
    this.flow = 1.0;
    
    // Transform & Kinematics (Spawn on north side of arena facing South)
    this.x = 0;
    this.y = 0;
    this.z = 14;
    this.vx = 0;
    this.vy = 0;
    this.vz = 0;
    this.yaw = Math.PI; // Face South towards player
    
    // Combat & Defensive States
    this.isGuarding = false;
    this.isInvulnerable = false;
    this.isStaggered = false;
    this.staggerEndTime = 0;
    this.isDead = false;
    
    // Movement Footwork
    this.footworkMode = 'ADVANCE'; // ADVANCE, ORBIT_CW, ORBIT_CCW, PAUSE
    this.footworkTimer = 0;
    
    // Cooldown Trackers
    this.lastComboTime = 0;
    this.lastDodgeTime = 0;
    this.lastBoulderTime = 0;
    this.lastStoneGuardTime = 0;
    this.lastFissureTime = Date.now() + 4000; // 4s cooldown on start before ultimate fissure
    this.lastDamageTime = 0;

    // Telegraphed Windup
    this.isTelegraphing = false;
    this.telegraphEndTime = 0;
  }

  update(dt, targetPlayer) {
    if (this.isDead) return;

    const now = Date.now();

    // Check Stagger Recovery (Guard Break recovery)
    if (this.isStaggered) {
      if (now >= this.staggerEndTime) {
        this.isStaggered = false;
        this.poise = this.maxPoise * 0.7;
      } else {
        this.vx *= 0.8;
        this.vz *= 0.8;
        return;
      }
    }

    // Passive Poise Regeneration
    if (now - this.lastDamageTime > (COMBAT_CONSTANTS.POISE_RECOVERY_DELAY || 2.0) * 1000) {
      this.poise = Math.min(this.maxPoise, this.poise + (COMBAT_CONSTANTS.POISE_RECOVERY_RATE * dt * 1.5));
    }

    if (!targetPlayer || targetPlayer.isDead) {
      this.vx *= 0.85;
      this.vz *= 0.85;
      this.isGuarding = false;
      return;
    }

    // Vector to Target Player
    const dx = targetPlayer.x - this.x;
    const dz = targetPlayer.z - this.z;
    const dist = Math.hypot(dx, dz);

    // Turn directly towards opponent with sharp martial reaction
    if (dist > 0.1) {
      const targetYaw = Math.atan2(dx, dz);
      let diff = targetYaw - this.yaw;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.yaw += diff * Math.min(1.0, dt * 16.0);
    }

    // Hold fighting stance during in-arena countdown
    if (this.room && this.room.matchState !== 'ROUND_ACTIVE') {
      this.vx *= 0.5;
      this.vz *= 0.5;
      return;
    }

    // Handle Telegraphed Ranged Release
    if (this.isTelegraphing) {
      this.vx *= 0.5;
      this.vz *= 0.5;
      if (now >= this.telegraphEndTime) {
        this.isTelegraphing = false;
        this.releaseRangedAttack(dx, dz, dist);
      }
      return;
    }

    // 1. Reactive Absolver Defense:
    if (targetPlayer.isAttacking && dist < 4.2 && !this.isGuarding && !this.isInvulnerable) {
      const gChance = this.guardChance !== undefined ? this.guardChance : 0.50;
      const dChance = this.dodgeChance !== undefined ? this.dodgeChance : 0.30;
      if (Math.random() < gChance) {
        this.isGuarding = true;
        setTimeout(() => { this.isGuarding = false; }, 350 + Math.random() * 250);
      } else if (Math.random() < dChance && now - this.lastDodgeTime > (this.level >= 2 ? 1100 : 1800)) {
        this.performEvasiveDodge(dx, dz, dist);
      }
    }

    // 2. Aggressive Footwork Decision Machine:
    // Close the gap, stay in the pocket, and never endlessly retreat!
    this.footworkTimer -= dt;
    if (this.footworkTimer <= 0) {
      this.footworkTimer = (this.level >= 2 ? 0.2 : 0.3) + Math.random() * 0.3;

      if (dist > 8.0) {
        this.footworkMode = 'ADVANCE';
      } else if (dist < 2.2) {
        // Too close: space out, back up to fighting pocket, or circle to flank
        const roll = Math.random();
        if (roll < 0.45) this.footworkMode = 'RETREAT';
        else if (roll < 0.75) this.footworkMode = 'ORBIT_CW';
        else this.footworkMode = 'ORBIT_CCW';
      } else if (dist < 4.0) {
        // In the fighting pocket: circle and trade strikes
        const roll = Math.random();
        if (roll < (this.level >= 2 ? 0.55 : 0.35)) this.footworkMode = 'ADVANCE';
        else if (roll < 0.75) this.footworkMode = 'ORBIT_CW';
        else this.footworkMode = 'ORBIT_CCW';
      } else {
        // Mid-range: advance or circle
        const roll = Math.random();
        if (roll < (this.level >= 2 ? 0.75 : 0.60)) this.footworkMode = 'ADVANCE';
        else if (roll < 0.85) this.footworkMode = 'ORBIT_CW';
        else this.footworkMode = 'ORBIT_CCW';
      }
    }

    // Execute Footwork Kinematics
    const dirFwdX = dx / Math.max(0.1, dist);
    const dirFwdZ = dz / Math.max(0.1, dist);
    const dirRightX = -dirFwdZ;
    const dirRightZ = dirFwdX;

    let targetVx = 0;
    let targetVz = 0;
    const advanceSpeed = this.advanceSpeed || 5.2;
    const orbitSpeed = this.orbitSpeed || 4.2;

    if (this.footworkMode === 'ADVANCE') {
      targetVx = dirFwdX * advanceSpeed;
      targetVz = dirFwdZ * advanceSpeed;
    } else if (this.footworkMode === 'RETREAT') {
      targetVx = -dirFwdX * 3.8;
      targetVz = -dirFwdZ * 3.8;
    } else if (this.footworkMode === 'ORBIT_CW') {
      targetVx = dirRightX * orbitSpeed + dirFwdX * 0.8;
      targetVz = dirRightZ * orbitSpeed + dirFwdZ * 0.8;
    } else if (this.footworkMode === 'ORBIT_CCW') {
      targetVx = -dirRightX * orbitSpeed + dirFwdX * 0.8;
      targetVz = -dirRightZ * orbitSpeed + dirFwdZ * 0.8;
    }

    // Apply movement acceleration
    this.vx += (targetVx - this.vx) * (dt * 12.0);
    this.vz += (targetVz - this.vz) * (dt * 12.0);

    // 3. Combat Offense & Strike Initiation:
    const cadence = (this.cadenceCooldown || 2.4) * 1000;
    const boulderCooldown = this.boulderCooldown || 3200;
    const snareCooldown = this.snareCooldown || 9500;

    if (dist < 3.4 && now - this.lastComboTime > cadence && !this.isGuarding) {
      // Close Range: Fluid 3-Hit Melee Combo Strike with fair sparring cadence
      this.executeMeleeCombo(dirFwdX, dirFwdZ);
    } else if (dist >= 4.5 && dist <= 24.0 && now - this.lastBoulderTime > boulderCooldown && !this.isGuarding) {
      // Medium Range: Telegraphed Elemental Projectile
      this.startTelegraphedRanged();
    } else if (dist >= 3.5 && dist <= 12.0 && now - this.lastStoneGuardTime > 7500) {
      this.castDefensiveBarrier(dx, dz, dist);
    } else if (dist >= 4.0 && dist <= 18.0 && now - this.lastFissureTime > snareCooldown) {
      this.castUltimateSnare(dirFwdX, dirFwdZ);
    }

    // Integrate Physics Position
    this.x += this.vx * dt;
    this.z += this.vz * dt;

    // Physical Capsule Pushback against target player (prevent ghosting/clipping)
    if (targetPlayer && !targetPlayer.isDead) {
      const cdx = this.x - targetPlayer.x;
      const cdz = this.z - targetPlayer.z;
      const cdist = Math.hypot(cdx, cdz);
      const MIN_DIST = 1.45;
      if (cdist < MIN_DIST && cdist > 0.001) {
        const overlap = MIN_DIST - cdist;
        const cnx = cdx / cdist;
        const cnz = cdz / cdist;
        this.x += cnx * overlap;
        this.z += cnz * overlap;

        const velAlongNormal = this.vx * (-cnx) + this.vz * (-cnz);
        if (velAlongNormal > 0) {
          this.vx -= (-cnx) * velAlongNormal;
          this.vz -= (-cnz) * velAlongNormal;
        }
      }
    }

    // Arena boundary clamp (Radius 26.5m)
    const arenaDist = Math.hypot(this.x, this.z);
    if (arenaDist > 26.5) {
      this.x = (this.x / arenaDist) * 26.5;
      this.z = (this.z / arenaDist) * 26.5;
      this.vx *= 0.5;
      this.vz *= 0.5;
    }
  }

  // Physical knockback impulse received from player attacks
  applyKnockback(dirX, dirZ, force = 7.5) {
    const len = Math.hypot(dirX, dirZ) || 1.0;
    this.vx += (dirX / len) * force;
    this.vz += (dirZ / len) * force;
  }

  // Absolver Evasive Slip
  performEvasiveDodge(dx, dz, dist) {
    this.lastDodgeTime = Date.now();
    this.isInvulnerable = true;
    this.isGuarding = false;

    const dirRightX = -(dz / dist);
    const dirRightZ = dx / dist;
    const slipSide = Math.random() < 0.5 ? 1 : -1;

    this.vx = (dirRightX * slipSide - (dx / dist) * 0.4) * 12.0;
    this.vz = (dirRightZ * slipSide - (dz / dist) * 0.4) * 12.0;

    setTimeout(() => {
      this.isInvulnerable = false;
    }, (COMBAT_CONSTANTS.DODGE_SLIP_IFRAMES || 0.22) * 1000);
  }

  // 3-Hit Melee Combo with Forward Step Momentum
  executeMeleeCombo(dirFwdX, dirFwdZ) {
    this.lastComboTime = Date.now();
    this.isGuarding = false;

    // Strike 1: Lead Jab / Palm (+1.8m forward step)
    this.vx += dirFwdX * 1.8;
    this.vz += dirFwdZ * 1.8;

    this.room.broadcastAbility({
      casterId: this.id,
      abilityId: 'STRIKE_1',
      element: this.element,
      slot: 'LMB',
      type: 'MELEE_SWEEP',
      damage: Math.round(12 * (this.dmgMult || 1.0)),
      poiseDamage: 16,
      range: 3.8,
      direction: { x: dirFwdX, y: 0, z: dirFwdZ },
      origin: { x: this.x, y: this.y + 1.1, z: this.z }
    });

    // Strike 2: Body Hook (+2.0m step forward, 450ms later)
    setTimeout(() => {
      if (this.isDead || this.isStaggered) return;
      this.vx += dirFwdX * 2.0;
      this.vz += dirFwdZ * 2.0;

      this.room.broadcastAbility({
        casterId: this.id,
        abilityId: 'STRIKE_2',
        element: this.element,
        slot: 'LMB',
        type: 'MELEE_SWEEP',
        damage: Math.round(16 * (this.dmgMult || 1.0)),
        poiseDamage: 20,
        range: 4.0,
        direction: { x: dirFwdX, y: 0, z: dirFwdZ },
        origin: { x: this.x, y: this.y + 1.1, z: this.z }
      });

      // Strike 3: Heavy Roundhouse Breaker (+2.4m forward lunge, 500ms later)
      setTimeout(() => {
        if (this.isDead || this.isStaggered) return;
        this.vx += dirFwdX * 2.4;
        this.vz += dirFwdZ * 2.4;

        this.room.broadcastAbility({
          casterId: this.id,
          abilityId: 'HEAVY_BREAKER',
          element: this.element,
          slot: 'RMB',
          type: 'MELEE_SWEEP',
          damage: Math.round(24 * (this.dmgMult || 1.0)),
          poiseDamage: 32,
          guardBreak: true,
          range: 4.2,
          direction: { x: dirFwdX, y: 0, z: dirFwdZ },
          origin: { x: this.x, y: this.y + 1.1, z: this.z }
        });
      }, 500);
    }, 450);
  }

  // Telegraphed Elemental Blast
  startTelegraphedRanged() {
    this.lastBoulderTime = Date.now();
    this.isTelegraphing = true;
    this.telegraphEndTime = Date.now() + 400; // 400ms visible windup
  }

  releaseRangedAttack(dx, dz, dist) {
    const dirX = dx / Math.max(0.1, dist);
    const dirZ = dz / Math.max(0.1, dist);

    let abilityId = 'BOULDER_KICK';
    if (this.element === 'WATER') abilityId = 'WATER_CHAKRAMS';
    else if (this.element === 'FIRE') abilityId = 'FIRE_BEAM';
    else if (this.element === 'AIR') abilityId = 'AIR_GALE';

    this.room.broadcastAbility({
      casterId: this.id,
      abilityId,
      element: this.element,
      slot: 'E',
      type: 'PHYSICAL_PROJECTILE',
      origin: { x: this.x, y: this.y + 1.1, z: this.z },
      direction: { x: dirX, y: 0.05, z: dirZ },
      damage: 38,
      poiseDamage: 45,
      radius: 1.3,
      speed: 26.0
    });
  }

  castDefensiveBarrier(dx, dz, dist) {
    this.lastStoneGuardTime = Date.now();
    let abilityId = 'STONE_GUARD';
    if (this.element === 'WATER') abilityId = 'ICE_WALL';
    else if (this.element === 'FIRE') abilityId = 'FLAME_SHIELD';
    else if (this.element === 'AIR') abilityId = 'GALE_BARRIER';

    this.room.broadcastAbility({
      casterId: this.id,
      abilityId,
      element: this.element,
      slot: 'Q',
      origin: { x: this.x + (dx / dist) * 2.5, y: this.y, z: this.z + (dz / dist) * 2.5 },
      type: 'EARTH_SPIRES',
      health: 400
    });
  }

  castUltimateSnare(dirFwdX, dirFwdZ) {
    this.lastFissureTime = Date.now();
    let abilityId = 'SEISMIC_SNARE';
    if (this.element === 'WATER') abilityId = 'THE_OCTOPUS';
    else if (this.element === 'FIRE') abilityId = 'FIRESTORM';
    else if (this.element === 'AIR') abilityId = 'TEMPEST';

    this.room.broadcastAbility({
      casterId: this.id,
      abilityId,
      element: this.element,
      slot: 'R',
      origin: { x: this.x, y: this.y, z: this.z },
      direction: { x: dirFwdX, y: 0, z: dirFwdZ },
      type: 'LINEAR_FISSURE',
      length: 18.0,
      damage: 35,
      poiseDamage: 50
    });
  }
}
