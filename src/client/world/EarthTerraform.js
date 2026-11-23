// Flowbound: Masters of Four - Earth Terraforming & Physical Projectiles
// Clean, low-profile tactical earth fracture spikes with zero camera occlusion

import * as THREE from 'three';
import { PALETTE } from '../../shared/Constants.js';

export class EarthTerraform {
  constructor(scene) {
    this.scene = scene;
    this.activeSpires = [];
    this.activeBoulders = [];
    this.activeFissures = [];
  }

  // Summon 4 Low-Profile Jagged Basalt Shards (Ability Q)
  spawnStoneGuard(origin, forwardDir) {
    const spireCluster = {
      meshes: [],
      pits: [],
      createdAt: Date.now(),
      lifetime: 3.2 // Snappy 3.2s duration (no 12s clutter!)
    };

    const rightDir = new THREE.Vector3(-forwardDir.z, 0, forwardDir.x).normalize();
    // Volcanic obsidian basalt with glowing amber fissures
    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x27272a,
      emissive: 0xd97706,
      emissiveIntensity: 0.35,
      roughness: 0.85,
      metalness: 0.2
    });

    const pitMat = new THREE.MeshBasicMaterial({ color: 0x09090b });

    for (let i = -1.5; i <= 1.5; i += 1.0) {
      const offset = rightDir.clone().multiplyScalar(i * 1.05);
      const pos = origin.clone().add(offset);

      // Low-profile multi-faceted jagged rock spike (1.3m - 1.6m height, never occludes camera)
      const height = 1.35 + Math.random() * 0.35;
      const spireGeo = new THREE.ConeGeometry(0.48, height, 5);
      const spireMesh = new THREE.Mesh(spireGeo, stoneMat);
      spireMesh.position.set(pos.x, height / 2, pos.z);
      spireMesh.rotation.y = Math.random() * Math.PI;
      spireMesh.rotation.z = (Math.random() - 0.5) * 0.18;
      spireMesh.castShadow = true;
      spireMesh.receiveShadow = true;
      this.scene.add(spireMesh);

      // Negative Space Floor Pit Decal
      const pitGeo = new THREE.CircleGeometry(0.55, 8);
      const pitMesh = new THREE.Mesh(pitGeo, pitMat);
      pitMesh.rotation.x = -Math.PI / 2;
      pitMesh.position.set(pos.x, 0.03, pos.z);
      this.scene.add(pitMesh);

      spireCluster.meshes.push(spireMesh);
      spireCluster.pits.push(pitMesh);
    }

    this.activeSpires.push(spireCluster);
  }

  // Launch Boulder Kick (Ability LMB)
  spawnBoulder(origin, direction, speed = 28.0) {
    const boulderGeo = new THREE.DodecahedronGeometry(0.85, 1);
    const boulderMat = new THREE.MeshStandardMaterial({
      color: 0x3f3f46,
      emissive: 0xb45309,
      emissiveIntensity: 0.25,
      roughness: 0.9
    });

    const mesh = new THREE.Mesh(boulderGeo, boulderMat);
    mesh.position.copy(origin);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    this.activeBoulders.push({
      mesh,
      velocity: direction.clone().multiplyScalar(speed),
      radius: 0.85,
      createdAt: Date.now(),
      lifetime: 2.5
    });
  }

  // Spawn Authentic Dynamic Earth Rupture Shockwave (Ability M4 / Seismic Snare)
  // Low-profile ground fracture slabs with dust/debris bursts that pop up and sink within 0.9s
  spawnFissure(origin, direction, length = 16.0) {
    const stepDist = 1.4;
    const numSteps = Math.min(10, Math.floor(length / stepDist));
    const normDir = direction.clone().normalize();

    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x27272a,
      emissive: 0xd97706,
      emissiveIntensity: 0.4,
      roughness: 0.85,
      metalness: 0.1
    });

    const pebbleMat = new THREE.MeshBasicMaterial({
      color: 0xd97706
    });

    for (let i = 1; i <= numSteps; i++) {
      setTimeout(() => {
        const pos = origin.clone().add(normDir.clone().multiplyScalar(2.0 + i * stepDist));
        pos.y = 0;

        // Low-profile natural rock slab (0.3m - 0.45m height)
        const slabHeight = 0.3 + Math.random() * 0.2;
        const slabWidth = 0.5 + Math.random() * 0.15;
        const geo = new THREE.BoxGeometry(slabWidth, slabHeight, slabWidth * 0.85);
        const slab = new THREE.Mesh(geo, stoneMat);
        slab.position.set(pos.x, -0.2, pos.z);
        slab.rotation.set(
          (Math.random() - 0.5) * 0.25,
          Math.random() * Math.PI,
          (Math.random() - 0.5) * 0.25
        );
        slab.castShadow = true;
        slab.receiveShadow = true;
        this.scene.add(slab);

        // Ground fracture dust & flying pebble burst
        const pebbles = [];
        for (let p = 0; p < 4; p++) {
          const pGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
          const pMesh = new THREE.Mesh(pGeo, pebbleMat);
          pMesh.position.set(
            pos.x + (Math.random() - 0.5) * 0.4,
            0.15,
            pos.z + (Math.random() - 0.5) * 0.4
          );
          pMesh.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 3.5,
            2.2 + Math.random() * 2.5,
            (Math.random() - 0.5) * 3.5
          );
          this.scene.add(pMesh);
          pebbles.push(pMesh);
        }

        this.activeFissures.push({
          mesh: slab,
          pebbles,
          createdAt: Date.now(),
          targetY: slabHeight / 2,
          lifetime: 0.95
        });
      }, i * 45);
    }
  }

  update(dt) {
    const now = Date.now();

    // Update Fissure slabs and debris
    for (let i = this.activeFissures.length - 1; i >= 0; i--) {
      const f = this.activeFissures[i];
      const elapsed = (now - f.createdAt) / 1000;

      // Update flying pebbles
      if (f.pebbles) {
        for (let p = f.pebbles.length - 1; p >= 0; p--) {
          const pebble = f.pebbles[p];
          pebble.position.add(pebble.velocity.clone().multiplyScalar(dt));
          pebble.velocity.y -= 9.8 * dt;
          if (pebble.position.y <= 0.05 || elapsed > 0.6) {
            this.scene.remove(pebble);
            pebble.geometry.dispose();
            f.pebbles.splice(p, 1);
          }
        }
      }

      // Animate slab: fast erupt -> brief pause -> crumble into ground
      if (elapsed < 0.12) {
        f.mesh.position.y += (f.targetY - f.mesh.position.y) * Math.min(1.0, dt * 18.0);
      } else if (elapsed > 0.65) {
        f.mesh.position.y -= dt * 1.5;
        f.mesh.scale.multiplyScalar(Math.max(0.01, 1.0 - dt * 2.5));
      }

      if (elapsed > f.lifetime || f.mesh.position.y < -0.4) {
        this.scene.remove(f.mesh);
        f.mesh.geometry.dispose();
        if (f.pebbles) {
          f.pebbles.forEach(p => { this.scene.remove(p); p.geometry.dispose(); });
        }
        this.activeFissures.splice(i, 1);
      }
    }

    // Update Flying Boulders
    for (let i = this.activeBoulders.length - 1; i >= 0; i--) {
      const b = this.activeBoulders[i];
      b.mesh.position.add(b.velocity.clone().multiplyScalar(dt));
      b.mesh.rotation.x += dt * 8.0;
      b.mesh.rotation.y += dt * 6.0;

      if ((now - b.createdAt) / 1000 > b.lifetime || b.mesh.position.y < -1) {
        this.scene.remove(b.mesh);
        b.mesh.geometry.dispose();
        this.activeBoulders.splice(i, 1);
      }
    }

    // Update & Crumble Spires
    for (let i = this.activeSpires.length - 1; i >= 0; i--) {
      const s = this.activeSpires[i];
      const age = (now - s.createdAt) / 1000;
      if (age > s.lifetime * 0.75) {
        // Smooth sink & crumble
        const sinkSpeed = (age - s.lifetime * 0.75) / (s.lifetime * 0.25);
        s.meshes.forEach(m => {
          m.position.y -= dt * 1.8;
          m.scale.set(1.0 - sinkSpeed * 0.4, 1.0 - sinkSpeed * 0.8, 1.0 - sinkSpeed * 0.4);
        });
      }
      if (age >= s.lifetime) {
        s.meshes.forEach(m => { this.scene.remove(m); m.geometry.dispose(); });
        s.pits.forEach(p => { this.scene.remove(p); p.geometry.dispose(); });
        this.activeSpires.splice(i, 1);
      }
    }
  }

  // Clean wipe of all boulders, rock spires, floor pits and fissures for clean round/match start
  clearAll() {
    for (const b of this.activeBoulders) {
      if (b.mesh) {
        this.scene.remove(b.mesh);
        if (b.mesh.geometry) b.mesh.geometry.dispose();
        if (b.mesh.material) b.mesh.material.dispose();
      }
    }
    this.activeBoulders = [];

    for (const s of this.activeSpires) {
      if (s.meshes) {
        s.meshes.forEach(m => {
          this.scene.remove(m);
          if (m.geometry) m.geometry.dispose();
          if (m.material) m.material.dispose();
        });
      }
      if (s.pits) {
        s.pits.forEach(p => {
          this.scene.remove(p);
          if (p.geometry) p.geometry.dispose();
          if (p.material) p.material.dispose();
        });
      }
    }
    this.activeSpires = [];

    for (const f of this.activeFissures) {
      if (f.mesh) {
        this.scene.remove(f.mesh);
        if (f.mesh.geometry) f.mesh.geometry.dispose();
        if (f.mesh.material) f.mesh.material.dispose();
      }
      if (f.pebbles) {
        f.pebbles.forEach(p => {
          this.scene.remove(p);
          if (p.geometry) p.geometry.dispose();
          if (p.material) p.material.dispose();
        });
      }
    }
    this.activeFissures = [];
  }
}
