// Flowbound: Masters of Four - Real-Time Procedural Ice Surfing & Crystalline Ice Ramps
// Faithful to reference video: Luminous crystalline ice launch ramps, frost borders, and mist particles

import * as THREE from 'three';
import { PALETTE } from '../../shared/Constants.js';

export class ProceduralIce {
  constructor(scene) {
    this.scene = scene;
    this.activeRamps = []; // Array of active ramp actors
    this.activeSurfParticles = []; // Dynamic frost spray & cold mist particles
    this.currentSurfingRamp = null;
    this.lastExtrudeTime = 0;
    this.rampHalfWidth = 0.55; // Sleek 1.1m carved ice trail
  }

  // Dynamic Frost Spray & Cold Mist Billow (Attached to heels of ice skate)
  spawnSurfFrostParticles(pos, forwardDir) {
    if (!this.scene) return;
    const tailPos = pos.clone().sub(forwardDir.clone().multiplyScalar(0.65));
    tailPos.y = Math.max(0.04, pos.y + 0.03);

    for (let i = 0; i < 4; i++) {
      const isMist = (i % 2 === 0);
      const geo = isMist ? new THREE.SphereGeometry(0.12 + Math.random() * 0.08, 8, 8) : new THREE.BoxGeometry(0.06, 0.06, 0.06);
      const mat = new THREE.MeshBasicMaterial({
        color: isMist ? 0xe0f2fe : 0x7dd3fc,
        transparent: true,
        opacity: isMist ? 0.6 : 0.88
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        tailPos.x + (Math.random() - 0.5) * 0.35,
        tailPos.y + Math.random() * 0.12,
        tailPos.z + (Math.random() - 0.5) * 0.35
      );
      this.scene.add(mesh);

      const lateral = new THREE.Vector3(-forwardDir.z, 0, forwardDir.x).normalize();
      const sideSpread = (Math.random() - 0.5) * 3.2;
      const vel = forwardDir.clone().multiplyScalar(-3.5 - Math.random() * 2.5)
        .add(lateral.multiplyScalar(sideSpread))
        .add(new THREE.Vector3(0, 0.7 + Math.random() * 1.4, 0));

      this.activeSurfParticles.push({
        mesh,
        velocity: vel,
        isMist,
        lifetime: 0.35 + Math.random() * 0.2,
        createdAt: Date.now()
      });
    }
  }

  startSurfing(startPos, forwardDir) {
    const ramp = {
      points: [startPos.clone()],
      mesh: null,
      geometry: new THREE.BufferGeometry(),
      vertices: [],
      indices: [],
      normals: [],
      uvs: [],
      colliders: [],
      createdAt: Date.now(),
      lifetime: 7.0,
      isFinished: false
    };

    ramp.material = new THREE.MeshStandardMaterial({
      color: 0x93c5fd,
      emissive: 0x0284c7,
      emissiveIntensity: 0.65,
      roughness: 0.12,
      metalness: 0.25,
      transparent: true,
      opacity: 0.88,
      side: THREE.DoubleSide
    });

    ramp.mesh = new THREE.Mesh(ramp.geometry, ramp.material);
    ramp.mesh.castShadow = true;
    ramp.mesh.receiveShadow = true;
    this.scene.add(ramp.mesh);

    this.activeRamps.push(ramp);
    this.currentSurfingRamp = ramp;
    this.lastExtrudeTime = Date.now();
  }

  addSurfingSegment(currentPos, forwardDir) {
    if (!this.currentSurfingRamp) return;

    const ramp = this.currentSurfingRamp;
    const now = Date.now();
    if (now - this.lastExtrudeTime < 65) return;
    this.lastExtrudeTime = now;

    const prevPos = ramp.points[ramp.points.length - 1];
    const dist = currentPos.distanceTo(prevPos);
    if (dist < 0.35) return;

    ramp.points.push(currentPos.clone());
    const pCount = ramp.points.length;
    if (pCount < 2) return;

    const segDir = currentPos.clone().sub(prevPos).normalize();
    const upVector = new THREE.Vector3(0, 1, 0);
    const rightDir = new THREE.Vector3().crossVectors(segDir, upVector).normalize();

    const iceY1 = Math.max(prevPos.y, 0) + 0.05;
    const iceY2 = Math.max(currentPos.y, 0) + 0.05;

    const v1 = prevPos.clone().sub(rightDir.clone().multiplyScalar(this.rampHalfWidth));
    v1.y = iceY1;
    const v2 = prevPos.clone().add(rightDir.clone().multiplyScalar(this.rampHalfWidth));
    v2.y = iceY1;
    const v3 = currentPos.clone().sub(rightDir.clone().multiplyScalar(this.rampHalfWidth));
    v3.y = iceY2;
    const v4 = currentPos.clone().add(rightDir.clone().multiplyScalar(this.rampHalfWidth));
    v4.y = iceY2;

    const baseIndex = ramp.vertices.length / 3;

    ramp.vertices.push(v1.x, v1.y, v1.z);
    ramp.vertices.push(v2.x, v2.y, v2.z);
    ramp.vertices.push(v3.x, v3.y, v3.z);
    ramp.vertices.push(v4.x, v4.y, v4.z);

    ramp.indices.push(baseIndex, baseIndex + 2, baseIndex + 1);
    ramp.indices.push(baseIndex + 1, baseIndex + 2, baseIndex + 3);

    const u = pCount * 0.5;
    ramp.uvs.push(0, u, 1, u, 0, u + 0.5, 1, u + 0.5);

    ramp.geometry.setAttribute('position', new THREE.Float32BufferAttribute(ramp.vertices, 3));
    ramp.geometry.setAttribute('uv', new THREE.Float32BufferAttribute(ramp.uvs, 2));
    ramp.geometry.setIndex(ramp.indices);
    ramp.geometry.computeVertexNormals();

    ramp.colliders.push({
      start: prevPos.clone(),
      end: currentPos.clone(),
      y: Math.max(prevPos.y, currentPos.y),
      radius: this.rampHalfWidth
    });
  }

  stopSurfing() {
    if (this.currentSurfingRamp) {
      this.currentSurfingRamp.isFinished = true;
      this.currentSurfingRamp = null;
    }
  }

  // Spawn Authentic Crystalline Ice Plank / Launch Ramp (Ability Q)
  // Faithful to reference video: Sleek arched crystalline launch plank with frost borders and mist plumes
  spawnIceWall(position, forwardDir, isCurved = false, type = 'RAMP') {
    const rampGroup = new THREE.Group();
    const length = 7.6;
    const height = 2.3;
    const halfW = 0.95; // 1.9m wide clean riding plank

    const normDir = forwardDir.clone().normalize();
    const rightDir = new THREE.Vector3(-normDir.z, 0, normDir.x).normalize();

    // 1. Crystalline Ice Surface Material (Works in all browsers & WebGL renderers)
    const iceMat = new THREE.MeshStandardMaterial({
      color: 0x93c5fd,
      emissive: 0x0284c7,
      emissiveIntensity: 0.65,
      roughness: 0.12,
      metalness: 0.25,
      transparent: true,
      opacity: 0.88,
      side: THREE.DoubleSide
    });

    // 2. Pure White Frost Edge Ribbon Material
    const frostMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95
    });

    const numSegments = 10;
    const vertices = [];
    const indices = [];
    const uvs = [];

    const leftBorderVerts = [];
    const rightBorderVerts = [];

    const startPos = position.clone();
    startPos.y = 0.04;

    for (let i = 0; i <= numSegments; i++) {
      const t = i / numSegments;
      // Smooth arched ski-ramp / wave profile
      const dist = t * length;
      const y = Math.pow(Math.sin(t * Math.PI * 0.5), 1.35) * height + 0.04;

      const center = startPos.clone().add(normDir.clone().multiplyScalar(dist));
      center.y = y;

      const vL = center.clone().sub(rightDir.clone().multiplyScalar(halfW));
      const vR = center.clone().add(rightDir.clone().multiplyScalar(halfW));

      vertices.push(vL.x, vL.y, vL.z);
      vertices.push(vR.x, vR.y, vR.z);
      uvs.push(0, t, 1, t);

      leftBorderVerts.push(vL);
      rightBorderVerts.push(vR);

      if (i < numSegments) {
        const base = i * 2;
        indices.push(base, base + 2, base + 1);
        indices.push(base + 1, base + 2, base + 3);
      }
    }

    const iceGeo = new THREE.BufferGeometry();
    iceGeo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    iceGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    iceGeo.setIndex(indices);
    iceGeo.computeVertexNormals();

    const iceMesh = new THREE.Mesh(iceGeo, iceMat);
    iceMesh.castShadow = true;
    iceMesh.receiveShadow = true;
    rampGroup.add(iceMesh);

    // 3. White Frost Edge Rails
    const buildBorderMesh = (borderVerts) => {
      const bVerts = [];
      const bIndices = [];
      const bW = 0.09;
      for (let i = 0; i < borderVerts.length; i++) {
        const p = borderVerts[i];
        bVerts.push(p.x, p.y + 0.02, p.z);
        bVerts.push(p.x, p.y - 0.03, p.z);
        if (i < borderVerts.length - 1) {
          const b = i * 2;
          bIndices.push(b, b + 2, b + 1);
          bIndices.push(b + 1, b + 2, b + 3);
        }
      }
      const bGeo = new THREE.BufferGeometry();
      bGeo.setAttribute('position', new THREE.Float32BufferAttribute(bVerts, 3));
      bGeo.setIndex(bIndices);
      bGeo.computeVertexNormals();
      return new THREE.Mesh(bGeo, frostMat);
    };

    rampGroup.add(buildBorderMesh(leftBorderVerts));
    rampGroup.add(buildBorderMesh(rightBorderVerts));

    // 4. Base Frost Decal Ring
    const baseDecalGeo = new THREE.RingGeometry(0.3, 1.4, 16);
    const baseDecalMat = new THREE.MeshBasicMaterial({
      color: 0xbae6fd,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide
    });
    const baseDecal = new THREE.Mesh(baseDecalGeo, baseDecalMat);
    baseDecal.rotation.x = -Math.PI / 2;
    baseDecal.position.set(startPos.x, 0.02, startPos.z);
    rampGroup.add(baseDecal);

    this.scene.add(rampGroup);

    // 5. Cold Mist Particle Plumes
    const mistPlumes = [];
    for (let m = 0; m < 5; m++) {
      const mt = (m + 1) / 6;
      const mPos = startPos.clone().add(normDir.clone().multiplyScalar(mt * length));
      mPos.y = Math.pow(Math.sin(mt * Math.PI * 0.5), 1.35) * height + 0.15;

      const mGeo = new THREE.SphereGeometry(0.22, 8, 8);
      const mMat = new THREE.MeshBasicMaterial({
        color: 0xe0f2fe,
        transparent: true,
        opacity: 0.55
      });
      const mMesh = new THREE.Mesh(mGeo, mMat);
      mMesh.position.copy(mPos);
      this.scene.add(mMesh);
      mistPlumes.push(mMesh);
    }

    const rampActor = {
      mesh: rampGroup,
      material: iceMat,
      frostMat,
      mistPlumes,
      createdAt: Date.now(),
      lifetime: 7.5,
      collider: {
        type: 'CURVED_ICE_RAMP',
        start: startPos.clone(),
        end: startPos.clone().add(normDir.clone().multiplyScalar(length)),
        direction: normDir.clone(),
        height,
        length,
        radius: halfW + 0.2
      }
    };

    this.activeRamps.push(rampActor);
    return rampActor;
  }

  update(dt) {
    const now = Date.now();

    // Update dynamic frost spray and cold mist particles
    for (let i = this.activeSurfParticles.length - 1; i >= 0; i--) {
      const p = this.activeSurfParticles[i];
      const age = (now - p.createdAt) / 1000;

      p.mesh.position.addScaledVector(p.velocity, dt);
      p.velocity.multiplyScalar(0.93);
      if (p.isMist) {
        p.velocity.y += dt * 0.45;
        p.mesh.scale.multiplyScalar(1.0 + dt * 1.8);
      } else {
        p.velocity.y -= dt * 6.5;
      }

      if (p.mesh.material) {
        p.mesh.material.opacity = Math.max(0, (1.0 - (age / p.lifetime)) * (p.isMist ? 0.6 : 0.88));
      }

      if (age >= p.lifetime) {
        this.scene.remove(p.mesh);
        if (p.mesh.geometry) p.mesh.geometry.dispose();
        if (p.mesh.material) p.mesh.material.dispose();
        this.activeSurfParticles.splice(i, 1);
      }
    }

    // Update Ramps
    for (let i = this.activeRamps.length - 1; i >= 0; i--) {
      const ramp = this.activeRamps[i];
      const age = (now - ramp.createdAt) / 1000;

      // Animate mist plumes
      if (ramp.mistPlumes) {
        ramp.mistPlumes.forEach((m, idx) => {
          m.position.y += dt * 0.35;
          m.scale.multiplyScalar(1.0 + dt * 0.8);
          if (m.material) {
            m.material.opacity = Math.max(0, (1.0 - (age / 2.5)) * 0.55);
          }
        });
      }

      // Dissolution melt effect after 70% of lifetime
      if (age > ramp.lifetime * 0.7) {
        const meltRatio = (ramp.lifetime - age) / (ramp.lifetime * 0.3);
        if (ramp.material) {
          ramp.material.opacity = Math.max(0, meltRatio * 0.88);
        }
        if (ramp.frostMat) {
          ramp.frostMat.opacity = Math.max(0, meltRatio * 0.95);
        }
      }

      // Cleanup fully melted ramps
      if (age >= ramp.lifetime) {
        if (ramp.mesh) {
          this.scene.remove(ramp.mesh);
          ramp.mesh.traverse((c) => {
            if (c.geometry) c.geometry.dispose();
            if (c.material) c.material.dispose();
          });
        }
        if (ramp.mistPlumes) {
          ramp.mistPlumes.forEach(m => {
            this.scene.remove(m);
            if (m.geometry) m.geometry.dispose();
            if (m.material) m.material.dispose();
          });
        }
        this.activeRamps.splice(i, 1);
      }
    }
  }

  // Check collision for player surfing/walking on ramps
  checkRampCollision(playerPos) {
    for (const ramp of this.activeRamps) {
      if (ramp.collider && (ramp.collider.type === 'CURVED_ICE_RAMP' || ramp.collider.type === 'WEDGE_RAMP')) {
        const c = ramp.collider;
        const toPlayer = playerPos.clone().sub(c.start);
        const rampVec = c.end.clone().sub(c.start);
        const rampLen = Math.hypot(rampVec.x, rampVec.z);
        if (rampLen < 0.01) continue;

        const dirX = rampVec.x / rampLen;
        const dirZ = rampVec.z / rampLen;
        const proj = (toPlayer.x * dirX) + (toPlayer.z * dirZ);

        if (proj >= -0.8 && proj <= rampLen + 0.8) {
          const sideDist = Math.abs(toPlayer.x * (-dirZ) + toPlayer.z * dirX);
          if (sideDist <= c.radius + 0.5) {
            const t = Math.min(1.0, Math.max(0.0, proj / rampLen));
            // Curved surface elevation matching ramp mesh
            const surfaceY = c.start.y + Math.pow(Math.sin(t * Math.PI * 0.5), 1.35) * c.height;
            const isAtLaunchLip = proj >= rampLen * 0.86;

            if (playerPos.y >= surfaceY - 0.8 && playerPos.y <= surfaceY + 1.8) {
              return {
                onRamp: true,
                surfaceY,
                slopeAngle: 28.0,
                isAtLaunchLip,
                rampForward: new THREE.Vector3(dirX, 0, dirZ),
                ramp: ramp
              };
            }
          }
        }
      }
    }
    return null;
  }

  // Dynamic multi-point crystalline ice shatter explosion
  spawnRampShatterBurst(collider) {
    if (!this.scene || !collider) return;
    const points = [];
    if (collider.start) points.push(collider.start);
    if (collider.end) points.push(collider.end);
    if (collider.start && collider.end) {
      const mid = collider.start.clone().add(collider.end).multiplyScalar(0.5);
      mid.y = (collider.height || 2.0) * 0.5;
      points.push(mid);
    }

    const frostMat = new THREE.MeshBasicMaterial({
      color: 0xbae6fd,
      transparent: true,
      opacity: 0.85
    });

    for (const pt of points) {
      for (let i = 0; i < 6; i++) {
        const geo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
        const mesh = new THREE.Mesh(geo, frostMat);
        mesh.position.set(
          pt.x + (Math.random() - 0.5) * 0.8,
          Math.max(0.05, pt.y + Math.random() * 0.6),
          pt.z + (Math.random() - 0.5) * 0.8
        );
        this.scene.add(mesh);
        const vel = new THREE.Vector3(
          (Math.random() - 0.5) * 5.5,
          2.0 + Math.random() * 3.5,
          (Math.random() - 0.5) * 5.5
        );
        this.activeSurfParticles.push({
          mesh,
          velocity: vel,
          isMist: false,
          lifetime: 0.45 + Math.random() * 0.25,
          createdAt: Date.now()
        });
      }
    }
  }

  // Immediately shatter and remove an ice ramp upon jumping / vaulting
  removeRamp(rampActor = null) {
    if (!rampActor) {
      if (this.activeRamps.length > 0) {
        rampActor = this.activeRamps[this.activeRamps.length - 1];
      }
    }
    if (!rampActor) return;

    const idx = this.activeRamps.indexOf(rampActor);
    if (idx !== -1) {
      this.activeRamps.splice(idx, 1);
    }

    if (rampActor.collider) {
      this.spawnRampShatterBurst(rampActor.collider);
    }

    if (rampActor.mesh) {
      this.scene.remove(rampActor.mesh);
      rampActor.mesh.traverse((c) => {
        if (c.geometry) c.geometry.dispose();
        if (c.material) {
          if (Array.isArray(c.material)) c.material.forEach(m => m.dispose());
          else c.material.dispose();
        }
      });
      rampActor.mesh = null;
    }

    if (rampActor.mistPlumes) {
      rampActor.mistPlumes.forEach(m => {
        this.scene.remove(m);
        if (m.geometry) m.geometry.dispose();
        if (m.material) m.material.dispose();
      });
      rampActor.mistPlumes = [];
    }
  }

  // Clean wipe of all ramps, surfing ribbons and particles for clean round start
  clearAll() {
    this.stopSurfing();
    for (const ramp of this.activeRamps) {
      if (ramp.mesh) {
        this.scene.remove(ramp.mesh);
        ramp.mesh.traverse((c) => {
          if (c.geometry) c.geometry.dispose();
          if (c.material) {
            if (Array.isArray(c.material)) c.material.forEach(m => m.dispose());
            else c.material.dispose();
          }
        });
      }
      if (ramp.mistPlumes) {
        ramp.mistPlumes.forEach(m => {
          this.scene.remove(m);
          if (m.geometry) m.geometry.dispose();
          if (m.material) m.material.dispose();
        });
      }
    }
    this.activeRamps = [];

    for (const p of this.activeSurfParticles) {
      if (p.mesh) {
        this.scene.remove(p.mesh);
        if (p.mesh.geometry) p.mesh.geometry.dispose();
        if (p.mesh.material) p.mesh.material.dispose();
      }
    }
    this.activeSurfParticles = [];
  }
}
