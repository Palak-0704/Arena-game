// Flowbound: Masters of Four - C++ Physics & Continuous Collision Detection

#include "FlowboundCore.h"

namespace Flowbound {

// Calculates the minimum squared distance between two 3D line segments (P1->P2 and Q1->Q2)
float PhysicsEngine::SegmentSegmentDistanceSq(
    const Vector3& p1, const Vector3& p2,
    const Vector3& q1, const Vector3& q2,
    Vector3& outClosestP, Vector3& outClosestQ
) {
    Vector3 d1 = p2 - p1; // Direction of segment 1
    Vector3 d2 = q2 - q1; // Direction of segment 2
    Vector3 r = p1 - q1;

    float a = d1.Dot(d1);
    float e = d2.Dot(d2);
    float f = d2.Dot(r);

    float s = 0.0f;
    float t = 0.0f;

    if (a <= 0.00001f && e <= 0.00001f) {
        outClosestP = p1;
        outClosestQ = q1;
        return (p1 - q1).LengthSq();
    }

    if (a <= 0.00001f) {
        s = 0.0f;
        t = std::max(0.0f, std::min(1.0f, f / e));
    } else {
        float c = d1.Dot(r);
        if (e <= 0.00001f) {
            t = 0.0f;
            s = std::max(0.0f, std::min(1.0f, -c / a));
        } else {
            float b = d1.Dot(d2);
            float denom = a * e - b * b;

            if (denom != 0.0f) {
                s = std::max(0.0f, std::min(1.0f, (b * f - c * e) / denom));
            } else {
                s = 0.0f;
            }

            t = (b * s + f) / e;

            if (t < 0.0f) {
                t = 0.0f;
                s = std::max(0.0f, std::min(1.0f, -c / a));
            } else if (t > 1.0f) {
                t = 1.0f;
                s = std::max(0.0f, std::min(1.0f, (b - c) / a));
            }
        }
    }

    outClosestP = p1 + d1 * s;
    outClosestQ = q1 + d2 * t;
    return (outClosestP - outClosestQ).LengthSq();
}

// Continuous Swept Sphere vs Capsule (Never tunnels regardless of velocity or framerate drops)
bool PhysicsEngine::SweptSphereVsCapsule(
    const Vector3& rayStart,
    const Vector3& rayEnd,
    float sphereRadius,
    const Capsule& target,
    HitResult& outHit
) {
    Vector3 closestRay, closestCap;
    float distSq = SegmentSegmentDistanceSq(rayStart, rayEnd, target.p0, target.p1, closestRay, closestCap);
    float combinedRadius = sphereRadius + target.radius;

    if (distSq <= (combinedRadius * combinedRadius)) {
        float dist = std::sqrt(distSq);
        outHit.hit = true;
        outHit.hitPoint = closestCap;
        outHit.hitNormal = dist > 0.0001f ? (closestRay - closestCap) / dist : Vector3(0, 1, 0);

        Vector3 rayDir = rayEnd - rayStart;
        float rayLenSq = rayDir.LengthSq();
        if (rayLenSq > 0.0001f) {
            outHit.hitTime = (closestRay - rayStart).Length() / std::sqrt(rayLenSq);
        } else {
            outHit.hitTime = 0.0f;
        }
        return true;
    }

    outHit.hit = false;
    return false;
}

// Vectorized Arena Clamp
bool PhysicsEngine::ClampArenaBounds(Vector3& pos, Vector3& vel, float arenaRadius) {
    float horizDistSq = pos.x * pos.x + pos.z * pos.z;
    if (horizDistSq > (arenaRadius * arenaRadius)) {
        float horizDist = std::sqrt(horizDistSq);
        float inv = arenaRadius / horizDist;
        pos.x *= inv;
        pos.z *= inv;
        vel.x *= 0.5f;
        vel.z *= 0.5f;
        return true;
    }
    return false;
}

// Integrates high-speed ballistic projectiles
void PhysicsEngine::StepProjectile(Projectile& p, float dt) {
    if (!p.active) return;
    p.pos += p.vel * dt;
    p.life -= dt;
    if (p.life <= 0.0f) {
        p.active = false;
    }
}

} // namespace Flowbound
