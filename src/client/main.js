// Flowbound: Masters of Four - Client Application Entry Point

import * as THREE from 'three';
import { SceneManager } from './engine/SceneManager.js';
import { CameraController } from './engine/CameraController.js';
import { ColosseumArena } from './world/ColosseumArena.js';
import { ProceduralIce } from './world/ProceduralIce.js';
import { EarthTerraform } from './world/EarthTerraform.js';
import { SoundEngine } from './audio/SoundEngine.js';
import { HUDManager } from './ui/HUDManager.js';
import { RecapScreen } from './ui/RecapScreen.js';
import { GameFlowManager } from './ui/GameFlowManager.js';
import { CharacterSelect3D } from './ui/CharacterSelect3D.js';
import { PlayerController } from './entities/PlayerController.js';
import { CharacterModel } from './entities/CharacterModel.js';
import { RemoteCharacter } from './entities/RemoteCharacter.js';
import { NetworkClient } from './net/NetworkClient.js';
import { BotAI } from '../server/BotAI.js';
import { RoomManager } from '../server/RoomManager.js';

class FlowboundGame {
  constructor() {
    this.container = document.getElementById('app') || document.body;

    // 1. Core Engine Subsystems
    this.sceneManager = new SceneManager(this.container);
    this.cameraController = new CameraController(this.sceneManager.renderer.domElement);
    this.soundEngine = new SoundEngine();
    this.hudManager = new HUDManager();
    this.recapScreen = new RecapScreen();

    // 2. World & Terraforming Systems
    this.arena = new ColosseumArena(this.sceneManager.scene);
    this.proceduralIce = new ProceduralIce(this.sceneManager.scene);
    this.earthTerraform = new EarthTerraform(this.sceneManager.scene);

    // 3. Local Player Controller (Initially hidden until match commences)
    this.player = new PlayerController(
      this.sceneManager.scene,
      this.cameraController,
      this.proceduralIce,
      this.earthTerraform,
      this.soundEngine,
      this.hudManager
    );
    this.player.model.group.visible = false;

    // 4. Remote Combatants / Opponents Map
    this.remoteCharacters = new Map();
    this.activeVFX = [];

    // 5. Network Subsystem
    this.network = new NetworkClient();
    this.isStandalone = false;
    this.localRoom = null;

    // 6. Complete 3D Character Selection & Game Flow Experience
    const hint = document.getElementById('click-to-play-hint');
    if (hint) hint.style.display = 'none';
    this.playerName = localStorage.getItem('flowbound_player_name') || 'DRAGON_FIST';

    const qcw = document.getElementById('quick-controls-wrapper');
    if (qcw) qcw.style.display = 'none';

    this.characterSelect3D = new CharacterSelect3D(
      this.sceneManager.scene,
      this.cameraController.camera,
      (fighter, customName) => this.onCharacterSelected(fighter, customName)
    );
    this.characterSelect3D.showStage(); // Camera placed immediately at y = 202; zero flash into arena!

    this.isGamePaused = false;

    this.gameFlow = new GameFlowManager(
      () => this.characterSelect3D.openUI(),
      (config) => this.onMatchStartSelected(config)
    );

    // Loop Timing
    this.clock = new THREE.Clock();
    this.init();
  }

  onCharacterSelected(fighter, customName) {
    this.characterSelect3D.hide();
    this.playerName = customName || localStorage.getItem('flowbound_player_name') || 'DRAGON_FIST';
    this.gameFlow.showArenaSelect(fighter, this.playerName);
  }

  onMatchStartSelected(config) {
    console.log('[Flowbound] Match starting with config:', config);
    this.soundEngine.playRoundVictory();

    this.chosenArena = (config?.arena || 'COLOSSEUM').toUpperCase();
    if (this.chosenArena === 'BASIN') this.chosenArena = 'GLACIER';

    // Dynamically set arena strictly according to player's chosen battleground card
    this.arena.setArenaType(this.chosenArena, this.sceneManager);

    // Clean wipe any leftover terraform objects, ramps, and VFX from previous sessions
    this.proceduralIce.clearAll();
    this.earthTerraform.clearAll();
    for (const vfx of this.activeVFX) {
      if (vfx.mesh) this.sceneManager.scene.remove(vfx.mesh);
    }
    this.activeVFX = [];

    const hint = document.getElementById('click-to-play-hint');
    if (hint) hint.style.display = 'block';
    const qcw = document.getElementById('quick-controls-wrapper');
    if (qcw) qcw.style.display = 'flex';
    this.hudManager.setVisible(true);

    const charConfig = config.character || { id: 'WATER', name: this.playerName || 'DRAGON_FIST' };
    const oppConfig = config.opponent || { id: 'EARTH', name: 'PCNASTYX' };

    // Update Top Combat HUD with Fighter Names and Elements
    this.hudManager.setFighterNames(charConfig.name, charConfig.id, oppConfig.name, oppConfig.id);
    this.hudManager.updatePlayerHP(300, 300, 200, 200);
    this.hudManager.updateBotHP(300, 300, 200, 200);

    // Set local player's model and spawn at south gate (z = -14) facing North
    this.player.setModel(charConfig.id);
    this.player.resetCombatState(0, 0, -14, 0);
    this.player.model.group.visible = true;

    // Clean up existing remote characters and spawn designated rival at north gate (z = 14) facing South
    for (const remote of this.remoteCharacters.values()) {
      remote.destroy();
    }
    this.remoteCharacters.clear();

    const rival = new RemoteCharacter(this.sceneManager.scene, 'bot_rival', oppConfig.name, oppConfig.id);
    rival.currentPos.set(0, 0, 14);
    rival.targetPos.set(0, 0, 14);
    rival.currentYaw = Math.PI;
    rival.targetYaw = Math.PI;
    rival.model.group.position.set(0, 0, 14);
    rival.model.group.rotation.y = Math.PI;
    this.remoteCharacters.set('bot_rival', rival);

    // Align camera directly behind the player looking forward at opponent
    this.cameraController.resetToCombat(this.player.position, rival.currentPos);

    // Blur any active DOM element so keyboard controls receive full focus
    if (document.activeElement && document.activeElement.blur) {
      document.activeElement.blur();
    }
    window.focus();

    // Start 1v1 match in server or standalone (passing chosen arena and level strictly!)
    const startLevel = config?.level || 1;
    if (this.network.isConnected) {
      this.network.joinMatch(charConfig.name, charConfig.id, oppConfig, this.chosenArena, startLevel);
    } else {
      this.setupStandaloneRoom(charConfig, oppConfig, this.chosenArena, startLevel);
    }

    try {
      this.sceneManager.renderer.domElement.requestPointerLock();
    } catch (e) {}
  }

  async init() {
    console.log('[Flowbound] Initializing 3D Elemental Arena...');

    // Wire up player ability casts
    this.player.onCastAbility = (abilityData) => {
      if (this.network.isConnected) {
        this.network.sendAbility(abilityData);
      } else if (this.localRoom) {
        abilityData.casterId = 'local_player';
        this.localRoom.broadcastAbility(abilityData);
      }
    };

    // Celebration Key Listener: Press Space to claim victory and open scorecard
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && this.isCelebrationMode) {
        e.preventDefault();
        this.requestOpenRecap();
      }

      // Pause Game listener (Escape or P)
      if (e.code === 'Escape' || e.code === 'KeyP') {
        const recapOverlay = document.getElementById('flowbound-recap-overlay');
        const isRecapOpen = recapOverlay && recapOverlay.style.display === 'flex';
        const gameFlowOverlay = document.getElementById('game-flow-overlay');
        const isFlowOpen = gameFlowOverlay && gameFlowOverlay.style.display === 'flex';
        if (!isRecapOpen && !isFlowOpen && this.hudManager && this.hudManager.container && this.hudManager.container.style.display !== 'none') {
          e.preventDefault();
          this.togglePause();
        }
      }
    });

    // Wire up Pause System
    this.hudManager.setupPauseHandlers(
      () => this.togglePause(),
      () => this.restartCurrentRound(),
      () => this.toggleSoundMute(),
      () => this.quitToLevelSelect()
    );

    // Wire up RecapScreen action buttons
    this.recapScreen.onNextRound = (perkId) => {
      console.log('[Flowbound] Next round / level initiated with perk:', perkId);
      if (this.network.isConnected) {
        this.network.send('NEXT_ROUND', { perkId });
      } else if (this.localRoom) {
        this.localRoom.advanceToNextRound('local_player', perkId);
      }
    };

    this.recapScreen.onRematch = () => {
      console.log('[Flowbound] Rematch initiated');
      if (this.network.isConnected) {
        this.network.send('REMATCH', {});
      } else if (this.localRoom) {
        this.localRoom.restartMatch();
      }
    };

    this.recapScreen.onCharacterSelect = () => {
      this.hudManager.setVisible(false);
      const qcw = document.getElementById('quick-controls-wrapper');
      if (qcw) qcw.style.display = 'none';
      if (this.localRoom) {
        this.localRoom.destroy();
        this.localRoom = null;
      }
      if (this.network.isConnected) {
        this.network.leaveMatch();
      }
      this.characterSelect3D.openUI();
    };

    this.recapScreen.onMainMenu = () => {
      this.hudManager.setVisible(false);
      const qc = document.getElementById('quick-controls');
      if (qc) qc.style.display = 'none';
      if (this.localRoom) {
        this.localRoom.destroy();
        this.localRoom = null;
      }
      if (this.network.isConnected) {
        this.network.leaveMatch();
      }
      this.gameFlow.showTitle();
    };

    // Attempt Network Connection (pure socket connection, no premature join!)
    const connected = await this.network.connect();

    if (connected) {
      this.setupNetworkCallbacks();
    } else {
      console.log('[Flowbound] Dedicated server unavailable; ready for Offline Standalone Mode.');
      this.isStandalone = true;
    }

    // Start 60 FPS Render Loop
    this.animate();
  }

  setupNetworkCallbacks() {
    this.network.onStateSync = (data) => {
      const activeIds = new Set(data.players.map(p => p.id));

      // Cleanup disconnected remote characters immediately
      for (const [id, remote] of this.remoteCharacters) {
        if (!activeIds.has(id)) {
          remote.destroy();
          this.remoteCharacters.delete(id);
        }
      }

      for (const pState of data.players) {
        if (pState.id === this.network.localPlayerId) {
          // Reconcile local player health & poise
          this.player.health = pState.health;
          this.player.poise = pState.poise;
          this.hudManager.updatePlayerHP(pState.health, pState.maxHealth || 300, pState.poise, pState.maxPoise || 200);
        } else {
          // Update or create remote opponent
          let remote = this.remoteCharacters.get(pState.id);
          if (!remote) {
            remote = new RemoteCharacter(this.sceneManager.scene, pState.id, pState.name || 'RIVAL', pState.element || 'EARTH');
            this.remoteCharacters.set(pState.id, remote);
          }
          remote.updateFromState(pState);
          this.hudManager.updateBotHP(pState.health, pState.maxHealth || 300, pState.poise, pState.maxPoise || 200);
        }
      }
    };

    this.network.onAbilityCast = (ability) => {
      this.handleWorldAbility(ability);
    };

    this.network.onDamageEvent = (hit) => {
      this.handleDamageEvent(hit);
    };

    this.network.onElementalClash = (data) => {
      this.handleElementalClash(data);
    };

    this.network.onFatalBlow = (data) => {
      this.handleFatalBlow(data);
    };

    this.network.onRoundStart = (data) => {
      const targetArena = data.arenaType || this.chosenArena || 'COLOSSEUM';
      if (targetArena !== this.arena.currentArenaType) {
        this.arena.setArenaType(targetArena, this.sceneManager);
      }
      if (data.playerPerks) {
        this.hudManager.updatePlayerPerks(data.playerPerks);
      }
      if (data.playerStats) {
        this.player.setPlayerStats(data.playerStats);
      }

      this.hudManager.updateRoundHeader(data.round, data.playerWins, data.botWins, data.level, data.botTier);
      this.hudManager.setCinematicLetterbox(false);
      this.hudManager.hideCelebrationPrompt();
      this.hudManager.setTensionActive(false);
      this.isCelebrationMode = false;
      this.timeDilation = 1.0;

      // Clean wipe all terraforming objects, ice ramps, and active VFX for fresh round
      this.proceduralIce.clearAll();
      this.earthTerraform.clearAll();
      for (const vfx of this.activeVFX) {
        if (vfx.mesh) this.sceneManager.scene.remove(vfx.mesh);
      }
      this.activeVFX = [];

      this.player.resetCombatState(0, 0, -14, 0);
      this.player.setInputLocked(true);
      for (const remote of this.remoteCharacters.values()) {
        remote.currentPos.set(0, 0, 14);
        remote.targetPos.set(0, 0, 14);
        remote.currentYaw = Math.PI;
        remote.targetYaw = Math.PI;
        remote.isDead = false;
        if (remote.model && remote.model.group) {
          remote.model.group.position.set(0, 0, 14);
          remote.model.group.rotation.set(0, Math.PI, 0);
        }
      }
      this.cameraController.resetToCombat(this.player.position, new THREE.Vector3(0, 0, 14));
      this.hudManager.startInArenaCountdown(this.soundEngine, () => {
        this.player.setInputLocked(false);
      });
    };

    this.network.onRoundEnd = (data) => {
      this.hudManager.setCinematicLetterbox(false);
      this.hudManager.hideCelebrationPrompt();
      this.hudManager.setTensionActive(false);
      this.isCelebrationMode = false;

      // Unlock next level in localStorage when current level is conquered
      if (data.isLevelOver && data.playerWonLevel) {
        const curUnlocked = parseInt(localStorage.getItem('flowbound_unlocked_level') || '1', 10);
        const nextUnlocked = Math.max(curUnlocked, (data.level || 1) + 1);
        localStorage.setItem('flowbound_unlocked_level', String(nextUnlocked));
        console.log(`[Flowbound] Level progression updated: Level ${nextUnlocked} is now UNLOCKED!`);
      }

      this.recapScreen.showRecap(data);
      this.soundEngine.playRoundVictory();
    };
  }

  setupStandaloneRoom(charConfig, oppConfig, arena, level = 1) {
    this.isStandalone = true;
    if (this.localRoom) {
      this.localRoom.destroy();
    }
    this.localRoom = new RoomManager('offline_arena');
    this.localPlayerRef = this.localRoom.addPlayer({
      send: (msg) => this.handleLocalMessage(msg),
      readyState: 1
    }, {
      id: 'local_player',
      name: charConfig?.name || this.playerName || 'DRAGON_FIST',
      element: charConfig?.id || 'WATER',
      opponent: oppConfig,
      arena: arena || this.chosenArena || 'COLOSSEUM',
      level: level || 1
    });
  }

  handleLocalMessage(raw) {
    const packet = JSON.parse(raw);
    if (!packet) return;

    if (packet.t === 'STATE_SYNC') {
      const pState = packet.d.players.find(p => p.id === 'local_player');
      if (pState) {
        this.player.health = pState.health;
        this.player.poise = pState.poise;
        this.hudManager.updatePlayerHP(pState.health, pState.maxHealth || 300, pState.poise, pState.maxPoise || 200);
      }
      const botState = packet.d.players.find(p => p.id === 'bot_rival' || p.id === 'bot_pcnastyx');
      const remote = this.remoteCharacters.get('bot_rival') || this.remoteCharacters.get('bot_pcnastyx');
      if (remote && botState) {
        remote.updateFromState(botState);
        this.hudManager.updateBotHP(botState.health, botState.maxHealth || 300, botState.poise, botState.maxPoise || 200);
      }
    } else if (packet.t === 'ABILITY_CAST') {
      this.handleWorldAbility(packet.d);
    } else if (packet.t === 'DAMAGE_EVENT') {
      this.handleDamageEvent(packet.d);
    } else if (packet.t === 'ELEMENTAL_CLASH') {
      this.handleElementalClash(packet.d);
    } else if (packet.t === 'FATAL_BLOW') {
      this.handleFatalBlow(packet.d);
    } else if (packet.t === 'ROUND_START') {
      const targetArena = packet.d.arenaType || this.chosenArena || 'COLOSSEUM';
      if (targetArena !== this.arena.currentArenaType) {
        this.arena.setArenaType(targetArena, this.sceneManager);
      }
      if (packet.d.playerPerks) {
        this.hudManager.updatePlayerPerks(packet.d.playerPerks);
      }
      if (packet.d.playerStats) {
        this.player.setPlayerStats(packet.d.playerStats);
      }

      this.hudManager.updateRoundHeader(packet.d.round, packet.d.playerWins, packet.d.botWins, packet.d.level, packet.d.botTier);
      this.hudManager.setCinematicLetterbox(false);
      this.hudManager.hideCelebrationPrompt();
      this.hudManager.setTensionActive(false);
      this.isCelebrationMode = false;
      this.timeDilation = 1.0;

      // Clean wipe all terraforming objects, ice ramps, and active VFX for fresh round
      this.proceduralIce.clearAll();
      this.earthTerraform.clearAll();
      for (const vfx of this.activeVFX) {
        if (vfx.mesh) this.sceneManager.scene.remove(vfx.mesh);
      }
      this.activeVFX = [];

      this.player.resetCombatState(0, 0, -14, 0);
      this.player.setInputLocked(true);
      for (const remote of this.remoteCharacters.values()) {
        remote.currentPos.set(0, 0, 14);
        remote.targetPos.set(0, 0, 14);
        remote.currentYaw = Math.PI;
        remote.targetYaw = Math.PI;
        remote.isDead = false;
        if (remote.model && remote.model.group) {
          remote.model.group.position.set(0, 0, 14);
          remote.model.group.rotation.set(0, Math.PI, 0);
        }
      }
      this.cameraController.resetToCombat(this.player.position, new THREE.Vector3(0, 0, 14));
      this.hudManager.startInArenaCountdown(this.soundEngine, () => {
        this.player.setInputLocked(false);
      });
    } else if (packet.t === 'ROUND_END') {
      this.hudManager.setCinematicLetterbox(false);
      this.hudManager.hideCelebrationPrompt();
      this.hudManager.setTensionActive(false);
      this.isCelebrationMode = false;
      this.recapScreen.showRecap(packet.d);
      this.soundEngine.playRoundVictory();
    }
  }

  handleFatalBlow(data) {
    console.log('[Flowbound] FATAL BLOW triggered:', data);

    // 1. Cinematic Slow-Motion Time Dilation (0.22x speed for 1.4s)
    this.timeDilation = 0.22;
    setTimeout(() => {
      this.timeDilation = 1.0;
    }, 1400);

    // 2. Camera micro-shake & sub-bass KO stinger
    if (this.cameraController.triggerShake) this.cameraController.triggerShake(0.35);
    else if (this.cameraController.shake) this.cameraController.shake(0.35);
    this.soundEngine.playDramaticSlowMoStinger();

    // 3. Cinematic Letterbox & KO Calligraphic Banner
    this.hudManager.setCinematicLetterbox(true);
    this.hudManager.showDecisiveKOBanner(data.playerWonRound);
    setTimeout(() => {
      this.hudManager.hideDecisiveKOBanner();
    }, 1800);

    // 4. Mark loser as defeated
    if (data.loserId) {
      const remote = this.remoteCharacters.get(data.loserId);
      if (remote) {
        remote.isDead = true;
      }
    }

    // 5. Clean wipe any active ice ramps & terraform for celebration arena
    this.proceduralIce.clearAll();
    this.earthTerraform.clearAll();

    // 6. Player Freedom to Move, Jump, Punch & Celebrate in Arena!
    if (data.playerWonRound) {
      this.isCelebrationMode = true;
      this.hudManager.showCelebrationPrompt(() => {
        this.requestOpenRecap();
      });
    } else {
      this.isCelebrationMode = false;
    }
  }

  requestOpenRecap() {
    this.isCelebrationMode = false;
    this.hudManager.hideCelebrationPrompt();
    this.hudManager.setCinematicLetterbox(false);
    this.proceduralIce.clearAll();
    this.earthTerraform.clearAll();

    if (this.network.isConnected) {
      this.network.send('OPEN_RECAP', {});
    } else if (this.localRoom) {
      this.localRoom.openRoundRecap();
    }
  }

  handleWorldAbility(ability) {
    const localId = this.network.localPlayerId || 'local_player';

    // Trigger visual punch / kick animation on remote attacker model
    if (ability.casterId && ability.casterId !== localId) {
      const remote = this.remoteCharacters.get(ability.casterId);
      if (remote) {
        remote.playAttack(ability.slot === 'RMB' ? 'kick' : 'punch');
      }
    }

    const orig = ability.origin ? new THREE.Vector3(ability.origin.x, ability.origin.y, ability.origin.z) : this.player.position.clone();
    const dir = ability.direction ? new THREE.Vector3(ability.direction.x, ability.direction.y, ability.direction.z).normalize() : new THREE.Vector3(0, 0, 1);

    if (ability.abilityId === 'BOULDER_KICK') {
      this.earthTerraform.spawnBoulder(orig, dir, ability.speed || 28.0);
      this.soundEngine.playFootstep();
    } else if (ability.abilityId === 'STONE_GUARD' || ability.abilityId === 'ICE_WALL' || ability.abilityId === 'FLAME_SHIELD' || ability.abilityId === 'GALE_BARRIER') {
      if (ability.casterId === localId) {
        // Already spawned instantaneously in PlayerController on keypress for 0ms responsiveness
        return;
      }
      const el = ability.element || (ability.abilityId === 'STONE_GUARD' ? 'EARTH' : 'WATER');
      this.proceduralIce.spawnIceWall(orig, dir, false, 'RAMP', el, ability.casterId);
      this.soundEngine.playIceWallSpawn();
    } else if (ability.abilityId === 'SEISMIC_SNARE') {
      this.earthTerraform.spawnFissure(orig, dir, ability.length || 18.0);
      this.soundEngine.playIceWallSpawn();
    } else if (ability.abilityId === 'WATER_CHAKRAMS') {
      this.spawnFlyingProjectile(orig, dir, 0x38bdf8, 32.0, 0.45);
      this.soundEngine.playChakramThrow();
    } else if (ability.abilityId === 'FIRE_BEAM' || ability.abilityId === 'FINGER_BLAST') {
      this.spawnFlyingProjectile(orig, dir, 0xf97316, 30.0, 0.55);
      this.soundEngine.playWhipSlash();
    } else if (ability.abilityId === 'AIR_GALE' || ability.abilityId === 'THE_CURVE') {
      this.spawnFlyingProjectile(orig, dir, 0xf0fdf4, 34.0, 0.6);
      this.soundEngine.playGhostDash();
    } else if (ability.abilityId === 'THE_OCTOPUS') {
      this.spawnRadialShockwave(orig, 0x38bdf8, 6.5);
      this.soundEngine.playOctopus();
    } else if (ability.abilityId === 'FIRESTORM') {
      this.spawnRadialShockwave(orig, 0xef4444, 7.0);
      this.soundEngine.playOctopus();
    } else if (ability.abilityId === 'TEMPEST') {
      this.spawnRadialShockwave(orig, 0xe2e8f0, 7.0);
      this.soundEngine.playOctopus();
    }
  }

  spawnFlyingProjectile(orig, dir, color = 0x38bdf8, speed = 28.0, size = 0.5) {
    const geo = new THREE.SphereGeometry(size, 16, 16);
    const mat = new THREE.MeshBasicMaterial({ color, wireframe: false });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(orig);
    this.sceneManager.scene.add(mesh);

    const ringGeo = new THREE.RingGeometry(size * 0.7, size * 1.3, 16);
    const ringMat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    mesh.add(ring);

    const vel = new THREE.Vector3(dir.x * speed, (dir.y || 0) * speed, dir.z * speed);

    this.activeVFX.push({
      mesh,
      velocity: vel,
      life: 2.2,
      onUpdate: (dt) => {
        ring.rotation.z += dt * 12;
      }
    });
  }

  spawnRadialShockwave(center, color = 0x38bdf8, maxRadius = 6.5) {
    const geo = new THREE.RingGeometry(0.5, 0.9, 32);
    const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(center);
    mesh.position.y = 0.1;
    mesh.rotation.x = -Math.PI / 2;
    this.sceneManager.scene.add(mesh);

    let currentScale = 1.0;
    this.activeVFX.push({
      mesh,
      life: 0.65,
      onUpdate: (dt) => {
        currentScale += dt * (maxRadius * 2.0);
        mesh.scale.set(currentScale, currentScale, 1.0);
        mat.opacity = Math.max(0, mat.opacity - dt * 1.35);
      }
    });
  }

  handleElementalClash(data) {
    console.log('[Flowbound VFX] Handling Elemental Clash:', data);
    const pos = new THREE.Vector3(data.x, data.y || 1.1, data.z);
    const clashType = data.clashType || 'steam';

    // 1. Audio and Camera Feedback
    if (this.soundEngine && this.soundEngine.playElementalClash) {
      this.soundEngine.playElementalClash(clashType);
    }
    if (this.cameraController && this.cameraController.triggerShake) {
      this.cameraController.triggerShake(0.35);
    }

    // 2. Primary Expanding Shockwave Ring
    let ringColor = 0xe0f2fe; // Steam white/cyan
    if (clashType === 'magma') ringColor = 0xf97316;
    else if (clashType === 'mud') ringColor = 0xb45309;
    else if (clashType === 'gale') ringColor = 0x86efac;
    else if (clashType === 'barrier_impact') ringColor = 0xfef08a;

    const ringGeo = new THREE.RingGeometry(0.3, 0.7, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: ringColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.copy(pos);
    ringMesh.rotation.x = -Math.PI / 2;
    this.sceneManager.scene.add(ringMesh);

    let ringScale = 1.0;
    this.activeVFX.push({
      mesh: ringMesh,
      life: 0.55,
      onUpdate: (dt) => {
        ringScale += dt * 8.5;
        ringMesh.scale.set(ringScale, ringScale, 1.0);
        ringMat.opacity = Math.max(0, ringMat.opacity - dt * 1.8);
      }
    });

    // 3. High-Velocity Sparks & Elemental Debris Burst (18 particles)
    const particleColors = [ringColor, 0xffffff, 0x38bdf8, 0xef4444, 0xf59e0b];
    for (let i = 0; i < 18; i++) {
      const pGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
      const pColor = particleColors[i % particleColors.length];
      const pMat = new THREE.MeshBasicMaterial({ color: pColor, transparent: true, opacity: 0.9 });
      const pMesh = new THREE.Mesh(pGeo, pMat);
      pMesh.position.copy(pos);
      this.sceneManager.scene.add(pMesh);

      // Random spherical velocity
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI;
      const speed = 4.0 + Math.random() * 8.0;
      const vel = new THREE.Vector3(
        Math.cos(phi) * Math.cos(theta) * speed,
        Math.sin(phi) * speed + 2.5,
        Math.cos(phi) * Math.sin(theta) * speed
      );

      this.activeVFX.push({
        mesh: pMesh,
        velocity: vel,
        life: 0.45 + Math.random() * 0.3,
        onUpdate: (dt) => {
          vel.y -= 14.0 * dt; // Gravity pull
          pMesh.rotation.x += dt * 10;
          pMesh.rotation.y += dt * 10;
          pMat.opacity = Math.max(0, pMat.opacity - dt * 1.5);
        }
      });
    }

    // 4. Dense Rising Steam / Smoke Clouds
    if (clashType === 'steam' || clashType === 'magma') {
      for (let s = 0; s < 4; s++) {
        const steamGeo = new THREE.SphereGeometry(0.45 + Math.random() * 0.3, 12, 12);
        const steamMat = new THREE.MeshBasicMaterial({
          color: clashType === 'steam' ? 0xf8fafc : 0x78716c,
          transparent: true,
          opacity: 0.65
        });
        const steamMesh = new THREE.Mesh(steamGeo, steamMat);
        steamMesh.position.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * 0.6, Math.random() * 0.4, (Math.random() - 0.5) * 0.6));
        this.sceneManager.scene.add(steamMesh);

        let sScale = 1.0;
        this.activeVFX.push({
          mesh: steamMesh,
          life: 0.65,
          onUpdate: (dt) => {
            steamMesh.position.y += dt * 2.2;
            sScale += dt * 2.0;
            steamMesh.scale.set(sScale, sScale, sScale);
            steamMat.opacity = Math.max(0, steamMat.opacity - dt * 1.1);
          }
        });
      }
    }
  }

  // Authentic Impact Sparks & Elemental Debris Burst (Matching Flowbound Reference Video)
  spawnHitImpactVFX(hitPoint, wasBlocked = false, damage = 20, element = 'WATER') {
    if (!hitPoint) return;
    const pos = new THREE.Vector3(hitPoint.x, hitPoint.y, hitPoint.z);

    // 1. Expanding Impact Ring Flash
    const ringColor = wasBlocked ? 0xfbbf24 : (element === 'WATER' ? 0x38bdf8 : (element === 'EARTH' ? 0xa8a29e : (element === 'FIRE' ? 0xf97316 : 0xf0fdf4)));
    const ringGeo = new THREE.RingGeometry(0.12, 0.42, 16);
    const ringMat = new THREE.MeshBasicMaterial({
      color: ringColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.copy(pos);
    ringMesh.lookAt(this.cameraController.camera.position);
    this.sceneManager.scene.add(ringMesh);

    let ringScale = 1.0;
    this.activeVFX.push({
      mesh: ringMesh,
      life: 0.18,
      onUpdate: (dt) => {
        ringScale += dt * 8.5;
        ringMesh.scale.set(ringScale, ringScale, ringScale);
        ringMat.opacity = Math.max(0, ringMat.opacity - dt * 5.5);
      }
    });

    // 2. 14-16 Flying Impact Sparks / Elemental Particles
    const particleCount = wasBlocked ? 10 : 16;
    const partColor = wasBlocked ? 0xfde047 : (element === 'WATER' ? 0x7dd3fc : (element === 'EARTH' ? 0x78716c : (element === 'FIRE' ? 0xfb923c : 0xffffff)));
    const partGeo = new THREE.BoxGeometry(0.09, 0.09, 0.09);

    for (let p = 0; p < particleCount; p++) {
      const pMat = new THREE.MeshBasicMaterial({
        color: partColor,
        transparent: true,
        opacity: 0.95
      });
      const pMesh = new THREE.Mesh(partGeo, pMat);
      pMesh.position.copy(pos);
      this.sceneManager.scene.add(pMesh);

      const spreadAngle = Math.random() * Math.PI * 2;
      const elevation = (Math.random() - 0.25) * Math.PI;
      const speed = 4.5 + Math.random() * 6.5;
      const vel = new THREE.Vector3(
        Math.cos(spreadAngle) * Math.cos(elevation) * speed,
        Math.sin(elevation) * speed + 2.2,
        Math.sin(spreadAngle) * Math.cos(elevation) * speed
      );

      this.activeVFX.push({
        mesh: pMesh,
        velocity: vel,
        life: 0.38 + Math.random() * 0.25,
        onUpdate: (dt) => {
          vel.y -= 12.0 * dt; // Gravity
          pMat.opacity = Math.max(0, pMat.opacity - dt * 2.2);
        }
      });
    }
  }

  handleDamageEvent(hit) {
    const localId = this.network.localPlayerId || 'local_player';
    const isLocalVictim = (hit.targetId === localId);
    const isLocalAttacker = (hit.attackerId === localId);

    // Strictly ignore self-damage: never allow attacker to damage themselves!
    if (isLocalVictim && isLocalAttacker) {
      console.warn('[Flowbound Combat] Ignored self-damage event:', hit);
      return;
    }

    // Determine attack element for authentic impact VFX
    let element = 'WATER';
    if (hit.attackerId) {
      const attacker = this.remoteCharacters.get(hit.attackerId);
      if (attacker && attacker.model) element = attacker.model.element;
      else if (isLocalAttacker) element = this.player.model?.element || 'WATER';
    }

    // Spawn authentic impact flash ring & elemental spark burst
    this.spawnHitImpactVFX(hit.hitPoint, hit.wasBlocked, hit.damage, element);

    if (isLocalVictim) {
      // Local player took damage from opponent
      if (hit.wasBlocked) {
        this.soundEngine.playFootstep(); // Crisp block impact
        this.cameraController.triggerShake(0.14);
        const knockDir = (hit.hitPoint)
          ? new THREE.Vector3(this.player.position.x - hit.hitPoint.x, 0, this.player.position.z - hit.hitPoint.z).normalize()
          : new THREE.Vector3(0, 0, -1);
        this.player.applyKnockback(knockDir, 2.5, 0);
      } else {
        this.soundEngine.playGuardBreak();
        this.player.model.triggerHitReaction(1.0);
        this.cameraController.triggerShake(hit.damage > 25 ? 0.45 : 0.28);
        this.hudManager.triggerDamageFlash();

        // Authentic Hit Knockback Impulse
        const knockDir = (hit.hitPoint)
          ? new THREE.Vector3(this.player.position.x - hit.hitPoint.x, 0, this.player.position.z - hit.hitPoint.z).normalize()
          : new THREE.Vector3(0, 0, -1);
        const force = hit.guardBroken ? 11.0 : (hit.damage > 25 ? 8.5 : 5.5);
        const popUp = (hit.damage > 25 || hit.guardBroken) ? 2.8 : 1.2;
        this.player.applyKnockback(knockDir, force, popUp);

        // Authentic Hitstop micro-freeze (65ms)
        this.player.triggerHitstop(0.065);
      }
    } else {
      // Opponent took damage from local player: Trigger crisp hitmarker tick, reticle 'X', and damage numbers
      this.soundEngine.playHitmarker();
      this.hudManager.triggerHitmarker();

      const opponent = this.remoteCharacters.get(hit.targetId);
      if (opponent) {
        if (opponent.model) {
          opponent.model.triggerHitReaction(1.0);
        }
        // Client-side visual knockback interpolation on opponent model
        if (hit.hitPoint && opponent.model && opponent.model.group) {
          const knockDir = new THREE.Vector3(
            opponent.model.group.position.x - hit.hitPoint.x,
            0,
            opponent.model.group.position.z - hit.hitPoint.z
          ).normalize();
          const knockDist = hit.guardBroken ? 1.5 : (hit.damage > 25 ? 1.0 : 0.5);
          opponent.model.group.position.add(knockDir.multiplyScalar(knockDist));
        }
      }

      if (hit.hitPoint) {
        const p = new THREE.Vector3(hit.hitPoint.x, hit.hitPoint.y + 0.6, hit.hitPoint.z);
        p.project(this.cameraController.camera);
        const screenX = (p.x * 0.5 + 0.5) * window.innerWidth;
        const screenY = (-(p.y * 0.5) + 0.5) * window.innerHeight;
        this.hudManager.showDamageNumber(screenX, screenY, hit.damage, hit.isHeadshot || hit.guardBroken);
      }
    }

    if (hit.guardBroken) {
      this.soundEngine.playGuardBreak();
    }
  }

  togglePause() {
    this.isGamePaused = !this.isGamePaused;
    if (this.isGamePaused) {
      try { document.exitPointerLock(); } catch (e) {}
      const info = `LEVEL ${this.currentLevel || 1} · ROUND ${this.currentRound || 1} (BEST OF 3)`;
      this.hudManager.showPauseModal(info);
      if (this.player?.model?.mixer) this.player.model.mixer.timeScale = 0;
      this.remoteCharacters.forEach(rc => { if (rc.model?.mixer) rc.model.mixer.timeScale = 0; });
      if (this.localRoom) this.localRoom.isPaused = true;
    } else {
      this.hudManager.hidePauseModal();
      if (this.player?.model?.mixer) this.player.model.mixer.timeScale = 1.0;
      this.remoteCharacters.forEach(rc => { if (rc.model?.mixer) rc.model.mixer.timeScale = 1.0; });
      if (this.localRoom) this.localRoom.isPaused = false;
    }
  }

  restartCurrentRound() {
    this.isGamePaused = false;
    this.hudManager.hidePauseModal();
    if (this.player?.model?.mixer) this.player.model.mixer.timeScale = 1.0;
    this.remoteCharacters.forEach(rc => { if (rc.model?.mixer) rc.model.mixer.timeScale = 1.0; });
    if (this.localRoom) {
      this.localRoom.isPaused = false;
      this.localRoom.startRound(this.localRoom.currentRound);
    } else if (this.network.isConnected) {
      this.network.send('REMATCH', {});
    }
  }

  toggleSoundMute() {
    const isMuted = this.soundEngine.toggleMute();
    this.hudManager.updatePauseSoundBtn(isMuted);
  }

  quitToLevelSelect() {
    this.isGamePaused = false;
    this.hudManager.hidePauseModal();
    this.hudManager.setVisible(false);
    const qcw = document.getElementById('quick-controls-wrapper');
    if (qcw) qcw.style.display = 'none';
    if (this.localRoom) {
      this.localRoom.destroy();
      this.localRoom = null;
    }
    if (this.network.isConnected) {
      this.network.leaveMatch();
    }
    if (this.characterSelect3D) {
      this.characterSelect3D.showStage();
    }
    this.gameFlow.showLevelSelect();
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    if (this.isGamePaused) {
      this.sceneManager.render(this.cameraController.camera);
      return;
    }

    const dt = Math.min(this.clock.getDelta(), 0.1) * (this.timeDilation || 1.0);

    // Dynamic Low-Health Tension Heartbeat (HP < 28%)
    if (this.player && this.player.health > 0) {
      const maxHp = this.player.maxHealth || 300;
      const hpRatio = this.player.health / maxHp;
      if (hpRatio <= 0.28 && !this.isCelebrationMode) {
        this.hudManager.setTensionActive(true);
        const now = Date.now();
        if (now - (this.lastHeartbeatTime || 0) > 1150) {
          this.lastHeartbeatTime = now;
          this.soundEngine.playHeartbeat();
        }
      } else {
        this.hudManager.setTensionActive(false);
      }
    } else {
      this.hudManager.setTensionActive(false);
    }

    // If in 3D Character Selection stage, update pedestal animation & camera, then render
    if (this.characterSelect3D && this.characterSelect3D.isActive) {
      this.characterSelect3D.update(dt);
      this.sceneManager.render(this.cameraController.camera);
      return;
    }

    // 1. Locate Primary Opponent for Lock-on & Two-Shot Camera
    let primaryOpponent = null;
    for (const remote of this.remoteCharacters.values()) {
      if (!remote.isDead) {
        primaryOpponent = remote;
        break;
      }
    }

    this.player.targetOpponent = primaryOpponent;
    const opponentPos = primaryOpponent ? primaryOpponent.model.group.position : null;

    // 2. Update Player Physics & Kinematics
    this.player.update(dt, this.arena.colliders);

    // 3. Update Dynamic Absolver Two-Shot Camera Framing
    this.cameraController.update(dt, this.player.position, opponentPos);

    // 4. Update Dynamic Arena Weather & Floating Crystals
    if (this.arena && this.arena.update) this.arena.update(dt);

    // 5. Update Procedural Terraforming
    this.proceduralIce.update(dt);
    this.earthTerraform.update(dt);

    // 5. Update Remote Characters
    for (const remote of this.remoteCharacters.values()) {
      remote.update(dt, this.cameraController.camera);
    }

    // 6. Update Active VFX & Projectiles
    for (let i = this.activeVFX.length - 1; i >= 0; i--) {
      const vfx = this.activeVFX[i];
      vfx.life -= dt;
      if (vfx.mesh && vfx.velocity) {
        vfx.mesh.position.addScaledVector(vfx.velocity, dt);
      }
      if (vfx.onUpdate) vfx.onUpdate(dt);
      if (vfx.life <= 0) {
        this.sceneManager.scene.remove(vfx.mesh);
        if (vfx.mesh.geometry) vfx.mesh.geometry.dispose();
        if (vfx.mesh.material) vfx.mesh.material.dispose();
        this.activeVFX.splice(i, 1);
      }
    }

    // 7. Update Standalone Local Room (if offline)
    if (this.isStandalone && this.localRoom) {
      if (this.localPlayerRef) {
        this.localPlayerRef.x = this.player.position.x;
        this.localPlayerRef.y = this.player.position.y;
        this.localPlayerRef.z = this.player.position.z;
        this.localPlayerRef.vx = this.player.velocity.x;
        this.localPlayerRef.vy = this.player.velocity.y;
        this.localPlayerRef.vz = this.player.velocity.z;
        this.localPlayerRef.yaw = this.player.model.group.rotation.y;
        this.localPlayerRef.isSurfing = this.player.isSurfing;
        this.localPlayerRef.isGuarding = this.player.isGuarding;
        this.localPlayerRef.isInvulnerable = this.player.isInvulnerable;
      }
      this.localRoom.update(dt);
    } else if (this.network.isConnected) {
      this.network.sendInput(this.player);
    }

    // 7. Render 3D Scene
    this.sceneManager.render(this.cameraController.camera);
  }
}

// Launch on Window Load or immediately if DOM is ready
function launchGame() {
  if (!window.flowboundGame) {
    window.flowboundGame = new FlowboundGame();
  }
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', launchGame);
} else {
  launchGame();
}




