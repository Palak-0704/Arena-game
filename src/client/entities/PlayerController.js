// Flowbound: Masters of Four - Absolver-Style Player Controller
// Implements Lock-On, Orbital Strafing, Gold-Link Combo Chains, Heavy Breaker Strikes, Guarding & Dodging

import * as THREE from 'three';
import { MOVEMENT_CONSTANTS, COMBAT_CONSTANTS } from '../../shared/Constants.js';
import { CharacterModel } from './CharacterModel.js';
import { wasmCore } from '../wasm/WasmCore.js';

export class PlayerController {
  constructor(scene, cameraController, proceduralIce, earthTerraform, soundEngine, hudManager) {
    this.scene = scene;
    this.cameraController = cameraController;
    this.proceduralIce = proceduralIce;
    this.earthTerraform = earthTerraform;
    this.soundEngine = soundEngine;
    this.hudManager = hudManager;

    this.id = 'local_player';

    // 3D Model with Mixamo Skeletal Rig & Authentic Clothing
    this.model = new CharacterModel('WATER');
    this.scene.add(this.model.group);

    // Transform & Kinematics (Spawn at z = -14 facing North)
    this.position = new THREE.Vector3(0, 0, -14);
    this.velocity = new THREE.Vector3();
    this.model.group.position.copy(this.position);
    this.model.group.rotation.y = 0;

    // Target Opponent Reference for Absolver Lock-On
    this.targetOpponent = null;
    this.isLockedOn = true;

    // Attributes
    this.health = COMBAT_CONSTANTS.BASE_HEALTH;
    this.maxHealth = COMBAT_CONSTANTS.BASE_HEALTH;
    this.poise = COMBAT_CONSTANTS.BASE_POISE;
    this.maxPoise = COMBAT_CONSTANTS.BASE_POISE;
    this.flow = 1.0;

    // Combat & Defensive States
    this.isInputLocked = false;
    this.isGuarding = false;
    this.isDashing = false;
    this.isInvulnerable = false;
    this.isAttacking = false;
    this.isStaggered = false;
    this.staggerTimer = 0;
    this.dodgeCooldown = 0;
    this.hitstopTimer = 0; // Authentic Hitstop micro-freeze duration

    // Absolver Combo Deck State
    this.comboStep = 0; // 0=None, 1=Jab, 2=Cross, 3=Finisher Kick
    this.lastAttackTime = 0;
    this.currentAttackDuration = 0.40;
    this.isGoldLinkAvailable = false;
    this.attackMomentum = new THREE.Vector3();
    this.bufferedAttack = null; // High-response fighting game input buffer (never drops early clicks)

    // Movement States
    this.isSurfing = false;
    this.isAirborne = false;

    // Input States
    this.keys = {};
    this.setupInputListeners();

    // Ability Cooldowns
    this.qCooldown = 0;
    this.eCooldown = 0;
    this.rCooldown = 0;

    // Ice Ramp Tracking & Jump Disposal
    this.activePlayerRamp = null;
    this.wasOnRamp = false;
    this.currentRampInUse = null;

    // Ghost Dash & Gold Link Afterimages
    this.afterimages = [];

    // Zero-Allocation Reusable Kinematics Scratch Vectors
    this._scratchMove = new THREE.Vector3();
    this._scratchSurf = new THREE.Vector3();
    this._scratchFwd = new THREE.Vector3();
    this._scratchRight = new THREE.Vector3();
  }

  isForward() {
    return !!(this.keys['KeyW'] || this.keys['ArrowUp'] || this.keys['w'] || this.keys['W']);
  }

  isBackward() {
    return !!(this.keys['KeyS'] || this.keys['ArrowDown'] || this.keys['s'] || this.keys['S']);
  }

  isLeft() {
    return !!(this.keys['KeyA'] || this.keys['ArrowLeft'] || this.keys['a'] || this.keys['A']);
  }

  isRight() {
    return !!(this.keys['KeyD'] || this.keys['ArrowRight'] || this.keys['d'] || this.keys['D']);
  }

  setModel(element) {
    if (this.model && this.model.group) {
      this.scene.remove(this.model.group);
    }
    this.model = new CharacterModel(element);
    this.scene.add(this.model.group);
    this.model.group.position.copy(this.position);
    this.model.group.rotation.y = 0;
  }

  setPlayerStats(stats) {
    if (!stats) return;
    this.statBoosts = this.statBoosts || {};
    if (stats.dmgMult) this.statBoosts.dmgMult = stats.dmgMult;
    if (stats.maxHp) this.maxHealth = stats.maxHp;
    if (stats.maxPoise) this.maxPoise = stats.maxPoise;
    this.health = this.maxHealth;
    this.poise = this.maxPoise;
  }

  resetCombatState(x = 0, y = 0, z = -14, yaw = 0) {
    this.position.set(x, y, z);
    this.velocity.set(0, 0, 0);
    this.health = this.maxHealth || COMBAT_CONSTANTS.BASE_HEALTH;
    this.poise = this.maxPoise || COMBAT_CONSTANTS.BASE_POISE;
    this.isGuarding = false;
    this.isDashing = false;
    this.isInvulnerable = false;
    this.isAttacking = false;
    this.isStaggered = false;
    this.isSurfing = false;
    this.isAirborne = false;
    this.isInputLocked = false;
    this.activePlayerRamp = null;
    this.wasOnRamp = false;
    this.currentRampInUse = null;
    if (this.lockTimeout) clearTimeout(this.lockTimeout);
    this.keys = {};
    if (this.hudManager && this.hudManager.setSurfingActive) {
      this.hudManager.setSurfingActive(false);
    }
    if (this.model && this.model.group) {
      this.model.group.position.copy(this.position);
      this.model.group.rotation.y = yaw;
      this.model.setGuarding(false);
    }
  }

  setInputLocked(locked) {
    this.isInputLocked = !!locked;
    if (this.lockTimeout) clearTimeout(this.lockTimeout);
    if (this.isInputLocked) {
      // Auto-unlock watchdog so player can never be permanently frozen
      this.lockTimeout = setTimeout(() => {
        this.setInputLocked(false);
        console.log('[Flowbound Player] Input unlocked by safety watchdog.');
      }, 3500);
    } else {
      if (this.bufferedAttack === 'light') {
        this.bufferedAttack = null;
        this.executeLightComboAttack();
      }
    }
  }

  setupInputListeners() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.key) this.keys[e.key] = true;

      // Defensive Guard (Hold F)
      if (e.code === 'KeyF' || e.key === 'f' || e.key === 'F') {
        this.setGuardState(true);
      }

      // Jump (Space - Only from Ground/Ramp, strictly ignore OS repeating held key)
      if (e.code === 'Space') {
        if (!e.repeat) {
          this.handleJumpOrMantle();
        }
      }

      // Dodge Slip / Evasive Roll (Alt or C)
      if (e.code === 'AltLeft' || e.code === 'AltRight' || e.code === 'KeyC' || e.key === 'c' || e.key === 'C') {
        this.triggerDodgeSlip();
      }

      // Elemental Abilities (Q / U, E / I, R / O)
      if (e.code === 'KeyQ' || e.key === 'q' || e.key === 'Q' || e.code === 'KeyU' || e.key === 'u' || e.key === 'U') this.castAbilityQ();
      if (e.code === 'KeyE' || e.key === 'e' || e.key === 'E' || e.code === 'KeyI' || e.key === 'i' || e.key === 'I') this.castAbilityE();
      if (e.code === 'KeyR' || e.key === 'r' || e.key === 'R' || e.code === 'KeyO' || e.key === 'o' || e.key === 'O') this.castAbilityR();

      // Light Attack alternative key (J)
      if (e.code === 'KeyJ' || e.key === 'j' || e.key === 'J') {
        this.executeLightComboAttack();
      }

      // Heavy Attack alternative key (K)
      if (e.code === 'KeyK' || e.key === 'k' || e.key === 'K') {
        this.executeHeavyBreakerStrike();
      }

      // Lock-On Toggle (Tab or L)
      if (e.code === 'Tab' || e.code === 'KeyL' || e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        this.isLockedOn = !this.isLockedOn;
        if (this.hudManager && this.hudManager.showLockOnFeedback) {
          this.hudManager.showLockOnFeedback(this.isLockedOn);
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      if (e.key) this.keys[e.key] = false;

      // Release Guard
      if (e.code === 'KeyF' || e.key === 'f' || e.key === 'F') {
        this.setGuardState(false);
      }
    });

    // Clear stuck keys immediately if window loses focus or modal opens
    window.addEventListener('blur', () => {
      this.keys = {};
      this.setGuardState(false);
    });

    this.lastPointerDownTime = 0;
    const onPointerAttack = (e) => {
      if (document.activeElement && document.activeElement.tagName === 'INPUT') return;

      const now = Date.now();
      if (now - this.lastPointerDownTime < 35) return;
      this.lastPointerDownTime = now;

      // LMB (Button 0): Absolver Light Attack Combo Chain (with Gold Link)
      if (e.button === 0) {
        this.executeLightComboAttack();
      }

      // MMB (Button 1 / Middle click): Elemental Art E (Chakrams / Boulder)
      if (e.button === 1) {
        this.castAbilityE();
      }

      // RMB (Button 2): Heavy Breaker Strike / Aerial Dive
      if (e.button === 2) {
        e.preventDefault();
        this.executeHeavyBreakerStrike();
      }

      // Side Mouse Buttons (Buttons 3 & 4): Dodge Slip / Dash
      if (e.button === 3 || e.button === 4) {
        this.triggerDodgeSlip();
      }
    };

    window.addEventListener('pointerdown', onPointerAttack);
    window.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  setGuardState(guarding) {
    if (this.isAttacking || this.isDashing || this.isSurfing) {
      this.isGuarding = false;
      this.model.setGuarding(false);
      return;
    }
    this.isGuarding = guarding;
    this.model.setGuarding(guarding);
  }

  handleJumpOrMantle() {
    // Strictly prevent repeated mid-air boosting or holding Space flight!
    if (this.isAirborne) return;

    // STRICT: Just after jumping from or near an ice ramp, the ice is immediately removed!
    if (this.activePlayerRamp) {
      this.proceduralIce.removeRamp(this.activePlayerRamp);
      this.activePlayerRamp = null;
    }
    if (this.currentRampInUse) {
      this.proceduralIce.removeRamp(this.currentRampInUse);
      this.currentRampInUse = null;
    }
    const rampCheck = this.proceduralIce.checkRampCollision(this.position);
    if (rampCheck && rampCheck.onRamp) {
      this.proceduralIce.removeRamp(rampCheck.ramp);
    }
    // Also remove any ramp within jump proximity (within 8 meters)
    if (this.proceduralIce && this.proceduralIce.activeRamps) {
      for (let i = this.proceduralIce.activeRamps.length - 1; i >= 0; i--) {
        const r = this.proceduralIce.activeRamps[i];
        if (r && r.collider) {
          const dStart = this.position.distanceTo(r.collider.start);
          const dEnd = this.position.distanceTo(r.collider.end);
          if (dStart < 8.0 || dEnd < 8.0) {
            this.proceduralIce.removeRamp(r);
          }
        }
      }
    }
    this.wasOnRamp = false;

    this.velocity.y = MOVEMENT_CONSTANTS.JUMP_VELOCITY || 7.2;
    this.isAirborne = true;
    if (this.soundEngine) this.soundEngine.playJump();
  }

  // Absolver Evasive Slip / Dodge with Invulnerability Frames
  triggerDodgeSlip() {
    if (this.dodgeCooldown > 0 || this.isDashing || this.isStaggered) return;

    this.isDashing = true;
    this.isInvulnerable = true;
    this.dodgeCooldown = 0.55;
    this.lastDodgeTime = Date.now();
    this.setGuardState(false);

    // Determine Dodge Direction (Relative to opponent or camera)
    const forward = this.getCombatForwardVector();
    const right = new THREE.Vector3(-forward.z, 0, forward.x);
    let dodgeDir = new THREE.Vector3();

    if (this.keys['KeyW']) dodgeDir.add(forward);
    if (this.keys['KeyS']) dodgeDir.sub(forward);
    if (this.keys['KeyD']) dodgeDir.add(right);
    if (this.keys['KeyA']) dodgeDir.sub(right);

    // If no directional key held, back-slip away from threat
    if (dodgeDir.lengthSq() === 0) {
      dodgeDir.sub(forward);
    }
    dodgeDir.normalize();

    // Spawn Ghost Afterimage
    const ghost = this.model.createGhostAfterimage();
    ghost.position.copy(this.position);
    ghost.rotation.copy(this.model.group.rotation);
    this.scene.add(ghost);

    this.afterimages.push({
      mesh: ghost,
      createdAt: Date.now(),
      lifetime: 0.35
    });

    // Apply Evasive Burst Velocity
    const dodgeSpeed = COMBAT_CONSTANTS.DODGE_SLIP_SPEED || 13.0;
    this.velocity.x = dodgeDir.x * dodgeSpeed;
    this.velocity.z = dodgeDir.z * dodgeSpeed;

    this.soundEngine.playGhostDash();

    // i-Frames end slightly before movement burst ends
    setTimeout(() => {
      this.isInvulnerable = false;
    }, (COMBAT_CONSTANTS.DODGE_SLIP_IFRAMES || 0.22) * 1000);

    setTimeout(() => {
      this.isDashing = false;
    }, (COMBAT_CONSTANTS.DODGE_SLIP_DURATION || 0.28) * 1000);
  }

  // Absolver 3-Hit Light Attack Combo with Gold Link Timing & Input Buffering
  executeLightComboAttack() {
    // If input is currently locked (e.g. pre-round countdown), buffer the attack for instant frame-1 release
    if (this.isInputLocked) {
      this.bufferedAttack = 'light';
      return;
    }

    if (this.isDashing || this.isStaggered) {
      this.bufferedAttack = 'light';
      return;
    }

    // If currently Ice Surfing, cancel surf into an authentic sliding slash!
    if (this.isSurfing) {
      this.isSurfing = false;
      this.proceduralIce.stopSurfing();
      this.cameraController.setSurfingFOV(false);
      this.soundEngine.stopSurfAudio();
      if (this.hudManager && this.hudManager.setSurfingActive) {
        this.hudManager.setSurfingActive(false);
      }
    }

    const now = Date.now();
    const elapsedSinceLast = (now - this.lastAttackTime) / 1000;

    // Check Gold Link Window or Buffer next combo hit
    let isGoldLink = false;
    if (this.isAttacking) {
      if (elapsedSinceLast >= (this.currentAttackDuration - 0.22)) {
        isGoldLink = true;
        this.soundEngine.playHitmarker(); // Crisp gold-link audio cue
        this.spawnGoldSparkVFX();
      } else {
        // Buffer this click so it fires the microsecond the current strike window opens (0 dropped inputs!)
        this.bufferedAttack = 'light';
        return;
      }
    }

    this.bufferedAttack = null;

    // Reset combo if too much time has elapsed between strikes
    if (elapsedSinceLast > 1.15) {
      this.comboStep = 0;
    }

    this.comboStep = (this.comboStep % 3) + 1;
    this.lastAttackTime = now;
    this.isAttacking = true;
    this.setGuardState(false);

    // Combo Step Configuration: [Damage, Forward Step Impulse, Duration, Animation]
    const pDmgMult = this.statBoosts?.dmgMult || 1.0;
    let hitDamage = Math.round(12 * pDmgMult);
    let stepImpulse = 2.2;
    let animType = 'punch';
    this.currentAttackDuration = 0.44;

    if (this.comboStep === 1) {
      hitDamage = Math.round(12 * pDmgMult);
      stepImpulse = 2.4;
      animType = 'punch';
      this.currentAttackDuration = 0.32;
    } else if (this.comboStep === 2) {
      hitDamage = Math.round(18 * pDmgMult);
      stepImpulse = 3.2;
      animType = 'punch';
      this.currentAttackDuration = 0.36;
    } else {
      // Step 3: Roundhouse / Drop Kick Finisher
      hitDamage = Math.round(28 * pDmgMult);
      stepImpulse = 4.4;
      animType = 'kick';
      this.currentAttackDuration = 0.44;
    }

    // Play Authentic Mixamo Combat Animation
    this.hudManager.triggerCooldown('LMB', this.currentAttackDuration * 0.85);
    this.model.setWhipActive(true);
    
    const completeAttack = () => {
      this.isAttacking = false;
      this.model.setWhipActive(false);
      // Consume buffered attack immediately for zero-delay combo chaining
      if (this.bufferedAttack && !this.isInputLocked) {
        const next = this.bufferedAttack;
        this.bufferedAttack = null;
        if (next === 'light') this.executeLightComboAttack();
        else if (next === 'heavy') this.executeHeavyBreakerStrike();
      }
    };

    this.model.playAttack(animType, completeAttack);

    // Fallback safety timeout so attack state never gets permanently stuck
    setTimeout(completeAttack, (this.currentAttackDuration + 0.08) * 1000);

    this.soundEngine.playWhipSlash();

    // STRICT: Orient face directly toward opponent before strike
    this.faceOpponent(true);

    // Step Forward Momentum towards opponent (No punching from thin air!)
    const forward = this.getCombatForwardVector();
    this.velocity.x += forward.x * stepImpulse;
    this.velocity.z += forward.z * stepImpulse;

    // Spawn authentic martial swipe arc ribbon & forward compressed air shockwave
    this.spawnPunchSwipeVFX(forward, this.comboStep, false);

    // Send Attack Hitbox strictly in the face direction of the GLB model
    if (this.onCastAbility) {
      this.onCastAbility({
        casterId: this.id,
        abilityId: 'WATER_WHIP',
        type: 'MELEE_SWEEP',
        step: this.comboStep,
        damage: hitDamage,
        poiseDamage: hitDamage * 1.2,
        isHeavy: false,
        isGoldLink,
        range: 4.8,
        direction: { x: forward.x, y: 0, z: forward.z },
        origin: { x: this.position.x, y: this.position.y + 1.1, z: this.position.z }
      });
    }
  }

  // Absolver Heavy Breaker Strike (High poise damage, breaks guard)
  executeHeavyBreakerStrike() {
    if (this.isInputLocked || this.isDashing || this.isStaggered) {
      this.bufferedAttack = 'heavy';
      return;
    }

    if (this.isAttacking) {
      this.bufferedAttack = 'heavy';
      return;
    }

    if (this.isSurfing) {
      this.isSurfing = false;
      this.proceduralIce.stopSurfing();
      this.cameraController.setSurfingFOV(false);
      this.soundEngine.stopSurfAudio();
      if (this.hudManager && this.hudManager.setSurfingActive) {
        this.hudManager.setSurfingActive(false);
      }
    }

    // STRICT: Orient face directly toward opponent before heavy breaker
    this.faceOpponent(true);

    const forward = this.getCombatForwardVector();

    // Aerial Dive Strike if in air
    if (this.isAirborne) {
      this.velocity.y = -22.0;
      this.velocity.x = forward.x * 16.0;
      this.velocity.z = forward.z * 16.0;
      this.cameraController.triggerShake(0.5);
      this.soundEngine.playChakramThrow();

      if (this.onCastAbility) {
        this.onCastAbility({
          casterId: this.id,
          abilityId: 'AERIAL_DIVE_STRIKE',
          type: 'MELEE_SWEEP',
          damage: 45,
          poiseDamage: 75,
          isHeavy: true,
          range: 5.5,
          direction: { x: forward.x, y: -0.8, z: forward.z },
          origin: { x: this.position.x, y: this.position.y, z: this.position.z }
        });
      }
      return;
    }

    // Grounded Heavy Breaker Kick
    this.isAttacking = true;
    this.currentAttackDuration = 0.52;
    this.lastAttackTime = Date.now();
    this.setGuardState(false);
    this.hudManager.triggerCooldown('RMB', 0.65);

    let heavyFinished = false;
    const completeHeavy = () => {
      if (heavyFinished) return;
      heavyFinished = true;
      this.isAttacking = false;
      if (this.bufferedAttack && !this.isInputLocked) {
        const next = this.bufferedAttack;
        this.bufferedAttack = null;
        if (next === 'light') this.executeLightComboAttack();
        else if (next === 'heavy') this.executeHeavyBreakerStrike();
      }
    };

    this.model.playAttack('kick', completeHeavy);
    setTimeout(completeHeavy, 540);

    this.soundEngine.playChakramThrow();

    // High forward lunge step
    this.velocity.x += forward.x * 4.2;
    this.velocity.z += forward.z * 4.2;

    // Spawn authentic heavy breaker downward smash arc
    this.spawnPunchSwipeVFX(forward, 0, true);

    const pDmgMult = this.statBoosts?.dmgMult || 1.0;
    if (this.onCastAbility) {
      this.onCastAbility({
        casterId: this.id,
        abilityId: 'HEAVY_BREAKER',
        type: 'MELEE_SWEEP',
        damage: Math.round(32 * pDmgMult),
        poiseDamage: 65,
        isHeavy: true,
        guardBreak: true,
        range: 4.5,
        direction: { x: forward.x, y: 0, z: forward.z },
        origin: { x: this.position.x, y: this.position.y + 1.1, z: this.position.z }
      });
    }
  }

  castAbilityQ() {
    if (this.isInputLocked || this.qCooldown > 0) return;
    this.qCooldown = 3.6;
    this.hudManager.triggerCooldown('Q', 3.6);

    // STRICT: Orient face directly toward opponent so ramp launches directly at opponent!
    this.faceOpponent(true);

    // STRICT: Fire and activate directly in the exact face direction of the 3D GLB model
    const forward = this.getGlbFaceDirection();

    // Start directly from beneath player's feet so the player immediately mounts and rides the ice ramp!
    const spawnPos = this.position.clone();
    spawnPos.y = 0;

    const el = this.model?.element || 'WATER';
    let abilityId = 'ICE_WALL';
    if (el === 'EARTH') abilityId = 'STONE_GUARD';
    else if (el === 'FIRE') abilityId = 'FLAME_SHIELD';
    else if (el === 'AIR') abilityId = 'GALE_BARRIER';

    if (el === 'EARTH' && this.earthTerraform) {
      const earthSpawn = spawnPos.clone().add(forward.clone().multiplyScalar(2.0));
      this.earthTerraform.spawnStoneGuard(earthSpawn, forward);
    } else {
      this.activePlayerRamp = this.proceduralIce.spawnIceWall(spawnPos, forward, false);
      this.wasOnRamp = true;
      this.currentRampInUse = this.activePlayerRamp;
      // Fluid forward glide momentum straight in the face direction of the GLB model
      this.velocity.x = forward.x * 11.5;
      this.velocity.z = forward.z * 11.5;
      this.velocity.y = 1.0;
      this.isAirborne = false;
    }
    this.soundEngine.playIceWallSpawn();

    if (this.onCastAbility) {
      this.onCastAbility({
        casterId: this.id,
        abilityId,
        element: el,
        slot: 'Q',
        type: 'PROCEDURAL_BARRIER',
        origin: { x: spawnPos.x, y: 0, z: spawnPos.z },
        direction: { x: forward.x, y: 0, z: forward.z }
      });
    }
  }

  castAbilityE() {
    if (this.isInputLocked || this.eCooldown > 0) return;
    this.eCooldown = 2.4;
    this.hudManager.triggerCooldown('E', 2.4);

    // STRICT: Orient face directly toward opponent so projectiles launch straight at opponent!
    this.faceOpponent(true);

    // STRICT: Fire directly in the exact face direction of the 3D GLB model
    const forward = this.getGlbFaceDirection();
    this.soundEngine.playChakramThrow();

    const el = this.model?.element || 'WATER';
    let abilityId = 'WATER_CHAKRAMS';
    if (el === 'EARTH') abilityId = 'BOULDER_KICK';
    else if (el === 'FIRE') abilityId = 'FIRE_BEAM';
    else if (el === 'AIR') abilityId = 'AIR_GALE';

    const spawnOrigin = this.position.clone().add(new THREE.Vector3(0, 1.2, 0)).add(forward.clone().multiplyScalar(0.85));

    if (this.onCastAbility) {
      this.onCastAbility({
        casterId: this.id,
        abilityId,
        element: el,
        slot: 'E',
        type: 'PHYSICAL_PROJECTILE',
        damage: 38,
        poiseDamage: 45,
        speed: 28.0,
        radius: 1.2,
        origin: { x: spawnOrigin.x, y: spawnOrigin.y, z: spawnOrigin.z },
        direction: { x: forward.x, y: 0.05, z: forward.z }
      });
    }
  }

  castAbilityR() {
    if (this.isInputLocked || this.rCooldown > 0) return;
    this.rCooldown = 8.0;
    this.hudManager.triggerCooldown('R', 8.0);

    this.soundEngine.playOctopus();
    this.cameraController.triggerShake(0.4);

    // STRICT: Orient face directly toward opponent
    this.faceOpponent(true);

    const el = this.model?.element || 'WATER';
    let abilityId = 'THE_OCTOPUS';
    if (el === 'EARTH') abilityId = 'SEISMIC_SNARE';
    else if (el === 'FIRE') abilityId = 'FIRESTORM';
    else if (el === 'AIR') abilityId = 'TEMPEST';

    // STRICT: Fire directly in the exact face direction of the 3D GLB model
    const forward = this.getGlbFaceDirection();

    if (this.onCastAbility) {
      this.onCastAbility({
        casterId: this.id,
        abilityId,
        element: el,
        slot: 'R',
        type: 'AOE_SPHERE',
        center: { x: this.position.x, y: this.position.y, z: this.position.z },
        origin: { x: this.position.x, y: this.position.y, z: this.position.z },
        direction: { x: forward.x, y: 0, z: forward.z },
        radius: 6.5,
        length: 18.0,
        damage: 42,
        poiseDamage: 65
      });
    }
  }

  getGlbFaceDirection() {
    // Exact forward unit vector that the 3D GLB model's face / chest is currently pointing
    const yaw = this.model?.group?.rotation?.y || 0;
    return new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)).normalize();
  }

  getCombatForwardVector() {
    // Strictly and always return the exact face direction of the 3D GLB model!
    return this.getGlbFaceDirection();
  }

  faceOpponent(instant = false, dt = 0.016) {
    if (!this.targetOpponent || this.targetOpponent.isDead) return;
    const oppPos = this.targetOpponent.currentPos || this.targetOpponent.position || this.targetOpponent.model?.group?.position;
    if (!oppPos) return;

    const dx = oppPos.x - this.position.x;
    const dz = oppPos.z - this.position.z;
    if (Math.hypot(dx, dz) < 0.1) return;

    const targetAngle = Math.atan2(dx, dz);
    if (instant) {
      this.model.group.rotation.y = targetAngle;
    } else {
      let diff = targetAngle - this.model.group.rotation.y;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      const turnSpeed = this.isAttacking ? 35.0 : 18.0;
      const turnDamp = 1.0 - Math.exp(-turnSpeed * dt);
      this.model.group.rotation.y += diff * turnDamp;
    }
  }

  snapOrientationToTarget() {
    this.faceOpponent(true);
  }

  // Authentic Hitstop micro-pause (freezes kinematic motion for crunchy impact feel)
  triggerHitstop(duration = 0.065) {
    this.hitstopTimer = duration;
  }

  // Physical knockback impulse received from impacts
  applyKnockback(dir, force = 7.5, upwardPop = 1.8) {
    if (!dir) return;
    const len = Math.hypot(dir.x, dir.z) || 1.0;
    this.velocity.x += (dir.x / len) * force;
    this.velocity.z += (dir.z / len) * force;
    if (upwardPop > 0) {
      this.velocity.y = Math.max(this.velocity.y, upwardPop);
      this.isGrounded = false;
    }
  }

  spawnGoldSparkVFX() {
    // Golden flash burst on gold-link combo connect
    const sparkGeo = new THREE.RingGeometry(0.3, 0.45, 16);
    const sparkMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide
    });
    const spark = new THREE.Mesh(sparkGeo, sparkMat);
    spark.position.copy(this.position).add(new THREE.Vector3(0, 1.2, 0));
    spark.rotation.x = Math.PI / 2;
    this.scene.add(spark);

    this.afterimages.push({
      mesh: spark,
      createdAt: Date.now(),
      lifetime: 0.18
    });
  }

  spawnBodyCollisionSparks(x, y, z) {
    if (!this.scene) return;
    const ringGeo = new THREE.RingGeometry(0.2, 0.65, 16);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(x, y, z);
    ring.rotation.x = Math.PI / 2;
    this.scene.add(ring);

    this.afterimages.push({
      mesh: ring,
      createdAt: Date.now(),
      lifetime: 0.22
    });
  }

  // Authentic Martial Punch Swipe Ribbon & Forward Air Shockwave
  spawnPunchSwipeVFX(forward, comboStep, isHeavy = false) {
    if (!this.scene) return;

    const el = this.model?.element || 'WATER';
    const arcColor = {
      WATER: 0x38bdf8,
      FIRE:  0xf97316,
      EARTH: 0xa3e635,
      AIR:   0xf0fdf4
    }[el] || 0x38bdf8;

    const yaw = Math.atan2(forward.x, forward.z);

    if (isHeavy) {
      // 1. Heavy Breaker Downward Smash Arc (RMB)
      const arcGeo = new THREE.RingGeometry(0.85, 2.5, 24, 1, -Math.PI * 0.15, Math.PI * 0.75);
      const arcMat = new THREE.MeshBasicMaterial({
        color: arcColor,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.95
      });
      const arcMesh = new THREE.Mesh(arcGeo, arcMat);
      arcMesh.position.copy(this.position).add(forward.clone().multiplyScalar(1.2));
      arcMesh.position.y += 1.25;
      arcMesh.rotation.y = yaw - Math.PI / 2;
      arcMesh.rotation.x = Math.PI / 4;
      this.scene.add(arcMesh);

      let scale = 1.0;
      this.afterimages.push({
        mesh: arcMesh,
        createdAt: Date.now(),
        lifetime: 0.22,
        onUpdate: (dt) => {
          scale += dt * 5.0;
          arcMesh.scale.set(scale, scale, scale);
          arcMat.opacity = Math.max(0, arcMat.opacity - dt * 4.5);
        }
      });

      // Ground crack shockwave ring on heavy slam
      setTimeout(() => {
        const groundGeo = new THREE.RingGeometry(0.4, 2.2, 32);
        const groundMat = new THREE.MeshBasicMaterial({
          color: arcColor,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.9
        });
        const groundRing = new THREE.Mesh(groundGeo, groundMat);
        groundRing.position.copy(this.position).add(forward.clone().multiplyScalar(1.5));
        groundRing.position.y = 0.05;
        groundRing.rotation.x = -Math.PI / 2;
        this.scene.add(groundRing);

        let gScale = 1.0;
        this.afterimages.push({
          mesh: groundRing,
          createdAt: Date.now(),
          lifetime: 0.35,
          onUpdate: (dt) => {
            gScale += dt * 6.5;
            groundRing.scale.set(gScale, gScale, gScale);
            groundMat.opacity = Math.max(0, groundMat.opacity - dt * 2.8);
          }
        });
      }, 120);

    } else if (comboStep === 3) {
      // 2. Combo Step 3: Massive Roundhouse / Drop Kick Crescent Moon Arc
      const arcGeo = new THREE.RingGeometry(1.0, 3.2, 32, 1, -Math.PI * 0.45, Math.PI * 0.95);
      const arcMat = new THREE.MeshBasicMaterial({
        color: arcColor,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.95
      });
      const arcMesh = new THREE.Mesh(arcGeo, arcMat);
      arcMesh.position.copy(this.position).add(forward.clone().multiplyScalar(1.1));
      arcMesh.position.y += 0.95;
      arcMesh.rotation.x = -Math.PI / 2 + 0.1;
      arcMesh.rotation.z = yaw - Math.PI / 2;
      this.scene.add(arcMesh);

      let scale = 1.0;
      this.afterimages.push({
        mesh: arcMesh,
        createdAt: Date.now(),
        lifetime: 0.22,
        onUpdate: (dt) => {
          scale += dt * 6.0;
          arcMesh.scale.set(scale, scale, scale);
          arcMat.opacity = Math.max(0, arcMat.opacity - dt * 4.2);
        }
      });

    } else if (comboStep === 2) {
      // 3. Combo Step 2: Upward Diagonal Slash Arc (Left Hook / Uppercut)
      const arcGeo = new THREE.RingGeometry(0.7, 2.1, 24, 1, -Math.PI * 0.25, Math.PI * 0.65);
      const arcMat = new THREE.MeshBasicMaterial({
        color: arcColor,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.95
      });
      const arcMesh = new THREE.Mesh(arcGeo, arcMat);
      arcMesh.position.copy(this.position).add(forward.clone().multiplyScalar(0.95));
      arcMesh.position.y += 1.05;
      arcMesh.rotation.y = yaw;
      arcMesh.rotation.z = -Math.PI / 4;
      arcMesh.rotation.x = -Math.PI / 6;
      this.scene.add(arcMesh);

      let scale = 1.0;
      this.afterimages.push({
        mesh: arcMesh,
        createdAt: Date.now(),
        lifetime: 0.18,
        onUpdate: (dt) => {
          scale += dt * 6.5;
          arcMesh.scale.set(scale, scale, scale);
          arcMat.opacity = Math.max(0, arcMat.opacity - dt * 5.2);
        }
      });

    } else {
      // 4. Combo Step 1: Right Cross Punch Horizontal Slash Arc
      const arcGeo = new THREE.RingGeometry(0.75, 2.2, 24, 1, -Math.PI * 0.35, Math.PI * 0.7);
      const arcMat = new THREE.MeshBasicMaterial({
        color: arcColor,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.95
      });
      const arcMesh = new THREE.Mesh(arcGeo, arcMat);
      arcMesh.position.copy(this.position).add(forward.clone().multiplyScalar(0.95));
      arcMesh.position.y += 1.18;
      arcMesh.rotation.x = -Math.PI / 2 + 0.18;
      arcMesh.rotation.z = yaw - Math.PI / 2;
      this.scene.add(arcMesh);

      let scale = 1.0;
      this.afterimages.push({
        mesh: arcMesh,
        createdAt: Date.now(),
        lifetime: 0.18,
        onUpdate: (dt) => {
          scale += dt * 6.5;
          arcMesh.scale.set(scale, scale, scale);
          arcMat.opacity = Math.max(0, arcMat.opacity - dt * 5.2);
        }
      });
    }

    // Forward Air Shockwave Conical Ring (Martial speed compression wave)
    const shockGeo = new THREE.RingGeometry(0.2, 0.55, 20);
    const shockMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85
    });
    const shockRing = new THREE.Mesh(shockGeo, shockMat);
    shockRing.position.copy(this.position).add(forward.clone().multiplyScalar(0.75));
    shockRing.position.y += 1.15;
    shockRing.lookAt(shockRing.position.clone().add(forward));
    this.scene.add(shockRing);

    let shockScale = 1.0;
    const shockVel = forward.clone().multiplyScalar(5.5);
    this.afterimages.push({
      mesh: shockRing,
      createdAt: Date.now(),
      lifetime: 0.16,
      onUpdate: (dt) => {
        shockRing.position.addScaledVector(shockVel, dt);
        shockScale += dt * 7.0;
        shockRing.scale.set(shockScale, shockScale, shockScale);
        shockMat.opacity = Math.max(0, shockMat.opacity - dt * 5.5);
      }
    });

    // 4-6 Flying Elemental Sparks burst along the punch vector
    const sparkCount = isHeavy ? 10 : 6;
    for (let s = 0; s < sparkCount; s++) {
      const pGeo = new THREE.BoxGeometry(0.07, 0.07, 0.07);
      const pMat = new THREE.MeshBasicMaterial({
        color: arcColor,
        transparent: true,
        opacity: 0.95
      });
      const pMesh = new THREE.Mesh(pGeo, pMat);
      pMesh.position.copy(this.position).add(forward.clone().multiplyScalar(0.65));
      pMesh.position.y += 1.15;
      this.scene.add(pMesh);

      const lateral = new THREE.Vector3(-forward.z, 0, forward.x);
      const spread = (Math.random() - 0.5) * 2.2;
      const pVel = forward.clone().multiplyScalar(7.0 + Math.random() * 5.0)
        .add(lateral.multiplyScalar(spread))
        .add(new THREE.Vector3(0, (Math.random() - 0.2) * 2.5, 0));

      this.afterimages.push({
        mesh: pMesh,
        createdAt: Date.now(),
        lifetime: 0.25 + Math.random() * 0.15,
        onUpdate: (dt) => {
          pMesh.position.addScaledVector(pVel, dt);
          pVel.y -= 9.8 * dt; // gravity
          pMat.opacity = Math.max(0, pMat.opacity - dt * 3.5);
        }
      });
    }
  }

  update(dt, arenaColliders) {
    // Safety auto-recovery watchdog: ensure combat actions never get stuck
    const now = Date.now();
    if (this.isAttacking && (now - this.lastAttackTime > 850)) {
      this.isAttacking = false;
      this.bufferedAttack = null;
      if (this.model) this.model.setWhipActive(false);
    }
    if (this.isDashing && (now - (this.lastDodgeTime || 0) > 600)) {
      this.isDashing = false;
      this.isInvulnerable = false;
    }

    // Authentic Hitstop: momentary freeze frame on impactful hits
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      return;
    }

    // Cooldown updates
    if (this.dodgeCooldown > 0) this.dodgeCooldown -= dt;
    if (this.qCooldown > 0) this.qCooldown -= dt;
    if (this.eCooldown > 0) this.eCooldown -= dt;
    if (this.rCooldown > 0) this.rCooldown -= dt;

    // Ice Surfing State (Holding Shift unlocks free-sprint carving)
    const wantsSurf = !!(this.keys['ShiftLeft'] || this.keys['ShiftRight'] || this.keys['Shift']);
    if (wantsSurf && !this.isSurfing) {
      this.isSurfing = true;
      this.setGuardState(false);
      const forward = this.cameraController.getForwardDirection();
      this.proceduralIce.startSurfing(this.position, forward);
      this.cameraController.setSurfingFOV(true);
      this.soundEngine.startSurfAudio();
      if (this.hudManager && this.hudManager.setSurfingActive) {
        this.hudManager.setSurfingActive(true);
      }
    } else if (!wantsSurf && this.isSurfing) {
      this.isSurfing = false;
      this.proceduralIce.stopSurfing();
      this.cameraController.setSurfingFOV(false);
      this.soundEngine.stopSurfAudio();
      if (this.hudManager && this.hudManager.setSurfingActive) {
        this.hudManager.setSurfingActive(false);
      }
    }

    // Lock movement during pre-round countdown
    if (this.isInputLocked) {
      this.velocity.x *= 0.7;
      this.velocity.z *= 0.7;
      this.model.updateAnimation(dt, 0, false, false);
      return;
    }

    // Absolver Dynamic Movement & Orbital Strafing
    const forwardCam = this.cameraController.getForwardDirection();
    const rightCam = this.cameraController.getRightDirection();

    let oppPos = null;
    let distToOpp = 999;
    let isOppDead = false;
    if (this.targetOpponent) {
      oppPos = this.targetOpponent.currentPos || this.targetOpponent.position;
      isOppDead = !!this.targetOpponent.isDead;
      if (oppPos) distToOpp = this.position.distanceTo(oppPos);
    }

    if (this.isSurfing) {
      // Ice Surfing Carving Controls (Zero-allocation)
      this._scratchSurf.copy(forwardCam);
      if (this.isLeft()) this._scratchSurf.addScaledVector(rightCam, -0.65);
      if (this.isRight()) this._scratchSurf.addScaledVector(rightCam, 0.65);
      if (this.isBackward()) this._scratchSurf.multiplyScalar(0.5);
      this._scratchSurf.normalize();

      const surfSpeed = MOVEMENT_CONSTANTS.ICE_SURF_BASE;
      this.velocity.x += (this._scratchSurf.x * surfSpeed - this.velocity.x) * (dt * 6.5);
      this.velocity.z += (this._scratchSurf.z * surfSpeed - this.velocity.z) * (dt * 6.5);

      const targetAngle = Math.atan2(this.velocity.x, this.velocity.z);
      this.model.group.rotation.y = targetAngle;

    } else if (this.isDashing) {
      // Evasive dodge slip momentum maintained

    } else {
      // Free Camera-Relative WASD Combat Movement (Zero-allocation)
      this._scratchMove.set(0, 0, 0);
      if (this.isForward()) this._scratchMove.add(forwardCam);
      if (this.isBackward()) this._scratchMove.sub(forwardCam);
      if (this.isRight()) this._scratchMove.add(rightCam);
      if (this.isLeft()) this._scratchMove.sub(rightCam);

      if (this._scratchMove.lengthSq() > 0.001) {
        this._scratchMove.normalize();
        const baseSpeed = this.isGuarding ? 4.5 : MOVEMENT_CONSTANTS.RUN_SPEED;
        this.velocity.x += (this._scratchMove.x * baseSpeed - this.velocity.x) * Math.min(1.0, dt * 14.0);
        this.velocity.z += (this._scratchMove.z * baseSpeed - this.velocity.z) * Math.min(1.0, dt * 14.0);

      } else {
        const damping = this.isAttacking ? 0.90 : 0.82;
        this.velocity.x *= damping;
        this.velocity.z *= damping;
      }

      // STRICT: In arena combat, the character's face direction strictly and continuously faces the opponent!
      if (this.targetOpponent && !this.targetOpponent.isDead) {
        this.faceOpponent(false, dt);
      } else if (this._scratchMove.lengthSq() > 0.001) {
        // Fallback: outside combat or after match, face travel direction
        const targetAngle = Math.atan2(this.velocity.x, this.velocity.z);
        let diff = targetAngle - this.model.group.rotation.y;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        const turnDamp = 1.0 - Math.exp(-22.0 * dt);
        this.model.group.rotation.y += diff * turnDamp;
      }
    }

    // Gravity
    this.velocity.y += MOVEMENT_CONSTANTS.GRAVITY * dt;

    // Kinematics Position Step
    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
    this.position.z += this.velocity.z * dt;

    // 3D Capsule / Cylinder Character-to-Character Physical Collision
    if (this.targetOpponent && !this.targetOpponent.isDead) {
      const oppPos = this.targetOpponent.currentPos || this.targetOpponent.position;
      if (oppPos) {
        const dx = this.position.x - oppPos.x;
        const dz = this.position.z - oppPos.z;
        const dist = Math.hypot(dx, dz);
        const MIN_DIST = 1.35; // combined physical fighter capsule radius (0.67m each)

        if (dist < MIN_DIST && dist > 0.001) {
          const overlap = MIN_DIST - dist;
          const nx = dx / dist;
          const nz = dz / dist;

          // Push player out of opponent's body
          this.position.x += nx * overlap;
          this.position.z += nz * overlap;

          // Relative inward velocity check
          const velAlongNormal = this.velocity.x * (-nx) + this.velocity.z * (-nz);
          if (velAlongNormal > 0) {
            // Cancel penetration velocity
            this.velocity.x -= (-nx) * velAlongNormal;
            this.velocity.z -= (-nz) * velAlongNormal;

            // Trigger physical body collision impact VFX and sound if colliding with force
            if (velAlongNormal > 3.2 && this.soundEngine) {
              this.soundEngine.playBodyCollision();
              this.spawnBodyCollisionSparks(
                (this.position.x + oppPos.x) * 0.5,
                1.1,
                (this.position.z + oppPos.z) * 0.5
              );
            }
          }
        }
      }
    }

    // Ice Ramp Collision & Apex Launch
    const rampCheck = this.proceduralIce.checkRampCollision(this.position);
    if (rampCheck && rampCheck.onRamp) {
      this.position.y = rampCheck.surfaceY;
      this.isAirborne = false;
      this.wasOnRamp = true;
      this.currentRampInUse = rampCheck.ramp;

      // STRICT: Orient the GLB model to face forward along the ramp so the character climbs it straight forward, never sideways!
      if (rampCheck.rampForward) {
        const rampAngle = Math.atan2(rampCheck.rampForward.x, rampCheck.rampForward.z);
        let diff = rampAngle - this.model.group.rotation.y;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        this.model.group.rotation.y += diff * Math.min(1.0, dt * 25.0);
      }

      if (rampCheck.isAtLaunchLip) {
        // Fluid apex vault into jump
        this.velocity.y = 7.8;
        this.isAirborne = true;
        this.soundEngine.playJump();
        if (rampCheck.rampForward) {
          this.velocity.x = rampCheck.rampForward.x * 12.5;
          this.velocity.z = rampCheck.rampForward.z * 12.5;
        }
        // STRICT: Just after jumping off the ramp apex, ice ramp is immediately removed!
        this.proceduralIce.removeRamp(rampCheck.ramp);
        if (this.activePlayerRamp === rampCheck.ramp) this.activePlayerRamp = null;
        this.currentRampInUse = null;
        this.wasOnRamp = false;
      } else {
        // Smooth riding along incline
        this.velocity.y = 2.0;
        if (rampCheck.rampForward) {
          this.velocity.x = rampCheck.rampForward.x * 11.5;
          this.velocity.z = rampCheck.rampForward.z * 11.5;
        }
      }

      this.proceduralIce.spawnSurfFrostParticles(this.position, forwardCam);
      if (this.isSurfing) {
        this.proceduralIce.addSurfingSegment(this.position, forwardCam);
      }
    } else {
      if (this.wasOnRamp && this.currentRampInUse) {
        // Player just vaulted or left the ramp into the air! Remove the ramp immediately!
        this.proceduralIce.removeRamp(this.currentRampInUse);
        this.currentRampInUse = null;
        if (this.activePlayerRamp) {
          this.proceduralIce.removeRamp(this.activePlayerRamp);
          this.activePlayerRamp = null;
        }
      }
      this.wasOnRamp = false;

      if (this.position.y <= 0) {
        // Ground plane
        if (this.isAirborne && this.velocity.y < -3.5 && this.cameraController) {
          this.cameraController.triggerLandingDip(0.06);
          if (this.soundEngine) this.soundEngine.playFootstep();
        }
        this.position.y = 0;
        this.velocity.y = 0;
        this.isAirborne = false;

        if (this.isSurfing) {
          this.proceduralIce.spawnSurfFrostParticles(this.position, forwardCam);
          this.proceduralIce.addSurfingSegment(this.position, forwardCam);
        }
      } else {
        this.isAirborne = true;
      }
    }

    // Colosseum & Glacial Arena Boundary & Hard Ceiling Clamp
    const MAX_ARENA_RADIUS = 26.2;
    const horizDist = Math.hypot(this.position.x, this.position.z);
    if (horizDist > MAX_ARENA_RADIUS) {
      const scale = MAX_ARENA_RADIUS / horizDist;
      this.position.x *= scale;
      this.position.z *= scale;
      this.velocity.x *= 0.2;
      this.velocity.z *= 0.2;
    }

    // Hard ceiling cap so holding Space or ramp launch NEVER flies outside or over arena walls
    const MAX_HEIGHT_CAP = 6.2;
    if (this.position.y > MAX_HEIGHT_CAP) {
      this.position.y = MAX_HEIGHT_CAP;
      if (this.velocity.y > 0) this.velocity.y = 0;
    }

    // Update 3D Character Model Visuals
    this.model.group.position.copy(this.position);
    const groundSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    this.model.updateAnimation(dt, groundSpeed, this.isSurfing, this.isAirborne);

    // Update Afterimages & Transient Combat VFX
    for (let i = this.afterimages.length - 1; i >= 0; i--) {
      const a = this.afterimages[i];
      const age = (now - a.createdAt) / 1000;
      if (a.onUpdate) {
        a.onUpdate(dt, age);
      }
      if (age >= a.lifetime) {
        this.scene.remove(a.mesh);
        if (a.mesh.geometry) a.mesh.geometry.dispose();
        if (a.mesh.material) a.mesh.material.dispose();
        this.afterimages.splice(i, 1);
      }
    }
  }
}
