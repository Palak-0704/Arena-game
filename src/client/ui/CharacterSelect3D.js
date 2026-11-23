// Flowbound: Masters of Four - Premium 3D Character Selection Experience
// Features authentic 3D fighters standing on glowing circular display platforms,
// studio lighting (key, fill, rim), element-specific particle auras, smooth camera transitions,
// and full calligraphic master profiles.

import * as THREE from 'three';
import { CharacterModel } from '../entities/CharacterModel.js';

export const FIGHTER_ROSTER = [
  {
    id: 'WATER',
    name: 'WHOISCOBRAA',
    kanji: '水',
    kanjiColor: '#38bdf8',
    title: 'MASTER OF THE FLOWING TIDE',
    role: 'WATER · FLUID MOBILITY & ZONE CONTROL',
    style: 'Tai Chi Chuan · Fluid Momentum',
    desc: 'Master of spatial momentum and fluid martial arts. Surfaces continuous ice ramps to skate across the arena, launches into high-angle aerial dives, and controls distance with triple water whip slash combos.',
    stats: { mobility: 95, defense: 70, range: 85, power: 75 },
    modelFile: '/models/Dark_Shinobi.glb',
    themeColor: 0x38bdf8,
    spotColor: 0x60a5fa,
    ringColor: 0x0284c7,
    abilities: [
      { name: 'Water Whip', key: 'LMB', desc: '3-hit fluid slash string (70 total dmg)' },
      { name: 'Ice Surfing', key: 'Shift', desc: 'Extrudes frictionless speed ramps' },
      { name: 'Water Chakrams', key: 'E', desc: 'Twin homing diving rings (60 dmg)' },
      { name: 'Ice Wall Palisade', key: 'Q', desc: 'Curved trapping barrier (250 HP)' }
    ]
  },
  {
    id: 'EARTH',
    name: 'PCNASTYX',
    kanji: '土',
    kanjiColor: '#86efac',
    title: 'THE BEDROCK BRAWLER',
    role: 'EARTH · HEAVY POISE & CRUSHING IMPACT',
    style: 'Hung Gar · Grounded Power',
    desc: 'Stoic powerhouse of the mountain. Carries sacred sandalwood prayer beads and a brass dragon medallion. Erects climbable basalt monoliths, shatters ice ramps with 1.2m boulder kicks, and cracks the earth with seismic fissures.',
    stats: { mobility: 60, defense: 95, range: 70, power: 95 },
    modelFile: '/models/Earth_Monk.glb',
    themeColor: 0x86efac,
    spotColor: 0x4ade80,
    ringColor: 0x166534,
    abilities: [
      { name: 'Boulder Kick', key: 'LMB', desc: 'Kicks 1.2m rock, breaking ramps (55 dmg)' },
      { name: 'Stone Guard Spires', key: 'Q', desc: 'Erects 4 climbable basalt monoliths (400 HP)' },
      { name: 'Shard Volley', key: 'E', desc: 'Rapid 3-spike cone blast (36 dmg)' },
      { name: 'Seismic Fissure', key: 'M4', desc: 'Ground slam launching targets 4m high' }
    ]
  },
  {
    id: 'FIRE',
    name: 'IGNIS',
    kanji: '火',
    kanjiColor: '#f87171',
    title: 'THE CRIMSON FLAME',
    role: 'FIRE · AGGRESSIVE PACE & GUARD BREAKER',
    style: 'Northern Shaolin · Explosive Pressure',
    desc: 'Relentless duel-master clad in dragon-embroidered crimson armor and flowing flame sash. Overwhelms opponent guards with rapid martial strikes, incinerates barriers with supersonic heat beams, and releases concussive 360° firestorms.',
    stats: { mobility: 85, defense: 65, range: 75, power: 90 },
    modelFile: '/models/Samurai_Fire.glb',
    themeColor: 0xf87171,
    spotColor: 0xf87171,
    ringColor: 0xb91c1c,
    abilities: [
      { name: 'Fire Strikes', key: 'LMB', desc: 'Rapid 4-hit martial combo (67 total dmg)' },
      { name: 'Finger Blast', key: 'E', desc: 'Supersonic 55m/s thermal beam (45 dmg)' },
      { name: 'Crown of Fire', key: 'Q', desc: 'Melts ice and burns projectiles' },
      { name: 'Simon’s Rage', key: 'M4', desc: '360° point-blank concussive stun (35 dmg)' }
    ]
  },
  {
    id: 'AIR',
    name: 'ZEPHYR',
    kanji: '風',
    kanjiColor: '#cbd5e1',
    title: 'MASTER OF THE CELESTIAL WIND',
    role: 'AIR · EVASIVE SLIP & AERIAL DISPLACER',
    style: 'Baguazhang · Kinetic Redirection',
    desc: 'Graceful martial arts master moving with fluid, untraceable evasion. Glides between incoming strikes with effortless slips, bends compressed air currents around cover, and suspends opponents in rising gale vortexes.',
    stats: { mobility: 100, defense: 60, range: 80, power: 70 },
    modelFile: '/models/Kachujin_G_Rosales.glb',
    themeColor: 0xe0f2fe,
    spotColor: 0x93c5fd,
    ringColor: 0x0284c7,
    abilities: [
      { name: 'Air Palm Blades', key: 'LMB', desc: 'Slices of compressed wind with pushback' },
      { name: 'The Curve', key: 'E', desc: 'Bends wind sphere around cover (30 dmg)' },
      { name: 'Wind Guard', key: 'Q', desc: 'Hemispherical dome reflecting boulders' },
      { name: 'Tornado Field', key: 'M4', desc: 'Suspends opponents in air for 1.5s' }
    ]
  }
];

export class CharacterSelect3D {
  constructor(scene, camera, onConfirmCallback) {
    this.scene = scene;
    this.camera = camera;
    this.onConfirm = onConfirmCallback;
    this.selectedIndex = 0;
    this.targetCameraX = 0;
    this.currentCameraX = 0;
    this.isActive = false;
    this.customPlayerName = localStorage.getItem('flowbound_player_name') || 'DRAGON_FIST';

    this.group = new THREE.Group();
    this.group.name = 'CharacterSelect3D_Group';
    this.group.position.set(0, 200, 0); // Elevated studio stage, isolated from arena
    this.group.visible = false;
    this.scene.add(this.group);

    this.platforms = [];
    this.fighterModels = [];
    this.particleSystems = [];

    this.setupStudioEnvironment();
    this.buildPlatformsAndFighters();
    this.buildOverlayUI();
    this.setupInputListeners();
  }

  setupStudioEnvironment() {
    // Studio Backdrop (Curved dark cyclorama floor)
    const floorGeo = new THREE.CylinderGeometry(40, 40, 0.4, 64);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x090d16,
      roughness: 0.75,
      metalness: 0.25
    });
    this.studioFloor = new THREE.Mesh(floorGeo, floorMat);
    this.studioFloor.position.set(0, -0.2, 0);
    this.studioFloor.receiveShadow = true;
    this.group.add(this.studioFloor);

    // Studio Ambient Light (Warm natural white for authentic skin & armor tones)
    this.ambientLight = new THREE.AmbientLight(0xfffaed, 2.2);
    this.group.add(this.ambientLight);

    // Dynamic Key Spotlight (Focuses on selected character)
    this.spotLight = new THREE.SpotLight(0xfffaed, 5.0, 35, Math.PI / 4.0, 0.45, 1.2);
    this.spotLight.position.set(0, 7.5, 5);
    this.spotLight.castShadow = true;
    this.spotLight.shadow.mapSize.width = 2048;
    this.spotLight.shadow.mapSize.height = 2048;
    this.spotLight.shadow.bias = -0.0003;
    this.spotLight.shadow.normalBias = 0.035;
    this.spotLight.shadow.radius = 3.5;
    this.group.add(this.spotLight);
    this.spotLightTarget = new THREE.Object3D();
    this.group.add(this.spotLightTarget);
    this.spotLight.target = this.spotLightTarget;

    // Dedicated Front Fill Light for crisp chest, armor, and facial lighting
    this.frontFill = new THREE.DirectionalLight(0xfff5ea, 2.5);
    this.frontFill.position.set(0, 3.5, 5.0);
    this.group.add(this.frontFill);

    // Rim Backlight (Accentuates silhouette)
    this.rimLight = new THREE.DirectionalLight(0xa5b4fc, 2.5);
    this.rimLight.position.set(0, 4.5, -6);
    this.group.add(this.rimLight);
  }

  buildPlatformsAndFighters() {
    const spacing = 7.0; // Distance between platforms

    FIGHTER_ROSTER.forEach((fighter, idx) => {
      const posX = (idx - 1.5) * spacing;

      // 1. Circular Display Pedestal
      const platformGroup = new THREE.Group();
      platformGroup.position.set(posX, 0, 0);

      // Base Pedestal Tier 1
      const baseGeo = new THREE.CylinderGeometry(1.6, 1.8, 0.35, 48);
      const baseMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.5,
        metalness: 0.4
      });
      const baseMesh = new THREE.Mesh(baseGeo, baseMat);
      baseMesh.position.y = 0.175;
      baseMesh.receiveShadow = true;
      platformGroup.add(baseMesh);

      // Upper Tier with Polished Dark Granite
      const topGeo = new THREE.CylinderGeometry(1.4, 1.4, 0.1, 48);
      const topMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        roughness: 0.25,
        metalness: 0.6
      });
      const topMesh = new THREE.Mesh(topGeo, topMat);
      topMesh.position.y = 0.40;
      topMesh.receiveShadow = true;
      platformGroup.add(topMesh);

      // Glowing Elemental Enso Ring
      const ringGeo = new THREE.RingGeometry(1.25, 1.35, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: fighter.ringColor,
        side: THREE.DoubleSide
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = -Math.PI / 2;
      ringMesh.position.y = 0.46;
      platformGroup.add(ringMesh);

      // Floating Elemental Particle System around platform
      const particleGeo = new THREE.BufferGeometry();
      const pCount = 36;
      const posArray = new Float32Array(pCount * 3);
      for (let i = 0; i < pCount; i++) {
        const theta = Math.random() * Math.PI * 2;
        const rad = 0.8 + Math.random() * 0.7;
        posArray[i * 3 + 0] = Math.cos(theta) * rad;
        posArray[i * 3 + 1] = 0.45 + Math.random() * 1.8;
        posArray[i * 3 + 2] = Math.sin(theta) * rad;
      }
      particleGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
      const particleMat = new THREE.PointsMaterial({
        color: fighter.themeColor,
        size: 0.06,
        transparent: true,
        opacity: 0.8
      });
      const particles = new THREE.Points(particleGeo, particleMat);
      platformGroup.add(particles);
      this.particleSystems.push({ mesh: particles, speed: 0.4 + Math.random() * 0.4 });

      this.group.add(platformGroup);
      this.platforms.push({ group: platformGroup, posX });

      // 2. 3D Character Model standing on platform
      const charModel = new CharacterModel(fighter.id);
      charModel.group.position.set(posX, 0.46, 0); // Position firmly on platform surface
      charModel.group.rotation.y = 0; // Face forward towards camera
      this.group.add(charModel.group);
      this.fighterModels.push(charModel);
    });
  }

  buildOverlayUI() {
    this.uiContainer = document.createElement('div');
    this.uiContainer.id = 'char-select-3d-ui';
    document.body.appendChild(this.uiContainer);

    this.injectStyles();
    this.updateCardContent();
  }

  injectStyles() {
    const style = document.createElement('style');
    style.innerHTML = `
      #char-select-3d-ui {
        position: fixed;
        top: 0; left: 0;
        width: 100vw; height: 100vh;
        pointer-events: none;
        user-select: none;
        z-index: 1500;
        font-family: 'Cinzel', serif;
        display: none;
      }

      #char-select-3d-ui.active {
        display: block;
      }

      /* Top Title Header */
      .cs-header {
        position: absolute;
        top: 24px;
        left: 50%;
        transform: translateX(-50%);
        text-align: center;
      }

      .cs-main-title {
        font-family: 'Cinzel Decorative', serif;
        font-size: 36px;
        font-weight: 900;
        letter-spacing: 5px;
        background: linear-gradient(180deg, #fef08a 0%, #f59e0b 50%, #b45309 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        text-shadow: 0 4px 18px rgba(245, 158, 11, 0.4);
        margin: 0 0 6px 0;
      }

      .cs-sub-title {
        font-size: 13px;
        letter-spacing: 3px;
        color: #94a3b8;
        text-transform: uppercase;
      }

      /* Navigation Arrows */
      .cs-nav-btn {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        pointer-events: auto;
        background: rgba(15, 23, 42, 0.75);
        border: 2px solid rgba(255, 255, 255, 0.2);
        color: #f8fafc;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 26px;
        cursor: pointer;
        transition: all 0.25s ease;
        backdrop-filter: blur(8px);
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6);
      }

      .cs-nav-btn:hover {
        background: #38bdf8;
        border-color: #38bdf8;
        color: #09090b;
        transform: translateY(-50%) scale(1.1);
        box-shadow: 0 0 24px rgba(56, 189, 248, 0.7);
      }

      .cs-nav-left { left: 40px; z-index: 150; }
      .cs-nav-right { right: 380px; z-index: 150; }

      @media (max-width: 1280px) {
        .cs-nav-right { right: 360px; }
      }

      @media (max-width: 1024px) {
        .cs-nav-right { right: 330px; }
      }

      .cs-quick-nav-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: rgba(30, 41, 59, 0.7);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 6px;
        padding: 6px 12px;
        margin-bottom: 14px;
      }

      .cs-quick-nav-btn {
        background: rgba(15, 23, 42, 0.9);
        border: 1px solid #38bdf8;
        color: #f8fafc;
        font-family: 'Cinzel', serif;
        font-size: 11px;
        font-weight: bold;
        letter-spacing: 1px;
        padding: 5px 10px;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .cs-quick-nav-btn:hover {
        background: #38bdf8;
        color: #09090b;
        box-shadow: 0 0 12px #38bdf8;
      }

      .cs-quick-counter {
        font-size: 12px;
        font-weight: bold;
        color: #fde68a;
        letter-spacing: 2px;
      }

      /* Character Profile Card (Right Side) */
      .cs-profile-card {
        position: absolute;
        right: 28px;
        top: 60px;
        width: 315px;
        max-height: calc(100vh - 80px);
        overflow-y: auto;
        background: rgba(15, 23, 42, 0.92);
        border: 1px solid rgba(255, 255, 255, 0.18);
        border-radius: 8px;
        padding: 20px 24px;
        backdrop-filter: blur(12px);
        box-shadow: 0 16px 40px rgba(0, 0, 0, 0.85);
        pointer-events: auto;
        z-index: 50;
        animation: fadeInCard 0.35s ease;
        box-sizing: border-box;
      }

      .cs-profile-card::-webkit-scrollbar {
        width: 6px;
      }

      .cs-profile-card::-webkit-scrollbar-thumb {
        background: rgba(56, 189, 248, 0.4);
        border-radius: 3px;
      }

      /* Callsign Input Box */
      .cs-callsign-box {
        margin-bottom: 12px;
        background: rgba(30, 41, 59, 0.7);
        border: 1px solid rgba(254, 240, 138, 0.35);
        border-radius: 6px;
        padding: 8px 12px;
        box-shadow: inset 0 2px 6px rgba(0,0,0,0.4);
      }

      .cs-callsign-label {
        display: block;
        font-family: 'Cinzel', serif;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 2px;
        color: #fde68a;
        margin-bottom: 4px;
      }

      .cs-callsign-input-wrap {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .cs-callsign-input {
        flex: 1;
        background: rgba(15, 23, 42, 0.85);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 4px;
        color: #f8fafc;
        font-family: 'Rajdhani', sans-serif;
        font-size: 15px;
        font-weight: 700;
        letter-spacing: 2px;
        padding: 6px 10px;
        outline: none;
        text-transform: uppercase;
        transition: all 0.2s ease;
      }

      .cs-callsign-input:focus {
        border-color: #38bdf8;
        box-shadow: 0 0 12px rgba(56, 189, 248, 0.5);
      }

      .cs-callsign-icon {
        color: #fde68a;
        font-size: 14px;
      }

      @keyframes fadeInCard {
        from { opacity: 0; transform: translateX(20px); }
        to { opacity: 1; transform: translateX(0); }
      }

      .cs-card-header {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 12px;
      }

      .cs-kanji {
        font-size: 48px;
        font-weight: 900;
        line-height: 1;
        text-shadow: 0 0 16px currentColor;
      }

      .cs-name-box {
        display: flex;
        flex-direction: column;
      }

      .cs-name {
        font-family: 'Cinzel Decorative', serif;
        font-size: 26px;
        font-weight: 800;
        color: #f8fafc;
        letter-spacing: 2px;
      }

      .cs-title {
        font-size: 11px;
        letter-spacing: 2px;
        color: #f59e0b;
        font-weight: bold;
      }

      .cs-role {
        font-size: 12px;
        color: #94a3b8;
        letter-spacing: 1px;
        margin-bottom: 14px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        padding-bottom: 8px;
      }

      .cs-desc {
        font-family: 'Rajdhani', sans-serif;
        font-size: 14px;
        color: #cbd5e1;
        line-height: 1.5;
        margin-bottom: 18px;
      }

      /* Stats Bars */
      .cs-stats-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px 16px;
        margin-bottom: 18px;
      }

      .cs-stat-item {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .cs-stat-label {
        font-size: 10px;
        letter-spacing: 1px;
        color: #94a3b8;
      }

      .cs-stat-bar-bg {
        width: 100%;
        height: 6px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 3px;
        overflow: hidden;
      }

      .cs-stat-bar-fill {
        height: 100%;
        border-radius: 3px;
        transition: width 0.4s ease;
      }

      /* Abilities List */
      .cs-abilities-title {
        font-size: 12px;
        letter-spacing: 2px;
        color: #f8fafc;
        margin-bottom: 8px;
        font-weight: bold;
      }

      .cs-ability-row {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 6px;
        font-family: 'Rajdhani', sans-serif;
        font-size: 13px;
      }

      .cs-ability-key {
        background: rgba(30, 41, 59, 0.9);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: #fef08a;
        font-size: 11px;
        font-weight: bold;
        padding: 2px 6px;
        border-radius: 3px;
        min-width: 32px;
        text-align: center;
      }

      .cs-ability-name {
        color: #f8fafc;
        font-weight: bold;
      }

      .cs-ability-desc {
        color: #94a3b8;
        font-size: 12px;
      }

      /* Confirm Button */
      .cs-confirm-btn {
        margin-top: 18px;
        width: 100%;
        padding: 14px;
        background: linear-gradient(180deg, #f59e0b 0%, #b45309 100%);
        border: 1px solid #fef08a;
        border-radius: 4px;
        color: #09090b;
        font-family: 'Cinzel', serif;
        font-size: 16px;
        font-weight: 800;
        letter-spacing: 3px;
        cursor: pointer;
        box-shadow: 0 0 20px rgba(245, 158, 11, 0.5);
        transition: all 0.25s ease;
      }

      .cs-confirm-btn:hover {
        background: #fef08a;
        box-shadow: 0 0 32px rgba(254, 240, 138, 0.8);
        transform: translateY(-2px);
      }

      /* Quick Dots Indicator */
      .cs-dots-row {
        position: absolute;
        bottom: 40px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        gap: 12px;
        pointer-events: auto;
      }

      .cs-dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        border: 2px solid rgba(255, 255, 255, 0.4);
        background: transparent;
        cursor: pointer;
        transition: all 0.25s ease;
      }

      .cs-dot.active {
        background: #38bdf8;
        border-color: #38bdf8;
        box-shadow: 0 0 12px #38bdf8;
        transform: scale(1.25);
      }
    `;
    document.head.appendChild(style);
  }

  updateCardContent() {
    const f = FIGHTER_ROSTER[this.selectedIndex];
    if (!this.uiContainer) return;

    this.uiContainer.innerHTML = `
      <div class="cs-header">
        <h1 class="cs-main-title">SELECT YOUR ELEMENTAL MASTER</h1>
        <div class="cs-sub-title">PREVIEW 3D MARTIAL ARTISTS · CHOOSE YOUR DISCIPLINE</div>
      </div>

      <!-- Navigation Arrows -->
      <button class="cs-nav-btn cs-nav-left" id="btn-prev-char">❮</button>
      <button class="cs-nav-btn cs-nav-right" id="btn-next-char">❯</button>

      <!-- Profile Sidebar -->
      <div class="cs-profile-card">
        <!-- Quick Master Navigation Bar -->
        <div class="cs-quick-nav-row">
          <button class="cs-quick-nav-btn" id="card-btn-prev">❮ PREV MASTER</button>
          <span class="cs-quick-counter">${this.selectedIndex + 1} / ${FIGHTER_ROSTER.length}</span>
          <button class="cs-quick-nav-btn" id="card-btn-next">NEXT MASTER ❯</button>
        </div>

        <!-- Dynamic Player Fighter Callsign Input -->
        <div class="cs-callsign-box">
          <label class="cs-callsign-label" for="cs-fighter-callsign">⚔ ENTER FIGHTER CALLSIGN</label>
          <div class="cs-callsign-input-wrap">
            <input type="text" id="cs-fighter-callsign" class="cs-callsign-input" maxlength="15" value="${this.customPlayerName}" placeholder="CALLSIGN..." spellcheck="false" autocomplete="off" />
            <span class="cs-callsign-icon">✍</span>
          </div>
        </div>

        <div class="cs-card-header">
          <div class="cs-kanji" style="color: ${f.kanjiColor};">${f.kanji}</div>
          <div class="cs-name-box">
            <span class="cs-name">${f.name}</span>
            <span class="cs-title">${f.title}</span>
          </div>
        </div>

        <div class="cs-role">${f.role} · ${f.style}</div>
        <div class="cs-desc">${f.desc}</div>

        <div class="cs-stats-grid">
          <div class="cs-stat-item">
            <span class="cs-stat-label">MOBILITY (${f.stats.mobility})</span>
            <div class="cs-stat-bar-bg"><div class="cs-stat-bar-fill" style="width: ${f.stats.mobility}%; background: ${f.kanjiColor};"></div></div>
          </div>
          <div class="cs-stat-item">
            <span class="cs-stat-label">POWER (${f.stats.power})</span>
            <div class="cs-stat-bar-bg"><div class="cs-stat-bar-fill" style="width: ${f.stats.power}%; background: ${f.kanjiColor};"></div></div>
          </div>
          <div class="cs-stat-item">
            <span class="cs-stat-label">DEFENSE (${f.stats.defense})</span>
            <div class="cs-stat-bar-bg"><div class="cs-stat-bar-fill" style="width: ${f.stats.defense}%; background: ${f.kanjiColor};"></div></div>
          </div>
          <div class="cs-stat-item">
            <span class="cs-stat-label">RANGE (${f.stats.range})</span>
            <div class="cs-stat-bar-bg"><div class="cs-stat-bar-fill" style="width: ${f.stats.range}%; background: ${f.kanjiColor};"></div></div>
          </div>
        </div>

        <div class="cs-abilities-title">CORE DISCIPLINE TECHNIQUES</div>
        ${f.abilities.map(a => `
          <div class="cs-ability-row">
            <span class="cs-ability-key">${a.key}</span>
            <div>
              <span class="cs-ability-name">${a.name}</span>
              <span class="cs-ability-desc">— ${a.desc}</span>
            </div>
          </div>
        `).join('')}

        <button class="cs-confirm-btn" id="btn-confirm-selection">CONFIRM MASTER</button>
      </div>

      <!-- Carousel Dot Indicators -->
      <div class="cs-dots-row">
        ${FIGHTER_ROSTER.map((_, i) => `
          <div class="cs-dot ${i === this.selectedIndex ? 'active' : ''}" data-index="${i}"></div>
        `).join('')}
      </div>
    `;

    // Wire up events
    document.getElementById('btn-prev-char')?.addEventListener('click', () => this.navigate(-1));
    document.getElementById('btn-next-char')?.addEventListener('click', () => this.navigate(1));
    document.getElementById('card-btn-prev')?.addEventListener('click', () => this.navigate(-1));
    document.getElementById('card-btn-next')?.addEventListener('click', () => this.navigate(1));
    document.getElementById('btn-confirm-selection')?.addEventListener('click', () => {
      this.confirmSelection();
    });

    const callsignInput = document.getElementById('cs-fighter-callsign');
    if (callsignInput) {
      callsignInput.addEventListener('input', (e) => {
        let val = e.target.value.toUpperCase().replace(/[^A-Z0-9_ -]/g, '');
        if (val.length > 15) val = val.slice(0, 15);
        this.customPlayerName = val;
        localStorage.setItem('flowbound_player_name', val);
      });
      callsignInput.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.key === 'Enter') {
          this.confirmSelection();
        }
      });
    }

    document.querySelectorAll('.cs-dot').forEach(dot => {
      dot.addEventListener('click', (e) => {
        const idx = parseInt(e.target.dataset.index, 10);
        this.selectIndex(idx);
      });
    });
  }

  setupInputListeners() {
    window.addEventListener('keydown', (e) => {
      if (!this.isActive) return;
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
        if (e.key === 'Enter') this.confirmSelection();
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        this.navigate(-1);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        this.navigate(1);
      } else if (e.key === 'Enter') {
        this.confirmSelection();
      }
    });
  }

  navigate(dir) {
    let next = this.selectedIndex + dir;
    if (next < 0) next = FIGHTER_ROSTER.length - 1;
    if (next >= FIGHTER_ROSTER.length) next = 0;
    this.selectIndex(next);
  }

  selectIndex(index) {
    this.selectedIndex = index;
    const targetPlatform = this.platforms[index];
    if (targetPlatform) {
      this.targetCameraX = targetPlatform.posX;
      this.spotLightTarget.position.set(targetPlatform.posX, 1.2, 0);
      this.spotLight.position.set(targetPlatform.posX, 7.5, 4.8);
      
      const fighter = FIGHTER_ROSTER[index];
      this.spotLight.color.setHex(0xfffaed); // Natural warm studio illumination preserves human skin, robes & metallic details
      this.rimLight.color.setHex(fighter.themeColor); // Elemental silhouette rim contour
    }
    this.updateCardContent();
  }

  confirmSelection() {
    const selected = FIGHTER_ROSTER[this.selectedIndex];
    const finalName = (this.customPlayerName && this.customPlayerName.trim().length > 0)
      ? this.customPlayerName.trim().toUpperCase()
      : selected.name;
    console.log(`[CharacterSelect3D] Confirmed Master: ${selected.name} as ${finalName} (${selected.id})`);
    if (this.onConfirm) {
      this.onConfirm(selected, finalName);
    }
  }

  showStage() {
    this.isActive = true;
    this.group.visible = true;
    this.selectIndex(0);
    this.currentCameraX = this.targetCameraX;
    this.camera.position.set(this.currentCameraX - 0.8, 200 + 2.0, 4.8);
    this.camera.lookAt(this.currentCameraX, 200 + 1.25, 0);
  }

  openUI() {
    this.showStage();
    if (this.uiContainer) {
      this.uiContainer.classList.add('active');
    }
  }

  show() {
    this.openUI();
  }

  hide() {
    this.isActive = false;
    this.group.visible = false;
    if (this.uiContainer) {
      this.uiContainer.classList.remove('active');
    }
  }

  update(dt) {
    if (!this.isActive) return;

    // Smoothly pan camera to position character on the left side of the viewport, away from profile card
    this.currentCameraX = THREE.MathUtils.lerp(this.currentCameraX, this.targetCameraX, dt * 6.0);
    this.camera.position.set(this.currentCameraX - 1.3, 200 + 1.75, 4.3);
    this.camera.lookAt(this.currentCameraX - 0.25, 200 + 1.1, 0);

    // Track dynamic lights directly to current selected master platform
    if (this.spotLight && this.spotLightTarget) {
      this.spotLight.position.x = this.currentCameraX - 0.5;
      this.spotLightTarget.position.set(this.currentCameraX, 1.0, 0);
      this.spotLight.target.updateMatrixWorld();
    }
    if (this.frontFill) {
      this.frontFill.position.x = this.currentCameraX - 0.5;
    }

    // Update animations on all 4 3D fighters on their platforms
    this.fighterModels.forEach(model => {
      model.updateAnimation(dt, 0, false, false);
    });

    // Orbit subtle elemental particle dust
    this.particleSystems.forEach(ps => {
      if (ps.mesh) {
        ps.mesh.rotation.y += dt * ps.speed;
      }
    });
  }
}
