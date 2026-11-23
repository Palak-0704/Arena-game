// Flowbound: Masters of Four - 3D Scene & Lighting Manager

import * as THREE from 'three';
import { PALETTE } from '../../shared/Constants.js';

export class SceneManager {
  constructor(container) {
    this.container = container;
    
    // Create Three.js Scene with Sky Dome Visibility & Sunset Fog
    this.scene = new THREE.Scene();
    this.scene.background = null; // Let the procedural Sunset Sky Dome render
    this.scene.fog = new THREE.FogExp2(0xfba26b, 0.0035); // Warm sunset golden-amber haze

    // Setup High-Performance Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    
    container.appendChild(this.renderer.domElement);

    // Setup Dynamic Lighting
    this.setupLighting();

    // Resize Handler
    window.addEventListener('resize', () => this.onWindowResize());
  }

  setupLighting() {
    // Ambient Light (Warm peach sky bounce)
    this.ambientLight = new THREE.AmbientLight(0xffedd5, 1.15);
    this.scene.add(this.ambientLight);

    // Primary Directional Sun Light (Golden hour sunset angle)
    this.sunLight = new THREE.DirectionalLight(0xfdba74, 2.0);
    this.sunLight.position.set(40, 35, -35);
    this.sunLight.castShadow = true;
    
    // Ultra-smooth 4K shadow map with soft PCF penumbra filtering
    this.sunLight.shadow.mapSize.width = 4096;
    this.sunLight.shadow.mapSize.height = 4096;
    this.sunLight.shadow.camera.near = 1.0;
    this.sunLight.shadow.camera.far = 160.0;
    
    // Tight frustum concentrated on the 60m fighting ring for max pixel density
    const d = 34;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0003;
    this.sunLight.shadow.normalBias = 0.035; // Eliminates shadow acne and jagged self-shadow stair-stepping
    this.sunLight.shadow.radius = 3.2; // Soft smooth penumbra blur for authentic cinematic shading

    this.scene.add(this.sunLight);

    // Front/Back Fill Light to ensure player character body & back are vividly visible
    this.fillLight = new THREE.DirectionalLight(0xffecd2, 1.1);
    this.fillLight.position.set(-25, 25, -45);
    this.scene.add(this.fillLight);

    // Rim / Sky Bounce Light for crisp character silhouette separation
    this.rimLight = new THREE.DirectionalLight(0x7dd3fc, 0.85);
    this.rimLight.position.set(0, 15, 35);
    this.scene.add(this.rimLight);

    // Hemisphere Light (Sky cyan to ground amber)
    this.hemiLight = new THREE.HemisphereLight(0x93c5fd, 0xb45309, 0.75);
    this.scene.add(this.hemiLight);
  }

  onWindowResize() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  render(camera) {
    this.renderer.render(this.scene, camera);
  }
}
