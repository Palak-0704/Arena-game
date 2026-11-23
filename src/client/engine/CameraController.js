// Flowbound: Masters of Four - Over-the-Shoulder 3rd Person Combat Camera
// Features Exponential Mouse Damping, Zero-Allocation Vector Math & Dynamic Landing Impulse

import * as THREE from 'three';

export class CameraController {
  constructor(domElement) {
    this.camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 300);
    this.domElement = domElement;

    // Angles: yaw=0 faces North (+Z) directly behind player facing south-to-north
    this.yaw = 0;
    this.pitch = 0.16; // Level over-the-shoulder angle
    this.targetYaw = 0;
    this.targetPitch = 0.16;
    
    // Arm & Offset Properties
    this.armLength = 4.2;
    this.targetArmLength = 4.2;
    this.shoulderOffset = 0.35; // Slight over-the-right-shoulder offset for martial visibility
    this.targetOffset = new THREE.Vector3(0, 1.45, 0); // Focus at upper torso / head
    
    // Smooth Damping Positions
    this.currentPosition = new THREE.Vector3(0, 2.0, -18.2);
    this.currentTarget = new THREE.Vector3(0, 1.45, -14);
    this.hasInitialized = false;
    
    // Dynamic Camera Effects
    this.shakeIntensity = 0;
    this.landingDip = 0;
    this.baseFov = 65;
    this.targetFov = 65;

    // Zero-Allocation Reusable Scratch Vectors
    this._scratchDesiredTarget = new THREE.Vector3();
    this._scratchDesiredPos = new THREE.Vector3();
    this._scratchForward = new THREE.Vector3();
    this._scratchRight = new THREE.Vector3();
    this._scratchLook = new THREE.Vector3();
    this._forwardDir = new THREE.Vector3();
    this._rightDir = new THREE.Vector3();

    // Mouse Tracking
    this.isPointerLocked = false;
    this.isMouseDown = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;
    this.setupInputListeners();

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    });
  }

  setupInputListeners() {
    // Click on canvas to engage pointer lock
    this.domElement.addEventListener('click', () => {
      if (!this.isPointerLocked) {
        try {
          const promise = this.domElement.requestPointerLock();
          if (promise && promise.catch) promise.catch(() => {});
        } catch (e) {}
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = (document.pointerLockElement === this.domElement);
    });

    // Mouse movement: works with pointer lock OR mouse drag
    window.addEventListener('mousedown', (e) => {
      this.isMouseDown = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    });

    window.addEventListener('mouseup', () => {
      this.isMouseDown = false;
    });

    window.addEventListener('mousemove', (e) => {
      let deltaX = 0;
      let deltaY = 0;

      if (this.isPointerLocked) {
        deltaX = e.movementX || 0;
        deltaY = e.movementY || 0;
      } else if (this.isMouseDown) {
        deltaX = e.clientX - this.lastMouseX;
        deltaY = e.clientY - this.lastMouseY;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      } else {
        return;
      }

      const sensitivity = 0.0022;
      this.targetYaw -= deltaX * sensitivity;
      this.targetPitch += deltaY * sensitivity;

      // Clamp vertical pitch (-20° looking up to +50° looking down)
      const maxPitch = 0.85;
      const minPitch = -0.35;
      this.targetPitch = Math.max(minPitch, Math.min(maxPitch, this.targetPitch));
    });

    // Arrow keys fallback to rotate camera
    window.addEventListener('keydown', (e) => {
      if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
      if (e.code === 'ArrowLeft') this.targetYaw += 0.04;
      if (e.code === 'ArrowRight') this.targetYaw -= 0.04;
      if (e.code === 'ArrowUp') this.targetPitch -= 0.03;
      if (e.code === 'ArrowDown') this.targetPitch += 0.03;
    });
  }

  triggerShake(intensity = 0.4) {
    this.shakeIntensity = Math.min(1.0, this.shakeIntensity + intensity);
  }

  shake(intensity = 0.4) {
    this.triggerShake(intensity);
  }

  triggerLandingDip(amount = 0.08) {
    this.landingDip = Math.min(0.25, this.landingDip + amount);
  }

  setSurfingFOV(isSurfing) {
    this.targetFov = isSurfing ? 80 : this.baseFov;
  }

  // Classic Behind-the-Back 3rd Person Combat Camera with Exponential Smoothing
  update(dt, playerPosition, opponentPosition = null) {
    if (!playerPosition) return;

    // Exponential Mouse Damping (Buttery smooth 60-144Hz interpolation)
    const mouseDecay = Math.exp(-24.0 * dt);
    this.yaw = this.targetYaw + (this.yaw - this.targetYaw) * mouseDecay;
    this.pitch = this.targetPitch + (this.pitch - this.targetPitch) * mouseDecay;

    // Smooth FOV Transition
    this.camera.fov += (this.targetFov - this.camera.fov) * (dt * 6.0);
    this.camera.updateProjectionMatrix();

    // Target always centers on the player's upper body / head (Zero allocation)
    this._scratchDesiredTarget.copy(playerPosition).add(this.targetOffset);

    // Smooth target lerp
    if (!this.hasInitialized) {
      this.currentTarget.copy(this._scratchDesiredTarget);
      this.hasInitialized = true;
    } else {
      this.currentTarget.lerp(this._scratchDesiredTarget, dt * 18.0);
    }

    // Dynamic camera distance: smoothly pull back when climbing ramps or vaulting into air
    const targetArm = (playerPosition.y > 0.5) ? 5.2 : 4.6;
    this.armLength += (targetArm - this.armLength) * Math.min(1.0, dt * 6.0);

    // Direction vectors based on yaw (Zero allocation)
    const sinYaw = Math.sin(this.yaw);
    const cosYaw = Math.cos(this.yaw);
    this._scratchForward.set(sinYaw, 0, cosYaw);
    this._scratchRight.set(cosYaw, 0, -sinYaw);

    // Place camera directly behind player, elevated by pitch and centered
    const horizDist = this.armLength * Math.cos(this.pitch);
    const vertDist = this.armLength * Math.sin(this.pitch);

    this._scratchDesiredPos.copy(this.currentTarget)
      .addScaledVector(this._scratchForward, -horizDist)
      .addScaledVector(this._scratchRight, this.shoulderOffset * 0.7);
    this._scratchDesiredPos.y += vertDist - this.landingDip;

    // Recover landing dip smoothly
    if (this.landingDip > 0.001) {
      this.landingDip *= Math.exp(-14.0 * dt);
    } else {
      this.landingDip = 0;
    }

    // Camera Shake
    if (this.shakeIntensity > 0.01) {
      const shakeX = (Math.random() - 0.5) * this.shakeIntensity * 0.45;
      const shakeY = (Math.random() - 0.5) * this.shakeIntensity * 0.45;
      this._scratchDesiredPos.x += shakeX;
      this._scratchDesiredPos.y += shakeY;
      this.shakeIntensity *= Math.max(0, 1.0 - dt * 8.5);
    } else {
      this.shakeIntensity = 0;
    }

    // Prevent camera from clipping beneath floor or into low ramp surfaces
    if (this._scratchDesiredPos.y < 0.85) this._scratchDesiredPos.y = 0.85;

    this.currentPosition.lerp(this._scratchDesiredPos, dt * 20.0);
    this.camera.position.copy(this.currentPosition);

    // Soft combat auto-tracking: gently bias yaw towards opponent if locked on
    if (opponentPosition) {
      const oppDx = opponentPosition.x - playerPosition.x;
      const oppDz = opponentPosition.z - playerPosition.z;
      if (Math.hypot(oppDx, oppDz) > 0.5) {
        const combatYaw = Math.atan2(oppDx, oppDz);
        let diffYaw = combatYaw - this.targetYaw;
        while (diffYaw < -Math.PI) diffYaw += Math.PI * 2;
        while (diffYaw > Math.PI) diffYaw -= Math.PI * 2;
        this.targetYaw += diffYaw * Math.min(1.0, dt * 1.8);
      }
    }

    // Look slightly ahead of player along the camera view direction (Zero allocation)
    this._scratchLook.copy(this.currentTarget).addScaledVector(this._scratchForward, 6.0);
    this.camera.lookAt(this._scratchLook);
  }

  // Reset cleanly right behind player facing directly towards the opponent
  resetToCombat(playerPos, oppPos) {
    this.hasInitialized = false;
    this.pitch = 0.16;
    this.armLength = 4.2;

    if (playerPos && oppPos) {
      const dx = oppPos.x - playerPos.x;
      const dz = oppPos.z - playerPos.z;
      // Set yaw so camera faces directly from player towards opponent
      this.yaw = Math.atan2(dx, dz);
    } else {
      this.yaw = 0; // Face North
    }
    this.targetYaw = this.yaw;
    this.targetPitch = this.pitch;

    const p = playerPos || this._scratchDesiredPos.set(0, 0, -14);
    this.currentTarget.copy(p).add(this.targetOffset);

    const sinYaw = Math.sin(this.yaw);
    const cosYaw = Math.cos(this.yaw);
    this._scratchForward.set(sinYaw, 0, cosYaw);
    this._scratchRight.set(cosYaw, 0, -sinYaw);

    const horizDist = this.armLength * Math.cos(this.pitch);
    const vertDist = this.armLength * Math.sin(this.pitch);

    this.currentPosition.copy(this.currentTarget)
      .addScaledVector(this._scratchForward, -horizDist)
      .addScaledVector(this._scratchRight, this.shoulderOffset);
    this.currentPosition.y += vertDist;

    this.camera.position.copy(this.currentPosition);
    this._scratchLook.copy(this.currentTarget).addScaledVector(this._scratchForward, 6.0);
    this.camera.lookAt(this._scratchLook);
    this.hasInitialized = true;
  }

  getForwardDirection() {
    this.camera.getWorldDirection(this._forwardDir);
    this._forwardDir.y = 0;
    return this._forwardDir.normalize();
  }

  getRightDirection() {
    const fwd = this.getForwardDirection();
    this._rightDir.set(-fwd.z, 0, fwd.x);
    return this._rightDir;
  }
}
