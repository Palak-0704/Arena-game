// Flowbound: Masters of Four - C++ Sparring AI & Orbital Footwork Engine

#include "FlowboundCore.h"

namespace Flowbound {

SparringAIEngine::AIDecision SparringAIEngine::EvaluateBot(
    const Vector3& botPos,
    const Vector3& playerPos,
    const Vector3& playerVel,
    bool playerAttacking,
    float dt,
    float combatSpacing
) {
    AIDecision dec;
    dec.desiredVelocity = Vector3(0, 0, 0);
    dec.desiredYaw = 0.0f;
    dec.shouldGuard = false;
    dec.shouldDodge = false;
    dec.shouldAttack = false;
    dec.attackType = 0;

    Vector3 toPlayer = playerPos - botPos;
    toPlayer.y = 0.0f;
    float dist = toPlayer.Length();

    if (dist > 0.001f) {
        dec.desiredYaw = std::atan2(toPlayer.x, toPlayer.z);
    }

    Vector3 dirFwd = dist > 0.001f ? (toPlayer / dist) : Vector3(0, 0, 1);
    Vector3 dirRight = Vector3(-dirFwd.z, 0.0f, dirFwd.x);

    // 1. Reactive Threat Assessment (Predict incoming strikes)
    if (playerAttacking && dist < 4.2f) {
        // High poise / close range: 60% chance to guard, 35% chance to dodge
        dec.shouldGuard = true;
        dec.desiredVelocity = dirRight * 2.5f - dirFwd * 1.5f; // Cautious defensive retreat
        return dec;
    }

    // 2. Absolver Orbital Spacing Decision Matrix
    constexpr float ADVANCE_SPEED = 5.2f;
    constexpr float RETREAT_SPEED = 3.8f;
    constexpr float ORBIT_SPEED = 4.8f;

    if (dist > 12.0f) {
        // Long range: Close distance
        dec.desiredVelocity = dirFwd * ADVANCE_SPEED;
    } else if (dist < 2.2f) {
        // Too close: Step back to neutral fighting pocket or strike
        dec.desiredVelocity = dirFwd * (-RETREAT_SPEED);
        dec.shouldAttack = true;
        dec.attackType = 1; // Light combo
    } else if (dist >= 2.2f && dist <= 4.8f) {
        // Martial pocket: Orbit around opponent with forward pressure
        dec.desiredVelocity = dirRight * ORBIT_SPEED + dirFwd * 0.4f;
        if (dist < 3.2f) {
            dec.shouldAttack = true;
            dec.attackType = 1; // 2-hit combo
        }
    } else {
        // Medium range: Advance or telegraph boulder
        dec.desiredVelocity = dirFwd * (ADVANCE_SPEED * 0.7f);
        dec.shouldAttack = true;
        dec.attackType = 3; // Boulder kick
    }

    return dec;
}

} // namespace Flowbound
