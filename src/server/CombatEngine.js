// Flowbound: Masters of Four - Authoritative Combat Engine
// Powered by Absolver-style hit detection, blocking mitigation, guard break, and physical impact

import { COMBAT_CONSTANTS } from '../shared/Constants.js';
import { PhysicsMath } from '../shared/PhysicsMath.js';

export class CombatEngine {
  constructor(room) {
    this.room = room;
  }

  // Process hit verification for melee and directional attacks
  processAttack(attacker, attackData) {
    if (!attacker || !attacker.id) return [];

    const targets = this.room.getOpponents(attacker.id);
    const results = [];

    for (const target of targets) {
      // ABSOLUTE GUARANTEE: Never damage or collide with the attacker themselves!
      if (target.id === attacker.id) continue;
      if (target.isInvulnerable || target.isDead) continue;

      // Hurtbox capsule: center-line between feet and head
      const capBottom = { x: target.x, y: target.y + 0.3, z: target.z };
      const capTop = { x: target.x, y: target.y + 1.7, z: target.z };
      const capRadius = 0.55;

      let hitResult = null;

      if (attackData.type === 'MELEE_SWEEP') {
        // Melee swing: Check distance AND ensure target is in front of attacker
        const attackerX = (attackData.origin && typeof attackData.origin.x === 'number') ? attackData.origin.x : attacker.x;
        const attackerZ = (attackData.origin && typeof attackData.origin.z === 'number') ? attackData.origin.z : attacker.z;
        const toTargetX = target.x - attackerX;
        const toTargetZ = target.z - attackerZ;
        const distSq = toTargetX * toTargetX + toTargetZ * toTargetZ;

        // Allow point-blank hits (never fail if distSq < 0.04) and check generous melee range
        const maxRange = attackData.range || 5.0;
        if (distSq <= maxRange * maxRange) {
          const dist = Math.sqrt(distSq);
          // Attacker forward facing direction
          const forward = attackData.direction || {
            x: Math.sin(attacker.yaw || 0),
            z: Math.cos(attacker.yaw || 0)
          };
          // Since physical character capsules touch at ~1.45m (MIN_DIST), any distance up to 1.75m is point-blank touch range
          // At point-blank / close-quarters (dist <= 1.75m), grant full hit coverage; otherwise check forward arc
          const dot = dist <= 1.75 ? 1.0 : ((toTargetX / dist) * forward.x + (toTargetZ / dist) * forward.z);

          // Target must be within generous forward frontal arc
          if (dot >= 0.0) {
            hitResult = { hit: true, hitPoint: { x: target.x, y: target.y + 1.1, z: target.z } };
          }
        }
      } else if (attackData.type === 'RAY_PROJECTILE') {
        hitResult = PhysicsMath.rayIntersectsCapsule(
          attackData.origin,
          attackData.direction,
          capBottom,
          capTop,
          capRadius
        );
      } else if (attackData.type === 'AOE_SPHERE') {
        const distSq = PhysicsMath.distSq(attackData.center, target);
        if (distSq <= attackData.radius * attackData.radius) {
          hitResult = { hit: true, hitPoint: { x: target.x, y: target.y + 0.5, z: target.z } };
        }
      } else if (attackData.type === 'LINEAR_FISSURE') {
        const orig = attackData.origin || { x: attacker.x, y: attacker.y, z: attacker.z };
        const dir = attackData.direction || { x: Math.sin(attacker.yaw || 0), y: 0, z: Math.cos(attacker.yaw || 0) };
        const len = attackData.length || 16.0;
        const width = attackData.width || 2.2;
        const toTargetX = target.x - orig.x;
        const toTargetZ = target.z - orig.z;
        const projDist = toTargetX * dir.x + toTargetZ * dir.z;
        if (projDist > 0.1 && projDist <= len) {
          const perpDist = Math.abs(toTargetX * (-dir.z) + toTargetZ * dir.x);
          if (perpDist <= width * 0.5) {
            hitResult = { hit: true, hitPoint: { x: target.x, y: target.y + 0.4, z: target.z } };
          }
        }
      }

      if (hitResult && hitResult.hit) {
        // Calculate Base Damage & Poise
        let finalDamage = attackData.damage || 20;
        let finalPoiseDmg = attackData.poiseDamage || 25;

        // Apply Attacker Power Perks
        if (attacker.perks) {
          if (attacker.perks.includes('THUNDER_PALM') && !attackData.isHeavy) {
            finalDamage *= 1.25;
            finalPoiseDmg *= 1.35;
          }
          if (attacker.perks.includes('DRAGON_BREAKER') && attackData.isHeavy) {
            finalDamage *= 1.40;
            finalPoiseDmg *= 1.45;
          }
        }

        // Check headshot (upper 20% of capsule)
        const isHeadshot = hitResult.hitPoint && hitResult.hitPoint.y > target.y + 1.45;
        if (isHeadshot) {
          finalDamage *= COMBAT_CONSTANTS.HEADSHOT_MULT;
        }

        // Apply Stagger bonus if enemy is already guard broken
        if (target.isStaggered) {
          finalDamage *= COMBAT_CONSTANTS.GUARD_BREAK_DMG_MULT;
        }

        // Absolver-Style Defense: Check if target is Blocking / Guarding
        let wasBlocked = false;
        let guardBroken = false;

        if (target.isGuarding) {
          wasBlocked = true;
          // Mitigate 80% (or 95% with Iron Bastion perk) damage on block
          const blockReduct = (target.perks && target.perks.includes('IRON_BASTION')) ? 0.95 : COMBAT_CONSTANTS.BLOCK_DAMAGE_REDUCTION;
          finalDamage *= (1.0 - blockReduct);
          // Absorb into poise
          const poiseDrain = (target.perks && target.perks.includes('IRON_BASTION')) ? 0.65 : 1.0;
          target.poise = Math.max(0, target.poise - (finalPoiseDmg * COMBAT_CONSTANTS.BLOCK_POISE_DRAIN_MULT * poiseDrain));
          target.lastDamageTime = Date.now();

          // Guard Break Check
          if (target.poise <= 0 && !target.isStaggered) {
            target.isStaggered = true;
            target.staggerEndTime = Date.now() + (COMBAT_CONSTANTS.GUARD_BREAK_DURATION * 1000);
            guardBroken = true;
          }
        } else {
          // Unblocked strike
          target.poise = Math.max(0, target.poise - finalPoiseDmg);
          target.lastDamageTime = Date.now();

          if (target.poise <= 0 && !target.isStaggered) {
            target.isStaggered = true;
            target.staggerEndTime = Date.now() + (COMBAT_CONSTANTS.GUARD_BREAK_DURATION * 1000);
            guardBroken = true;
          }
        }

        // Apply HP Damage
        target.health = Math.max(0, target.health - finalDamage);

        // Award Attacker Flow Meter (+0.25 bar per hit)
        attacker.flow = Math.min(COMBAT_CONSTANTS.MAX_FLOW, (attacker.flow || 0) + 0.25);
        attacker.totalDamageDealt = (attacker.totalDamageDealt || 0) + Math.round(finalDamage);

        // Check Knockout
        let isKO = false;
        if (target.health <= 0) {
          target.isDead = true;
          attacker.kos = (attacker.kos || 0) + 1;
          if (attackData.knockdown) {
            attacker.finishers = (attacker.finishers || 0) + 1;
          }
          isKO = true;
        }

        results.push({
          attackerId: attacker.id,
          targetId: target.id,
          damage: Math.round(finalDamage),
          poiseRemaining: target.poise,
          healthRemaining: target.health,
          isHeadshot,
          wasBlocked,
          guardBroken,
          isKO,
          hitPoint: hitResult.hitPoint,
          knockback: attackData.knockback || (attackData.type === 'LINEAR_FISSURE' ? 12.0 : (attackData.slot === 'RMB' ? 9.0 : 6.0))
        });
      }
    }

    return results;
  }

  // Direct hit applied from physical projectiles (e.g. Flying Boulders)
  applyDirectHit(attacker, target, hitData) {
    if (!attacker || !target) return [];
    if (target.id === attacker.id) return [];
    if (target.isInvulnerable || target.isDead) return [];

    let finalDamage = hitData.damage || 35;
    let finalPoiseDmg = hitData.poiseDamage || 40;

    let wasBlocked = false;
    let guardBroken = false;

    if (target.isGuarding) {
      wasBlocked = true;
      finalDamage *= (1.0 - COMBAT_CONSTANTS.BLOCK_DAMAGE_REDUCTION);
      target.poise = Math.max(0, target.poise - (finalPoiseDmg * COMBAT_CONSTANTS.BLOCK_POISE_DRAIN_MULT));
      target.lastDamageTime = Date.now();

      if (target.poise <= 0 && !target.isStaggered) {
        target.isStaggered = true;
        target.staggerEndTime = Date.now() + (COMBAT_CONSTANTS.GUARD_BREAK_DURATION * 1000);
        guardBroken = true;
      }
    } else {
      target.poise = Math.max(0, target.poise - finalPoiseDmg);
      target.lastDamageTime = Date.now();

      if (target.poise <= 0 && !target.isStaggered) {
        target.isStaggered = true;
        target.staggerEndTime = Date.now() + (COMBAT_CONSTANTS.GUARD_BREAK_DURATION * 1000);
        guardBroken = true;
      }
    }

    target.health = Math.max(0, target.health - finalDamage);
    attacker.totalDamageDealt = (attacker.totalDamageDealt || 0) + Math.round(finalDamage);

    let isKO = false;
    if (target.health <= 0) {
      target.isDead = true;
      attacker.kos = (attacker.kos || 0) + 1;
      isKO = true;
    }

    return [{
      attackerId: attacker.id,
      targetId: target.id,
      damage: Math.round(finalDamage),
      poiseRemaining: target.poise,
      healthRemaining: target.health,
      wasBlocked,
      guardBroken,
      isKO,
      hitPoint: hitData.hitPoint || { x: target.x, y: target.y + 1.0, z: target.z },
      knockback: hitData.knockback || 10.0
    }];
  }
}
