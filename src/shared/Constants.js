// Flowbound: Masters of Four - Shared Constants & Exact Sampled Palette

export const PALETTE = {
  // Arena Environment
  FLOOR_BLUE: 0x8ea0bc,        // Hex #8EA0BC - Outer stone tile apron
  FLOOR_YELLOW: 0xf09e00,      // Hex #F09E00 - Combat court satin finish
  FLOOR_BORDER: 0x9b6945,      // Hex #9B6945 - Terracotta boundary step
  WALL_STONE: 0xb0aba4,        // Hex #B0ABA4 - Sandstone Colosseum light beige walls
  WALL_STONE_DARK: 0x8a847e,   // Hex #8A847E - Sandstone wall trim/cornice
  COLUMN_JADE: 0x1e3a2f,       // Hex #1E3A2F - Imperial Jade pillars
  PAGODA_GOLD: 0xd49b43,       // Hex #D49B43 - Lacquer gold trim & canopy soffit
  
  // Elemental Banners
  BANNER_FIRE: 0xb91c1c,       // Hex #B91C1C - Fire discipline red silk
  BANNER_WATER: 0x1d4ed8,      // Hex #1D4ED8 - Water discipline royal blue silk
  BANNER_EARTH: 0x15803d,      // Hex #15803D - Earth discipline emerald silk
  BANNER_AIR: 0xca8a04,        // Hex #CA8A04 - Air discipline golden silk

  // Materials & Shaders
  ICE_CORE: 0x38bdf8,          // Hex #38BDF8 - Translucent crystalline ice body
  ICE_FROST: 0xf0f9ff,         // Hex #F0F9FF - High albedo snow crust
  WATER_CYAN: 0x38bdf8,        // Hex #38BDF8 - Glowing water whip & chakrams
  FLOW_CYAN: 0x9be2f6,         // Hex #9BE2F6 - Electric cyan UI flow meter
  EARTH_ROCK: 0x4a433a,        // Hex #4A433A - Shadowed basalt rock
  EARTH_SLATE: 0x6e6659,       // Hex #6E6659 - Raised stone spires

  // Characters (Faithful to Reference Video)
  CHAR_SKIN: 0xb47b56,         // Hex #B47B56 - Warm athletic monk tan skin
  CHAR_SKIN_SHADOW: 0x8a5533,  // Hex #8A5533 - Cel-shade shadow skin tone
  WATER_PANTS: 0x1b2d4c,       // Hex #1B2D4C - Whoiscobra deep navy trousers
  EARTH_PANTS: 0x334220,       // Hex #334220 - PCNastyx olive martial trousers
  SASH_BELT: 0x241810,         // Hex #241810 - Bound martial arts dark leather sash

  // UI & Feedback
  DAMAGE_GOLD: 0xfacc15,       // Hex #FACC15 - Floating combat damage numbers
  HITMARKER_WHITE: 0xffffff,   // Hex #FFFFFF - Reticle hitmarker flash
  RECAP_TEXT_BLUE: 0xbae6fd,   // Hex #BAE6FD - Stylized post-round victory text
  INK_BLACK: 0x0f172a          // Hex #0F172A - Sumi-e calligraphic ink brush
};

export const COMBAT_CONSTANTS = {
  BASE_HEALTH: 420.0,          // Weighty competitive health pool (sparring exchanges last 35-50s)
  BASE_POISE: 280.0,           // Substantial poise bar for tactical guard break play
  MAX_FLOW: 3.0,
  POISE_RECOVERY_DELAY: 2.2,   // Seconds before poise begins recovering
  POISE_RECOVERY_RATE: 35.0,   // Poise points recovered per second
  GUARD_BREAK_DURATION: 1.4,   // Seconds player is staggered upon poise break
  GUARD_BREAK_DMG_MULT: 1.35,  // Damage multiplier when guard is broken
  HEADSHOT_MULT: 1.25,
  LIMB_MULT: 0.85,
  
  // Absolver-Style Fighting Mechanics
  BLOCK_DAMAGE_REDUCTION: 0.80,// 80% damage reduction when blocking
  BLOCK_POISE_DRAIN_MULT: 0.95,// Poise drained per blocked damage point
  HIT_STOP_DURATION: 0.08,     // 80ms micro-pause on impact
  LOCK_ON_RANGE: 22.0,         // Target lock-on acquisition distance (m)
  COMBO_GOLD_LINK_WINDOW: 0.22 // Timing window (s) to link next strike with gold bonus
};

export const MOVEMENT_CONSTANTS = {
  WALK_SPEED: 2.6,             // m/s - Deliberate footwork
  RUN_SPEED: 5.6,              // m/s
  SPRINT_SPEED: 8.5,           // m/s
  
  // Absolver-Style Combat Movement
  LOCK_ON_ADVANCE_SPEED: 4.8,  // W advance towards opponent
  LOCK_ON_RETREAT_SPEED: 3.6,  // S backstep away from opponent
  LOCK_ON_ORBIT_SPEED: 4.2,    // A/D orbital circling around opponent
  DODGE_SLIP_SPEED: 11.5,      // Quick martial slip/weave
  DODGE_SLIP_DURATION: 0.28,   // Slip duration (s)
  DODGE_SLIP_IFRAMES: 0.22,    // Invulnerability window (s)
  
  ICE_SURF_BASE: 10.5,         // m/s - Weighty, cinematic carving
  ICE_SURF_MAX: 14.0,          // m/s
  GHOST_DASH_SPEED: 15.0,      // m/s
  GHOST_DASH_DURATION: 0.25,   // Seconds
  GHOST_DASH_IFRAMES: 0.16,    // Invulnerability duration
  JUMP_VELOCITY: 6.5,          // m/s
  RAMP_LAUNCH_VZ: 8.5,         // Vertical launch impulse
  RAMP_LAUNCH_VX: 10.0,        // Horizontal forward launch impulse
  GRAVITY: -18.0,              // Snappy competitive gravity
  WALL_KICK_IMPULSE_NORM: 6.0,
  WALL_KICK_IMPULSE_UP: 5.0,
  MANTLE_HEIGHT_MAX: 4.0
};

export const MATCH_RULES = {
  ROUNDS_TO_WIN: 2,            // Best of 3 rounds per level
  MAX_ROUNDS_PER_LEVEL: 3,     // Up to 3 rounds in every level
  TOTAL_LEVELS: 3,             // 3 complete progressive levels
  ROUND_TIME_LIMIT: 90.0,      // Seconds
  SUDDEN_DEATH_RING_START: 75.0// Seconds before boundary shrinks
};

export const POWER_PERKS = [
  {
    id: 'THUNDER_PALM',
    name: 'Thunder Palm',
    icon: '⚡',
    rarity: 'RARE',
    desc: '+25% Light Combo Damage & +35% Poise Shock',
    tag: 'OFFENSIVE'
  },
  {
    id: 'GLACIAL_SURGE',
    name: 'Glacial Surge',
    icon: '❄️',
    rarity: 'EPIC',
    desc: '+40% Ice Surf Speed & +35% Ramp Launch Apex',
    tag: 'MOBILITY'
  },
  {
    id: 'IRON_BASTION',
    name: 'Iron Bastion',
    icon: '🛡️',
    rarity: 'RARE',
    desc: '+60 Max Poise & 95% Guard Damage Reduction',
    tag: 'DEFENSIVE'
  },
  {
    id: 'DRAGON_BREAKER',
    name: 'Dragon Breaker',
    icon: '💥',
    rarity: 'LEGENDARY',
    desc: 'Heavy RMB unleashes a ground shockwave (+40% AoE Damage)',
    tag: 'FINISHER'
  },
  {
    id: 'FLOW_MASTERY',
    name: 'Flow Mastery',
    icon: '🌀',
    rarity: 'EPIC',
    desc: 'Flow generates +50% faster, Ability cooldowns -25%',
    tag: 'ELEMENTAL'
  }
];
