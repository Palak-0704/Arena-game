// Flowbound: Masters of Four - Complete Game Introduction & Flow Manager
// Handles Title Screen, 3D Character Selection Transition, Arena Selection, and Matchup VS Intro

export class GameFlowManager {
  constructor(onOpenCharSelect, onStartMatchCallback) {
    this.onOpenCharSelect = onOpenCharSelect;
    this.onStartMatch = onStartMatchCallback;
    this.selectedCharacter = 'WATER';
    this.selectedFighter = null;
    this.selectedArena = 'COLOSSEUM';
    this.container = document.createElement('div');
    this.container.id = 'game-flow-overlay';
    document.body.appendChild(this.container);

    this.injectStyles();
    this.showTitleScreen();
  }

  injectStyles() {
    const style = document.createElement('style');
    style.innerHTML = `
      #game-flow-overlay {
        position: fixed;
        top: 0; left: 0;
        width: 100vw; height: 100vh;
        z-index: 2000;
        pointer-events: auto;
        user-select: none;
        font-family: 'Cinzel', serif;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: opacity 0.6s ease;
      }

      .flow-screen {
        position: absolute;
        width: 100%; height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: radial-gradient(circle at center, rgba(15, 23, 42, 0.65) 0%, rgba(9, 9, 11, 0.85) 100%);
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s ease;
      }

      .flow-screen.active {
        opacity: 1;
        pointer-events: auto;
      }

      #screen-title {
        background: radial-gradient(circle at center, #0f172a 0%, #090d16 65%, #030712 100%) !important;
      }

      /* Title Screen - Cinematic Elemental Aura */
      .landing-crest {
        position: relative;
        width: 140px;
        height: 140px;
        margin-bottom: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .crest-aurora {
        position: absolute;
        width: 200px;
        height: 200px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(56, 189, 248, 0.28) 0%, rgba(245, 158, 11, 0.16) 45%, rgba(0,0,0,0) 70%);
        filter: blur(14px);
        animation: pulseAurora 4s ease-in-out infinite alternate;
      }

      @keyframes pulseAurora {
        0% { transform: scale(0.92); opacity: 0.6; }
        100% { transform: scale(1.12); opacity: 1; }
      }

      .crest-ring-outer {
        position: absolute;
        width: 130px;
        height: 130px;
        border-radius: 50%;
        border: 2px solid rgba(254, 240, 138, 0.45);
        box-shadow: 0 0 25px rgba(245, 158, 11, 0.4), inset 0 0 16px rgba(56, 189, 248, 0.2);
        animation: spinSlow 32s linear infinite;
      }

      .crest-ring-inner {
        position: absolute;
        width: 104px;
        height: 104px;
        border-radius: 50%;
        border: 1.5px dashed rgba(56, 189, 248, 0.55);
        animation: spinReverse 22s linear infinite;
      }

      @keyframes spinSlow {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      @keyframes spinReverse {
        from { transform: rotate(360deg); }
        to { transform: rotate(0deg); }
      }

      .crest-yinyang {
        font-size: 64px;
        color: #fef08a;
        filter: drop-shadow(0 0 20px rgba(245, 158, 11, 0.85));
        animation: floatGently 3.4s ease-in-out infinite alternate;
        user-select: none;
      }

      @keyframes floatGently {
        0% { transform: translateY(-4px) scale(0.98); }
        100% { transform: translateY(4px) scale(1.02); }
      }

      .landing-title {
        font-family: 'Cinzel Decorative', 'Cinzel', serif;
        font-size: 72px;
        font-weight: 900;
        letter-spacing: 12px;
        margin: 0 0 10px 0;
        background: linear-gradient(180deg, #ffffff 0%, #fef08a 35%, #f59e0b 70%, #b45309 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        filter: drop-shadow(0 4px 28px rgba(245, 158, 11, 0.55));
        line-height: 1.1;
        text-align: center;
      }

      .landing-subtitle {
        font-family: 'Cinzel', serif;
        font-size: 18px;
        letter-spacing: 8px;
        color: #7dd3fc;
        text-transform: uppercase;
        margin-bottom: 8px;
        text-shadow: 0 0 18px rgba(56, 189, 248, 0.7);
        font-weight: 700;
        text-align: center;
      }

      .landing-tagline {
        font-size: 12px;
        letter-spacing: 5px;
        color: #94a3b8;
        text-transform: uppercase;
        margin-bottom: 42px;
        text-align: center;
      }

      .flow-btn-primary {
        position: relative;
        overflow: hidden;
        background: linear-gradient(135deg, rgba(14, 116, 144, 0.95) 0%, rgba(2, 132, 199, 0.95) 50%, rgba(3, 105, 161, 0.95) 100%);
        border: 2px solid #38bdf8;
        color: #ffffff;
        font-family: 'Cinzel', serif;
        font-size: 19px;
        font-weight: 900;
        letter-spacing: 4px;
        padding: 18px 56px;
        border-radius: 8px;
        cursor: pointer;
        box-shadow: 0 0 35px rgba(56, 189, 248, 0.6), inset 0 0 16px rgba(255, 255, 255, 0.25);
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      }

      .flow-btn-primary:hover {
        background: linear-gradient(135deg, #38bdf8 0%, #0284c7 100%);
        color: #030712;
        border-color: #fef08a;
        box-shadow: 0 0 50px rgba(56, 189, 248, 0.95), 0 0 25px rgba(254, 240, 138, 0.8);
        transform: translateY(-3px) scale(1.04);
      }

      .btn-glow-sweep {
        position: absolute;
        top: 0;
        left: -100%;
        width: 60%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.35), transparent);
        transform: skewX(-25deg);
        animation: glowSweep 3.6s infinite;
      }

      @keyframes glowSweep {
        0% { left: -100%; }
        35% { left: 160%; }
        100% { left: 160%; }
      }

      .landing-press-prompt {
        margin-top: 24px;
        font-size: 11px;
        letter-spacing: 3.5px;
        color: #64748b;
        text-transform: uppercase;
        animation: pulseFade 2.4s ease-in-out infinite alternate;
      }

      @keyframes pulseFade {
        0% { opacity: 0.4; }
        100% { opacity: 0.9; }
      }
        letter-spacing: 4px;
        padding: 16px 48px;
        border-radius: 6px;
        cursor: pointer;
        box-shadow: 0 0 28px rgba(56, 189, 248, 0.5), inset 0 0 12px rgba(255, 255, 255, 0.2);
        transition: all 0.25s ease;
      }

      .flow-btn-primary:hover {
        background: linear-gradient(135deg, #38bdf8 0%, #0284c7 100%);
        color: #09090b;
        box-shadow: 0 0 40px rgba(56, 189, 248, 0.9), 0 0 16px #ffffff;
        transform: translateY(-2px) scale(1.03);
      }

      .flow-btn {
        background: linear-gradient(180deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.95) 100%);
        border: 1px solid #38bdf8;
        color: #f8fafc;
        font-family: 'Cinzel', serif;
        font-size: 16px;
        font-weight: 700;
        letter-spacing: 3px;
        padding: 12px 36px;
        border-radius: 4px;
        cursor: pointer;
        box-shadow: 0 0 16px rgba(56, 189, 248, 0.35);
        transition: all 0.25s ease;
      }

      .flow-btn:hover {
        background: #38bdf8;
        color: #09090b;
        box-shadow: 0 0 28px rgba(56, 189, 248, 0.7);
        transform: translateY(-2px);
      }

      /* Selection Screen */
      .selection-title {
        font-size: 32px;
        font-weight: 800;
        letter-spacing: 4px;
        color: #fde68a;
        margin-bottom: 30px;
      }

      .cards-container {
        display: flex;
        gap: 32px;
        margin-bottom: 36px;
      }

      .select-card {
        width: 290px;
        padding: 24px;
        background: rgba(15, 23, 42, 0.85);
        border: 2px solid rgba(255, 255, 255, 0.15);
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
      }

      .select-card:hover, .select-card.selected {
        border-color: #38bdf8;
        box-shadow: 0 0 24px rgba(56, 189, 248, 0.5);
        transform: scale(1.04);
      }

      .select-card.selected {
        background: rgba(14, 116, 144, 0.35);
      }

      .level-card.locked {
        opacity: 0.52;
        filter: grayscale(0.65);
        cursor: not-allowed;
        border-color: rgba(239, 68, 68, 0.45);
      }

      .level-card.locked:hover {
        transform: none;
        border-color: rgba(239, 68, 68, 0.7);
        box-shadow: 0 0 16px rgba(239, 68, 68, 0.3);
      }

      .level-status-badge {
        background: rgba(14, 116, 144, 0.8);
        color: #bae6fd;
        border: 1px solid #38bdf8;
        border-radius: 4px;
        padding: 4px 10px;
        font-size: 11px;
        font-weight: bold;
        letter-spacing: 1px;
        margin-top: 14px;
      }

      .level-lock-badge {
        background: rgba(185, 28, 28, 0.8);
        color: #fecaca;
        border: 1px solid #ef4444;
        border-radius: 4px;
        padding: 4px 10px;
        font-size: 10px;
        font-weight: bold;
        letter-spacing: 1px;
        margin-top: 14px;
      }

      .card-kanji {
        font-size: 54px;
        margin-bottom: 12px;
        font-weight: bold;
      }

      .card-name {
        font-size: 20px;
        font-weight: 700;
        letter-spacing: 2px;
        color: #f8fafc;
        margin-bottom: 8px;
      }

      .card-role {
        font-size: 13px;
        color: #94a3b8;
        letter-spacing: 1px;
        margin-bottom: 14px;
      }

      .card-desc {
        font-family: 'Rajdhani', sans-serif;
        font-size: 14px;
        color: #cbd5e1;
        line-height: 1.4;
      }

      /* Matchup VS Screen */
      .vs-container {
        display: flex;
        align-items: center;
        gap: 60px;
        margin-bottom: 40px;
      }

      .vs-badge {
        font-family: 'Cinzel Decorative', serif;
        font-size: 48px;
        font-weight: 900;
        color: #ef4444;
        text-shadow: 0 0 20px rgba(239, 68, 68, 0.8);
      }

      .countdown-banner {
        font-family: 'Cinzel Decorative', serif;
        font-size: 64px;
        font-weight: 900;
        color: #fef08a;
        letter-spacing: 6px;
        text-shadow: 0 0 28px rgba(245, 158, 11, 0.8);
        animation: pulseText 0.8s ease-in-out infinite alternate;
      }

      @media (max-width: 768px) {
        .landing-crest {
          width: 90px;
          height: 90px;
          margin-bottom: 16px;
        }
        .crest-aurora {
          width: 130px;
          height: 130px;
        }
        .crest-ring-outer {
          width: 85px;
          height: 85px;
        }
        .crest-ring-inner {
          width: 68px;
          height: 68px;
        }
        .crest-yinyang {
          font-size: 38px;
        }
        .landing-title {
          font-size: 38px;
          letter-spacing: 5px;
        }
        .landing-subtitle {
          font-size: 13px;
          letter-spacing: 4px;
        }
        .landing-tagline {
          font-size: 10px;
          letter-spacing: 2px;
          margin-bottom: 28px;
        }
        .flow-btn-primary {
          padding: 13px 32px;
          font-size: 15px;
          letter-spacing: 2px;
        }
        .level-cards-container {
          flex-direction: column !important;
          max-height: 65vh;
          overflow-y: auto;
          gap: 16px !important;
          width: 92vw !important;
        }
        .level-card {
          width: 100% !important;
          padding: 16px 20px !important;
        }
        .vs-container {
          gap: 20px;
          flex-direction: column;
        }
      }
    `;
    document.head.appendChild(style);
  }

  showTitleScreen() {
    this.container.style.display = 'flex';
    this.container.style.opacity = '1';
    this.container.innerHTML = `
      <div class="flow-screen active" id="screen-title" style="position: relative; overflow: hidden; justify-content: center;">
        <canvas id="landing-theme-canvas" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 1;"></canvas>

        <div style="position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center; text-align: center;">
          <!-- Sacred Animated Elemental Crest -->
          <div class="landing-crest">
            <div class="crest-aurora"></div>
            <div class="crest-ring-outer"></div>
            <div class="crest-ring-inner"></div>
            <div class="crest-yinyang">☯</div>
          </div>

          <!-- Bold, Majestic Typography -->
          <h1 class="landing-title">FLOWBOUND</h1>
          <div class="landing-subtitle">MASTERS OF FOUR</div>
          <div class="landing-tagline">THE ELEMENTAL ARENA</div>

          <!-- Glowing Primary CTA Button -->
          <button class="flow-btn-primary" id="btn-start-game">
            <span style="position: relative; z-index: 2;">⚔️ START GAME ❯</span>
            <div class="btn-glow-sweep"></div>
          </button>

          <div class="landing-press-prompt">PRESS SPACE OR CLICK TO START</div>
        </div>
      </div>
    `;

    // Dynamic Atmospheric Elemental Theme Canvas Animation
    const canvas = document.getElementById('landing-theme-canvas');
    let animId = null;
    let cleanup = null;

    if (canvas) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const ctx = canvas.getContext('2d');

      const onResize = () => {
        if (!canvas) return;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      };
      window.addEventListener('resize', onResize);

      // Chi particles & drifting embers
      const particles = [];
      const colors = ['#38bdf8', '#f59e0b', '#10b981', '#f8fafc', '#ef4444'];
      for (let i = 0; i < 48; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: Math.random() * 2.5 + 0.8,
          color: colors[Math.floor(Math.random() * colors.length)],
          vx: (Math.random() - 0.5) * 0.7,
          vy: -Math.random() * 1.2 - 0.35,
          alpha: Math.random() * 0.65 + 0.25,
          phase: Math.random() * Math.PI * 2
        });
      }

      let time = 0;
      const draw = () => {
        if (!document.getElementById('landing-theme-canvas')) return;
        time += 0.016;

        const w = canvas.width;
        const h = canvas.height;

        // 100% Solid Opaque Background: Completely eliminates translucent bleeding of 3D scene
        ctx.fillStyle = '#060a14';
        ctx.fillRect(0, 0, w, h);

        // 1. Water Chi Fluid Wave (Cyan stream flowing across lower third)
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(0, h * 0.68);
        for (let x = 0; x <= w; x += 30) {
          const y = h * 0.68 + Math.sin(x * 0.0035 + time * 1.5) * 35 + Math.cos(x * 0.006 - time * 0.8) * 18;
          ctx.lineTo(x, y);
        }
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 18;
        ctx.shadowColor = '#38bdf8';
        ctx.stroke();
        ctx.restore();

        // 2. Fire Chi Flame Ribbon (Warm amber stream drifting diagonally)
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(0, h * 0.52);
        for (let x = 0; x <= w; x += 30) {
          const y = h * 0.52 + Math.cos(x * 0.0042 - time * 1.8) * 40 + Math.sin(x * 0.008 + time * 1.2) * 20;
          ctx.lineTo(x, y);
        }
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.18)';
        ctx.lineWidth = 2.5;
        ctx.shadowBlur = 18;
        ctx.shadowColor = '#f59e0b';
        ctx.stroke();
        ctx.restore();

        // 3. Air Gale Flow (Celestial white stream across upper screen)
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(0, h * 0.32);
        for (let x = 0; x <= w; x += 35) {
          const y = h * 0.32 + Math.sin(x * 0.0048 + time * 2.2) * 28;
          ctx.lineTo(x, y);
        }
        ctx.strokeStyle = 'rgba(248, 250, 252, 0.14)';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 14;
        ctx.shadowColor = '#ffffff';
        ctx.stroke();
        ctx.restore();

        // 4. Floating Elemental Chi Particles
        for (const p of particles) {
          p.x += p.vx + Math.sin(time + p.phase) * 0.4;
          p.y += p.vy;
          if (p.y < -10) {
            p.y = h + 10;
            p.x = Math.random() * w;
          }
          if (p.x < 0) p.x = w;
          if (p.x > w) p.x = 0;

          ctx.save();
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color;
          ctx.shadowBlur = 12;
          ctx.shadowColor = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        animId = requestAnimationFrame(draw);
      };
      draw();

      cleanup = () => {
        if (animId) cancelAnimationFrame(animId);
        window.removeEventListener('resize', onResize);
      };
    }

    const btn = document.getElementById('btn-start-game');
    const onEnterGame = () => {
      if (cleanup) cleanup();
      window.removeEventListener('keydown', onKeyDown);
      this.container.style.display = 'none';
      if (this.onOpenCharSelect) {
        this.onOpenCharSelect();
      }
    };

    const onKeyDown = (e) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        onEnterGame();
      }
    };

    if (btn) btn.onclick = onEnterGame;
    window.addEventListener('keydown', onKeyDown);
  }

  showArenaSelect(selectedFighter, customPlayerName = null) {
    if (selectedFighter) {
      this.selectedFighter = selectedFighter;
      this.selectedCharacter = selectedFighter.id;
    }
    if (customPlayerName) {
      this.customPlayerName = customPlayerName;
    }
    this.container.style.display = 'flex';
    this.container.style.opacity = '1';

    this.container.innerHTML = `
      <div class="flow-screen active" id="screen-arena-select">
        <h2 class="selection-title">SELECT BATTLEGROUND</h2>
        <div class="cards-container">
          <!-- Imperial Colosseum -->
          <div class="select-card selected" id="card-colosseum">
            <div class="card-kanji" style="color: #f59e0b;">🏛️</div>
            <div class="card-name">IMPERIAL COLOSSEUM</div>
            <div class="card-role">GRAND 60M AMPHITHEATER</div>
            <div class="card-desc">
              Ancient martial court with central 10m Yin-Yang platform, 12 Imperial jade pillars, and ceremonial banners under sunset sky.
            </div>
          </div>

          <!-- Boreal Glacial Chasm -->
          <div class="select-card" id="card-basin">
            <div class="card-kanji" style="color: #38bdf8;">❄️</div>
            <div class="card-name">GLACIAL CHASM</div>
            <div class="card-role">BOREAL ICE SANCTUARY</div>
            <div class="card-desc">
              Frozen sanctuary surrounded by glowing Aurora Borealis curtains, 16 towering glacial ice spires, sacred Torii arches, and swirling snow flurries.
            </div>
          </div>
        </div>

        <button class="flow-btn" id="btn-confirm-arena">SELECT LEVEL ❯</button>
      </div>
    `;

    const colCard = document.getElementById('card-colosseum');
    const basCard = document.getElementById('card-basin');

    if (colCard) {
      colCard.onclick = () => {
        colCard.classList.add('selected');
        if (basCard) basCard.classList.remove('selected');
        this.selectedArena = 'COLOSSEUM';
      };
    }

    if (basCard) {
      basCard.onclick = () => {
        basCard.classList.add('selected');
        if (colCard) colCard.classList.remove('selected');
        this.selectedArena = 'GLACIER';
      };
    }

    const confirmBtn = document.getElementById('btn-confirm-arena');
    if (confirmBtn) {
      confirmBtn.onclick = () => {
        this.showLevelSelect();
      };
    }
  }

  showLevelSelect() {
    this.container.style.display = 'flex';
    this.container.style.opacity = '1';

    this.unlockedLevel = parseInt(localStorage.getItem('flowbound_unlocked_level') || '1', 10);
    this.selectedLevel = 1;

    this.container.innerHTML = `
      <div class="flow-screen active" id="screen-level-select">
        <h2 class="selection-title" style="margin-bottom: 8px;">SELECT CAMPAIGN LEVEL</h2>
        <div style="font-size: 13px; letter-spacing: 3px; color: #9be2f6; text-transform: uppercase; margin-bottom: 24px; text-shadow: 0 0 10px rgba(56, 189, 248, 0.6);">
          CONQUER EACH LEVEL (BEST OF 3 ROUNDS) TO ADVANCE & UNLOCK
        </div>

        <div class="cards-container">
          <!-- Level 1 -->
          <div class="select-card level-card selected" id="card-level-1">
            <div class="card-kanji" style="color: #38bdf8;">🥋</div>
            <div class="card-name">LEVEL 1 · TRIAL</div>
            <div class="card-role">APPRENTICE DUEL</div>
            <div class="card-desc">
              Entry tournament bout. 380 HP opponent with deliberate sparring cadence. Best of 3 rounds.
            </div>
            <div class="level-status-badge">CURRENT LEVEL</div>
          </div>

          <!-- Level 2 -->
          <div class="select-card level-card ${this.unlockedLevel >= 2 ? '' : 'locked'}" id="card-level-2">
            <div class="card-kanji" style="color: ${this.unlockedLevel >= 2 ? '#f59e0b' : '#64748b'};">
              ${this.unlockedLevel >= 2 ? '⚔️' : '🔒'}
            </div>
            <div class="card-name">LEVEL 2 · WARRIOR</div>
            <div class="card-role">CHAMPIONSHIP BOUT</div>
            <div class="card-desc">
              Formidable master. 480 HP opponent with +18% damage, evasive slip footwork, and aggressive combos.
            </div>
            <div class="${this.unlockedLevel >= 2 ? 'level-status-badge' : 'level-lock-badge'}">
              ${this.unlockedLevel >= 2 ? 'UNLOCKED' : '🔒 LOCKED (CONQUER LEVEL 1)'}
            </div>
          </div>

          <!-- Level 3 -->
          <div class="select-card level-card ${this.unlockedLevel >= 3 ? '' : 'locked'}" id="card-level-3">
            <div class="card-kanji" style="color: ${this.unlockedLevel >= 3 ? '#ef4444' : '#64748b'};">
              ${this.unlockedLevel >= 3 ? '👑' : '🔒'}
            </div>
            <div class="card-name">LEVEL 3 · TITAN</div>
            <div class="card-role">GRANDMASTER FINALS</div>
            <div class="card-desc">
              Supreme Elemental Grandmaster. 600 HP boss with +35% damage, instant guard breaks, and seismic snares.
            </div>
            <div class="${this.unlockedLevel >= 3 ? 'level-status-badge' : 'level-lock-badge'}">
              ${this.unlockedLevel >= 3 ? 'UNLOCKED' : '🔒 LOCKED (CONQUER LEVEL 2)'}
            </div>
          </div>
        </div>

        <div id="level-lock-alert" style="height: 22px; font-size: 13px; font-weight: bold; letter-spacing: 1.5px; color: #f87171; text-shadow: 0 0 10px rgba(239, 68, 68, 0.8); margin-bottom: 16px;"></div>

        <div style="display: flex; gap: 16px;">
          <button class="flow-btn" style="background: rgba(30, 41, 59, 0.7); border-color: #64748b;" id="btn-back-arena">❮ BACK</button>
          <button class="flow-btn" id="btn-confirm-level">COMMENCE LEVEL 1 BATTLE ❯</button>
        </div>
      </div>
    `;

    // Handlers
    const card1 = document.getElementById('card-level-1');
    const card2 = document.getElementById('card-level-2');
    const card3 = document.getElementById('card-level-3');
    const alertEl = document.getElementById('level-lock-alert');
    const confirmBtn = document.getElementById('btn-confirm-level');

    const selectLvl = (lvl) => {
      this.selectedLevel = lvl;
      document.querySelectorAll('.level-card').forEach(c => c.classList.remove('selected'));
      document.getElementById(`card-level-${lvl}`)?.classList.add('selected');
      alertEl.innerText = '';
      if (confirmBtn) confirmBtn.innerText = `COMMENCE LEVEL ${lvl} BATTLE ❯`;
    };

    if (card1) card1.onclick = () => selectLvl(1);

    if (card2) {
      card2.onclick = () => {
        if (this.unlockedLevel >= 2) {
          selectLvl(2);
        } else {
          alertEl.innerText = '🔒 LEVEL 2 IS LOCKED: Conquer Level 1 (Best of 3 rounds) to unlock!';
          this.shakeElement(card2);
        }
      };
    }

    if (card3) {
      card3.onclick = () => {
        if (this.unlockedLevel >= 3) {
          selectLvl(3);
        } else {
          alertEl.innerText = '🔒 LEVEL 3 IS LOCKED: Conquer Level 2 Championship to unlock the Grandmaster!';
          this.shakeElement(card3);
        }
      };
    }

    document.getElementById('btn-back-arena')?.addEventListener('click', () => {
      this.showArenaSelect(this.selectedFighter, this.customPlayerName);
    });

    if (confirmBtn) {
      confirmBtn.onclick = () => {
        this.showMatchupIntro();
      };
    }
  }

  shakeElement(el) {
    if (!el) return;
    el.style.transform = 'translateX(-8px)';
    setTimeout(() => {
      el.style.transform = 'translateX(8px)';
      setTimeout(() => {
        el.style.transform = 'translateX(-4px)';
        setTimeout(() => {
          el.style.transform = '';
        }, 80);
      }, 80);
    }, 80);
  }

  showMatchupIntro() {
    const OPPONENT_PAIRS = {
      WATER: { id: 'EARTH', name: 'PCNASTYX', title: 'THE BEDROCK BRAWLER', color: '#86efac' },
      EARTH: { id: 'WATER', name: 'WHOISCOBRAA', title: 'MASTER OF THE FLOWING TIDE', color: '#38bdf8' },
      FIRE:  { id: 'AIR',   name: 'ZEPHYR', title: 'THE WANDERING GALE', color: '#cbd5e1' },
      AIR:   { id: 'FIRE',  name: 'IGNIS', title: 'THE CRIMSON FLAME', color: '#f87171' }
    };

    const p1 = this.selectedFighter ? { ...this.selectedFighter } : {
      id: this.selectedCharacter,
      name: this.selectedCharacter === 'WATER' ? 'WHOISCOBRAA' : (this.selectedCharacter === 'EARTH' ? 'PCNASTYX' : (this.selectedCharacter === 'FIRE' ? 'IGNIS' : 'ZEPHYR')),
      title: 'ELEMENTAL MASTER',
      kanjiColor: '#38bdf8'
    };

    if (this.customPlayerName && this.customPlayerName.trim().length > 0) {
      p1.name = this.customPlayerName.trim().toUpperCase();
    }

    const p2 = OPPONENT_PAIRS[p1.id] || OPPONENT_PAIRS.WATER;

    this.container.style.display = 'flex';
    this.container.style.opacity = '1';

    this.container.innerHTML = `
      <div class="flow-screen active" id="screen-matchup">
        <div class="vs-container">
          <div style="text-align: center;">
            <div style="font-size: 14px; letter-spacing: 2px; color: #94a3b8;">PLAYER 1</div>
            <div style="font-size: 32px; font-weight: 800; color: ${p1.kanjiColor || '#38bdf8'}; margin: 8px 0;">${p1.name}</div>
            <div style="font-size: 14px; letter-spacing: 3px; color: #f59e0b; margin-bottom: 6px;">${p1.title}</div>
            <div style="font-size: 16px; letter-spacing: 4px; color: #e2e8f0;">[ ${p1.id} ]</div>
          </div>

          <div class="vs-badge">VS</div>

          <div style="text-align: center;">
            <div style="font-size: 14px; letter-spacing: 2px; color: #94a3b8;">RIVAL</div>
            <div style="font-size: 32px; font-weight: 800; color: ${p2.color}; margin: 8px 0;">${p2.name}</div>
            <div style="font-size: 14px; letter-spacing: 3px; color: #f59e0b; margin-bottom: 6px;">${p2.title}</div>
            <div style="font-size: 16px; letter-spacing: 4px; color: #e2e8f0;">[ ${p2.id} ]</div>
          </div>
        </div>

        <div class="countdown-banner" id="match-countdown">ROUND 1 · BATTLE!</div>
      </div>
    `;

    setTimeout(() => {
      const banner = document.getElementById('match-countdown');
      if (banner) banner.innerText = 'FIGHT!';

      setTimeout(() => {
        // Fade out flow overlay and start match
        this.container.style.opacity = '0';
        setTimeout(() => {
          this.container.style.display = 'none';
          if (this.onStartMatch) {
            this.onStartMatch({
              character: p1,
              opponent: p2,
              arena: this.selectedArena,
              level: this.selectedLevel || 1
            });
          }
        }, 400);
      }, 700);
    }, 1100);
  }
}
