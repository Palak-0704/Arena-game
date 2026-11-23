# 08 — Game Architecture & Technical Stack

## 1. Engine Architecture & Core Class Hierarchy

The architecture of *Flowbound* is implemented in **Unreal Engine 5.4+** utilizing modern C++ design patterns, the **Gameplay Ability System (GAS)**, and custom **Enhanced Input** mappings.

```mermaid
classDiagram
    class AGameModeBase
    class AFlowboundGameMode {
        +int32 RoundsToWin = 3
        +float RoundDuration = 90.0f
        +StartRound()
        +EndRound(AController* Winner)
        +CheckMatchVictory()
    }
    AGameModeBase <|-- AFlowboundGameMode

    class AGameStateBase
    class AFlowboundGameState {
        +int32 TeamAScore
        +int32 TeamBScore
        +int32 CurrentRound
        +float RemainingRoundTime
        +OnRep_ScoresUpdated()
    }
    AGameStateBase <|-- AFlowboundGameState

    class ACharacter
    class AFlowboundCharacterBase {
        +UFlowboundMovementComponent* FlowboundMovement
        +UAbilitySystemComponent* AbilitySystemComponent
        +UFlowboundAttributeSet* AttributeSet
        +USkeletalMeshComponent* BodyMesh
        +EElementalDiscipline CurrentDiscipline
        +PerformGhostDash()
        +ExecuteLedgeMantle()
    }
    ACharacter <|-- AFlowboundCharacterBase

    class UCharacterMovementComponent
    class UFlowboundMovementComponent {
        +bool bIsIceSurfing
        +bool bIsWallRunning
        +SplineRampGenerator* ActiveRamp
        +PhysCustom(float deltaTime, int32 Iterations)
        +PhysIceSurfing(float deltaTime, int32 Iterations)
        +PhysWallRunning(float deltaTime, int32 Iterations)
    }
    UCharacterMovementComponent <|-- UFlowboundMovementComponent

    AFlowboundCharacterBase --> UFlowboundMovementComponent
```

---

## 2. Gameplay Ability System (GAS) & Attribute Set

All character abilities, status effects, cooldowns, and resources are governed through Unreal Engine's **Gameplay Ability System**.

```mermaid
graph TD
    ASC["UAbilitySystemComponent (Character)"]
    
    subgraph Attributes["UFlowboundAttributeSet"]
        HP["Health (Current / Max: 150.0)"]
        Poise["Poise (Current / Max: 100.0)"]
        Flow["Flow (Current / Max: 3.0)"]
        Speed["MovementSpeedMult (1.0)"]
    end
    
    subgraph Abilities["Gameplay Abilities (UGameplayAbility)"]
        GA_Whip["GA_Water_WaterWhip (LMB)"]
        GA_Chakram["GA_Water_Chakram (RMB)"]
        GA_IceWall["GA_Water_IceWall (Q)"]
        GA_IceSurf["GA_Water_IceSurf (Shift)"]
        GA_Octopus["GA_Water_TheOctopus (M4)"]
        GA_Boulder["GA_Earth_BoulderKick (LMB)"]
        GA_StoneWall["GA_Earth_StoneGuard (Q)"]
        GA_Snare["GA_Earth_SeismicSnare (M4)"]
    end

    subgraph Tags["Gameplay Tags"]
        Tag_State["State.Combat.Staggered"]
        Tag_Surf["State.Movement.IceSurfing"]
        Tag_Mantle["State.Movement.Mantling"]
        Tag_Immune["State.Defense.Invulnerable"]
    end

    ASC --> Attributes
    ASC --> Abilities
    ASC --> Tags
```

### Attribute Set Definition (C++ Header Spec)
```cpp
UCLASS()
class FLOWBOUND_API UFlowboundAttributeSet : public UAttributeSet
{
    GENERATED_BODY()

public:
    UPROPERTY(BlueprintReadOnly, ReplicatedUsing = OnRep_Health, Category = "Attributes|Health")
    FGameplayAttributeData Health;
    ATTRIBUTE_ACCESSORS(UFlowboundAttributeSet, Health)

    UPROPERTY(BlueprintReadOnly, ReplicatedUsing = OnRep_MaxHealth, Category = "Attributes|Health")
    FGameplayAttributeData MaxHealth;
    ATTRIBUTE_ACCESSORS(UFlowboundAttributeSet, MaxHealth)

    UPROPERTY(BlueprintReadOnly, ReplicatedUsing = OnRep_Poise, Category = "Attributes|Poise")
    FGameplayAttributeData Poise;
    ATTRIBUTE_ACCESSORS(UFlowboundAttributeSet, Poise)

    UPROPERTY(BlueprintReadOnly, ReplicatedUsing = OnRep_Flow, Category = "Attributes|Flow")
    FGameplayAttributeData Flow;
    ATTRIBUTE_ACCESSORS(UFlowboundAttributeSet, Flow)

    virtual void PreAttributeChange(const FGameplayAttribute& Attribute, float& NewValue) override;
    virtual void PostGameplayEffectExecute(const FGameplayEffectModCallbackData& Data) override;
};
```

---

## 3. Real-Time Procedural Ice Spline Extrusion

The iconic Ice Surfing mechanic requires dynamically generating 3D geometry with convex physical collision in real time behind the player.

```mermaid
flowchart TD
    PlayerPos["Player Foot Location Sampled (12.5 Hz)"] --> SplineBuffer["Append to USplineComponent Buffer"]
    SplineBuffer --> TangentCalc["Calculate Curve Tangent & Up Vector"]
    TangentCalc --> CrossSection["Generate 2D Wedge Cross-Section Vertices"]
    CrossSection --> MeshBuilder["UProceduralMeshComponent::CreateMeshSection_LinearColor()"]
    MeshBuilder --> Collision["Update Simple Convex Collision Volume"]
    Collision --> PhysMaterial["Assign PM_Ice (Friction = 0.02)"]
    MeshBuilder --> LifetimeTimer["Set Timer: 6.0s Lifespan -> Trigger Melt Shader"]
```

### Procedural Mesh Generation Algorithm
```cpp
void AIceRampActor::AddSplinePointAndExtrude(const FVector& NewPoint, const FVector& ForwardDir)
{
    SplineComponent->AddSplinePoint(NewPoint, ESplineCoordinateSpace::World);
    int32 PointIndex = SplineComponent->GetNumberOfSplinePoints() - 1;

    if (PointIndex < 2) return;

    FVector CurrentPos = SplineComponent->GetLocationAtSplinePoint(PointIndex - 1, ESplineCoordinateSpace::World);
    FVector NextPos = SplineComponent->GetLocationAtSplinePoint(PointIndex, ESplineCoordinateSpace::World);
    FVector RightDir = FVector::CrossProduct(ForwardDir, FVector::UpVector).GetSafeNormal();

    float HalfWidth = 110.0f; // 2.2m total width
    float Height = 35.0f;     // Wedge slab thickness

    // Generate 4-vertex quad per segment
    int32 BaseIdx = Vertices.Num();
    Vertices.Add(CurrentPos - RightDir * HalfWidth);
    Vertices.Add(CurrentPos + RightDir * HalfWidth);
    Vertices.Add(NextPos - RightDir * HalfWidth);
    Vertices.Add(NextPos + RightDir * HalfWidth);

    // Triangles
    Triangles.Add(BaseIdx + 0); Triangles.Add(BaseIdx + 2); Triangles.Add(BaseIdx + 1);
    Triangles.Add(BaseIdx + 1); Triangles.Add(BaseIdx + 2); Triangles.Add(BaseIdx + 3);

    ProceduralMesh->CreateMeshSection_LinearColor(SectionIndex++, Vertices, Triangles, Normals, UV0, Colors, Tangents, true);
}
```

---

## 4. Multiplayer Replication & Client-Side Prediction

*Flowbound* is engineered for competitive online multiplayer with strict server authority and smooth client responsiveness.

```mermaid
sequenceDiagram
    participant Client as Client Player
    participant Server as Dedicated Server (64-128 Hz)
    participant Remote as Remote Opponents

    Client->>Client: 1. Input: Hold Shift (Ice Surf)
    Client->>Client: 2. Predict Local Movement & Spawn Local VFX
    Client->>Server: 3. Send FSavedMove (Timestamp, Acceleration, ViewAngle)
    
    Server->>Server: 4. Verify Movement & Physics Constraints
    Server->>Server: 5. Spawn Authoritative Ice Ramp Actor
    Server->>Remote: 6. Multicast Replicated Ice Ramp Actor
    Server->>Client: 7. Acknowledge Move or Correct State (Reconciliation)
    
    Remote->>Remote: 8. Render Extruded Ramp & Opponent Surfing Pose
```

### Network Synchronization Targets
- **Tickrate:** 64 Hz baseline (up to 128 Hz dedicated competitive instances).
- **Lag Compensation:** Circular history buffer (500ms) storing bounding capsule transforms for server-side raycast rewinding during high-velocity projectile hits.
- **Interpolation:** Remote proxies interpolate at 60 Hz with cubic Hermite spline position smoothing.
