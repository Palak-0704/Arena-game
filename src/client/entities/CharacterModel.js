// Flowbound: Masters of Four - Production-Quality Humanoid Character System
// Loads authentic, unique 3D GLB martial artist models for every element:
// - WATER: /models/Dark_Shinobi.glb (Unique hooded martial artist with cloth dynamics & water arcs)
// - EARTH: /models/Earth_Monk.glb (Unique Shaolin monk with 18 prayer beads, brass buckle & jade robes)
// - FIRE:  /models/Fire_Samurai.glb (Unique samurai warrior in full armor with flame sash & embers)
// - AIR:   /models/Air_Ronin.glb (Unique wanderer with woven bamboo kasa straw hat & silk robes)

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { PALETTE } from '../../shared/Constants.js';

// Global cache for loaded assets so multiple instances share memory
const modelCache = new Map();
const animClipCache = new Map();

export class CharacterModel {
  constructor(element = 'WATER') {
    this.element = element;
    this.group = new THREE.Group();
    
    // Animation state
    this.mixer = null;
    this.actions = {};
    this.currentActionName = 'idle';
    this.animTime = 0;
    this.isLoaded = false;
    this.isAttacking = false;
    this.attackEndTime = 0;
    
    // Bones reference for procedural posing & equipment sockets
    this.skeletonBones = new Map();
    this.sockets = {
      leftHand: null,
      rightHand: null,
      leftForeArm: null,
      rightForeArm: null,
      leftArm: null,
      rightArm: null,
      leftShoulder: null,
      rightShoulder: null,
      leftFoot: null,
      rightFoot: null,
      hips: null,
      spine: null,
      spine1: null,
      neck: null,
      head: null
    };

    // Stance & Combat flags
    this.currentStance = 'IDLE'; // IDLE, RUN, SURF, JUMP, ATTACK, GUARD, FLINCH
    this.surfBlend = 0;
    this.guardBlend = 0;
    this.isGuarding = false;
    this.hitFlinchTime = 0;
    this.hitFlinchIntensity = 0;

    // Elemental VFX & Equipment
    this.buildElementalSockets();

    // Load authentic unique 3D Rigged Humanoid GLB Model & Animations
    this.loadCharacterAndAnimations();
  }

  createPlaceholderMesh() {
    // No-op: do not spawn temporary dummy capsules/cylinders that pop in and out of the arena
  }

  async loadCharacterAndAnimations() {
    const gltfLoader = new GLTFLoader();
    gltfLoader.setMeshoptDecoder(MeshoptDecoder);
    const fbxLoader = new FBXLoader();

    // 100% Unique, dedicated GLB model for every single element:
    const uniqueModelPaths = {
      WATER: '/models/Dark_Shinobi.glb',
      EARTH: '/models/Earth_Monk.glb',
      FIRE:  '/models/Samurai_Fire.glb',
      AIR:   '/models/Kachujin_G_Rosales.glb'
    };

    const primaryPath = uniqueModelPaths[this.element] || uniqueModelPaths.WATER;
    const fallbackPath = '/models/Dark_Shinobi.glb';

    let gltfData = null;
    let activePath = primaryPath;

    try {
      let cached = modelCache.get(primaryPath);
      if (!cached) {
        cached = await gltfLoader.loadAsync(primaryPath);
        modelCache.set(primaryPath, cached);
      }
      gltfData = {
        scene: SkeletonUtils.clone(cached.scene),
        animations: cached.animations || []
      };
    } catch (e) {
      console.warn(`[CharacterModel] Could not load ${primaryPath}, trying fallback:`, e.message);
      try {
        activePath = fallbackPath;
        let cached = modelCache.get(fallbackPath);
        if (!cached) {
          cached = await gltfLoader.loadAsync(fallbackPath);
          modelCache.set(fallbackPath, cached);
        }
        gltfData = {
          scene: SkeletonUtils.clone(cached.scene),
          animations: cached.animations || []
        };
      } catch (err2) {
        console.error('[CharacterModel] Critical: failed to load character model:', err2);
        return;
      }
    }

    if (!gltfData || !gltfData.scene) return;

    try {
      const characterScene = gltfData.scene;
      characterScene.position.set(0, 0, 0);
      characterScene.rotation.set(0, 0, 0);
      characterScene.updateMatrixWorld(true);

      // Auto-normalize bounding box to authentic human scale (~1.80m)
      const rawBox = new THREE.Box3().setFromObject(characterScene);
      const rawSize = rawBox.getSize(new THREE.Vector3());
      const rawHeight = rawSize.y;

      let targetHeight = 1.80;
      if (this.element === 'EARTH') targetHeight = 1.90;
      else if (this.element === 'AIR') targetHeight = 1.76;
      else if (this.element === 'FIRE') targetHeight = 1.84;

      let scaleFactor = 1.0;
      if (rawHeight > 0.05) {
        scaleFactor = targetHeight / rawHeight;
      }
      characterScene.scale.set(scaleFactor, scaleFactor, scaleFactor);
      characterScene.updateMatrixWorld(true);

      // Ground feet firmly flush at ground level y = 0
      const alignedBox = new THREE.Box3().setFromObject(characterScene);
      characterScene.position.y = -alignedBox.min.y;

      // Load authentic high-resolution character textures
      const texLoader = new THREE.TextureLoader();
      let externalTexture = null;

      if (this.element === 'EARTH') {
        externalTexture = texLoader.load('/models/sage_monk_0.png');
      }
      if (externalTexture) {
        externalTexture.colorSpace = THREE.SRGBColorSpace;
      }

      // Apply high-quality PBR materials and map skeleton bones
      characterScene.traverse((child) => {
        if (child.isMesh || child.isSkinnedMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          child.frustumCulled = false; // Never cull animated limbs

          if (child.material) {
            const isArray = Array.isArray(child.material);
            const mats = isArray ? child.material : [child.material];
            const processedMats = mats.map((originalMat, matIdx) => {
              if (!originalMat) return originalMat;
              const mat = originalMat.clone();
              mat.side = THREE.DoubleSide;
              mat.shadowSide = THREE.DoubleSide;

              // Assign textures:
              if (!mat.map && externalTexture) {
                mat.map = externalTexture;
                mat.needsUpdate = true;
              } else if (mat.map) {
                mat.map.colorSpace = THREE.SRGBColorSpace;
                mat.needsUpdate = true;
              }

              // CRITICAL: Base tint set to neutral white so textures display naturally
              if (mat.color) {
                mat.color.setHex(0xffffff);
              }

              // Material Lighting & Emissive Setup
              if (this.element === 'FIRE') {
                // Fire Master Armor: Rich flame-tempered metalness with warm glowing embers
                mat.metalness = 0.35;
                mat.roughness = 0.40;
                if (mat.emissive) {
                  mat.emissive.setHex(0x351408); // Warm amber ambient glow
                }
              } else {
                if (mat.emissive) {
                  mat.emissive.setHex(0x000000);
                }
                const matName = (mat.name || child.name || '').toLowerCase();
                if (matName.includes('katana') || matName.includes('blade') || matName.includes('sword') || matName.includes('armor')) {
                  mat.metalness = 0.65;
                  mat.roughness = 0.35;
                } else {
                  mat.roughness = 0.65;
                  mat.metalness = 0.15;
                }
              }

              return mat;
            });

            child.material = isArray ? processedMats : processedMats[0];
          }
        }

        if (child.isBone) {
          this.skeletonBones.set(child.name, child);

          // Map essential sockets
          const lower = child.name.toLowerCase();
          if (lower.includes('lefthand') && !lower.includes('thumb') && !lower.includes('index')) {
            this.sockets.leftHand = child;
          } else if (lower.includes('righthand') && !lower.includes('thumb') && !lower.includes('index')) {
            this.sockets.rightHand = child;
          } else if (lower.includes('leftforearm')) {
            this.sockets.leftForeArm = child;
          } else if (lower.includes('rightforearm')) {
            this.sockets.rightForeArm = child;
          } else if (lower.includes('leftarm') && !lower.includes('fore')) {
            this.sockets.leftArm = child;
          } else if (lower.includes('rightarm') && !lower.includes('fore')) {
            this.sockets.rightArm = child;
          } else if (lower.includes('leftshoulder')) {
            this.sockets.leftShoulder = child;
          } else if (lower.includes('rightshoulder')) {
            this.sockets.rightShoulder = child;
          } else if (lower.includes('leftfoot')) {
            this.sockets.leftFoot = child;
          } else if (lower.includes('rightfoot')) {
            this.sockets.rightFoot = child;
          } else if (lower.includes('hips')) {
            this.sockets.hips = child;
            this.restHipsPosition = child.position.clone();
          } else if (lower.includes('spine1')) {
            this.sockets.spine1 = child;
          } else if (lower.includes('spine') && !lower.includes('1') && !lower.includes('2')) {
            this.sockets.spine = child;
          } else if (lower.includes('neck')) {
            this.sockets.neck = child;
          } else if (lower.includes('head') && !lower.includes('top')) {
            this.sockets.head = child;
          }
        }
      });

      // Remove placeholder mesh
      if (this.placeholderGroup) {
        this.group.remove(this.placeholderGroup);
        this.placeholderGroup = null;
      }

      this.group.add(characterScene);
      this.characterMesh = characterScene;

      // Setup Animation Mixer
      this.mixer = new THREE.AnimationMixer(characterScene);

      // 1. First register any animations already bundled in the model
      const loadedAnimations = gltfData.animations || [];
      if (loadedAnimations.length > 0) {
        for (const clip of loadedAnimations) {
          const lower = clip.name.toLowerCase();
          let key = null;
          if (lower === 'idle' || lower === 'swordidle') key = 'idle';
          else if (lower === 'run') key = 'run';
          else if (lower === 'sprint') key = 'sprint';
          else if (lower === 'walk') key = 'walk';
          else if (lower === 'jumpstart' || lower === 'jumploop' || lower === 'jump') key = 'jump';
          else if (lower === 'slasha' || lower === 'attack1') key = 'punch';
          else if (lower === 'slashb' || lower === 'slashc' || lower === 'kick' || lower === 'attack2') key = 'kick';
          else if (lower === 'roll') key = 'roll';
          else if (lower === 'hitreact' || lower === 'hit') key = 'flinch';
          
          if (key && !this.actions[key]) {
            const cleanClip = clip.clone();
            const action = this.mixer.clipAction(cleanClip);
            if (key === 'idle' || key === 'run' || key === 'walk') {
              action.setLoop(THREE.LoopRepeat);
            } else {
              action.setLoop(THREE.LoopOnce);
              action.clampWhenFinished = false;
            }
            this.actions[key] = action;
          }
        }
      }

      // 2. Load dedicated Mixamo FBX animations to guarantee fluid martial combat across all fighters
      const animationFiles = {
        idle: '/animations/Fight_Idle.fbx',
        run: '/animations/Fast_Run.fbx',
        punch: '/animations/Cross_Punch.fbx',
        kick: '/animations/Drop_Kick.fbx',
        jump: '/animations/Forward_Jump.fbx',
        roll: '/animations/Dive_Roll.fbx'
      };

      for (const [name, path] of Object.entries(animationFiles)) {
        if (this.actions[name]) continue; // Preserve native animation if already present

        try {
          let rawClip = animClipCache.get(path);
          if (!rawClip) {
            const fbx = await fbxLoader.loadAsync(path);
            if (fbx.animations && fbx.animations.length > 0) {
              rawClip = fbx.animations[0];
              rawClip.name = name;
              animClipCache.set(path, rawClip);
            }
          }

          if (rawClip) {
            // Clone the clip uniquely for this character and retarget to this character's exact bones
            const clip = rawClip.clone();
            this.retargetMixamoClip(clip);

            const action = this.mixer.clipAction(clip);
            if (name === 'idle' || name === 'run') {
              action.setLoop(THREE.LoopRepeat);
            } else {
              action.setLoop(THREE.LoopOnce);
              action.clampWhenFinished = false;
            }
            this.actions[name] = action;
          }
        } catch (e) {
          console.warn(`[CharacterModel] Could not load FBX anim ${name}:`, e.message);
        }
      }

      // Start playing combat idle stance
      if (this.actions.idle) {
        this.actions.idle.play();
        this.currentActionName = 'idle';
      }

      // Re-attach visual sockets, authentic 3D clothing & elemental effects
      this.attachVFXToSockets();
      this.attachElementalAccents();
      this.attachElementalClothing();

      this.isLoaded = true;
      console.log(`[CharacterModel] Authentic 3D martial artist active for ${this.element}bender (${activePath})!`);

    } catch (err) {
      console.error(`[CharacterModel] Error instantiating character model:`, err);
    }
  }

  retargetMixamoClip(clip) {
    if (!clip || !clip.tracks) return;
    const boneNames = new Set(this.skeletonBones.keys());

    // CRITICAL FIX: Strip Armature / Character tracks and all .scale tracks
    // to prevent any scaling explosion or bone length distortion.
    clip.tracks = clip.tracks.filter(t => {
      if (!t || !t.name) return false;
      const lower = t.name.toLowerCase();
      if (lower.startsWith('armature.') || lower.startsWith('character.')) return false;
      if (lower.includes('.scale')) return false;
      return true;
    });

    const qRest = new THREE.Quaternion(-0.7071068, 0, 0, 0.7071068);

    clip.tracks.forEach((track) => {
      if (!track || !track.name) return;
      const parts = track.name.split('.');
      const prop = parts.pop();
      let nodeName = parts.join('.');

      if (!boneNames.has(nodeName)) {
        if (nodeName.startsWith('mixamorig') && !nodeName.startsWith('mixamorig:')) {
          const withColon = nodeName.replace(/^mixamorig/, 'mixamorig:');
          if (boneNames.has(withColon)) nodeName = withColon;
        } else if (nodeName.startsWith('mixamorig:')) {
          const withoutColon = nodeName.replace(/^mixamorig:/, 'mixamorig');
          if (boneNames.has(withoutColon)) nodeName = withoutColon;
        }
      }

      track.name = `${nodeName}.${prop}`;

      // CRITICAL FIX: For AIR (Kachujin) and FIRE (Samurai), the Armature node is authored with +90 deg X rotation.
      // Retargeting standard Mixamo FBX animations requires pre-multiplying hips.quaternion by qRest (-90 deg X)
      // so they stand completely upright on their feet without tilting forward!
      if ((this.element === 'AIR' || this.element === 'FIRE') && track.name.toLowerCase().includes('hips.quaternion')) {
        for (let i = 0; i < track.values.length; i += 4) {
          const qAnim = new THREE.Quaternion(track.values[i], track.values[i+1], track.values[i+2], track.values[i+3]);
          const qResult = qRest.clone().multiply(qAnim);
          track.values[i] = qResult.x;
          track.values[i+1] = qResult.y;
          track.values[i+2] = qResult.z;
          track.values[i+3] = qResult.w;
        }
      }

      // Transform hips translation into Armature local coordinates (+90 deg X):
      if ((this.element === 'AIR' || this.element === 'FIRE') && track.name.toLowerCase().includes('hips.position')) {
        for (let i = 0; i < track.values.length; i += 3) {
          const y = track.values[i+1];
          const z = track.values[i+2];
          track.values[i+1] = z;
          track.values[i+2] = -y;
        }
      }
    });
  }

  buildElementalSockets() {
    // 1. Water Whip Trail Geometry
    this.whipMeshL = this.createWhipMesh();
    this.whipMeshR = this.createWhipMesh();
    this.group.add(this.whipMeshL);
    this.group.add(this.whipMeshR);
    this.whipMeshL.visible = false;
    this.whipMeshR.visible = false;

    // 2. Glowing Elemental Fist Auras (Swirling energy on fists)
    this.fistAuraL = this.createFistAuraMesh();
    this.fistAuraR = this.createFistAuraMesh();
    this.group.add(this.fistAuraL);
    this.group.add(this.fistAuraR);

    // 3. Authentic Curved Ice Skate / Surf Blade (Under feet during Shift sprint)
    this.iceSkateMesh = this.createIceSkateMesh();
    this.group.add(this.iceSkateMesh);
    this.iceSkateMesh.visible = false;

    // Ground Aura Ring (2.8m diameter)
    const auraColor = {
      WATER: PALETTE.WATER_CYAN,
      EARTH: PALETTE.EARTH_SPARK,
      FIRE:  0xef4444,
      AIR:   0x38bdf8
    }[this.element] || PALETTE.WATER_CYAN;

    const auraGeo = new THREE.RingGeometry(1.25, 1.45, 48);
    const auraMat = new THREE.MeshBasicMaterial({
      color: auraColor,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide
    });
    this.auraRing = new THREE.Mesh(auraGeo, auraMat);
    this.auraRing.rotation.x = -Math.PI / 2;
    this.auraRing.position.y = 0.05;
    this.group.add(this.auraRing);
    this.auraRing.visible = false;
  }

  attachVFXToSockets() {
    if (this.sockets.leftHand) {
      this.sockets.leftHand.add(this.whipMeshL);
      this.whipMeshL.position.set(0, 0.08, 0);
      this.sockets.leftHand.add(this.fistAuraL);
      this.fistAuraL.position.set(0, 0.06, 0);
    }
    if (this.sockets.rightHand) {
      this.sockets.rightHand.add(this.whipMeshR);
      this.whipMeshR.position.set(0, 0.08, 0);
      this.sockets.rightHand.add(this.fistAuraR);
      this.fistAuraR.position.set(0, 0.06, 0);
    }
  }

  attachElementalAccents() {
    // Subtle elemental hand focus glow rather than heavy primitive meshes
  }

  // Attach authentic 3D clothing meshes matching the user-uploaded reference image
  attachElementalClothing() {
    // 1. EARTHBENDER: Authentic Shaolin Monk Prayer Beads Necklace + Circular Brass Buckle
    if (this.element === 'EARTH') {
      const neckSocket = this.sockets.neck || this.sockets.spine1;
      if (neckSocket) {
        const beadsGroup = new THREE.Group();
        const beadGeo = new THREE.SphereGeometry(0.042, 12, 12);
        const beadMat = new THREE.MeshStandardMaterial({
          color: 0x78350f, // Polished dark sandalwood / stone beads
          roughness: 0.5,
          metalness: 0.1
        });

        // 18 large Buddhist prayer beads arranged in a necklace draped across the chest
        const count = 18;
        const radiusX = 0.17;
        const radiusY = 0.23;
        for (let i = 0; i < count; i++) {
          const theta = (i / count) * Math.PI * 2;
          const bead = new THREE.Mesh(beadGeo, beadMat);
          bead.position.set(
            Math.cos(theta) * radiusX,
            -Math.sin(theta) * radiusY * 0.7 - 0.05,
            Math.sin(theta) * 0.14 + 0.10
          );
          bead.castShadow = true;
          beadsGroup.add(bead);
        }
        neckSocket.add(beadsGroup);
      }

      // Circular Brass Buckle on belt
      if (this.sockets.hips) {
        const buckleGeo = new THREE.CylinderGeometry(0.085, 0.085, 0.025, 24);
        const buckleMat = new THREE.MeshStandardMaterial({
          color: 0xf59e0b,
          roughness: 0.35,
          metalness: 0.8
        });
        const buckle = new THREE.Mesh(buckleGeo, buckleMat);
        buckle.rotation.x = Math.PI / 2;
        buckle.position.set(0, 0, 0.15);
        this.sockets.hips.add(buckle);
      }
    }

    // 2. AIRBENDER: Flowing Azure Silk Waist Ribbons (Graceful wind master aesthetics)
    if (this.element === 'AIR') {
      if (this.sockets.hips) {
        const ribbonGeo = new THREE.BoxGeometry(0.06, 0.65, 0.01);
        const ribbonMat = new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          roughness: 0.4,
          metalness: 0.1,
          side: THREE.DoubleSide
        });
        const ribbonL = new THREE.Mesh(ribbonGeo, ribbonMat);
        ribbonL.position.set(-0.14, -0.35, 0.10);
        ribbonL.rotation.z = 0.15;
        this.sockets.hips.add(ribbonL);

        const ribbonR = new THREE.Mesh(ribbonGeo, ribbonMat);
        ribbonR.position.set(0.14, -0.35, 0.10);
        ribbonR.rotation.z = -0.15;
        this.sockets.hips.add(ribbonR);
      }
    }

    // 3. FIREBENDER: Authentic samurai armor & flame tassets are baked into Samurai_Fire.glb

    // 4. WATERBENDER: Authentic layered shinobi coat is baked into Dark_Shinobi.glb
  }

  createWhipMesh() {
    const whipGeo = new THREE.TorusGeometry(0.45, 0.04, 12, 36, Math.PI * 1.35);
    const whipMat = new THREE.MeshStandardMaterial({
      color: PALETTE.WATER_CYAN,
      emissive: PALETTE.WATER_CYAN,
      emissiveIntensity: 0.65,
      transparent: true,
      opacity: 0.85,
      roughness: 0.2,
      metalness: 0.1
    });
    const whip = new THREE.Mesh(whipGeo, whipMat);
    whip.rotation.x = Math.PI / 2;
    return whip;
  }

  // Authentic Flowbound Curved Ice Skate / Surf Blade (Extending under feet on Shift)
  createIceSkateMesh() {
    const skateGroup = new THREE.Group();

    const shape = new THREE.Shape();
    // Aerodynamic profile with tapered tail and upturned curved front tip
    shape.moveTo(-0.16, -0.70);
    shape.lineTo(0.16, -0.70);
    shape.lineTo(0.18, 0.40);
    shape.quadraticCurveTo(0.14, 0.75, 0.0, 0.85); // Upturned nose
    shape.quadraticCurveTo(-0.14, 0.75, -0.18, 0.40);
    shape.lineTo(-0.16, -0.70);

    const extrudeSettings = {
      steps: 2,
      depth: 0.05,
      bevelEnabled: true,
      bevelThickness: 0.025,
      bevelSize: 0.02,
      bevelSegments: 3
    };

    const bladeGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    bladeGeo.rotateX(Math.PI / 2); // Horizontal under feet

    const iceColor = (this.element === 'WATER') ? 0x38bdf8 : ((this.element === 'FIRE') ? 0xf97316 : ((this.element === 'EARTH') ? 0x84cc16 : 0xe0f2fe));
    const emissiveColor = (this.element === 'WATER') ? 0x0284c7 : ((this.element === 'FIRE') ? 0xdc2626 : ((this.element === 'EARTH') ? 0x4d7c0f : 0x0ea5e9));

    const iceMat = new THREE.MeshPhysicalMaterial({
      color: iceColor,
      emissive: emissiveColor,
      emissiveIntensity: 0.85,
      roughness: 0.1,
      metalness: 0.15,
      transmission: 0.75,
      ior: 1.31,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide
    });

    const bladeMesh = new THREE.Mesh(bladeGeo, iceMat);
    bladeMesh.position.set(0, 0.035, 0.08);
    bladeMesh.castShadow = true;
    skateGroup.add(bladeMesh);

    // Glowing crystalline core ridge along blade center
    const coreGeo = new THREE.BoxGeometry(0.08, 0.03, 1.4);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreMesh.position.set(0, 0.065, 0.08);
    skateGroup.add(coreMesh);

    // Frost ground glow plane underneath skate
    const glowGeo = new THREE.PlaneGeometry(0.65, 1.6);
    const glowMat = new THREE.MeshBasicMaterial({
      color: iceColor,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide
    });
    const glowMesh = new THREE.Mesh(glowGeo, glowMat);
    glowMesh.rotation.x = -Math.PI / 2;
    glowMesh.position.set(0, 0.015, 0.08);
    skateGroup.add(glowMesh);

    return skateGroup;
  }

  // Glowing Elemental Fist Auras (Swirling energy on striking hands)
  createFistAuraMesh() {
    const auraGroup = new THREE.Group();

    const elColor = {
      WATER: 0x38bdf8,
      FIRE:  0xf97316,
      EARTH: 0x84cc16,
      AIR:   0xf0fdf4
    }[this.element] || 0x38bdf8;

    const emissiveColor = {
      WATER: 0x0284c7,
      FIRE:  0xdc2626,
      EARTH: 0x4d7c0f,
      AIR:   0x38bdf8
    }[this.element] || 0x0284c7;

    const sphereGeo = new THREE.SphereGeometry(0.11, 16, 16);
    const sphereMat = new THREE.MeshStandardMaterial({
      color: elColor,
      emissive: emissiveColor,
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: 0.8,
      roughness: 0.2
    });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    auraGroup.add(sphere);

    const ringGeo = new THREE.TorusGeometry(0.15, 0.02, 8, 20);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.85
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 3;
    auraGroup.add(ring);

    auraGroup.sphereMat = sphereMat;
    auraGroup.ring = ring;
    return auraGroup;
  }

  setWhipActive(active) {
    this.whipMeshL.visible = active;
    this.whipMeshR.visible = active;
    this.auraRing.visible = active;
  }

  playAction(name, duration = 0.18) {
    if (!this.actions[name]) return;
    if (this.currentActionName === name && this.actions[name].isRunning()) return;

    const prevAction = this.actions[this.currentActionName];
    const nextAction = this.actions[name];

    if (prevAction && prevAction !== nextAction) {
      prevAction.fadeOut(duration);
    }

    nextAction.reset().fadeIn(duration).play();
    this.currentActionName = name;
  }

  playAttack(type = 'punch', onComplete) {
    const actionName = type === 'kick' ? 'kick' : 'punch';
    const action = this.actions[actionName] || this.actions['punch'] || this.actions['kick'] || this.actions['idle'];
    if (!action) {
      if (onComplete) onComplete();
      return;
    }

    this.isAttacking = true;
    const prevAction = this.actions[this.currentActionName];
    if (prevAction && prevAction !== action) {
      prevAction.fadeOut(0.08);
    }

    // Snappy martial arts animation speed (crisp responsive impact and martial flow)
    action.timeScale = (actionName === 'punch') ? 1.65 : 1.55;
    action.reset();
    action.setLoop(THREE.LoopOnce);
    action.clampWhenFinished = false;
    action.fadeIn(0.08).play();
    this.currentActionName = actionName;

    const rawClipDuration = action.getClip().duration || 0.8;
    const effectiveDuration = Math.min(0.55, (rawClipDuration / action.timeScale) * 0.9);
    this.attackEndTime = Date.now() + (effectiveDuration * 1000);

    let isDone = false;
    const finishAttack = () => {
      if (isDone) return;
      isDone = true;
      this.isAttacking = false;
      if (this.currentStance !== 'SURF') {
        this.playAction('idle', 0.15);
      }
      if (onComplete) onComplete();
    };

    setTimeout(finishAttack, effectiveDuration * 1000);
  }

  setGuarding(isGuarding) {
    this.isGuarding = isGuarding;
  }

  triggerHitReaction(intensity = 1.0) {
    this.hitFlinchTime = 0.35;
    this.hitFlinchIntensity = intensity;
  }

  // Clone an all-white silhouette for Ghost Dash afterimage
  createGhostAfterimage() {
    const clone = this.group.clone(true);
    const whiteMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8
    });

    clone.traverse((child) => {
      if (child.isMesh || child.isSkinnedMesh) {
        child.material = whiteMat;
      }
    });

    return clone;
  }

  updateAnimation(dt, speed, isSurfing, isAirborne) {
    this.animTime += dt;

    if (this.mixer) {
      this.mixer.update(dt);
    }

    // Dynamic rotation & pulse on elemental fist auras
    if (this.fistAuraL && this.fistAuraR) {
      const swirlSpeed = dt * (this.isAttacking ? 12.0 : 4.0);
      if (this.fistAuraL.ring) this.fistAuraL.ring.rotation.z += swirlSpeed;
      if (this.fistAuraR.ring) this.fistAuraR.ring.rotation.z += swirlSpeed;
      const targetEmissive = this.isAttacking ? 2.2 : 0.75;
      if (this.fistAuraL.sphereMat) {
        this.fistAuraL.sphereMat.emissiveIntensity = THREE.MathUtils.lerp(this.fistAuraL.sphereMat.emissiveIntensity, targetEmissive, dt * 10.0);
      }
      if (this.fistAuraR.sphereMat) {
        this.fistAuraR.sphereMat.emissiveIntensity = THREE.MathUtils.lerp(this.fistAuraR.sphereMat.emissiveIntensity, targetEmissive, dt * 10.0);
      }
    }

    // Handle Animation State Transitions
    if (isSurfing) {
      this.currentStance = 'SURF';
      this.surfBlend = THREE.MathUtils.lerp(this.surfBlend, 1.0, dt * 10.0);

      // Authentic Surfing: Smooth crouched glide stance on ice skate (DO NOT flap legs running!)
      if (this.actions.idle && this.currentActionName !== 'idle') {
        this.playAction('idle', 0.2);
      }

      if (this.iceSkateMesh) {
        this.iceSkateMesh.visible = (this.surfBlend > 0.05);
      }

      this.applyIceSurfingPose(this.surfBlend);
      this.setWhipActive(false);

    } else {
      this.surfBlend = THREE.MathUtils.lerp(this.surfBlend, 0, dt * 8.0);
      if (this.iceSkateMesh) {
        this.iceSkateMesh.visible = (this.surfBlend > 0.05);
      }
      if (this.surfBlend > 0.001) {
        this.applyIceSurfingPose(this.surfBlend);
      } else if (this.surfBlend > 0) {
        this.surfBlend = 0;
        if (this.sockets.hips && this.restHipsPosition) {
          this.sockets.hips.position.copy(this.restHipsPosition);
        }
      }

      // Guard blend
      const targetGuard = this.isGuarding ? 1.0 : 0.0;
      this.guardBlend = THREE.MathUtils.lerp(this.guardBlend, targetGuard, dt * 12.0);
      if (this.guardBlend > 0.02) {
        this.applyGuardPose(this.guardBlend);
      }

      // Hit Flinch
      if (this.hitFlinchTime > 0) {
        this.hitFlinchTime -= dt;
        this.applyHitFlinch(this.hitFlinchIntensity * (this.hitFlinchTime / 0.35));
      }

      if (this.isAttacking) {
        this.currentStance = 'ATTACK';
      } else if (this.isGuarding) {
        this.currentStance = 'GUARD';
        if (this.actions.idle && this.currentActionName !== 'idle') {
          this.playAction('idle', 0.15);
        }
      } else if (isAirborne) {
        this.currentStance = 'JUMP';
        if (this.actions.jump && this.currentActionName !== 'jump') {
          this.playAction('jump', 0.15);
        }
      } else if (speed > 0.6) {
        this.currentStance = 'RUN';
        if (this.actions.run && this.currentActionName !== 'run') {
          this.playAction('run', 0.18);
        }
      } else {
        this.currentStance = 'IDLE';
        if (this.actions.idle && this.currentActionName !== 'idle') {
          this.playAction('idle', 0.25);
        }
      }
    }
  }

  // Procedural stance adjustments for Absolver-quality feel
  applyIceSurfingPose(blend) {
    if (this.sockets.hips) {
      if (!this.restHipsPosition) {
        this.restHipsPosition = this.sockets.hips.position.clone();
      }
      // Keep hips strictly on their natural vertical rest height (micro-dip only, NEVER sink into floor!)
      this.sockets.hips.position.copy(this.restHipsPosition);
      this.sockets.hips.position.y -= 0.04 * blend;
      this.sockets.hips.rotation.y = 0.45 * blend;
      this.sockets.hips.rotation.x = 0.08 * blend;
    }
    if (this.sockets.leftUpLeg) {
      this.sockets.leftUpLeg.rotation.x = -0.42 * blend;
      this.sockets.leftUpLeg.rotation.z = -0.15 * blend;
    }
    if (this.sockets.leftLeg) {
      this.sockets.leftLeg.rotation.x = 0.75 * blend;
    }
    if (this.sockets.rightUpLeg) {
      this.sockets.rightUpLeg.rotation.x = -0.32 * blend;
      this.sockets.rightUpLeg.rotation.z = 0.15 * blend;
    }
    if (this.sockets.rightLeg) {
      this.sockets.rightLeg.rotation.x = 0.60 * blend;
    }
    if (this.sockets.spine) {
      this.sockets.spine.rotation.x = 0.35 * blend;
      this.sockets.spine.rotation.y = -0.35 * blend;
      this.sockets.spine.rotation.z = -0.18 * blend;
    }
    if (this.sockets.leftArm) {
      this.sockets.leftArm.rotation.x = -0.30 * blend;
      this.sockets.leftArm.rotation.z = -0.85 * blend;
    }
    if (this.sockets.rightArm) {
      this.sockets.rightArm.rotation.x = 0.45 * blend;
      this.sockets.rightArm.rotation.z = 0.85 * blend;
    }
    if (this.sockets.head) {
      this.sockets.head.rotation.y = -0.35 * blend;
      this.sockets.head.rotation.x = -0.15 * blend;
    }
  }

  applyGuardPose(blend) {
    if (this.sockets.leftArm) {
      this.sockets.leftArm.rotation.x = -0.8 * blend;
      this.sockets.leftArm.rotation.y = 0.5 * blend;
      this.sockets.leftArm.rotation.z = -0.4 * blend;
    }
    if (this.sockets.leftForeArm) {
      this.sockets.leftForeArm.rotation.z = -1.2 * blend;
    }
    if (this.sockets.rightArm) {
      this.sockets.rightArm.rotation.x = -0.8 * blend;
      this.sockets.rightArm.rotation.y = -0.5 * blend;
      this.sockets.rightArm.rotation.z = 0.4 * blend;
    }
    if (this.sockets.rightForeArm) {
      this.sockets.rightForeArm.rotation.z = 1.2 * blend;
    }
    if (this.sockets.head) {
      this.sockets.head.rotation.x = 0.15 * blend;
    }
  }

  applyHitFlinch(factor) {
    if (this.sockets.spine) {
      this.sockets.spine.rotation.x = -0.42 * factor;
      this.sockets.spine.rotation.y = (Math.random() - 0.5) * 0.25 * factor;
      this.sockets.spine.rotation.z = (Math.random() - 0.5) * 0.15 * factor;
    }
    if (this.sockets.head) {
      this.sockets.head.rotation.x = -0.55 * factor;
    }
    if (this.sockets.leftArm) {
      this.sockets.leftArm.rotation.x = -0.4 * factor;
      this.sockets.leftArm.rotation.z = -0.5 * factor;
    }
    if (this.sockets.rightArm) {
      this.sockets.rightArm.rotation.x = -0.4 * factor;
      this.sockets.rightArm.rotation.z = 0.5 * factor;
    }
  }

  destroy() {
    if (this.mixer) {
      this.mixer.stopAllAction();
    }
    if (this.characterMesh) {
      this.group.remove(this.characterMesh);
    }
  }
}
