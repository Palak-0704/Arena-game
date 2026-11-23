# 04 — Character Modeling & Animation Systems

## 1. 3D Character Model Specifications

The characters in *Flowbound* are stylized elemental martial artists inspired by Shaolin monks and traditional Wushu practitioners.

```mermaid
graph TD
    subgraph Mesh["Modular Character Hierarchy (38,000 Tris LOD0)"]
        Head["Head Mesh<br>- Bald/Shaved Monastic Crown<br>- Stylized Eyes & Sharp Jawline<br>- Cel-Outline Friendly Topology"]
        Torso["Torso Mesh<br>- Athletic Tanned Musculature<br>- Stylized Pectoral/Lat Contours<br>- Bare Upper Body"]
        Waist["Waist / Sash Mesh<br>- Dark Bound Martial Arts Sash (#111827)<br>- Dynamic Physics Tail Cloth"]
        Pants["Pants Mesh<br>- Baggy Kung-Fu Trousers<br>- Calve Shin Wraps / Bindings<br>- Water (Navy) / Earth (Olive)"]
        Feet["Feet Mesh<br>- Barefoot Anatomy with Plantar Arch<br>- Foot IK Alignment Targets"]
    end
```

---

### Master Mesh & Asset Budget

| Component | Target Triangle Count | Texture Resolution | PBR Channels Used | Sockets / FX Anchors |
| :--- | :--- | :--- | :--- | :--- |
| **Head & Neck** | 6,500 tris | 2048 x 2048 | BaseColor, Normal, CelMask | `head_socket`, `eye_l`, `eye_r` |
| **Torso & Arms** | 12,000 tris | 2048 x 2048 | BaseColor, Normal, CelMask | `spine_03_socket`, `chest_fx` |
| **Hands (x2)** | 7,000 tris (3.5k each) | 2048 x 2048 | BaseColor, Normal, CelMask | `hand_l_fx`, `hand_r_fx` (Whip emitters) |
| **Trousers & Sash**| 9,500 tris | 2048 x 2048 | BaseColor, Normal, Roughness| `pelvis_socket`, `sash_tail` |
| **Legs & Bare Feet**| 5,000 tris | 2048 x 2048 | BaseColor, Normal, CelMask | `foot_l_fx`, `foot_r_fx` (Ice skate emitters)|
| **Total Character**| **40,000 tris** | **Shared 4K Atlas** | **High Efficiency Toon Pack**| **12 Rig Sockets** |

---

## 2. Rigging, Skeleton & IK Hierarchy

The skeletal structure is built on the standard Epic Unreal Humanoid hierarchy with additional helper and IK bones to support ice surfing and wall interactions.

```mermaid
graph TD
    Root["root (0,0,0)"] --> Pelvis["pelvis"]
    Pelvis --> Spine1["spine_01"] --> Spine2["spine_02"] --> Spine3["spine_03"]
    Spine3 --> Neck["neck_01"] --> Head["head"]
    
    Spine3 --> ClavL["clavicle_l"] --> ArmL["upperarm_l"] --> ForearmL["lowerarm_l"] --> HandL["hand_l"]
    Spine3 --> ClavR["clavicle_r"] --> ArmR["upperarm_r"] --> ForearmR["lowerarm_r"] --> HandR["hand_r"]
    
    Pelvis --> ThighL["thigh_l"] --> CalfL["calf_l"] --> FootL["foot_l"] --> ToeL["ball_l"]
    Pelvis --> ThighR["thigh_r"] --> CalfR["calf_r"] --> FootR["foot_r"] --> ToeR["ball_r"]
    
    Root --> IKFootRoot["ik_foot_root"]
    IKFootRoot --> IKFootL["ik_foot_l"]
    IKFootRoot --> IKFootR["ik_foot_r"]
    
    Root --> IKHandRoot["ik_hand_root"]
    IKHandRoot --> IKHandL["ik_hand_l"]
    IKHandRoot --> IKHandR["ik_hand_r"]
```

### Essential Socket Attachments
- `hand_l_fx` & `hand_r_fx`: Spawns glowing water whips, water chakrams, or fire fist emitters.
- `foot_l_fx` & `foot_r_fx`: Emits snow/ice particles and dynamic surf decals.
- `root_ground_fx`: Projects the 2.8m ground aura ring during elemental stances.
- `spine_03_camera`: Anchor point for third-person spring-arm target offset.

---

## 3. Animation State Machine & Locomotion

```mermaid
stateDiagram-v2
    [*] --> GroundLocomotion
    
    GroundLocomotion --> Sprinting: Hold Shift (No Surf)
    GroundLocomotion --> IceSurfing: Hold Shift (Water Element)
    GroundLocomotion --> GhostDashing: Tap Dash (Space/Alt)
    GroundLocomotion --> JumpStart: Tap Jump (Space)
    
    IceSurfing --> RampLaunch: Skate Off Ramp Edge
    RampLaunch --> InAirApex: Vertical Arc
    
    JumpStart --> InAirApex: Ascending
    InAirApex --> Falling: Descending
    
    Falling --> LandingNormal: Hit Flat Ground (v_z < -800)
    Falling --> LandingRoll: Input Forward on Impact
    Falling --> LedgeMantle: Trace Hits Wall Edge
    Falling --> WallSlide: Forward Wall Contact
    
    WallSlide --> WallKick: Tap Jump on Wall
    WallKick --> InAirApex
    
    LedgeMantle --> GroundLocomotion: Pull Up Complete
    LandingRoll --> GroundLocomotion: Roll Recovery
    LandingNormal --> GroundLocomotion: Settle
    GhostDashing --> GroundLocomotion: Dash End
```

### Locomotion Speed Profiles
- **Idle:** 0 cm/s (Wushu martial arts breathing stance).
- **Combat Walk:** 280 cm/s (Strafe enabled, upper body decoupled).
- **Run:** 620 cm/s.
- **Sprint:** 950 cm/s.
- **Ice Surfing:** 1,200 cm/s base acceleration, uncapped down slopes up to 1,650 cm/s.
- **Ghost Dash Velocity:** 1,800 cm/s burst over 0.25s duration.

---

## 4. Combat Animation Montages & Layering

Combat actions utilize an **Upper Body Montage Slot** layered over lower-body locomotion via a `Layered blend per bone` node starting at `spine_01`. This allows the character to run, skate, or leap while charging projectiles, throwing boulders, or casting shields.

```mermaid
graph LR
    subgraph FullBody["Full Body Overrides"]
        AcroRoll["Acrobatic Recovery Roll"]
        DiveChakram["Aerial Chakram Dive"]
        SnareStomp["Seismic Snare Ground Slam"]
    end

    subgraph UpperBody["Layered Upper Body (spine_01)"]
        WhipStrike["Water Whip Strikes 1, 2, 3"]
        BoulderKick["Earth Boulder Kick"]
        ShieldCast["Ice Wall / Shield Hold"]
        WaterOrb["Water Sphere Throw"]
    end

    Loco["Lower Body: Run / Skate / Fall"] --> Blend["Layered Blend Per Bone"]
    UpperBody --> Blend
    Blend --> Output["Final Character Pose"]
```

---

## 5. Comprehensive Combat Frame Data Table

All timings assume a 60 FPS tickrate benchmark:

| Ability / Attack Name | Total Duration | Startup (Active Hits) | Active Frames | Recovery | On-Hit Advantage | Interruptible Cancel Window |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Water Whip 1 (`LMB`)** | 24 frames | 8 frames | 4 frames | 12 frames | +4 frames | Cancel recovery into Whip 2 at frame 13 |
| **Water Whip 2 (`LMB`)** | 28 frames | 10 frames | 4 frames | 14 frames | +6 frames | Cancel recovery into Whip 3 at frame 15 |
| **Water Whip 3 (Finisher)**| 38 frames | 14 frames | 6 frames | 18 frames | Knockdown | Non-cancelable finisher |
| **Water Chakrams (`RMB`)** | 36 frames | 12 frames | 8 frames | 16 frames | +2 frames | Cancel into Ghost Dash at frame 22 |
| **Aerial Chakram Dive** | 42 frames | 14 frames | 10 frames | 18 frames | Hard Knockdown| Can cancel on ground contact |
| **Ice Wall / Ramp (`Q`)** | 30 frames | 10 frames | Instant spawn | 20 frames | N/A | Cancel into Ice Surf at frame 12 |
| **Earth Boulder Kick (`LMB`)**| 46 frames | 18 frames | 8 frames | 20 frames | +8 frames (Stagger)| Cancel into Stone Guard at frame 28 |
| **Seismic Snare (`M4`)** | 52 frames | 20 frames | 12 frames | 20 frames | Launch / Float | Non-cancelable during stomp |
| **Ghost Dash** | 20 frames | 2 frames | 10 frames (i-frames)| 8 frames | Neutral | Cancel into any attack at frame 14 |
| **Ledge Mantle** | 24 frames | 4 frames | 16 frames | 4 frames | Neutral | Immediate attack on ledge crest |
