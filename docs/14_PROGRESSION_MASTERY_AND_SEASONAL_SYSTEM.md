# 14 — Progression, Mastery & Seasonal Content System

## 1. Player Retention Architecture & Core Motivation Loops

To maintain a thriving, long-term competitive playerbase, *Flowbound* implements a multi-layered progression system built entirely on **skill mastery, prestige cosmetics, and social customization**. 

**Strict Non-P2W Mandate:** No gameplay advantage, stat boost, or power-altering item can ever be purchased or unlocked. All players enter the arena with identical mechanical capabilities.

```mermaid
graph TD
    Match["Play Arena Matches (1v1, 2v2, 3v3, PvE)"]
    
    Match --> Loop1["1. Discipline Mastery (Lv 1-100)<br>Per-Element XP, Custom Bending Colors, Enso HUDs"]
    Match --> Loop2["2. The Scroll of Seasons (Battle Pass)<br>100 Tiers of Martial Outfits, Taunts, Finishers"]
    Match --> Loop3["3. Personal Dojo Housing<br>Trophy Display, Sparring Mats, Frame-Data Dummy"]
    Match --> Loop4["4. Daily/Weekly Sages' Trials<br>Targeted Combat Challenges & Jade Chi Currency"]
```

---

## 2. Elemental Discipline Mastery Paths (Levels 1–100)

Every time a player completes a match with an element (Water, Earth, Fire, Air), they earn **Discipline Experience Points (DXP)** based on damage dealt, barriers constructed, and rounds won.

```mermaid
timeline
    title 100-Level Elemental Mastery Unlock Progression
    Level 10 : Custom Enso HUD Ring : Glowing elemental brush borders
    Level 25 : Custom Bending Particle Tint : Midnight Blue Water, Obsidian Earth
    Level 50 : Traditional Martial Arts Kata : Dynamic pre-match bow & form
    Level 75 : Calligraphic Finisher : Sumi-e ink explosion on round-ending KO
    Level 100 : Avatar Grandmaster Aura : Full-body subtle ambient chi radiance
```

### Master Cosmetic Unlocks by Discipline

| Level Tier | Water Mastery Unlock | Earth Mastery Unlock | Fire Mastery Unlock | Air Mastery Unlock |
| :--- | :--- | :--- | :--- | :--- |
| **Level 10 (HUD)** | Frost-cracked Ice Enso Ring | Carved Basalt Stone Enso Ring | Searing Ember Enso Ring | Gale Spiral Enso Ring |
| **Level 25 (Color)**| *Midnight Abyss* (Dark Indigo) | *Obsidian Volcanic* (Black Glass)| *Emerald Dragon* (Jade Green Fire)| *Crimson Tempest* (Blood Wind) |
| **Level 50 (Emote)**| *Crane on Frozen Waters* Kata | *Iron Mountain Stance* Kata | *Striking Dragon* Kata | *Whirling Cloud* Kata |
| **Level 75 (KO FX)**| Enemy shatters into ice statues | Sinks into cracked earth fissure | Dissolves into burning cherry embers| Swept into ascending wind vortex |
| **Level 100 (Title)**| *"Tidebringer Grandmaster"* | *"Earthshaker Grandmaster"* | *"Flame Sovereign Grandmaster"* | *"Skywalker Grandmaster"* |

---

## 3. The Scroll of Seasons (Seasonal Battle Pass)

Each competitive season lasts **12 weeks** and centers around an overarching martial arts lore chapter accompanied by a 100-tier progression scroll.

```mermaid
graph LR
    Free["Free Track (All Players)<br>- 30 Cosmetic Rewards<br>- Jade Chi Currency<br>- Seasonal Profile Badges"]
    
    Premium["Scroll of the Sages (Premium Track)<br>- 100 Full Tiers<br>- Legendary Master Attire<br>- Animated Ink Banners<br>- Custom Audio Foley Packs"]
```

### Season Roadmap Themes
- **Season 1: *Rise of the Frozen Fang***
  - Focus: Water & Cryomancy masters.
  - Tier 100 Reward: *Master Kaelen's Glacial Patriarch Silk Robes* with dynamic floating icicle pauldron.
- **Season 2: *The Ashen Forge***
  - Focus: Earth & Lavabending titans.
  - Tier 100 Reward: *Master Orok's Basalt Dragonforged Armor* with pulsating magma core.
- **Season 3: *Eye of the Storm***
  - Focus: Air & Lightning duelists.
  - Tier 100 Reward: *Master Azari's Celestial Thunder Phoenix Robes* with crackling electric trail.

---

## 4. Personal Martial Arts Dojo (Player Housing & Social Hub)

Between matchmaking queues, players spawn inside their personal **3D Mountain Dojo**—a tranquil East Asian sanctuary overlooking a bamboo forest and koi pond.

```mermaid
graph TD
    Dojo["Personal Player Dojo (Customizable 3D Hub)"]
    
    Dojo --> Trophy["Trophy Wall<br>- Gold/Silver Medals from Weekly Tournaments<br>- Ranked Peak Season Badges"]
    Dojo --> Dummy["Interactive Frame-Data Dummy<br>- Damage Number Readout<br>- Startup/Active/Recovery Frame Visualizer<br>- Poise Break Threshold Tester"]
    Dojo --> Sparring["Central Sparring Mat<br>- Instant Zero-Load 1v1 Duels with Party Members<br>- Unlimited Cooldown / Sandbox Testing Mode"]
    Dojo --> Decor["Aesthetic Decoration<br>- Hanging Calligraphy Scrolls, Bonsai Trees, Weapon Racks"]
```

---

## 5. Daily & Weekly Sages' Trials (Quests)

To encourage diverse playstyles across all four elements, players receive randomized dynamic challenges updated daily and weekly.

```mermaid
flowchart LR
    subgraph Dailies["Daily Trials (Choose 3 per Day)"]
        D1["Glacial Launch: Score 2 knockouts within 3s of launching off an ice ramp (+250 Jade Chi)"]
        D2["Stone Shield: Absorb 400 total damage using Stone Guard spires (+250 Jade Chi)"]
        D3["Flow Mastery: Reach max 3 Flow bars in 3 separate rounds (+250 Jade Chi)"]
    end

    subgraph Weeklies["Weekly Grand Trials"]
        W1["Master of Four: Win at least 1 match playing each of the 4 elements (+1,200 Jade Chi)"]
        W2["Colosseum Victor: Win 10 ranked rounds in the Colosseum of the Four (+1,200 Jade Chi)"]
    end
```

### Jade Chi Bazaar (In-Game Cosmetic Shop)
- Jade Chi earned from daily/weekly trials and ranked matches can be redeemed for:
  - Custom martial arts pants colors and silk sash patterns.
  - Traditional wooden training weapons for dojo decoration.
  - Custom ink brush victory banner fonts and player card titles.
