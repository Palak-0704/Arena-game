// Flowbound: Masters of Four - Dynamic 3D Arena System
// Supports 'COLOSSEUM' (Imperial Sunset Court) and 'GLACIER' / 'BASIN' (Boreal Glacial Chasm)

import * as THREE from 'three';
import { PALETTE } from '../../shared/Constants.js';

export class ColosseumArena {
  constructor(scene) {
    this.scene = scene;
    this.colliders = [];
    this.currentArenaType = 'COLOSSEUM';

    this.skyRoot = new THREE.Group();
    this.arenaRoot = new THREE.Group();
    this.scene.add(this.skyRoot);
    this.scene.add(this.arenaRoot);

    this.floatingShards = [];
    this.snowParticles = null;
    this.snowGeo = null;

    this.buildSkyDome(this.currentArenaType);
    this.buildArena(this.currentArenaType);
  }

  setArenaType(arenaType, sceneManager) {
    let type = (arenaType || 'COLOSSEUM').toUpperCase();
    if (type === 'BASIN') type = 'GLACIER';
    console.log(`[ColosseumArena] Switching battleground to: ${type}`);
    this.currentArenaType = type;

    // Clear existing objects
    while (this.skyRoot.children.length > 0) {
      const obj = this.skyRoot.children[0];
      this.skyRoot.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    }

    while (this.arenaRoot.children.length > 0) {
      const obj = this.arenaRoot.children[0];
      this.arenaRoot.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    }

    this.colliders = [];
    this.floatingShards = [];
    this.snowParticles = null;

    // Rebuild Sky & Arena Geometry
    this.buildSkyDome(type);
    this.buildArena(type);

    // Update Lighting & Atmospheric Fog if sceneManager provided
    if (sceneManager) {
      if (type === 'GLACIER') {
        sceneManager.scene.fog = new THREE.FogExp2(0x051329, 0.0032);
        if (sceneManager.ambientLight) {
          sceneManager.ambientLight.color.setHex(0x1e3a5f);
          sceneManager.ambientLight.intensity = 1.25;
        }
        if (sceneManager.sunLight) {
          sceneManager.sunLight.color.setHex(0x93c5fd); // Crisp Boreal moonlight
          sceneManager.sunLight.intensity = 2.4;
          sceneManager.sunLight.position.set(-30, 48, 25);
        }
        if (sceneManager.fillLight) {
          sceneManager.fillLight.color.setHex(0x10b981); // Emerald aurora rim fill
          sceneManager.fillLight.intensity = 0.85;
          sceneManager.fillLight.position.set(30, 25, -35);
        }
        if (sceneManager.rimLight) {
          sceneManager.rimLight.color.setHex(0x38bdf8); // Cyan glacial rim highlight
          sceneManager.rimLight.intensity = 1.6;
        }
        if (sceneManager.hemiLight) {
          sceneManager.hemiLight.color.setHex(0x38bdf8);
          sceneManager.hemiLight.groundColor.setHex(0x020617);
        }
      } else {
        // Imperial Sunset Colosseum
        sceneManager.scene.fog = new THREE.FogExp2(0xfba26b, 0.0035);
        if (sceneManager.ambientLight) {
          sceneManager.ambientLight.color.setHex(0xffedd5);
          sceneManager.ambientLight.intensity = 1.2;
        }
        if (sceneManager.sunLight) {
          sceneManager.sunLight.color.setHex(0xfdba74);
          sceneManager.sunLight.intensity = 2.2;
          sceneManager.sunLight.position.set(40, 35, -35);
        }
        if (sceneManager.fillLight) {
          sceneManager.fillLight.color.setHex(0xffecd2);
          sceneManager.fillLight.intensity = 1.1;
          sceneManager.fillLight.position.set(-25, 25, -45);
        }
        if (sceneManager.rimLight) {
          sceneManager.rimLight.color.setHex(0x7dd3fc);
          sceneManager.rimLight.intensity = 0.85;
        }
        if (sceneManager.hemiLight) {
          sceneManager.hemiLight.color.setHex(0x93c5fd);
          sceneManager.hemiLight.groundColor.setHex(0xb45309);
        }
      }
    }
  }

  buildSkyDome(type = 'COLOSSEUM') {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    if (type === 'GLACIER') {
      // 1. Polar Night Sky Gradient
      const grad = ctx.createLinearGradient(0, 512, 0, 0);
      grad.addColorStop(0.0, '#0284c7'); // Electric cyan horizon glow
      grad.addColorStop(0.2, '#0f172a'); // Polar deep midnight
      grad.addColorStop(0.5, '#1e1b4b'); // Cosmic indigo
      grad.addColorStop(0.8, '#090d16'); // Dark zenith
      grad.addColorStop(1.0, '#020617'); // Space black
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1024, 512);

      // 2. Dynamic Aurora Borealis (Emerald Green & Celestial Violet Ribbons)
      const drawAuroraCurtain = (yBase, amp, color1, color2) => {
        ctx.save();
        const aGrad = ctx.createLinearGradient(0, yBase + 90, 0, yBase - 110);
        aGrad.addColorStop(0.0, 'rgba(0,0,0,0)');
        aGrad.addColorStop(0.4, color1);
        aGrad.addColorStop(0.75, color2);
        aGrad.addColorStop(1.0, 'rgba(0,0,0,0)');
        ctx.fillStyle = aGrad;

        ctx.beginPath();
        ctx.moveTo(0, yBase);
        for (let x = 0; x <= 1024; x += 16) {
          const wave = Math.sin(x * 0.012) * amp + Math.sin(x * 0.025) * (amp * 0.5);
          ctx.lineTo(x, yBase + wave);
        }
        ctx.lineTo(1024, yBase - 120);
        ctx.lineTo(0, yBase - 120);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      };

      // Aurora Ribbon 1: Luminous Emerald / Jade
      drawAuroraCurtain(240, 36, 'rgba(16, 185, 129, 0.45)', 'rgba(52, 211, 153, 0.75)');
      // Aurora Ribbon 2: Cyan & Electric Blue
      drawAuroraCurtain(210, 42, 'rgba(6, 182, 212, 0.40)', 'rgba(56, 189, 248, 0.65)');
      // Aurora Ribbon 3: Violet / Magenta Shimmer
      drawAuroraCurtain(180, 28, 'rgba(139, 92, 246, 0.35)', 'rgba(192, 132, 252, 0.55)');

      // 3. Dense Winter Polar Starfield (240 stars)
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 240; i++) {
        const sx = Math.random() * 1024;
        const sy = Math.random() * 360;
        const sr = Math.random() * 1.6 + 0.3;
        ctx.globalAlpha = 0.35 + Math.random() * 0.65;
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1.0;

      // 4. Radiant Silver Crescent Frost Moon
      const mx = 720, my = 110, mr = 38;
      const moonGlow = ctx.createRadialGradient(mx, my, mr * 0.4, mx, my, mr * 3.2);
      moonGlow.addColorStop(0, 'rgba(186, 230, 253, 0.5)');
      moonGlow.addColorStop(1, 'rgba(186, 230, 253, 0)');
      ctx.fillStyle = moonGlow;
      ctx.beginPath();
      ctx.arc(mx, my, mr * 3.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#f0f9ff';
      ctx.beginPath();
      ctx.arc(mx, my, mr, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(mx - 13, my - 5, mr * 0.92, 0, Math.PI * 2);
      ctx.fill();

      // 5. Jagged Frozen Mountain Peaks Silhouettes
      ctx.fillStyle = '#06101e';
      ctx.beginPath();
      ctx.moveTo(0, 512);
      for (let x = 0; x <= 1024; x += 12) {
        const peak = 405 + Math.sin(x * 0.026) * 42 + Math.cos(x * 0.009) * 38;
        ctx.lineTo(x, peak);
      }
      ctx.lineTo(1024, 512);
      ctx.closePath();
      ctx.fill();

    } else {
      // Imperial Sunset Gradient
      const grad = ctx.createLinearGradient(0, 512, 0, 0);
      grad.addColorStop(0.0, '#fdba74'); // Golden amber
      grad.addColorStop(0.2, '#f97316'); // Sunset orange
      grad.addColorStop(0.45, '#c084fc'); // Lavender transition
      grad.addColorStop(0.75, '#6366f1'); // Deep indigo
      grad.addColorStop(1.0, '#1e1b4b'); // Night sky apex
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1024, 512);

      // Distant mountain ridge silhouettes
      ctx.fillStyle = '#4a2820';
      ctx.beginPath();
      ctx.moveTo(0, 512);
      for (let x = 0; x <= 1024; x += 16) {
        const peak = 430 + Math.sin(x * 0.02) * 25 + Math.cos(x * 0.007) * 40;
        ctx.lineTo(x, peak);
      }
      ctx.lineTo(1024, 512);
      ctx.closePath();
      ctx.fill();
    }

    const skyTex = new THREE.CanvasTexture(canvas);
    const skyGeo = new THREE.SphereGeometry(140, 32, 16);
    const skyMat = new THREE.MeshBasicMaterial({
      map: skyTex,
      side: THREE.BackSide,
      fog: false
    });
    const skyMesh = new THREE.Mesh(skyGeo, skyMat);
    skyMesh.position.y = -10;
    this.skyRoot.add(skyMesh);
  }

  buildArena(type = 'COLOSSEUM') {
    if (type === 'GLACIER') {
      this.buildGlacierArena();
    } else {
      this.buildColosseumArena();
    }
  }

  // ==========================================
  // ARENA 1: IMPERIAL COLOSSEUM (SUNSET)
  // ==========================================
  buildColosseumArena() {
    this.buildFloors('COLOSSEUM');
    this.buildCenterEmblem('COLOSSEUM');
    this.buildOuterWalls('COLOSSEUM');
    this.buildColumnsAndCanopies('COLOSSEUM');
    this.buildElementalBanners('COLOSSEUM');
    this.buildPerimeterPedestals();
  }

  createStoneTileTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#8ea0bc';
    ctx.fillRect(0, 0, 512, 512);

    const tileSize = 64;
    ctx.lineWidth = 3;
    for (let x = 0; x < 512; x += tileSize) {
      for (let y = 0; y < 512; y += tileSize) {
        ctx.fillStyle = `rgba(0,0,0,${0.03 + Math.random() * 0.08})`;
        ctx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);
        ctx.strokeStyle = '#64748b';
        ctx.strokeRect(x, y, tileSize, tileSize);
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(12, 12);
    return tex;
  }

  createCourtTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    const cx = 512, cy = 512;

    // Golden Dojo Court Base
    ctx.fillStyle = '#f09e00';
    ctx.fillRect(0, 0, 1024, 1024);

    const grad = ctx.createRadialGradient(cx, cy, 80, cx, cy, 512);
    grad.addColorStop(0, 'rgba(254, 215, 170, 0.35)');
    grad.addColorStop(0.7, 'rgba(217, 119, 6, 0.25)');
    grad.addColorStop(1, 'rgba(180, 83, 9, 0.45)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 1024);

    // Outer martial boundary rings
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(cx, cy, 320, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.arc(cx, cy, 480, 0, Math.PI * 2);
    ctx.stroke();

    // Permanent Baked Center Yin-Yang (Taijitu) - 5m diameter on 22m court = 116px radius
    const r = Math.round((5.0 / 22.0) * 512);
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2, false);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy - r / 2, r / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(cx, cy + r / 2, r / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(cx, cy - r / 2, r / 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(cx, cy + r / 2, r / 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineWidth = 8;
    ctx.strokeStyle = '#b37d41';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = 3;
    ctx.strokeStyle = '#fde68a';
    ctx.beginPath();
    ctx.arc(cx, cy, r - 5, 0, Math.PI * 2);
    ctx.stroke();

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  buildFloors(type = 'COLOSSEUM') {
    // 1. Outer Ring (Radius 22m to 32m)
    const stoneTex = this.createStoneTileTexture();
    const outerGeo = new THREE.RingGeometry(22, 32, 64);
    const outerMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: stoneTex,
      roughness: 0.75,
      metalness: 0.1
    });
    const outerMesh = new THREE.Mesh(outerGeo, outerMat);
    outerMesh.rotation.x = -Math.PI / 2;
    outerMesh.receiveShadow = true;
    outerMesh.renderOrder = 0;
    this.arenaRoot.add(outerMesh);

    // 2. Inner Combat Court (Radius 22m) - Has Yin-Yang permanently baked into texture!
    const courtTex = this.createCourtTexture();
    const innerGeo = new THREE.CircleGeometry(22, 64);
    const innerMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: courtTex,
      roughness: 0.5,
      metalness: 0.15
    });
    const innerMesh = new THREE.Mesh(innerGeo, innerMat);
    innerMesh.rotation.x = -Math.PI / 2;
    innerMesh.position.y = 0.01;
    innerMesh.receiveShadow = true;
    innerMesh.renderOrder = 1;
    this.arenaRoot.add(innerMesh);

    // 3. Border Step
    const stepGeo = new THREE.TorusGeometry(22, 0.35, 16, 64);
    const stepMat = new THREE.MeshStandardMaterial({
      color: PALETTE.FLOOR_BORDER,
      roughness: 0.6
    });
    const stepMesh = new THREE.Mesh(stepGeo, stepMat);
    stepMesh.rotation.x = -Math.PI / 2;
    stepMesh.position.y = 0.15;
    this.arenaRoot.add(stepMesh);

    // 4. Ground Plane Collider
    this.colliders.push({
      type: 'PLANE',
      y: 0.0,
      radius: 32.0
    });
  }

  buildCenterEmblem(type = 'COLOSSEUM') {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    const cx = 512, cy = 512, r = 480;

    // Fill background with warm court color so material is 100% opaque (NO transparency sorting bugs)
    ctx.fillStyle = '#f09e00';
    ctx.fillRect(0, 0, 1024, 1024);

    // 10-meter diameter High-Definition Yin-Yang (Taijitu)
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2, false);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy - r / 2, r / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(cx, cy + r / 2, r / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(cx, cy - r / 2, r / 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(cx, cy + r / 2, r / 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineWidth = 28;
    ctx.strokeStyle = '#b37d41';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = 6;
    ctx.strokeStyle = '#fde68a';
    ctx.beginPath();
    ctx.arc(cx, cy, r - 20, 0, Math.PI * 2);
    ctx.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;

    const yyGeo = new THREE.CircleGeometry(5.0, 64);
    // SOLID OPAQUE with depthWrite: true - Permanently locked to floor, ZERO clipping or disappearance
    const yyMat = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.35,
      metalness: 0.2,
      transparent: false,
      depthWrite: true,
      polygonOffset: true,
      polygonOffsetFactor: -2.0,
      polygonOffsetUnits: -2.0
    });
    const yyMesh = new THREE.Mesh(yyGeo, yyMat);
    yyMesh.rotation.x = -Math.PI / 2;
    yyMesh.position.y = 0.035;
    yyMesh.receiveShadow = true;
    yyMesh.renderOrder = 2;
    this.arenaRoot.add(yyMesh);
  }

  buildOuterWalls(type = 'COLOSSEUM') {
    const wallRadius = 31.5;
    const wallHeight = 8.5;

    const wallGeo = new THREE.CylinderGeometry(wallRadius, wallRadius, wallHeight, 64, 1, true);
    const wallMat = new THREE.MeshStandardMaterial({
      color: PALETTE.WALL_STONE,
      roughness: 0.85,
      side: THREE.BackSide
    });
    const wallMesh = new THREE.Mesh(wallGeo, wallMat);
    wallMesh.position.y = wallHeight / 2;
    wallMesh.receiveShadow = true;
    this.arenaRoot.add(wallMesh);

    const corniceGeo = new THREE.TorusGeometry(wallRadius, 0.45, 16, 64);
    const corniceMat = new THREE.MeshStandardMaterial({
      color: PALETTE.WALL_STONE_DARK,
      roughness: 0.75
    });
    const corniceMesh = new THREE.Mesh(corniceGeo, corniceMat);
    corniceMesh.rotation.x = -Math.PI / 2;
    corniceMesh.position.y = wallHeight;
    this.arenaRoot.add(corniceMesh);

    this.colliders.push({
      type: 'CYLINDER_BOUND',
      radius: wallRadius - 0.5,
      height: wallHeight
    });
  }

  buildColumnsAndCanopies(type = 'COLOSSEUM') {
    const numColumns = 12;
    const colRadius = 26.5;

    const columnMat = new THREE.MeshStandardMaterial({
      color: PALETTE.COLUMN_JADE,
      roughness: 0.4,
      metalness: 0.3
    });

    const goldMat = new THREE.MeshStandardMaterial({
      color: PALETTE.PAGODA_GOLD,
      roughness: 0.4,
      metalness: 0.4
    });

    for (let i = 0; i < numColumns; i++) {
      const angle = (i / numColumns) * Math.PI * 2;
      const x = Math.cos(angle) * colRadius;
      const z = Math.sin(angle) * colRadius;

      const colGeo = new THREE.CylinderGeometry(0.85, 0.95, 10.0, 16);
      const colMesh = new THREE.Mesh(colGeo, columnMat);
      colMesh.position.set(x, 5.0, z);
      colMesh.castShadow = true;
      colMesh.receiveShadow = true;
      this.arenaRoot.add(colMesh);

      const baseGeo = new THREE.CylinderGeometry(1.2, 1.3, 0.8, 16);
      const baseMesh = new THREE.Mesh(baseGeo, goldMat);
      baseMesh.position.set(x, 0.4, z);
      this.arenaRoot.add(baseMesh);

      const capGeo = new THREE.CylinderGeometry(1.3, 1.15, 0.8, 16);
      const capMesh = new THREE.Mesh(capGeo, goldMat);
      capMesh.position.set(x, 9.6, z);
      this.arenaRoot.add(capMesh);

      this.colliders.push({
        type: 'CYLINDER',
        x, z,
        radius: 1.0,
        height: 10.0
      });
    }

    // Pagoda Canopy Ring
    const roofOuterR = 29.5;
    const roofInnerR = 24.5;
    const roofGeo = new THREE.RingGeometry(roofInnerR, roofOuterR, 48);
    const roofMat = new THREE.MeshStandardMaterial({
      color: 0x991b1b,
      roughness: 0.6,
      side: THREE.DoubleSide
    });
    const roofMesh = new THREE.Mesh(roofGeo, roofMat);
    roofMesh.rotation.x = -Math.PI / 2;
    roofMesh.position.y = 10.2;
    roofMesh.castShadow = true;
    this.arenaRoot.add(roofMesh);

    const fasciaGeo = new THREE.CylinderGeometry(roofOuterR, roofOuterR, 1.2, 48, 1, true);
    const fasciaMat = new THREE.MeshStandardMaterial({
      color: PALETTE.PAGODA_GOLD,
      roughness: 0.35,
      metalness: 0.5
    });
    const fasciaMesh = new THREE.Mesh(fasciaGeo, fasciaMat);
    fasciaMesh.position.y = 10.0;
    this.arenaRoot.add(fasciaMesh);
  }

  buildElementalBanners(type = 'COLOSSEUM') {
    const bannerConfigs = [
      { angle: 0, element: 'FIRE', color: PALETTE.BANNER_FIRE, char: '火' },
      { angle: Math.PI / 2, element: 'WATER', color: PALETTE.BANNER_WATER, char: '水' },
      { angle: Math.PI, element: 'EARTH', color: PALETTE.BANNER_EARTH, char: '土' },
      { angle: (3 * Math.PI) / 2, element: 'AIR', color: PALETTE.BANNER_AIR, char: '風' }
    ];

    const bannerRadius = 26.2;
    for (const b of bannerConfigs) {
      const x = Math.cos(b.angle) * bannerRadius;
      const z = Math.sin(b.angle) * bannerRadius;

      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 1024;
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#' + b.color.toString(16).padStart(6, '0');
      ctx.fillRect(0, 0, 256, 1024);

      ctx.strokeStyle = '#fcd34d';
      ctx.lineWidth = 12;
      ctx.strokeRect(16, 16, 224, 992);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 120px "Cinzel Decorative", serif';
      ctx.textAlign = 'center';
      ctx.fillText(b.char, 128, 480);

      const bannerTex = new THREE.CanvasTexture(canvas);
      const bannerGeo = new THREE.PlaneGeometry(2.4, 7.5);
      const bannerMat = new THREE.MeshStandardMaterial({
        map: bannerTex,
        roughness: 0.8,
        side: THREE.DoubleSide
      });
      const bannerMesh = new THREE.Mesh(bannerGeo, bannerMat);
      bannerMesh.position.set(x, 5.2, z);
      bannerMesh.rotation.y = -b.angle - Math.PI / 2;
      this.arenaRoot.add(bannerMesh);
    }
  }

  // Authentic carved dragon perimeter pedestals (completely leaving the center floor open!)
  buildPerimeterPedestals() {
    const pedMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.8,
      metalness: 0.2
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: PALETTE.PAGODA_GOLD,
      roughness: 0.3,
      metalness: 0.6
    });

    const positions = [
      { x: 19.5, z: 12.0 },
      { x: -19.5, z: 12.0 },
      { x: 19.5, z: -12.0 },
      { x: -19.5, z: -12.0 }
    ];

    positions.forEach((p) => {
      const baseGeo = new THREE.CylinderGeometry(0.7, 0.85, 1.1, 8);
      const baseMesh = new THREE.Mesh(baseGeo, pedMat);
      baseMesh.position.set(p.x, 0.55, p.z);
      baseMesh.castShadow = true;
      baseMesh.receiveShadow = true;
      this.arenaRoot.add(baseMesh);

      const bowlGeo = new THREE.CylinderGeometry(0.85, 0.55, 0.45, 8);
      const bowlMesh = new THREE.Mesh(bowlGeo, goldMat);
      bowlMesh.position.set(p.x, 1.25, p.z);
      this.arenaRoot.add(bowlMesh);

      // Warm brazier flame light
      const fireLight = new THREE.PointLight(0xf59e0b, 0.8, 8.0);
      fireLight.position.set(p.x, 1.7, p.z);
      this.arenaRoot.add(fireLight);

      this.colliders.push({
        type: 'CYLINDER',
        x: p.x, z: p.z,
        radius: 0.85,
        height: 1.5
      });
    });
  }

  // ==========================================
  // ARENA 2: BOREAL GLACIER CHASM (FROZEN SANCTUARY)
  // ==========================================
  buildGlacierArena() {
    this.buildGlacierFloors();
    this.buildGlacierCenterEmblem();
    this.buildGlacierIceSpires();
    this.buildGlacierIceArches();
    this.buildGlacierFloatingCrystals();
    this.buildGlacierWeatherSystem();
  }

  createGlacierIceTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Deep crystalline ocean ice blue
    ctx.fillStyle = '#0369a1';
    ctx.fillRect(0, 0, 512, 512);

    // Glacial rift texture
    const grad = ctx.createLinearGradient(0, 0, 512, 512);
    grad.addColorStop(0, '#0284c7');
    grad.addColorStop(0.5, '#0369a1');
    grad.addColorStop(1, '#075985');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Intricate frost fracture cracks
    ctx.strokeStyle = '#bae6fd';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 28; i++) {
      ctx.beginPath();
      let cx = Math.random() * 512;
      let cy = Math.random() * 512;
      ctx.moveTo(cx, cy);
      for (let s = 0; s < 4; s++) {
        cx += (Math.random() - 0.5) * 80;
        cy += (Math.random() - 0.5) * 80;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(8, 8);
    return tex;
  }

  createGlacierCourtTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    const cx = 512, cy = 512;

    // Polished deep glacial court
    ctx.fillStyle = '#082f49';
    ctx.fillRect(0, 0, 1024, 1024);

    const grad = ctx.createRadialGradient(cx, cy, 60, cx, cy, 512);
    grad.addColorStop(0, 'rgba(56, 189, 248, 0.45)');
    grad.addColorStop(0.7, 'rgba(3, 105, 161, 0.65)');
    grad.addColorStop(1, 'rgba(2, 6, 23, 0.95)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 1024);

    // Glowing ancient frost runes
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(cx, cy, 340, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#e0f2fe';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, 460, 0, Math.PI * 2);
    ctx.stroke();

    // 8 radial ice compass lines
    ctx.strokeStyle = 'rgba(186, 230, 253, 0.5)';
    ctx.lineWidth = 4;
    for (let a = 0; a < 8; a++) {
      const ang = (a / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ang) * 180, cy + Math.sin(ang) * 180);
      ctx.lineTo(cx + Math.cos(ang) * 460, cy + Math.sin(ang) * 460);
      ctx.stroke();
    }

    // Permanent Baked Center Glacier Mandala
    const r = Math.round((5.2 / 22.0) * 512);
    ctx.fillStyle = '#020e1f';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineWidth = 6;
    ctx.strokeStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(cx, cy, r - 8, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#e0f2fe';
    ctx.lineWidth = 4;
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(ang) * (r - 12), cy + Math.sin(ang) * (r - 12));
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  buildGlacierFloors() {
    // 1. Outer Glacial Rift (Radius 22m to 33m)
    const iceTex = this.createGlacierIceTexture();
    const outerGeo = new THREE.RingGeometry(22, 33, 64);
    const outerMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: iceTex,
      roughness: 0.18,
      metalness: 0.25
    });
    const outerMesh = new THREE.Mesh(outerGeo, outerMat);
    outerMesh.rotation.x = -Math.PI / 2;
    outerMesh.receiveShadow = true;
    outerMesh.renderOrder = 0;
    this.arenaRoot.add(outerMesh);

    // 2. Inner Polished Glacier Court (Radius 22m) - Mandala permanently baked into texture!
    const courtTex = this.createGlacierCourtTexture();
    const innerGeo = new THREE.CircleGeometry(22, 64);
    const innerMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: courtTex,
      roughness: 0.12,
      metalness: 0.35
    });
    const innerMesh = new THREE.Mesh(innerGeo, innerMat);
    innerMesh.rotation.x = -Math.PI / 2;
    innerMesh.position.y = 0.01;
    innerMesh.receiveShadow = true;
    innerMesh.renderOrder = 1;
    this.arenaRoot.add(innerMesh);

    // 3. Radiant Frost Border Ring
    const borderGeo = new THREE.TorusGeometry(22, 0.4, 16, 64);
    const borderMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.7,
      roughness: 0.15,
      metalness: 0.3
    });
    const borderMesh = new THREE.Mesh(borderGeo, borderMat);
    borderMesh.rotation.x = -Math.PI / 2;
    borderMesh.position.y = 0.15;
    this.arenaRoot.add(borderMesh);

    this.colliders.push({
      type: 'PLANE',
      y: 0.0,
      radius: 33.0
    });
  }

  buildGlacierCenterEmblem() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    const cx = 512, cy = 512, r = 480;

    // Fill background with court ice color so material is 100% solid and opaque
    ctx.fillStyle = '#082f49';
    ctx.fillRect(0, 0, 1024, 1024);

    // Glowing Glacial Mandala / Snowflake Emblem
    ctx.fillStyle = '#020e1f';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // Luminous Outer Ring
    ctx.lineWidth = 20;
    ctx.strokeStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(cx, cy, r - 30, 0, Math.PI * 2);
    ctx.stroke();

    // 6-Pointed Master Crystal Star
    ctx.strokeStyle = '#e0f2fe';
    ctx.lineWidth = 14;
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      const ex = cx + Math.cos(ang) * 400;
      const ey = cy + Math.sin(ang) * 400;
      ctx.lineTo(ex, ey);
      ctx.stroke();

      // Branching frost feathers
      for (let b = 1; b <= 3; b++) {
        const d = b * 100;
        const bx = cx + Math.cos(ang) * d;
        const by = cy + Math.sin(ang) * d;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + Math.cos(ang + 0.6) * 60, by + Math.sin(ang + 0.6) * 60);
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + Math.cos(ang - 0.6) * 60, by + Math.sin(ang - 0.6) * 60);
        ctx.stroke();
      }
    }

    // Glowing Cyan Core
    ctx.fillStyle = '#bae6fd';
    ctx.beginPath();
    ctx.arc(cx, cy, 75, 0, Math.PI * 2);
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;

    const yyGeo = new THREE.CircleGeometry(5.2, 64);
    // SOLID OPAQUE with depthWrite: true - Permanently locked to floor, ZERO clipping or disappearance
    const yyMat = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.15,
      metalness: 0.35,
      transparent: false,
      depthWrite: true,
      polygonOffset: true,
      polygonOffsetFactor: -2.0,
      polygonOffsetUnits: -2.0
    });
    const yyMesh = new THREE.Mesh(yyGeo, yyMat);
    yyMesh.rotation.x = -Math.PI / 2;
    yyMesh.position.y = 0.035;
    yyMesh.receiveShadow = true;
    yyMesh.renderOrder = 2;
    this.arenaRoot.add(yyMesh);
  }

  // 16 Towering Jagged Glacial Spires framing the chasm boundary
  buildGlacierIceSpires() {
    const numSpires = 16;
    const spireRadius = 27.5;

    const spireMat = new THREE.MeshStandardMaterial({
      color: 0x93c5fd,
      emissive: 0x0284c7,
      emissiveIntensity: 0.45,
      roughness: 0.12,
      metalness: 0.25,
      transparent: true,
      opacity: 0.88
    });

    const frostTipMat = new THREE.MeshBasicMaterial({
      color: 0xf0f9ff,
      transparent: true,
      opacity: 0.95
    });

    for (let i = 0; i < numSpires; i++) {
      const angle = (i / numSpires) * Math.PI * 2;
      const x = Math.cos(angle) * spireRadius;
      const z = Math.sin(angle) * spireRadius;

      const height = 15.0 + Math.sin(i * 1.8) * 4.5;
      const spireGeo = new THREE.CylinderGeometry(0.3, 2.4, height, 5);
      const spireMesh = new THREE.Mesh(spireGeo, spireMat);
      spireMesh.position.set(x, height / 2, z);
      spireMesh.rotation.set(
        Math.cos(angle) * 0.12,
        angle + (i * 0.4),
        Math.sin(angle) * 0.12
      );
      spireMesh.castShadow = true;
      spireMesh.receiveShadow = true;
      this.arenaRoot.add(spireMesh);

      // Frost Cap on peak
      const capGeo = new THREE.ConeGeometry(0.65, 3.2, 5);
      const capMesh = new THREE.Mesh(capGeo, frostTipMat);
      capMesh.position.set(x, height - 0.4, z);
      this.arenaRoot.add(capMesh);

      // Cold sapphire bioluminescent point light on alternate spires
      if (i % 2 === 0) {
        const iceLight = new THREE.PointLight(0x38bdf8, 1.2, 12.0);
        iceLight.position.set(x * 0.92, 5.5, z * 0.92);
        this.arenaRoot.add(iceLight);
      }

      this.colliders.push({
        type: 'CYLINDER',
        x, z,
        radius: 2.2,
        height
      });
    }

    // Outer invisible boundary collision ring
    this.colliders.push({
      type: 'CYLINDER_BOUND',
      radius: spireRadius - 0.5,
      height: 20.0
    });
  }

  // Monumental Frozen Ice Torii Arches at North (Z=22) and South (Z=-22)
  buildGlacierIceArches() {
    const archMat = new THREE.MeshStandardMaterial({
      color: 0x7dd3fc,
      emissive: 0x0369a1,
      emissiveIntensity: 0.5,
      roughness: 0.1,
      metalness: 0.3,
      transparent: true,
      opacity: 0.9
    });

    const goldTrimMat = new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.6,
      roughness: 0.2
    });

    const gates = [
      { z: 22.5, rotY: 0 },
      { z: -22.5, rotY: Math.PI }
    ];

    gates.forEach((g) => {
      const gateGroup = new THREE.Group();

      // Left & Right Pillars
      const pGeo = new THREE.BoxGeometry(1.2, 11.0, 1.2);
      const pLeft = new THREE.Mesh(pGeo, archMat);
      pLeft.position.set(-5.5, 5.5, 0);
      pLeft.castShadow = true;
      gateGroup.add(pLeft);

      const pRight = new THREE.Mesh(pGeo, archMat);
      pRight.position.set(5.5, 5.5, 0);
      pRight.castShadow = true;
      gateGroup.add(pRight);

      // Curved Crossbeam Top
      const beamGeo = new THREE.BoxGeometry(15.0, 1.2, 1.6);
      const beam = new THREE.Mesh(beamGeo, archMat);
      beam.position.set(0, 10.5, 0);
      beam.castShadow = true;
      gateGroup.add(beam);

      // Frost Crest Trim
      const trimGeo = new THREE.BoxGeometry(16.2, 0.4, 1.8);
      const trim = new THREE.Mesh(trimGeo, goldTrimMat);
      trim.position.set(0, 11.2, 0);
      gateGroup.add(trim);

      gateGroup.position.set(0, 0, g.z);
      gateGroup.rotation.y = g.rotY;
      this.arenaRoot.add(gateGroup);
    });
  }

  // 8 Floating Crystalline Ice Shards around the arena
  buildGlacierFloatingCrystals() {
    const shardGeo = new THREE.OctahedronGeometry(1.1, 0);
    const shardMat = new THREE.MeshStandardMaterial({
      color: 0xbae6fd,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.65,
      roughness: 0.08,
      metalness: 0.4,
      transparent: true,
      opacity: 0.92
    });

    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + 0.39;
      const dist = 18.5;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      const y = 3.5 + Math.sin(i) * 1.2;

      const shard = new THREE.Mesh(shardGeo, shardMat);
      shard.position.set(x, y, z);
      shard.scale.set(0.8, 1.8, 0.8);
      this.arenaRoot.add(shard);

      this.floatingShards.push({
        mesh: shard,
        baseY: y,
        speed: 1.2 + Math.random() * 0.8,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  // Real-Time Blizzard / Falling Snow Flurry System
  buildGlacierWeatherSystem() {
    const particleCount = 280;
    const positions = new Float32Array(particleCount * 3);
    const velocities = [];

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 60;
      positions[i * 3 + 1] = Math.random() * 22;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 60;

      velocities.push({
        x: (Math.random() - 0.5) * 1.5,
        y: -1.2 - Math.random() * 1.8,
        z: (Math.random() - 0.5) * 1.5
      });
    }

    this.snowGeo = new THREE.BufferGeometry();
    this.snowGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const snowMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.28,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });

    this.snowParticles = new THREE.Points(this.snowGeo, snowMat);
    this.arenaRoot.add(this.snowParticles);
    this.snowVelocities = velocities;
  }

  // Per-Frame Animation Update
  update(dt = 0.016) {
    const now = Date.now() * 0.001;

    // 1. Animate Floating Shards (Gentle bobbing and spinning)
    for (const s of this.floatingShards) {
      if (s.mesh) {
        s.mesh.position.y = s.baseY + Math.sin(now * s.speed + s.phase) * 0.35;
        s.mesh.rotation.y += dt * 0.8;
        s.mesh.rotation.x = Math.sin(now * 0.5) * 0.15;
      }
    }

    // 2. Animate Falling Snow Flurry
    if (this.snowGeo && this.snowVelocities) {
      const pos = this.snowGeo.attributes.position.array;
      for (let i = 0; i < this.snowVelocities.length; i++) {
        const v = this.snowVelocities[i];
        pos[i * 3 + 0] += v.x * dt;
        pos[i * 3 + 1] += v.y * dt;
        pos[i * 3 + 2] += v.z * dt;

        // Reset snow particles when hitting ground
        if (pos[i * 3 + 1] < 0.1) {
          pos[i * 3 + 1] = 20.0 + Math.random() * 2.0;
          pos[i * 3 + 0] = (Math.random() - 0.5) * 60;
          pos[i * 3 + 2] = (Math.random() - 0.5) * 60;
        }
      }
      this.snowGeo.attributes.position.needsUpdate = true;
    }
  }
}
