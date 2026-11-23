// Flowbound: Masters of Four - Match & Room Manager
// Manages Match Lifecycle, 60Hz State Synchronization, and Authoritative Projectile Physics

import { MATCH_RULES, COMBAT_CONSTANTS, POWER_PERKS } from '../shared/Constants.js';
import { NetworkProtocol, MSG_TYPES } from '../shared/NetworkProtocol.js';
import { CombatEngine } from './CombatEngine.js';
import { BotAI } from './BotAI.js';

export class RoomManager {
  constructor(roomId) {
    this.roomId = roomId;
    this.players = new Map(); // id -> Player
    this.combatEngine = new CombatEngine(this);
    
    // Campaign & Match State: 3 Levels, 3 Rounds per Level (Best of 3)
    this.currentLevel = 1;
    this.currentRound = 1;
    this.playerLevelWins = 0; // round wins inside current level
    this.botLevelWins = 0;    // bot round wins inside current level
    this.totalLevelsWon = 0;
    this.totalLevelsLost = 0;

    this.matchState = 'WAITING'; // WAITING, ROUND_COUNTDOWN, ROUND_ACTIVE, ROUND_CELEBRATION, ROUND_RECAP, MATCH_OVER
    this.roundTimeRemaining = MATCH_RULES.ROUND_TIME_LIMIT;
    this.chosenArena = 'COLOSSEUM';
    this.currentArenaType = 'COLOSSEUM';
    this.roundWinner = null;
    
    // Active Terraforming Actors & Projectiles
    this.activeStructures = new Map();
    this.activeProjectiles = [];
    this.projectileCounter = 0;
  }

  addPlayer(ws, playerData) {
    this.players.clear(); // Enforce strict 1v1: isolated match

    const id = playerData.id || 'player_' + Math.random().toString(36).substr(2, 6);
    const element = playerData.element || 'WATER';
    const name = playerData.name || 'WHOISCOBRAA';

    // Arena Selection Persistence: strictly preserve what was chosen on select battleground screen!
    let arenaSelection = (playerData.arena || 'COLOSSEUM').toUpperCase();
    if (arenaSelection === 'BASIN') arenaSelection = 'GLACIER';
    this.chosenArena = arenaSelection;
    this.currentArenaType = arenaSelection;

    const player = {
      id,
      ws,
      name,
      element,
      health: COMBAT_CONSTANTS.BASE_HEALTH,
      maxHealth: COMBAT_CONSTANTS.BASE_HEALTH,
      poise: COMBAT_CONSTANTS.BASE_POISE,
      maxPoise: COMBAT_CONSTANTS.BASE_POISE,
      flow: 1.0,
      x: 0,
      y: 0,
      z: -14, // Starts at south side of arena facing North
      vx: 0,
      vy: 0,
      vz: 0,
      yaw: 0,
      pitch: 0,
      isSurfing: false,
      isGuarding: false,
      isInvulnerable: false,
      isStaggered: false,
      isDead: false,
      totalDamageDealt: 0,
      finishers: 0,
      kos: 0,
      perks: [],
      dmgMult: 1.0
    };

    this.players.set(id, player);

    // Designated Unique Rival AI (guaranteed distinct element & model)
    const OPPONENT_CONFIG = {
      WATER: { element: 'EARTH', name: 'PCNASTYX' },
      EARTH: { element: 'WATER', name: 'WHOISCOBRAA' },
      FIRE:  { element: 'AIR',   name: 'ZEPHYR' },
      AIR:   { element: 'FIRE',  name: 'IGNIS' }
    };
    const opp = (playerData.opponent && (playerData.opponent.id || playerData.opponent.element)) ? 
      { element: (playerData.opponent.id || playerData.opponent.element).toUpperCase(), name: playerData.opponent.name || 'RIVAL' } :
      (OPPONENT_CONFIG[element] || OPPONENT_CONFIG.WATER);
    const bot = new BotAI('bot_rival', opp.name, opp.element, this);
    bot.x = 0;
    bot.y = 0;
    bot.z = 14; // Starts on north side of arena facing South
    bot.yaw = Math.PI;
    this.players.set(bot.id, bot);

    // Start at player's chosen level
    this.currentLevel = playerData.level || 1;
    this.currentRound = 1;
    this.playerLevelWins = 0;
    this.botLevelWins = 0;
    this.totalLevelsWon = 0;
    this.totalLevelsLost = 0;

    // Start match
    this.startRound(1);
    return player;
  }

  destroy() {
    this.matchState = 'MATCH_OVER';
    if (this.recapTimer) clearTimeout(this.recapTimer);
    if (this.countdownTimer) clearTimeout(this.countdownTimer);
    this.players.clear();
    this.activeProjectiles = [];
    this.activeStructures.clear();
  }

  removePlayer(id) {
    this.players.delete(id);
    this.destroy();
  }

  getOpponents(attackerId) {
    if (!attackerId) return [];
    const opps = [];
    for (const [id, p] of this.players) {
      if (id !== attackerId) opps.push(p);
    }
    return opps;
  }

  startRound(roundNumber) {
    if (this.countdownTimer) clearTimeout(this.countdownTimer);
    this.currentRound = roundNumber;
    this.matchState = 'ROUND_COUNTDOWN';
    this.roundTimeRemaining = MATCH_RULES.ROUND_TIME_LIMIT;
    this.activeProjectiles = [];
    this.roundWinner = null;

    // Arena PERSISTENCE: Strict battleground persistence (never override player's chosen arena!)
    this.currentArenaType = this.chosenArena;

    // Scale Bot Difficulty based on this.currentLevel (Apprentice -> Warrior Champion -> Grandmaster Titan)
    const bot = Array.from(this.players.values()).find(p => p.isBot);
    if (bot) {
      bot.level = this.currentLevel;
      if (this.currentLevel === 1) {
        bot.maxHealth = 380;
        bot.health = 380;
        bot.maxPoise = 240;
        bot.poise = 240;
        bot.dmgMult = 1.0;
        bot.cadenceCooldown = 2.4;
        bot.guardChance = 0.45;
        bot.dodgeChance = 0.25;
        bot.advanceSpeed = 5.2;
        bot.orbitSpeed = 4.0;
        bot.boulderCooldown = 4500;
        bot.snareCooldown = 11000;
        bot.tierTitle = 'APPRENTICE';
      } else if (this.currentLevel === 2) {
        bot.maxHealth = 580; // +52% HP
        bot.health = 580;
        bot.maxPoise = 380; // +58% Poise
        bot.poise = 380;
        bot.dmgMult = 1.45; // +45% Damage
        bot.cadenceCooldown = 1.5; // Fast martial cadence!
        bot.guardChance = 0.78; // Frequently guards
        bot.dodgeChance = 0.55; // Evasive slips
        bot.advanceSpeed = 6.8; // Quick footwork
        bot.orbitSpeed = 5.2;
        bot.boulderCooldown = 2600; // Frequent projectile snipes
        bot.snareCooldown = 7000;
        bot.tierTitle = 'WARRIOR CHAMPION';
      } else {
        // Level 3: GRANDMASTER TITAN BOSS
        bot.maxHealth = 850; // +123% HP
        bot.health = 850;
        bot.maxPoise = 540; // +125% Poise
        bot.poise = 540;
        bot.dmgMult = 1.95; // +95% Damage (Punishing hits!)
        bot.cadenceCooldown = 1.05; // Relentless 1.05s cadence!
        bot.guardChance = 0.90; // High defense: requires Gold Link combos & Heavy Breakers
        bot.dodgeChance = 0.72; // Swift counter-slipping
        bot.advanceSpeed = 8.2; // Hyper-aggressive pressure
        bot.orbitSpeed = 6.5;
        bot.boulderCooldown = 1700;
        bot.snareCooldown = 4800;
        bot.tierTitle = 'GRANDMASTER TITAN';
      }
    }

    // Scale Human Player Power Growth with EVERY round and EVERY level!
    const human = Array.from(this.players.values()).find(p => !p.isBot);
    for (const [id, p] of this.players) {
      if (!p.isBot) {
        // Natural progression growth: strictly awarded as rewards for rounds and levels WON!
        const levelBonusHp = (this.currentLevel - 1) * 35;
        const roundBonusHp = this.playerLevelWins * 25;
        const levelBonusPoise = (this.currentLevel - 1) * 25;
        const roundBonusPoise = this.playerLevelWins * 20;
        
        let maxHP = COMBAT_CONSTANTS.BASE_HEALTH + levelBonusHp + roundBonusHp;
        let maxPoise = COMBAT_CONSTANTS.BASE_POISE + levelBonusPoise + roundBonusPoise;
        let dmgMult = 1.0 + (this.currentLevel - 1) * 0.18 + this.playerLevelWins * 0.12;

        // Apply Roguelike Perks bonuses
        if (p.perks && p.perks.includes('IRON_BASTION')) {
          maxPoise += 60;
        }
        if (p.perks && p.perks.includes('FLOW_RESONANCE')) {
          maxHP += 45;
        }
        if (p.perks && p.perks.includes('THUNDER_PALM')) {
          dmgMult += 0.20;
        }

        p.maxHealth = maxHP;
        p.health = maxHP;
        p.maxPoise = maxPoise;
        p.poise = maxPoise;
        p.dmgMult = dmgMult;
      }

      p.isDead = false;
      p.isStaggered = false;
      p.isGuarding = false;
      p.isInvulnerable = false;
      p.flow = 1.0;
      p.vx = 0;
      p.vy = 0;
      p.vz = 0;
      
      if (p.isBot) {
        p.x = 0; p.y = 0; p.z = 14; p.yaw = Math.PI;
      } else {
        p.x = 0; p.y = 0; p.z = -14; p.yaw = 0;
      }
    }

    this.broadcast(MSG_TYPES.ROUND_START, {
      round: this.currentRound,
      level: this.currentLevel,
      maxRounds: MATCH_RULES.MAX_ROUNDS_PER_LEVEL,
      totalLevels: MATCH_RULES.TOTAL_LEVELS,
      arenaType: this.currentArenaType,
      playerWins: this.playerLevelWins,
      botWins: this.botLevelWins,
      timeRemaining: this.roundTimeRemaining,
      countdown: 3,
      botTier: bot ? bot.tierTitle : 'WARRIOR',
      playerPerks: human ? (human.perks || []) : [],
      playerStats: human ? {
        maxHp: human.maxHealth,
        maxPoise: human.maxPoise,
        dmgMult: human.dmgMult || 1.0
      } : null
    });

    // 3.0s dramatic countdown before combat unlocks
    this.countdownTimer = setTimeout(() => {
      this.matchState = 'ROUND_ACTIVE';
      console.log(`[Flowbound Server] Level ${this.currentLevel} Round ${this.currentRound} COMMENCED in ${this.currentArenaType}!`);
    }, 3200);
  }

  triggerFatalKOBlow(winner, loser) {
    if (this.matchState === 'ROUND_CELEBRATION' || this.matchState === 'ROUND_RECAP') return;
    this.matchState = 'ROUND_CELEBRATION';
    this.roundWinner = winner;

    const humanPlayer = Array.from(this.players.values()).find(p => !p.isBot);
    const isPlayerWin = winner && humanPlayer && (winner.id === humanPlayer.id);

    console.log(`[Flowbound Server] FATAL BLOW DELIVERED! Winner: ${winner ? winner.name : 'DRAW'}. Entering Celebration Mode.`);

    this.broadcast(MSG_TYPES.FATAL_BLOW, {
      winnerId: winner ? winner.id : null,
      winnerName: winner ? winner.name : 'DRAW',
      loserId: loser ? loser.id : null,
      round: this.currentRound,
      level: this.currentLevel,
      playerWonRound: isPlayerWin,
      allowCelebration: true
    });

    // If bot won, allow brief fall then automatically open recap
    if (!isPlayerWin) {
      setTimeout(() => {
        if (this.matchState === 'ROUND_CELEBRATION') {
          this.openRoundRecap();
        }
      }, 3000);
    }
  }

  openRoundRecap() {
    if (this.matchState === 'ROUND_RECAP') return;
    this.matchState = 'ROUND_RECAP';

    const winner = this.roundWinner;
    const humanPlayer = Array.from(this.players.values()).find(p => !p.isBot);

    const playerWonRound = winner && humanPlayer && (winner.id === humanPlayer.id);
    if (playerWonRound) {
      this.playerLevelWins++;
    } else {
      this.botLevelWins++;
    }

    // Best of 3 in current Level: First to 2 round wins takes the level
    const isLevelOver = (this.playerLevelWins >= MATCH_RULES.ROUNDS_TO_WIN) || (this.botLevelWins >= MATCH_RULES.ROUNDS_TO_WIN);
    const playerWonLevel = this.playerLevelWins >= MATCH_RULES.ROUNDS_TO_WIN;

    let isMatchOver = false;
    let playerWonMatch = false;

    if (isLevelOver) {
      if (playerWonLevel) {
        this.totalLevelsWon++;
        if (this.currentLevel >= MATCH_RULES.TOTAL_LEVELS) {
          isMatchOver = true;
          playerWonMatch = true;
        }
      } else {
        this.totalLevelsLost++;
        isMatchOver = true;
        playerWonMatch = false;
      }
    }

    // STRICT RULE: Power perks are only offered when the human player WINS the round!
    // When lost, no extra power or perks are given to the player.
    let availablePerks = [];
    if (playerWonRound && !isMatchOver) {
      availablePerks = [...POWER_PERKS].sort(() => 0.5 - Math.random()).slice(0, 3);
    }

    // Gather Stats for Recap Table
    const stats = [];
    for (const [id, p] of this.players) {
      stats.push({
        id: p.id,
        name: p.name,
        damage: p.totalDamageDealt || 0,
        finishers: p.finishers || 0,
        kos: p.kos || 0,
        isWinner: p.id === (winner ? winner.id : null)
      });
    }

    this.broadcast(MSG_TYPES.ROUND_END, {
      round: this.currentRound,
      level: this.currentLevel,
      totalLevels: MATCH_RULES.TOTAL_LEVELS,
      winnerName: winner ? winner.name : 'DRAW',
      playerWonRound,
      playerWins: this.playerLevelWins,
      botWins: this.botLevelWins,
      isLevelOver,
      playerWonLevel,
      isMatchOver,
      playerWonMatch,
      stats,
      availablePerks,
      playerPerks: humanPlayer ? (humanPlayer.perks || []) : []
    });

    if (isMatchOver) {
      this.matchState = 'MATCH_OVER';
    }
  }

  endRound(winner) {
    this.roundWinner = winner;
    this.openRoundRecap();
  }

  advanceToNextRound(playerId, perkId) {
    const humanPlayer = Array.from(this.players.values()).find(p => !p.isBot);
    if (humanPlayer) {
      if (!humanPlayer.perks) humanPlayer.perks = [];
      // STRICT: Only grant perk if player actually won the round!
      if (this.playerWonRound && perkId && !humanPlayer.perks.includes(perkId)) {
        humanPlayer.perks.push(perkId);
        console.log(`[Flowbound Server] Victory reward: Player acquired perk ${perkId}`);
      }
    }

    const isLevelOver = (this.playerLevelWins >= MATCH_RULES.ROUNDS_TO_WIN) || (this.botLevelWins >= MATCH_RULES.ROUNDS_TO_WIN);
    const playerWonLevel = this.playerLevelWins >= MATCH_RULES.ROUNDS_TO_WIN;

    if (isLevelOver) {
      if (playerWonLevel && this.currentLevel < MATCH_RULES.TOTAL_LEVELS) {
        // Advance to next Level!
        this.currentLevel++;
        this.currentRound = 1;
        this.playerLevelWins = 0;
        this.botLevelWins = 0;
        this.startRound(1);
      } else {
        // Complete rematch/restart
        this.restartMatch();
      }
    } else {
      // Advance to next round within current Level
      this.currentRound++;
      this.startRound(this.currentRound);
    }
  }

  restartMatch() {
    if (this.recapTimer) clearTimeout(this.recapTimer);
    this.currentLevel = 1;
    this.currentRound = 1;
    this.playerLevelWins = 0;
    this.botLevelWins = 0;
    this.totalLevelsWon = 0;
    this.totalLevelsLost = 0;
    this.matchState = 'WAITING';
    for (const [id, p] of this.players) {
      p.totalDamageDealt = 0;
      p.finishers = 0;
      p.kos = 0;
      p.perks = [];
    }
    this.startRound(1);
  }

  checkRoundEndConditions() {
    if (this.matchState !== 'ROUND_ACTIVE') return;

    const humanPlayer = Array.from(this.players.values()).find(p => !p.isBot);
    const bot = Array.from(this.players.values()).find(p => p.isBot);

    if (bot && (bot.health <= 0 || bot.isDead)) {
      bot.health = 0;
      bot.isDead = true;
      this.triggerFatalKOBlow(humanPlayer, bot);
    } else if (humanPlayer && (humanPlayer.health <= 0 || humanPlayer.isDead)) {
      humanPlayer.health = 0;
      humanPlayer.isDead = true;
      this.triggerFatalKOBlow(bot, humanPlayer);
    } else if (this.roundTimeRemaining <= 0) {
      const winner = (humanPlayer && bot) ? (humanPlayer.health >= bot.health ? humanPlayer : bot) : null;
      const loser = (winner === humanPlayer) ? bot : humanPlayer;
      this.triggerFatalKOBlow(winner, loser);
    }
  }

  spawnPhysicalProjectile(data) {
    const speed = data.speed || data.projectileSpeed || 26.0;
    const dir = data.direction || { x: 0, y: 0, z: 1 };
    const orig = data.origin || { x: 0, y: 1.1, z: 0 };
    const element = data.element || (this.players.get(data.casterId)?.element) || 'EARTH';

    this.activeProjectiles.push({
      id: ++this.projectileCounter,
      casterId: data.casterId,
      abilityId: data.abilityId || 'BOULDER_KICK',
      element: element.toUpperCase(),
      x: orig.x,
      y: orig.y,
      z: orig.z,
      vx: dir.x * speed,
      vy: (dir.y || 0) * speed,
      vz: dir.z * speed,
      radius: data.radius || (data.abilityId === 'BOULDER_KICK' ? 1.3 : 0.9),
      damage: data.damage || 45,
      poiseDamage: data.poiseDamage || 50,
      life: 3.5 // 3.5 seconds flight lifetime
    });
  }

  update(dt) {
    if (this.isPaused) return;
    if (this.matchState !== 'ROUND_ACTIVE' && this.matchState !== 'ROUND_CELEBRATION') return;

    if (this.matchState === 'ROUND_ACTIVE') {
      this.roundTimeRemaining -= dt;

      // Update Bot AI
      const humanPlayer = Array.from(this.players.values()).find(p => !p.isBot);
      const bot = Array.from(this.players.values()).find(p => p.isBot);

      if (bot && bot.update) {
        bot.update(dt, humanPlayer);
      }

      // Character-to-Character Authoritative Collision Resolution
      if (humanPlayer && bot && !humanPlayer.isDead && !bot.isDead) {
        const dx = bot.x - humanPlayer.x;
        const dz = bot.z - humanPlayer.z;
        const dist = Math.hypot(dx, dz);
        const MIN_DIST = 1.35;
        if (dist < MIN_DIST && dist > 0.001) {
          const overlap = MIN_DIST - dist;
          const nx = dx / dist;
          const nz = dz / dist;
          humanPlayer.x -= nx * (overlap * 0.5);
          humanPlayer.z -= nz * (overlap * 0.5);
          bot.x += nx * (overlap * 0.5);
          bot.z += nz * (overlap * 0.5);
        }
      }

      // Authoritative Physics Simulation for Flying Projectiles
      for (let i = this.activeProjectiles.length - 1; i >= 0; i--) {
        const proj = this.activeProjectiles[i];
        proj.x += proj.vx * dt;
        proj.y += proj.vy * dt;
        proj.z += proj.vz * dt;
        proj.life -= dt;

        // Check collision against opposing combatants (Physical impact only!)
        for (const [id, target] of this.players) {
          if (id === proj.casterId || target.isDead) continue;

          const dist = Math.hypot(target.x - proj.x, target.z - proj.z);
          if (dist < (proj.radius + 0.8) && Math.abs(target.y - proj.y) < 2.2) {
            // Direct physical projectile impact!
            const attacker = this.players.get(proj.casterId) || { id: proj.casterId, name: 'Attacker' };
            const hits = this.combatEngine.applyDirectHit(attacker, target, {
              abilityId: proj.abilityId,
              damage: proj.damage,
              poiseDamage: proj.poiseDamage,
              knockback: 10.0,
              hitPoint: { x: proj.x, y: proj.y, z: proj.z }
            });

            for (const hit of hits) {
              const targetPlayer = this.players.get(hit.targetId);
              if (targetPlayer && hit.hitPoint) {
                const kdx = targetPlayer.x - hit.hitPoint.x;
                const kdz = targetPlayer.z - hit.hitPoint.z;
                const kdist = Math.hypot(kdx, kdz) || 1.0;
                const force = hit.wasBlocked ? 2.5 : (hit.knockback || 6.5);
                if (targetPlayer.applyKnockback) {
                  targetPlayer.applyKnockback(kdx, kdz, force);
                } else {
                  targetPlayer.vx = (targetPlayer.vx || 0) + (kdx / kdist) * force;
                  targetPlayer.vz = (targetPlayer.vz || 0) + (kdz / kdist) * force;
                }
              }
              this.broadcast(MSG_TYPES.DAMAGE_EVENT, hit);
            }

            this.checkRoundEndConditions();

            // Destroy projectile upon impact
            proj.life = -1;
            break;
          }
        }

        if (proj.life <= 0) {
          this.activeProjectiles.splice(i, 1);
        }
      }

      // Element-to-Element Projectile Clash Detection
      for (let i = 0; i < this.activeProjectiles.length; i++) {
        for (let j = i + 1; j < this.activeProjectiles.length; j++) {
          const p1 = this.activeProjectiles[i];
          const p2 = this.activeProjectiles[j];
          if (p1.life <= 0 || p2.life <= 0) continue;
          if (p1.casterId === p2.casterId) continue; // Opposing projectiles clash!

          const pdx = p1.x - p2.x;
          const pdy = p1.y - p2.y;
          const pdz = p1.z - p2.z;
          const pdist = Math.hypot(pdx, pdy, pdz);
          const clashRadius = (p1.radius || 1.0) + (p2.radius || 1.0);

          if (pdist < clashRadius) {
            const clashX = (p1.x + p2.x) * 0.5;
            const clashY = (p1.y + p2.y) * 0.5;
            const clashZ = (p1.z + p2.z) * 0.5;

            let clashType = 'steam';
            const el1 = (p1.element || 'WATER').toUpperCase();
            const el2 = (p2.element || 'EARTH').toUpperCase();

            if ((el1 === 'WATER' && el2 === 'FIRE') || (el1 === 'FIRE' && el2 === 'WATER')) {
              clashType = 'steam';
            } else if ((el1 === 'EARTH' && el2 === 'FIRE') || (el1 === 'FIRE' && el2 === 'EARTH')) {
              clashType = 'magma';
            } else if ((el1 === 'WATER' && el2 === 'EARTH') || (el1 === 'EARTH' && el2 === 'WATER')) {
              clashType = 'mud';
            } else if (el1 === 'AIR' || el2 === 'AIR') {
              clashType = 'gale';
            } else {
              clashType = 'resonance';
            }

            console.log(`[Flowbound Server] ELEMENTAL CLASH (${clashType}): ${el1} vs ${el2} at (${clashX.toFixed(1)}, ${clashY.toFixed(1)}, ${clashZ.toFixed(1)})`);

            p1.life = -1;
            p2.life = -1;

            this.broadcast(MSG_TYPES.ELEMENTAL_CLASH, {
              x: clashX,
              y: clashY,
              z: clashZ,
              elementA: el1,
              elementB: el2,
              clashType
            });
          }
        }
      }

      // Check Projectiles against Active Barriers (Ice Walls & Stone Spires)
      const nowTs = Date.now();
      for (const proj of this.activeProjectiles) {
        if (proj.life <= 0) continue;
        for (const [structId, struct] of this.activeStructures) {
          if (nowTs > struct.expiresAt) {
            this.activeStructures.delete(structId);
            continue;
          }
          if (struct.casterId === proj.casterId) continue;
          const bdist = Math.hypot(proj.x - struct.x, proj.z - struct.z);
          if (bdist < (proj.radius + struct.radius)) {
            proj.life = -1;
            struct.health -= proj.damage;
            this.broadcast(MSG_TYPES.ELEMENTAL_CLASH, {
              x: proj.x,
              y: proj.y,
              z: proj.z,
              elementA: proj.element,
              elementB: struct.element,
              clashType: 'barrier_impact'
            });
            if (struct.health <= 0) {
              this.activeStructures.delete(structId);
            }
            break;
          }
        }
      }

      // Check round win conditions
      this.checkRoundEndConditions();
    }

    // Broadcast 60Hz State Synchronization
    this.syncState();
  }

  syncState() {
    const states = [];
    for (const [id, p] of this.players) {
      states.push({
        id: p.id,
        x: p.x,
        y: p.y,
        z: p.z,
        vx: p.vx,
        vy: p.vy,
        vz: p.vz,
        yaw: p.yaw,
        pitch: p.pitch,
        health: p.health,
        maxHealth: p.maxHealth || 250,
        poise: p.poise,
        maxPoise: p.maxPoise || 180,
        flow: p.flow,
        isSurfing: p.isSurfing,
        isGuarding: !!p.isGuarding,
        isInvulnerable: !!p.isInvulnerable,
        isStaggered: p.isStaggered,
        isDead: p.isDead
      });
    }

    this.broadcast(MSG_TYPES.STATE_SYNC, {
      t: Date.now(),
      players: states,
      roundTime: Math.ceil(this.roundTimeRemaining)
    });
  }

  broadcastAbility(abilityData) {
    this.broadcast(MSG_TYPES.ABILITY_CAST, abilityData);

    const isProjectile = abilityData.type === 'PHYSICAL_PROJECTILE' || 
                         abilityData.slot === 'E' || 
                         abilityData.abilityId === 'WATER_CHAKRAMS' || 
                         abilityData.abilityId === 'BOULDER_KICK' || 
                         abilityData.abilityId === 'FIRE_BEAM' || 
                         abilityData.abilityId === 'AIR_GALE';

    if (isProjectile) {
      // Spawns flying projectile - authoritative physical collision & clashes
      this.spawnPhysicalProjectile(abilityData);
    } else if (abilityData.type === 'PROCEDURAL_BARRIER' || abilityData.type === 'EARTH_SPIRES' || abilityData.abilityId === 'STONE_GUARD' || abilityData.abilityId === 'ICE_WALL') {
      const structId = 'barrier_' + (++this.projectileCounter);
      this.activeStructures.set(structId, {
        id: structId,
        casterId: abilityData.casterId,
        element: abilityData.element || 'EARTH',
        x: abilityData.origin ? abilityData.origin.x : 0,
        y: abilityData.origin ? abilityData.origin.y : 0,
        z: abilityData.origin ? abilityData.origin.z : 0,
        radius: 2.5,
        health: abilityData.health || 350,
        expiresAt: Date.now() + 10000
      });
    } else {
      // Melee sweeps / AOE evaluated authoritatively
      const hits = this.combatEngine.processAttack(
        this.players.get(abilityData.casterId) || { id: abilityData.casterId },
        abilityData
      );

      for (const hit of hits) {
        const targetPlayer = this.players.get(hit.targetId);
        if (targetPlayer && hit.hitPoint) {
          const kdx = targetPlayer.x - hit.hitPoint.x;
          const kdz = targetPlayer.z - hit.hitPoint.z;
          const kdist = Math.hypot(kdx, kdz) || 1.0;
          const force = hit.wasBlocked ? 2.5 : (hit.knockback || 6.5);
          if (targetPlayer.applyKnockback) {
            targetPlayer.applyKnockback(kdx, kdz, force);
          } else {
            targetPlayer.vx = (targetPlayer.vx || 0) + (kdx / kdist) * force;
            targetPlayer.vz = (targetPlayer.vz || 0) + (kdz / kdist) * force;
          }
        }
        this.broadcast(MSG_TYPES.DAMAGE_EVENT, hit);
      }

      this.checkRoundEndConditions();
    }
  }

  broadcast(type, payload) {
    const msg = NetworkProtocol.encode(type, payload);
    for (const [id, p] of this.players) {
      if (p.ws && p.ws.readyState === 1) { // OPEN
        p.ws.send(msg);
      }
    }
  }
}
