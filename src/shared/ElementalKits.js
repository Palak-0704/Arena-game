// Flowbound: Masters of Four - Elemental Ability Definitions

export const ELEMENTAL_KITS = {
  WATER: {
    id: 'WATER',
    name: 'Water — The Controller',
    color: '#38bdf8',
    pantsColor: 0x020d22,
    abilities: {
      LMB: {
        id: 'WATER_WHIP',
        name: 'Water Whip',
        slot: 'LMB',
        type: 'MELEE_COMBO',
        comboHits: [
          { damage: 15, poise: 15, range: 6.5, startup: 0.15, active: 0.1, recovery: 0.25 },
          { damage: 20, poise: 20, range: 6.5, startup: 0.18, active: 0.1, recovery: 0.25 },
          { damage: 35, poise: 40, range: 7.0, startup: 0.22, active: 0.12, recovery: 0.35, knockdown: true }
        ],
        cooldown: 0.0,
        flowCost: 0.0
      },
      RMB: {
        id: 'WATER_CHAKRAMS',
        name: 'Water Chakrams',
        slot: 'RMB',
        type: 'DUAL_PROJECTILE_DIVE',
        maxCharges: 2,
        chargeCooldown: 4.5,
        projectileSpeed: 38.0,
        damage: 30,
        poiseDamage: 25,
        range: 35.0,
        aerialDiveSpeed: 24.0,
        aerialDiveDamage: 45,
        flowCost: 0.0
      },
      Q: {
        id: 'ICE_WALL',
        name: 'Ice Wall / Ramp',
        slot: 'Q',
        type: 'PROCEDURAL_BARRIER',
        cooldown: 6.0,
        flowCost: 1.0,
        barrierHealth: 250,
        duration: 8.0,
        wedgeLength: 6.0,
        wedgeHeight: 2.8,
        wedgeWidth: 2.2
      },
      SHIFT: {
        id: 'ICE_SURF',
        name: 'Ice Surf',
        slot: 'SHIFT',
        type: 'SPLINE_SURFING',
        cooldown: 0.0,
        staminaCostPerSec: 10.0,
        speedMultiplier: 1.65,
        rampExtrudeInterval: 0.08
      },
      M4: {
        id: 'THE_OCTOPUS',
        name: 'The Octopus',
        slot: 'M4',
        type: 'CROWD_CONTROL',
        cooldown: 8.0,
        flowCost: 1.5,
        damage: 25,
        poiseDamage: 35,
        radius: 5.5,
        slowPercent: 0.40,
        slowDuration: 1.5
      }
    }
  },

  EARTH: {
    id: 'EARTH',
    name: 'Earth — The Heavy Hitter',
    color: '#84cc16',
    pantsColor: 0x233910,
    abilities: {
      LMB: {
        id: 'BOULDER_KICK',
        name: 'Boulder Kick',
        slot: 'LMB',
        type: 'PHYSICAL_PROJECTILE',
        damage: 55,
        poiseDamage: 60,
        projectileSpeed: 28.0,
        range: 30.0,
        radius: 1.2,
        startup: 0.35,
        recovery: 0.45,
        cooldown: 1.8,
        shattersIce: true,
        flowCost: 0.0
      },
      RMB: {
        id: 'EARTH_SHARD_VOLLEY',
        name: 'Earth Shards',
        slot: 'RMB',
        type: 'RAPID_PROJECTILE',
        projectileCount: 3,
        damagePerShard: 12,
        poisePerShard: 10,
        projectileSpeed: 45.0,
        spreadAngle: 5.0,
        cooldown: 5.0,
        flowCost: 0.0
      },
      Q: {
        id: 'STONE_GUARD',
        name: 'Stone Guard Spires',
        slot: 'Q',
        type: 'EARTH_SPIRES',
        spireCount: 4,
        barrierHealth: 400,
        duration: 12.0,
        cooldown: 7.0,
        flowCost: 1.0,
        spireHeight: 3.5
      },
      SHIFT: {
        id: 'SEISMIC_DASH',
        name: 'Seismic Dash',
        slot: 'SHIFT',
        type: 'BURST_LEAP',
        burstSpeed: 16.0,
        duration: 0.35,
        groundSlamRadius: 3.5,
        slamDamage: 20,
        cooldown: 4.0,
        flowCost: 0.5
      },
      M4: {
        id: 'SEISMIC_SNARE',
        name: 'Seismic Snare',
        slot: 'M4',
        type: 'LINEAR_FISSURE',
        fissureLength: 18.0,
        fissureWidth: 1.8,
        damage: 40,
        poiseDamage: 50,
        launchVelocityZ: 8.0,
        cooldown: 9.0,
        flowCost: 1.5
      }
    }
  },

  FIRE: {
    id: 'FIRE',
    name: 'Fire — The Pace Setter',
    color: '#ef4444',
    pantsColor: 0x7f1d1d,
    abilities: {
      LMB: {
        id: 'FLAME_STRIKES',
        name: 'Flame Strikes',
        slot: 'LMB',
        type: 'MELEE_COMBO',
        comboHits: [
          { damage: 12, poise: 10, range: 5.0, startup: 0.12, active: 0.08, recovery: 0.18 },
          { damage: 12, poise: 10, range: 5.0, startup: 0.12, active: 0.08, recovery: 0.18 },
          { damage: 18, poise: 20, range: 5.5, startup: 0.16, active: 0.08, recovery: 0.22 },
          { damage: 25, poise: 35, range: 6.0, startup: 0.20, active: 0.10, recovery: 0.30, burnDoT: 5 }
        ],
        cooldown: 0.0,
        flowCost: 0.0
      },
      RMB: {
        id: 'FINGER_BLAST',
        name: 'Finger Blast',
        slot: 'RMB',
        type: 'BEAM_PROJECTILE',
        damage: 45,
        poiseDamage: 30,
        projectileSpeed: 55.0,
        burnDuration: 2.0,
        cooldown: 4.0,
        flowCost: 0.0
      },
      Q: {
        id: 'CROWN_OF_FIRE',
        name: 'Crown of Fire',
        slot: 'Q',
        type: 'RADIAL_SHIELD',
        radius: 3.0,
        duration: 3.5,
        meltsIce: true,
        cooldown: 6.5,
        flowCost: 1.0
      },
      SHIFT: {
        id: 'PROPEL',
        name: 'Propel Jet',
        slot: 'SHIFT',
        type: 'OMNI_THRUST',
        thrustVelocity: 14.0,
        duration: 0.5,
        cooldown: 3.5,
        flowCost: 0.5
      },
      M4: {
        id: 'SIMONS_RAGE',
        name: "Simon's Rage",
        slot: 'M4',
        type: 'POINT_BLANK_BURST',
        damage: 35,
        poiseDamage: 45,
        radius: 4.5,
        stunDuration: 0.8,
        cooldown: 8.5,
        flowCost: 1.5
      }
    }
  },

  AIR: {
    id: 'AIR',
    name: 'Air — The Displacer',
    color: '#eab308',
    pantsColor: 0x713f12,
    abilities: {
      LMB: {
        id: 'AIR_BLADES',
        name: 'Air Blades',
        slot: 'LMB',
        type: 'FAST_PROJECTILE',
        damage: 18,
        poiseDamage: 20,
        projectileSpeed: 42.0,
        pushbackForce: 8.0,
        cooldown: 0.3,
        flowCost: 0.0
      },
      RMB: {
        id: 'THE_CURVE',
        name: 'The Curve',
        slot: 'RMB',
        type: 'CURVED_PROJECTILE',
        damage: 30,
        poiseDamage: 30,
        projectileSpeed: 32.0,
        curveFactor: 1.8,
        cooldown: 4.5,
        flowCost: 0.0
      },
      Q: {
        id: 'WIND_GUARD',
        name: 'Wind Guard',
        slot: 'Q',
        type: 'DEFLECTION_DOME',
        duration: 2.5,
        deflectsProjectiles: true,
        cooldown: 6.0,
        flowCost: 1.0
      },
      SHIFT: {
        id: 'RIDDEN_TORNADO',
        name: 'Ridden Tornado',
        slot: 'SHIFT',
        type: 'CYCLONE_SURF',
        speedMultiplier: 1.8,
        verticalLift: 7.5,
        cooldown: 3.0,
        flowCost: 0.5
      },
      M4: {
        id: 'TORNADO_FIELD',
        name: 'Tornado Field',
        slot: 'M4',
        type: 'VORTEX_TRAP',
        radius: 6.0,
        suspensionDuration: 1.5,
        cooldown: 9.0,
        flowCost: 1.5
      }
    }
  }
};
