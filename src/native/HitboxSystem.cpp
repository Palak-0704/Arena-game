// Flowbound: Masters of Four - C++ Hitbox, Damage & Absolver Poise System

#include "FlowboundCore.h"

namespace Flowbound {

HitResult CombatEngine::ProcessMeleeStrike(
    const Vector3& strikeStart,
    const Vector3& strikeEnd,
    float strikeRadius,
    float rawDamage,
    float rawPoiseDamage,
    bool isHeavyBreaker,
    const Capsule& victimHurtbox,
    bool victimGuarding,
    bool victimInvulnerable,
    float& victimHealth,
    float& victimPoise
) {
    HitResult res;
    res.hit = false;
    res.damageDealt = 0.0f;
    res.poiseDealt = 0.0f;
    res.wasBlocked = false;
    res.guardBroken = false;

    // Evasive i-frames completely negate melee strikes
    if (victimInvulnerable) {
        return res;
    }

    // Check intersection between swept strike segment and victim capsule
    if (!PhysicsEngine::SweptSphereVsCapsule(strikeStart, strikeEnd, strikeRadius, victimHurtbox, res)) {
        return res;
    }

    // Hit confirmed! Evaluate Absolver Defensive Mechanics
    if (victimGuarding) {
        res.wasBlocked = true;
        // Block mitigates 80% of damage
        res.damageDealt = rawDamage * (1.0f - BLOCK_DAMAGE_MITIGATION);
        
        // Heavy Breaker strikes deal 2.5x poise damage against blocking opponents
        float poiseDrain = isHeavyBreaker ? (rawPoiseDamage * HEAVY_BREAKER_POISE_MULT) : rawPoiseDamage;
        res.poiseDealt = poiseDrain;

        victimPoise -= poiseDrain;
        victimHealth -= res.damageDealt;

        // Check for Guard Break
        if (victimPoise <= 0.0f) {
            victimPoise = 0.0f;
            res.guardBroken = true;
        }
    } else {
        // Direct unblocked strike
        res.damageDealt = rawDamage;
        res.poiseDealt = rawPoiseDamage;

        victimHealth -= rawDamage;
        victimPoise -= rawPoiseDamage;

        if (victimPoise <= 0.0f) {
            victimPoise = 0.0f;
            res.guardBroken = true;
        }
    }

    if (victimHealth < 0.0f) victimHealth = 0.0f;

    return res;
}

} // namespace Flowbound
