// Flowbound: Masters of Four - High-Performance C++ Core Engine
// Physics, Continuous Collision Detection (CCD), Swept Capsule Hitboxes, and Sparring AI

#ifndef FLOWBOUND_CORE_H
#define FLOWBOUND_CORE_H

#include <cmath>
#include <algorithm>
#include <cstdint>

namespace Flowbound {

struct Vector3 {
    float x, y, z;

    Vector3() : x(0), y(0), z(0) {}
    Vector3(float x_, float y_, float z_) : x(x_), y(y_), z(z_) {}

    Vector3 operator+(const Vector3& o) const { return Vector3(x + o.x, y + o.y, z + o.z); }
    Vector3 operator-(const Vector3& o) const { return Vector3(x - o.x, y - o.y, z - o.z); }
    Vector3 operator*(float s) const { return Vector3(x * s, y * s, z * s); }
    Vector3 operator/(float s) const { return Vector3(x / s, y / s, z / s); }

    Vector3& operator+=(const Vector3& o) { x += o.x; y += o.y; z += o.z; return *this; }
    Vector3& operator-=(const Vector3& o) { x -= o.x; y -= o.y; z -= o.z; return *this; }
    Vector3& operator*=(float s) { x *= s; y *= s; z *= s; return *this; }

    float Dot(const Vector3& o) const { return x * o.x + y * o.y + z * o.z; }
    Vector3 Cross(const Vector3& o) const {
        return Vector3(y * o.z - z * o.y, z * o.x - x * o.z, x * o.y - y * o.x);
    }
    float LengthSq() const { return x * x + y * y + z * z; }
    float Length() const { return std::sqrt(LengthSq()); }

    Vector3 Normalized() const {
        float len = Length();
        return len > 0.00001f ? (*this / len) : Vector3(0, 0, 0);
    }
};

struct Capsule {
    Vector3 p0; // Base (ankles)
    Vector3 p1; // Top (crown)
    float radius;
};

struct Projectile {
    int id;
    int casterId;
    Vector3 pos;
    Vector3 vel;
    float radius;
    float damage;
    float poiseDamage;
    float life;
    bool active;
};

struct HitResult {
    bool hit;
    float hitTime; // Fractional impact [0, 1]
    Vector3 hitPoint;
    Vector3 hitNormal;
    float damageDealt;
    float poiseDealt;
    bool wasBlocked;
    bool guardBroken;
};

// Absolver Combat Constants
constexpr float BLOCK_DAMAGE_MITIGATION = 0.80f; // Blocks 80% of damage
constexpr float HEAVY_BREAKER_POISE_MULT = 2.50f; // Heavy breaker deals 2.5x poise damage against blocks
constexpr float ARENA_RADIUS = 26.5f;

class PhysicsEngine {
public:
    // Continuous Collision Detection: Swept Sphere against Target Capsule
    static bool SweptSphereVsCapsule(
        const Vector3& rayStart,
        const Vector3& rayEnd,
        float sphereRadius,
        const Capsule& target,
        HitResult& outHit
    );

    // Closest distance between two 3D line segments (Attack Arc vs Hurtbox Segment)
    static float SegmentSegmentDistanceSq(
        const Vector3& p1, const Vector3& p2,
        const Vector3& q1, const Vector3& q2,
        Vector3& outClosestP, Vector3& outClosestQ
    );

    // Arena boundary clamp
    static bool ClampArenaBounds(Vector3& pos, Vector3& vel, float arenaRadius = ARENA_RADIUS);

    // Projectile integration step
    static void StepProjectile(Projectile& p, float dt);
};

class CombatEngine {
public:
    static HitResult ProcessMeleeStrike(
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
    );
};

class SparringAIEngine {
public:
    struct AIDecision {
        Vector3 desiredVelocity;
        float desiredYaw;
        bool shouldGuard;
        bool shouldDodge;
        bool shouldAttack;
        int attackType; // 0=None, 1=Light, 2=Heavy, 3=TelegraphBoulder
    };

    static AIDecision EvaluateBot(
        const Vector3& botPos,
        const Vector3& playerPos,
        const Vector3& playerVel,
        bool playerAttacking,
        float dt,
        float combatSpacing = 3.2f
    );
};

} // namespace Flowbound

#endif // FLOWBOUND_CORE_H
