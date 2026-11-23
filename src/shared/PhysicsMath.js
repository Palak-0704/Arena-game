// Flowbound: Masters of Four - Kinematics & Physics Math Library

export class PhysicsMath {
  // Catmull-Rom Spline Interpolation for smooth ice surfing ramps
  static catmullRom(p0, p1, p2, p3, t) {
    const t2 = t * t;
    const t3 = t2 * t;

    return {
      x: 0.5 * ((2 * p1.x) +
        (-p0.x + p2.x) * t +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
      y: 0.5 * ((2 * p1.y) +
        (-p0.y + p2.y) * t +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      z: 0.5 * ((2 * p1.z) +
        (-p0.z + p2.z) * t +
        (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 +
        (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t3)
    };
  }

  // Spline tangent vector for orientation and velocity
  static catmullRomTangent(p0, p1, p2, p3, t) {
    const t2 = t * t;
    const dx = 0.5 * ((-p0.x + p2.x) + (4 * p0.x - 10 * p1.x + 8 * p2.x - 2 * p3.x) * t + (-3 * p0.x + 9 * p1.x - 9 * p2.x + 3 * p3.x) * t2);
    const dy = 0.5 * ((-p0.y + p2.y) + (4 * p0.y - 10 * p1.y + 8 * p2.y - 2 * p3.y) * t + (-3 * p0.y + 9 * p1.y - 9 * p2.y + 3 * p3.y) * t2);
    const dz = 0.5 * ((-p0.z + p2.z) + (4 * p0.z - 10 * p1.z + 8 * p2.z - 2 * p3.z) * t + (-3 * p0.z + 9 * p1.z - 9 * p2.z + 3 * p3.z) * t2);
    
    const len = Math.hypot(dx, dy, dz) || 1.0;
    return { x: dx / len, y: dy / len, z: dz / len };
  }

  // Ray vs Capsule Intersection for manual aim hitboxes
  static rayIntersectsCapsule(rayOrigin, rayDir, capStart, capEnd, capRadius) {
    // Segment vector
    const ba = { x: capEnd.x - capStart.x, y: capEnd.y - capStart.y, z: capEnd.z - capStart.z };
    const oa = { x: rayOrigin.x - capStart.x, y: rayOrigin.y - capStart.y, z: rayOrigin.z - capStart.z };

    const baba = ba.x * ba.x + ba.y * ba.y + ba.z * ba.z;
    const bard = ba.x * rayDir.x + ba.y * rayDir.y + ba.z * rayDir.z;
    const baoa = ba.x * oa.x + ba.y * oa.y + ba.z * oa.z;
    const rdoa = rayDir.x * oa.x + rayDir.y * oa.y + rayDir.z * oa.z;
    const oaoa = oa.x * oa.x + oa.y * oa.y + oa.z * oa.z;

    const a = baba - bard * bard;
    const b = baba * rdoa - baoa * bard;
    const c = baba * oaoa - baoa * baoa - capRadius * capRadius * baba;
    const h = b * b - a * c;

    if (h >= 0.0) {
      const t = (-b - Math.sqrt(h)) / a;
      const y = baoa + t * bard;
      if (y > 0.0 && y < baba && t > 0.0) {
        return { hit: true, distance: t, hitPoint: {
          x: rayOrigin.x + rayDir.x * t,
          y: rayOrigin.y + rayDir.y * t,
          z: rayOrigin.z + rayDir.z * t
        }};
      }
      // Check spherical caps
      const oc1 = { x: rayOrigin.x - capStart.x, y: rayOrigin.y - capStart.y, z: rayOrigin.z - capStart.z };
      const oc2 = { x: rayOrigin.x - capEnd.x, y: rayOrigin.y - capEnd.y, z: rayOrigin.z - capEnd.z };
      const hit1 = this.rayIntersectsSphere(rayOrigin, rayDir, capStart, capRadius);
      const hit2 = this.rayIntersectsSphere(rayOrigin, rayDir, capEnd, capRadius);
      if (hit1.hit && hit2.hit) return hit1.distance < hit2.distance ? hit1 : hit2;
      if (hit1.hit) return hit1;
      if (hit2.hit) return hit2;
    }
    return { hit: false, distance: Infinity };
  }

  // Ray vs Sphere Intersection
  static rayIntersectsSphere(rayOrigin, rayDir, sphereCenter, radius) {
    const oc = {
      x: rayOrigin.x - sphereCenter.x,
      y: rayOrigin.y - sphereCenter.y,
      z: rayOrigin.z - sphereCenter.z
    };
    const b = oc.x * rayDir.x + oc.y * rayDir.y + oc.z * rayDir.z;
    const c = (oc.x * oc.x + oc.y * oc.y + oc.z * oc.z) - radius * radius;
    const h = b * b - c;
    if (h < 0.0) return { hit: false, distance: Infinity };
    const t = -b - Math.sqrt(h);
    if (t < 0.0) return { hit: false, distance: Infinity };
    return {
      hit: true,
      distance: t,
      hitPoint: {
        x: rayOrigin.x + rayDir.x * t,
        y: rayOrigin.y + rayDir.y * t,
        z: rayOrigin.z + rayDir.z * t
      }
    };
  }

  // Calculate Ramp Launch Kinematics
  static calculateRampLaunch(horizontalSpeed, inclineAngleDeg, launchVector) {
    const rad = (inclineAngleDeg * Math.PI) / 180;
    const vz = horizontalSpeed * Math.sin(rad) * 0.85;
    const forwardSpeed = horizontalSpeed * Math.cos(rad);
    return {
      vx: launchVector.x * forwardSpeed,
      vy: launchVector.y * forwardSpeed,
      vz: Math.max(vz, 7.5) // Minimum launch pop
    };
  }

  // Distance squared helper
  static distSq(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return dx * dx + dy * dy + dz * dz;
  }
}
