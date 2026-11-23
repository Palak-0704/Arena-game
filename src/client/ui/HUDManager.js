// Flowbound: Masters of Four - Calligraphic UI & HUD Manager
// Features Symmetrical High-Res Health & Poise Bars, Skill Enso Cooldowns, and In-Arena 3-2-1 Countdown

import { COMBAT_CONSTANTS, POWER_PERKS } from '../../shared/Constants.js';

export class HUDManager {
  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'flowbound-hud';
    document.body.appendChild(this.container);

    this.buildHUD();
    this.damageNumbers = [];
    this.setVisible(false);
  }

  setVisible(visible) {
    if (this.container) {
      this.container.style.display = visible ? 'block' : 'none';
    }
  }

  buildHUD() {
    this.container.innerHTML = `
      <style>
        #flowbound-hud {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          pointer-events: none;
          user-select: none;
          font-family: 'Cinzel Decorative', 'Cinzel', serif, system-ui;
          z-index: 1000;
        }

        /* Top Symmetrical Match Combat Header */
        .match-header {
          position: absolute;
          top: 18px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 20px;
          width: 94%;
          max-width: 1100px;
          justify-content: space-between;
          box-sizing: border-box;
          z-index: 100;
        }

        .fighter-hud-side {
          display: flex;
          flex-direction: column;
          flex: 1;
          gap: 4px;
          min-width: 0; /* Prevents flex children overflow */
        }

        .fighter-hud-side.player-side {
          align-items: flex-start;
        }

        .fighter-hud-side.bot-side {
          align-items: flex-end;
        }

        .fighter-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          letter-spacing: 2px;
          font-weight: 800;
          color: #f8fafc;
          text-shadow: 0 2px 6px rgba(0,0,0,0.9);
          max-width: 100%;
        }

        .fighter-hud-name {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 220px;
          display: inline-block;
          text-transform: uppercase;
        }

        .fighter-hud-badge {
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 3px;
          background: rgba(14, 116, 144, 0.4);
          border: 1px solid #38bdf8;
          color: #38bdf8;
          letter-spacing: 1px;
          flex-shrink: 0;
        }

        .bot-side .fighter-hud-badge {
          background: rgba(185, 28, 28, 0.4);
          border-color: #f87171;
          color: #f87171;
          flex-shrink: 0;
        }

        /* Health & Poise Bar Shells */
        .bar-shell {
          width: 100%;
          background: rgba(15, 23, 42, 0.85);
          border-radius: 3px;
          overflow: hidden;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.7);
        }

        .hp-shell {
          height: 14px;
          border: 1px solid rgba(255, 255, 255, 0.25);
        }

        .poise-shell {
          height: 6px;
          border: 1px solid rgba(255, 255, 255, 0.15);
          margin-top: 1px;
        }

        .perks-badge-row {
          display: flex;
          gap: 6px;
          margin-top: 6px;
          flex-wrap: wrap;
        }

        .perk-mini-pill {
          background: rgba(14, 116, 144, 0.7);
          border: 1px solid #38bdf8;
          border-radius: 4px;
          font-size: 10px;
          font-family: system-ui, sans-serif;
          font-weight: bold;
          color: #bae6fd;
          padding: 2px 7px;
          letter-spacing: 0.5px;
          box-shadow: 0 0 10px rgba(56, 189, 248, 0.4);
        }

        .bar-fill {
          height: 100%;
          transition: width 0.12s ease-out;
        }

        .player-hp-fill {
          background: linear-gradient(90deg, #0284c7 0%, #38bdf8 80%, #bae6fd 100%);
          box-shadow: 0 0 10px rgba(56, 189, 248, 0.6);
        }

        .bot-hp-fill {
          background: linear-gradient(90deg, #bae6fd 0%, #f87171 20%, #dc2626 100%);
          box-shadow: 0 0 10px rgba(239, 68, 68, 0.6);
        }

        .player-poise-fill {
          background: #e2e8f0;
        }

        .bot-poise-fill {
          background: #e2e8f0;
        }

        /* Center Match Info */
        .header-center-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          background: rgba(15, 23, 42, 0.90);
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 6px;
          padding: 6px 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.7);
          min-width: 150px;
          flex-shrink: 0;
        }

        @media (max-width: 1100px) {
          .match-header {
            width: 96%;
            gap: 12px;
            top: 12px;
          }
          .header-center-box {
            padding: 4px 10px;
            min-width: 130px;
          }
          .round-title {
            font-size: 10px;
            letter-spacing: 1px;
          }
          .fighter-meta {
            font-size: 11px;
            gap: 6px;
          }
          .fighter-hud-name {
            max-width: 140px;
          }
          .hp-shell {
            height: 12px;
          }
        }

        .diamonds-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .diamond-group {
          display: flex;
          gap: 6px;
        }

        .diamond {
          width: 11px;
          height: 11px;
          border: 2px solid #64748b;
          transform: rotate(45deg);
          transition: all 0.3s ease;
        }

        .diamond.filled {
          background: #38bdf8;
          border-color: #38bdf8;
          box-shadow: 0 0 10px #38bdf8;
        }

        .vs-mini-badge {
          font-size: 11px;
          font-weight: 900;
          color: #f59e0b;
          letter-spacing: 1px;
        }

        .round-title {
          margin-top: 4px;
          font-size: 11px;
          letter-spacing: 2px;
          color: #e2e8f0;
          font-weight: bold;
        }

        /* In-Arena Countdown Overlay */
        .arena-countdown-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          display: none;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          z-index: 1500;
        }

        .countdown-digit {
          font-family: 'Cinzel Decorative', serif;
          font-size: 110px;
          font-weight: 900;
          color: #fde047;
          text-shadow: 0 0 35px rgba(250, 204, 21, 0.9), 0 6px 18px rgba(0,0,0,0.95);
          animation: popScale 0.85s ease-out;
          letter-spacing: 4px;
        }

        .countdown-digit.fight {
          font-size: 120px;
          color: #38bdf8;
          text-shadow: 0 0 45px rgba(56, 189, 248, 1.0), 0 6px 20px rgba(0,0,0,0.95);
        }

        .countdown-sub {
          font-family: 'Cinzel', serif;
          font-size: 20px;
          letter-spacing: 6px;
          color: #f8fafc;
          text-shadow: 0 2px 8px rgba(0,0,0,0.9);
          margin-top: 10px;
        }

        @keyframes popScale {
          0% { transform: scale(2.0); opacity: 0; }
          30% { transform: scale(1.0); opacity: 1; }
          85% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(0.9); opacity: 0; }
        }

        /* Center Aim Reticle & Hitmarker */
        .reticle-container {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .reticle-dot {
          width: 5px;
          height: 5px;
          background: #ffffff;
          border-radius: 50%;
          box-shadow: 0 0 4px rgba(0,0,0,0.8);
          transition: transform 0.1s ease;
        }

        .hitmarker-x {
          position: absolute;
          width: 18px;
          height: 18px;
          opacity: 0;
          transition: opacity 0.08s ease;
        }

        .hitmarker-x::before, .hitmarker-x::after {
          content: '';
          position: absolute;
          top: 8px;
          left: 0;
          width: 18px;
          height: 2px;
          background: #ffffff;
        }
        .hitmarker-x::before { transform: rotate(45deg); }
        .hitmarker-x::after { transform: rotate(-45deg); }

        .hitmarker-x.active {
          opacity: 1;
        }

        /* Bottom Left Flow Meter */
        .flow-meter-container {
          position: absolute;
          bottom: 54px;
          left: 20px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .ink-brush-accent {
          width: 160px;
          height: 12px;
          background: linear-gradient(90deg, rgba(15,23,42,0.85) 0%, rgba(15,23,42,0.3) 80%, transparent 100%);
          border-radius: 4px;
        }

        .flow-bars {
          display: flex;
          gap: 4px;
        }

        .flow-segment {
          width: 48px;
          height: 10px;
          background: rgba(15, 23, 42, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 2px;
          overflow: hidden;
        }

        .flow-fill {
          height: 100%;
          width: 0%;
          background: #38bdf8;
          box-shadow: 0 0 10px #38bdf8;
          transition: width 0.15s ease-out;
        }

        /* Bottom Right Enso Skill Bar */
        .skill-bar-container {
          position: absolute;
          bottom: 35px;
          right: 35px;
          display: flex;
          gap: 16px;
          align-items: center;
        }

        .enso-slot {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
        }

        .enso-ring-bg {
          width: 58px;
          height: 58px;
          border-radius: 50%;
          background: rgba(15, 23, 42, 0.75);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
          transition: all 0.2s ease;
        }

        .enso-brush-svg {
          position: absolute;
          top: -3px;
          left: -3px;
          width: 64px;
          height: 64px;
          pointer-events: none;
        }

        .keybind-label {
          margin-top: 6px;
          font-size: 11px;
          font-weight: 800;
          color: #bae6fd;
          letter-spacing: 1.5px;
          text-shadow: 0 1px 3px rgba(0,0,0,0.9);
        }

        .enso-slot.active-surf .enso-ring-bg {
          background: rgba(56, 189, 248, 0.55);
          box-shadow: 0 0 24px #38bdf8, inset 0 0 10px #ffffff;
          transform: scale(1.15);
          transition: all 0.15s ease;
        }

        .surf-indicator-banner {
          position: absolute;
          bottom: 105px;
          right: 35px;
          background: rgba(15, 23, 42, 0.90);
          border: 1px solid #38bdf8;
          border-radius: 4px;
          padding: 8px 20px;
          color: #38bdf8;
          font-family: 'Cinzel', serif;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 2px;
          display: none;
          box-shadow: 0 0 20px rgba(56, 189, 248, 0.6);
          animation: pulseSurf 0.6s infinite alternate;
        }

        @keyframes pulseSurf {
          from { opacity: 0.8; transform: scale(1.0); }
          to { opacity: 1.0; transform: scale(1.04); }
        }

        .cooldown-overlay {
          position: absolute;
          width: 58px;
          height: 58px;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.7);
          display: none;
          z-index: 5;
        }

        /* Floating Damage Text (Authentic Flowbound pop-up) */
        .damage-number {
          position: absolute;
          font-size: 26px;
          font-weight: 900;
          font-family: 'Rajdhani', 'Cinzel', sans-serif;
          color: #facc15;
          -webkit-text-stroke: 1px #000;
          text-shadow: 0 0 10px rgba(250, 204, 21, 0.6), 0 2px 6px #000;
          pointer-events: none;
          z-index: 9999;
          animation: floatUp 0.85s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .damage-number.crit {
          font-size: 32px;
          color: #ef4444;
          text-shadow: 0 0 14px rgba(239, 68, 68, 0.8), 0 2px 6px #000;
        }

        @keyframes floatUp {
          0% { transform: translate(-50%, 0) scale(0.6); opacity: 0; }
          15% { transform: translate(-50%, -15px) scale(1.3); opacity: 1; }
          60% { transform: translate(-50%, -35px) scale(1.05); opacity: 1; }
          100% { transform: translate(-50%, -65px) scale(0.9); opacity: 0; }
        }

        /* Low Health Tension Heartbeat Vignette */
        #tension-vignette {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          pointer-events: none;
          box-shadow: inset 0 0 160px rgba(220, 38, 38, 0.85);
          opacity: 0;
          transition: opacity 0.3s ease;
          z-index: 920;
        }

        #tension-vignette.pulsing {
          animation: heartbeatPulse 1.1s infinite ease-in-out;
        }

        @keyframes heartbeatPulse {
          0% { opacity: 0.35; transform: scale(1.0); }
          50% { opacity: 0.88; transform: scale(1.015); }
          100% { opacity: 0.35; transform: scale(1.0); }
        }

        /* Full-Function Pause Modal Overlay */
        .hud-pause-btn {
          background: rgba(15, 23, 42, 0.85);
          border: 1px solid rgba(56, 189, 248, 0.4);
          border-radius: 20px;
          padding: 4px 12px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1.5px;
          color: #94a3b8;
          cursor: pointer;
          backdrop-filter: blur(8px);
          transition: all 0.22s ease;
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 5px;
        }

        .hud-pause-btn:hover {
          background: rgba(14, 116, 144, 0.6);
          color: #38bdf8;
          border-color: #38bdf8;
          box-shadow: 0 0 14px rgba(56, 189, 248, 0.4);
          transform: scale(1.04);
        }

        .pause-modal-backdrop {
          position: fixed;
          top: 0; left: 0;
          width: 100vw; height: 100vh;
          background: rgba(5, 10, 20, 0.82);
          backdrop-filter: blur(12px);
          z-index: 2500;
          display: flex;
          align-items: center;
          justify-content: center;
          user-select: none;
          font-family: 'Cinzel', serif;
          animation: pauseFadeIn 0.2s ease-out;
        }

        @keyframes pauseFadeIn {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1.0); }
        }

        .pause-modal-box {
          background: rgba(15, 23, 42, 0.95);
          border: 1px solid rgba(56, 189, 248, 0.45);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.9), 0 0 30px rgba(56, 189, 248, 0.25);
          border-radius: 12px;
          padding: 32px 42px;
          width: 440px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .pause-modal-title {
          font-family: 'Cinzel Decorative', serif;
          font-size: 32px;
          font-weight: 900;
          letter-spacing: 4px;
          background: linear-gradient(180deg, #fef08a 0%, #f59e0b 60%, #b45309 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 6px;
        }

        .pause-modal-sub {
          font-size: 12px;
          letter-spacing: 3px;
          color: #9be2f6;
          font-weight: 700;
          text-transform: uppercase;
          margin-bottom: 24px;
        }

        .pause-menu-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
        }

        .pause-action-btn {
          background: rgba(30, 41, 59, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.18);
          color: #f8fafc;
          font-family: 'Cinzel', serif;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 2.5px;
          padding: 13px 20px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.22s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .pause-action-btn:hover {
          background: #38bdf8;
          color: #09090b;
          border-color: #38bdf8;
          box-shadow: 0 0 22px rgba(56, 189, 248, 0.65);
          transform: translateY(-2px);
        }

        .pause-resume-btn {
          background: linear-gradient(135deg, rgba(14, 116, 144, 0.9) 0%, rgba(2, 132, 199, 0.9) 100%);
          border-color: #38bdf8;
        }

        .pause-resume-btn:hover {
          background: linear-gradient(135deg, #38bdf8 0%, #0284c7 100%);
        }

        .pause-quit-btn {
          border-color: rgba(239, 68, 68, 0.35);
        }

        .pause-quit-btn:hover {
          background: #ef4444;
          color: #ffffff;
          border-color: #ef4444;
          box-shadow: 0 0 22px rgba(239, 68, 68, 0.65);
        }

        /* Decisive Blow / K.O. Flash Banner */
        .ko-banner-overlay {
          position: fixed;
          top: 38%;
          left: 50%;
          transform: translate(-50%, -50%) scale(0.7);
          display: none;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          z-index: 1900;
          opacity: 0;
          transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .ko-banner-overlay.active {
          display: flex;
          opacity: 1;
          transform: translate(-50%, -50%) scale(1.0);
        }

        .ko-banner-text {
          font-size: 34px;
          letter-spacing: 12px;
          color: #fde047;
          font-weight: 900;
          text-shadow: 0 0 25px rgba(250, 204, 21, 0.9), 0 4px 12px #000;
        }

        .ko-banner-sub {
          font-size: 82px;
          font-weight: 900;
          letter-spacing: 8px;
          color: #ffffff;
          -webkit-text-stroke: 2px #dc2626;
          text-shadow: 0 0 40px rgba(239, 68, 68, 0.95), 0 6px 20px #000;
          margin-top: -6px;
        }

        /* Celebration Floating Action Prompt & Button */
        .celebration-prompt-container {
          position: fixed;
          bottom: 90px;
          left: 50%;
          transform: translateX(-50%);
          display: none;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          z-index: 1950;
          pointer-events: auto;
          animation: promptFloat 2.0s infinite ease-in-out;
        }

        @keyframes promptFloat {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(-6px); }
        }

        .celebration-title {
          font-size: 14px;
          letter-spacing: 3px;
          color: #38bdf8;
          font-weight: 900;
          text-shadow: 0 0 16px rgba(56, 189, 248, 0.8), 0 2px 6px #000;
          text-transform: uppercase;
        }

        .celebrate-btn {
          background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
          border: 2px solid #38bdf8;
          color: #ffffff;
          font-family: 'Cinzel', serif;
          font-size: 15px;
          font-weight: 800;
          letter-spacing: 2.5px;
          padding: 12px 32px;
          border-radius: 6px;
          cursor: pointer;
          box-shadow: 0 0 28px rgba(56, 189, 248, 0.65), 0 4px 14px rgba(0,0,0,0.8);
          transition: all 0.2s ease;
        }

        .celebrate-btn:hover {
          background: linear-gradient(135deg, #38bdf8 0%, #0284c7 100%);
          color: #020617;
          border-color: #fde047;
          box-shadow: 0 0 36px rgba(250, 204, 21, 0.8);
          transform: scale(1.04);
        }
      </style>



      <!-- Low-Health Tension Vignette -->
      <div id="tension-vignette"></div>

      <!-- Decisive Blow / K.O. Flash Banner -->
      <div id="ko-banner" class="ko-banner-overlay">
        <div class="ko-banner-text" id="ko-banner-header">DECISIVE BLOW</div>
        <div class="ko-banner-sub" id="ko-banner-main">K. O.</div>
      </div>

      <!-- Celebration Floating Action Prompt & Button -->
      <div id="celebration-prompt-overlay" class="celebration-prompt-container">
        <div class="celebration-title">⚔️ VICTORY! FREELY MOVE & CELEBRATE IN THE ARENA ⚔️</div>
        <button id="btn-celebrate-recap" class="celebrate-btn">
          [PRESS SPACE OR CLICK HERE TO VIEW STATS & UPGRADES ❯]
        </button>
      </div>

      <!-- Red Damage Flash Vignette -->
      <div id="damage-flash" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; pointer-events: none; box-shadow: inset 0 0 120px rgba(239, 68, 68, 0.75); opacity: 0; transition: opacity 0.15s ease-out; z-index: 950;"></div>

      <!-- Full-Function Pause Modal Overlay -->
      <div id="pause-modal-overlay" class="pause-modal-backdrop" style="display: none;">
        <div class="pause-modal-box">
          <div class="pause-modal-title">⏸️ GAME PAUSED</div>
          <div class="pause-modal-sub" id="pause-modal-info">LEVEL 1 · ROUND 1 (BEST OF 3)</div>
          
          <div class="pause-menu-list">
            <button class="pause-action-btn pause-resume-btn" id="btn-pause-resume">
              ▶ RESUME BOUT <span style="font-size: 11px; opacity: 0.75;">[ESC / P]</span>
            </button>
            <button class="pause-action-btn" id="btn-pause-restart">
              🔄 RESTART ROUND
            </button>
            <button class="pause-action-btn" id="btn-pause-sound">
              🔊 SOUND: ACTIVE
            </button>
            <button class="pause-action-btn pause-quit-btn" id="btn-pause-quit">
              🏠 QUIT TO LEVEL SELECT
            </button>
          </div>
        </div>
      </div>

      <!-- Top Symmetrical Match Header -->
      <div class="match-header">
        <!-- Player Side (Left) -->
        <div class="fighter-hud-side player-side">
          <div class="fighter-meta">
            <span class="fighter-hud-name" id="hud-player-name">WHOISCOBRAA</span>
            <span class="fighter-hud-badge" id="hud-player-element">WATER</span>
          </div>
          <div class="bar-shell hp-shell">
            <div class="bar-fill player-hp-fill" id="hud-player-hp" style="width: 100%;"></div>
          </div>
          <div class="bar-shell poise-shell">
            <div class="bar-fill player-poise-fill" id="hud-player-poise" style="width: 100%;"></div>
          </div>
          <div class="perks-badge-row" id="hud-player-perks"></div>
        </div>

        <!-- Center Match Diamonds & Info -->
        <div class="header-center-box">
          <div class="diamonds-row">
            <div class="diamond-group" id="player-diamonds">
              <div class="diamond"></div>
              <div class="diamond"></div>
            </div>
            <div class="vs-mini-badge">VS</div>
            <div class="diamond-group" id="bot-diamonds">
              <div class="diamond"></div>
              <div class="diamond"></div>
            </div>
          </div>
          <div class="round-title" id="round-title">ROUND 1 · BEST OF 3</div>
          <button class="hud-pause-btn" id="btn-hud-pause" title="Pause Game [ESC / P]">
            <span>⏸️</span> PAUSE <span style="font-size: 9px; opacity: 0.7;">[ESC]</span>
          </button>
        </div>

        <!-- Rival Side (Right) -->
        <div class="fighter-hud-side bot-side">
          <div class="fighter-meta">
            <span class="fighter-hud-badge" id="hud-bot-element">EARTH</span>
            <span class="fighter-hud-name" id="hud-bot-name">PCNASTYX</span>
          </div>
          <div class="bar-shell hp-shell">
            <div class="bar-fill bot-hp-fill" id="hud-bot-hp" style="width: 100%;"></div>
          </div>
          <div class="bar-shell poise-shell">
            <div class="bar-fill bot-poise-fill" id="hud-bot-poise" style="width: 100%;"></div>
          </div>
        </div>
      </div>

      <!-- Center Crosshair -->
      <div class="reticle-container">
        <div class="reticle-dot" id="reticle-dot"></div>
        <div class="hitmarker-x" id="hitmarker-x"></div>
      </div>

      <!-- In-Arena 3... 2... 1... FIGHT! Countdown Overlay -->
      <div id="arena-countdown-overlay" class="arena-countdown-container">
        <div class="countdown-digit" id="arena-countdown-text">3</div>
        <div class="countdown-sub" id="arena-countdown-sub">GET READY</div>
      </div>

      <!-- Bottom Left Flow Meter -->
      <div class="flow-meter-container">
        <div class="ink-brush-accent"></div>
        <div class="flow-bars">
          <div class="flow-segment"><div class="flow-fill" id="flow-bar-1"></div></div>
          <div class="flow-segment"><div class="flow-fill" id="flow-bar-2"></div></div>
          <div class="flow-segment"><div class="flow-fill" id="flow-bar-3"></div></div>
        </div>
      </div>

      <!-- Active Sprint / Surf Notification -->
      <div class="surf-indicator-banner" id="surf-indicator">⚡ [SHIFT] SPRINT / SURF ACTIVE</div>

      <!-- Bottom Right Enso Skill Bar -->
      <div class="skill-bar-container">
        <!-- LMB: 3-Hit Martial Combo -->
        <div class="enso-slot" id="slot-lmb">
          <div class="enso-ring-bg">
            <svg class="enso-brush-svg" viewBox="0 0 48 48">
              <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(155, 226, 246, 0.85)" stroke-width="3" stroke-linecap="round" stroke-dasharray="105 20" transform="rotate(-30 24 24)" />
            </svg>
            <div class="slot-content">
              <svg viewBox="0 0 24 24" width="16" height="16">
                <circle cx="12" cy="12" r="5" fill="#f8fafc" />
              </svg>
            </div>
          </div>
          <div class="cooldown-overlay" id="cd-lmb"></div>
          <span class="keybind-label">LMB</span>
        </div>

        <!-- RMB: Heavy Breaker Strike -->
        <div class="enso-slot" id="slot-rmb">
          <div class="enso-ring-bg">
            <svg class="enso-brush-svg" viewBox="0 0 48 48">
              <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(155, 226, 246, 0.85)" stroke-width="3" stroke-linecap="round" stroke-dasharray="105 20" transform="rotate(-30 24 24)" />
            </svg>
            <div class="slot-content">
              <span class="slot-text-charge" id="charge-rmb">⚔️</span>
            </div>
          </div>
          <div class="cooldown-overlay" id="cd-rmb"></div>
          <span class="keybind-label">RMB</span>
        </div>

        <!-- SHIFT: Flow Wave Sprint / Surf -->
        <div class="enso-slot" id="slot-shift">
          <div class="enso-ring-bg">
            <svg class="enso-brush-svg" viewBox="0 0 48 48">
              <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(155, 226, 246, 0.85)" stroke-width="3" stroke-linecap="round" stroke-dasharray="105 20" transform="rotate(-30 24 24)" />
            </svg>
            <div class="slot-content">
              <span style="font-size: 16px;">🌊</span>
            </div>
          </div>
          <div class="cooldown-overlay" id="cd-shift"></div>
          <span class="keybind-label">SHIFT</span>
        </div>

        <!-- Q: Defensive Barrier -->
        <div class="enso-slot" id="slot-q">
          <div class="enso-ring-bg">
            <svg class="enso-brush-svg" viewBox="0 0 48 48">
              <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(155, 226, 246, 0.85)" stroke-width="3" stroke-linecap="round" stroke-dasharray="105 20" transform="rotate(-30 24 24)" />
            </svg>
            <div class="slot-content">
              <span style="font-size: 16px;">🛡️</span>
            </div>
          </div>
          <div class="cooldown-overlay" id="cd-q"></div>
          <span class="keybind-label">Q</span>
        </div>

        <!-- E: Elemental Blast / Beam -->
        <div class="enso-slot" id="slot-e">
          <div class="enso-ring-bg">
            <svg class="enso-brush-svg" viewBox="0 0 48 48">
              <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(155, 226, 246, 0.85)" stroke-width="3" stroke-linecap="round" stroke-dasharray="105 20" transform="rotate(-30 24 24)" />
            </svg>
            <div class="slot-content">
              <span style="font-size: 16px;">🔥</span>
            </div>
          </div>
          <div class="cooldown-overlay" id="cd-e"></div>
          <span class="keybind-label">E</span>
        </div>

        <!-- R: Ultimate Radial Art -->
        <div class="enso-slot" id="slot-r">
          <div class="enso-ring-bg">
            <svg class="enso-brush-svg" viewBox="0 0 48 48">
              <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(155, 226, 246, 0.85)" stroke-width="3" stroke-linecap="round" stroke-dasharray="105 20" transform="rotate(-30 24 24)" />
            </svg>
            <div class="slot-content">
              <span style="font-size: 16px;">💥</span>
            </div>
          </div>
          <div class="cooldown-overlay" id="cd-r"></div>
          <span class="keybind-label">R</span>
        </div>
      </div>
    `;
  }

  startInArenaCountdown(soundEngine, onFightStart) {
    const overlay = document.getElementById('arena-countdown-overlay');
    const textEl = document.getElementById('arena-countdown-text');
    const subEl = document.getElementById('arena-countdown-sub');
    if (!overlay || !textEl || !subEl) {
      if (onFightStart) onFightStart();
      return;
    }

    overlay.style.display = 'flex';

    const triggerStep = (text, sub, isFight) => {
      textEl.innerText = text;
      subEl.innerText = sub;
      textEl.className = 'countdown-digit' + (isFight ? ' fight' : '');
      textEl.style.animation = 'none';
      void textEl.offsetWidth;
      textEl.style.animation = 'popScale 0.85s ease-out';

      if (soundEngine && soundEngine.playCountdownBeep) {
        soundEngine.playCountdownBeep(isFight);
      }
    };

    // 3
    triggerStep('3', 'ROUND 1 · GET READY', false);

    // 2
    setTimeout(() => {
      triggerStep('2', 'STEEL YOUR SPIRIT', false);
    }, 1000);

    // 1
    setTimeout(() => {
      triggerStep('1', 'ENGAGE FOCUS', false);
    }, 2000);

    // FIGHT!
    setTimeout(() => {
      triggerStep('FIGHT!', 'COMMENCE BATTLE', true);
      if (onFightStart) onFightStart();

      setTimeout(() => {
        overlay.style.display = 'none';
      }, 750);
    }, 3000);
  }

  updatePlayerHP(health, maxHealth = 300, poise = 200, maxPoise = 200) {
    const hpEl = document.getElementById('hud-player-hp');
    const poiseEl = document.getElementById('hud-player-poise');
    if (hpEl) hpEl.style.width = `${Math.max(0, (health / maxHealth) * 100)}%`;
    if (poiseEl) poiseEl.style.width = `${Math.max(0, (poise / maxPoise) * 100)}%`;
  }

  updateBotHP(health, maxHealth = 300, poise = 200, maxPoise = 200) {
    const hpEl = document.getElementById('hud-bot-hp');
    const poiseEl = document.getElementById('hud-bot-poise');
    if (hpEl) hpEl.style.width = `${Math.max(0, (health / maxHealth) * 100)}%`;
    if (poiseEl) poiseEl.style.width = `${Math.max(0, (poise / maxPoise) * 100)}%`;
  }

  setFighterNames(playerName, playerElement, botName, botElement) {
    const pName = document.getElementById('hud-player-name');
    const pEl = document.getElementById('hud-player-element');
    const bName = document.getElementById('hud-bot-name');
    const bEl = document.getElementById('hud-bot-element');

    if (pName && playerName) pName.innerText = playerName.toUpperCase();
    if (pEl && playerElement) pEl.innerText = playerElement.toUpperCase();
    if (bName && botName) bName.innerText = botName.toUpperCase();
    if (bEl && botElement) bEl.innerText = botElement.toUpperCase();
  }

  updateRoundHeader(round, playerWins, botWins, level = 1, botTier = 'WARRIOR') {
    const titleEl = document.getElementById('round-title');
    if (titleEl) {
      titleEl.innerHTML = `LEVEL ${level} · ROUND ${round} (BEST OF 3)<div style="font-size: 9px; color: #f59e0b; letter-spacing: 1.5px; margin-top: 2px;">[RIVAL: ${botTier}]</div>`;
    }

    const playerDias = document.getElementById('player-diamonds')?.children;
    if (playerDias) {
      for (let i = 0; i < playerDias.length; i++) {
        if (i < playerWins) playerDias[i].classList.add('filled');
        else playerDias[i].classList.remove('filled');
      }
    }

    const botDias = document.getElementById('bot-diamonds')?.children;
    if (botDias) {
      for (let i = 0; i < botDias.length; i++) {
        if (i < botWins) botDias[i].classList.add('filled');
        else botDias[i].classList.remove('filled');
      }
    }
  }

  setTensionActive(active) {
    const el = document.getElementById('tension-vignette');
    if (!el) return;
    if (active) {
      el.style.opacity = '1';
      el.classList.add('pulsing');
    } else {
      el.style.opacity = '0';
      el.classList.remove('pulsing');
    }
  }

  setCinematicLetterbox(active) {
    // Letterbox bars removed to keep arena view fully open and unblocked
  }

  showDecisiveKOBanner(isVictory = true) {
    const banner = document.getElementById('ko-banner');
    const header = document.getElementById('ko-banner-header');
    const main = document.getElementById('ko-banner-main');
    if (!banner || !header || !main) return;

    if (isVictory) {
      header.innerText = 'DECISIVE BLOW';
      header.style.color = '#fde047';
      main.innerText = 'K. O.';
      main.style.webkitTextStroke = '2px #0284c7';
    } else {
      header.innerText = 'FATAL IMPACT';
      header.style.color = '#f87171';
      main.innerText = 'DEFEAT';
      main.style.webkitTextStroke = '2px #dc2626';
    }

    banner.classList.add('active');
  }

  hideDecisiveKOBanner() {
    const banner = document.getElementById('ko-banner');
    if (banner) banner.classList.remove('active');
  }

  showCelebrationPrompt(onOpenRecap) {
    const overlay = document.getElementById('celebration-prompt-overlay');
    const btn = document.getElementById('btn-celebrate-recap');
    if (!overlay || !btn) return;

    overlay.style.display = 'flex';
    btn.onclick = () => {
      overlay.style.display = 'none';
      if (onOpenRecap) onOpenRecap();
    };
  }

  hideCelebrationPrompt() {
    const overlay = document.getElementById('celebration-prompt-overlay');
    if (overlay) overlay.style.display = 'none';
  }

  triggerHitmarker() {
    const hm = document.getElementById('hitmarker-x');
    if (hm) {
      hm.classList.add('active');
      setTimeout(() => hm.classList.remove('active'), 120);
    }
  }

  triggerDamageFlash() {
    const el = document.getElementById('damage-flash');
    if (!el) return;
    el.style.opacity = '1';
    setTimeout(() => {
      el.style.opacity = '0';
    }, 180);
  }

  showDamageNumber(x, y, damage, isCrit = false) {
    const el = document.createElement('div');
    el.className = 'damage-number' + (isCrit ? ' crit' : '');
    el.innerText = damage;
    const driftX = (Math.random() - 0.5) * 28;
    el.style.left = `${x + driftX}px`;
    el.style.top = `${y}px`;
    this.container.appendChild(el);

    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 850);
  }

  updateChargeCounter(slot, charges) {
    const badge = document.getElementById(`charge-${slot.toLowerCase()}`);
    if (badge) badge.innerText = charges;
  }

  triggerCooldown(slot, duration) {
    const overlay = document.getElementById(`cd-${slot.toLowerCase()}`);
    if (!overlay) return;

    overlay.style.display = 'block';
    overlay.style.transition = `opacity ${duration}s linear`;
    overlay.style.opacity = '1';

    setTimeout(() => {
      overlay.style.opacity = '0';
      setTimeout(() => overlay.style.display = 'none', 100);
    }, duration * 1000);
  }

  setSurfingActive(active) {
    const slot = document.getElementById('slot-shift');
    const indicator = document.getElementById('surf-indicator');
    if (slot) {
      if (active) slot.classList.add('active-surf');
      else slot.classList.remove('active-surf');
    }
    if (indicator) {
      indicator.style.display = active ? 'block' : 'none';
    }
  }

  updatePlayerPerks(perks) {
    const el = document.getElementById('hud-player-perks');
    if (!el) return;
    el.innerHTML = '';
    if (!perks || perks.length === 0) return;
    perks.forEach((pId) => {
      const pData = POWER_PERKS.find(p => p.id === pId);
      const span = document.createElement('span');
      span.className = 'perk-mini-pill';
      span.innerText = `${pData ? pData.icon : '⚡'} ${pData ? pData.name : pId}`;
      el.appendChild(span);
    });
  }

  showLockOnFeedback(isLockedOn) {
    let el = document.getElementById('lockon-pill-feedback');
    if (!el) {
      el = document.createElement('div');
      el.id = 'lockon-pill-feedback';
      el.style.position = 'fixed';
      el.style.top = '78px';
      el.style.left = '50%';
      el.style.transform = 'translateX(-50%)';
      el.style.padding = '5px 16px';
      el.style.borderRadius = '20px';
      el.style.fontSize = '11px';
      el.style.fontWeight = 'bold';
      el.style.letterSpacing = '2px';
      el.style.pointerEvents = 'none';
      el.style.zIndex = '1200';
      el.style.transition = 'opacity 0.25s ease';
      document.body.appendChild(el);
    }
    el.innerText = isLockedOn ? '🎯 LOCK-ON: ENGAGED [TAB / L]' : '🔓 LOCK-ON: FREE ROAM [TAB / L]';
    el.style.background = isLockedOn ? 'rgba(14, 116, 144, 0.85)' : 'rgba(71, 85, 105, 0.85)';
    el.style.border = isLockedOn ? '1px solid #38bdf8' : '1px solid #94a3b8';
    el.style.color = isLockedOn ? '#38bdf8' : '#e2e8f0';
    el.style.opacity = '1';
    if (this._lockonTimer) clearTimeout(this._lockonTimer);
    this._lockonTimer = setTimeout(() => {
      el.style.opacity = '0';
    }, 1400);
  }

  showPauseModal(infoText) {
    const overlay = document.getElementById('pause-modal-overlay');
    const info = document.getElementById('pause-modal-info');
    if (info && infoText) info.innerText = infoText;
    if (overlay) overlay.style.display = 'flex';
  }

  hidePauseModal() {
    const overlay = document.getElementById('pause-modal-overlay');
    if (overlay) overlay.style.display = 'none';
  }

  isPauseModalOpen() {
    const overlay = document.getElementById('pause-modal-overlay');
    return overlay && overlay.style.display === 'flex';
  }

  updatePauseSoundBtn(isMuted) {
    const btn = document.getElementById('btn-pause-sound');
    if (btn) {
      btn.innerText = isMuted ? '🔇 SOUND: MUTED' : '🔊 SOUND: ACTIVE';
      btn.style.color = isMuted ? '#f87171' : '#f8fafc';
    }
  }

  setupPauseHandlers(onResume, onRestart, onToggleSound, onQuit) {
    const btnHudPause = document.getElementById('btn-hud-pause');
    const btnResume = document.getElementById('btn-pause-resume');
    const btnRestart = document.getElementById('btn-pause-restart');
    const btnSound = document.getElementById('btn-pause-sound');
    const btnQuit = document.getElementById('btn-pause-quit');

    if (btnHudPause && onResume) {
      btnHudPause.onclick = (e) => {
        e.stopPropagation();
        onResume();
      };
    }
    if (btnResume && onResume) {
      btnResume.onclick = (e) => {
        e.stopPropagation();
        onResume();
      };
    }
    if (btnRestart && onRestart) {
      btnRestart.onclick = (e) => {
        e.stopPropagation();
        onRestart();
      };
    }
    if (btnSound && onToggleSound) {
      btnSound.onclick = (e) => {
        e.stopPropagation();
        onToggleSound();
      };
    }
    if (btnQuit && onQuit) {
      btnQuit.onclick = (e) => {
        e.stopPropagation();
        onQuit();
      };
    }
  }
}
