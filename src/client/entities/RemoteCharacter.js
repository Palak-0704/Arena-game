// Flowbound: Masters of Four - Remote Character & Opponent Interpolation

import * as THREE from 'three';
import { CharacterModel } from './CharacterModel.js';
import { COMBAT_CONSTANTS } from '../../shared/Constants.js';

export class RemoteCharacter {
  constructor(scene, id, name, element = 'EARTH') {
    this.scene = scene;
    this.id = id;
    this.name = name;
    this.element = element;

    // 3D Model
    this.model = new CharacterModel(element);
    this.scene.add(this.model.group);

    // Target Transforms for smooth interpolation
    this.currentPos = new THREE.Vector3(0, 0, 15);
    this.targetPos = new THREE.Vector3(0, 0, 15);
    this.model.group.position.copy(this.currentPos);

    this.currentYaw = Math.PI;
    this.targetYaw = Math.PI;

    // Attributes
    this.health = 300;
    this.maxHealth = 300;
    this.poise = 200;
    this.maxPoise = 200;
    this.isDead = false;

    // Overhead Health & Poise Bar DOM Element
    this.createOverheadUI();
  }

  createOverheadUI() {
    this.overheadContainer = document.createElement('div');
    this.overheadContainer.className = 'overhead-container';
    this.overheadContainer.style.position = 'fixed';
    this.overheadContainer.style.pointerEvents = 'none';
    this.overheadContainer.style.display = 'flex';
    this.overheadContainer.style.flexDirection = 'column';
    this.overheadContainer.style.alignItems = 'center';
    this.overheadContainer.style.transform = 'translate(-50%, -100%)';
    this.overheadContainer.style.zIndex = '500';

    this.overheadContainer.innerHTML = `
      <div style="font-size: 11px; font-weight: bold; color: #f8fafc; text-shadow: 0 1px 3px rgba(0,0,0,0.9); margin-bottom: 2px;">
        ${this.name}
      </div>
      <div class="overhead-bar">
        <div class="hp-fill" id="remote-hp-${this.id}" style="width: 100%;"></div>
      </div>
      <div class="poise-bar">
        <div class="poise-fill" id="remote-poise-${this.id}" style="width: 100%;"></div>
      </div>
    `;

    document.body.appendChild(this.overheadContainer);
  }

  playAttack(type = 'punch') {
    if (this.model && this.model.playAttack) {
      this.model.playAttack(type);
    }
  }

  updateFromState(state) {
    this.targetPos.set(state.x, state.y, state.z);
    this.targetYaw = state.yaw;
    this.health = state.health;
    this.maxHealth = state.maxHealth || 250;
    this.poise = state.poise;
    this.maxPoise = state.maxPoise || 180;
    this.isDead = !!state.isDead;
    this.model.setGuarding(!!state.isGuarding);

    // Update Overhead Bar
    const hpEl = document.getElementById(`remote-hp-${this.id}`);
    const poiseEl = document.getElementById(`remote-poise-${this.id}`);
    if (hpEl) hpEl.style.width = `${Math.max(0, (this.health / this.maxHealth) * 100)}%`;
    if (poiseEl) poiseEl.style.width = `${Math.max(0, (this.poise / this.maxPoise) * 100)}%`;

    if (this.isDead) {
      this.overheadContainer.style.display = 'none';
      this.model.group.visible = true;
      // Authentic martial arts knockdown defeat posture (flat on floor)
      this.model.group.rotation.x = -Math.PI / 2;
      this.model.group.position.y = 0.32;
    } else {
      this.overheadContainer.style.display = 'flex';
      this.model.group.visible = true;
      this.model.group.rotation.x = 0;
      this.model.group.position.y = 0;
    }
  }

  update(dt, camera) {
    if (this.isDead) return;

    // Smooth position interpolation
    this.currentPos.lerp(this.targetPos, dt * 14.0);
    this.model.group.position.copy(this.currentPos);

    // Smooth yaw with proper angular shortest-path wrap-around
    let diff = this.targetYaw - this.model.group.rotation.y;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    this.model.group.rotation.y += diff * Math.min(1.0, dt * 12.0);

    const speed = this.currentPos.distanceTo(this.targetPos) / Math.max(dt, 0.001);
    this.model.updateAnimation(dt, speed, false, this.currentPos.y > 0.3);

    // Project Overhead UI to screen space
    if (camera && this.overheadContainer) {
      const headPos = this.currentPos.clone().add(new THREE.Vector3(0, 2.1, 0));
      headPos.project(camera);

      // Check if in front of camera
      if (headPos.z < 1.0) {
        const x = (headPos.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-(headPos.y * 0.5) + 0.5) * window.innerHeight;
        this.overheadContainer.style.left = `${x}px`;
        this.overheadContainer.style.top = `${y}px`;
        this.overheadContainer.style.display = 'flex';
      } else {
        this.overheadContainer.style.display = 'none';
      }
    }
  }

  destroy() {
    this.scene.remove(this.model.group);
    if (this.overheadContainer && this.overheadContainer.parentNode) {
      this.overheadContainer.parentNode.removeChild(this.overheadContainer);
    }
  }
}
