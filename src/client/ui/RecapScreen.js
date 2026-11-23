// Flowbound: Masters of Four - Post-Round Victory, Upgrade & Progression Screen
// Player-Controlled Round Advancement & Roguelike Power Perks

export class RecapScreen {
  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'flowbound-recap-overlay';
    document.body.appendChild(this.container);

    this.onNextRound = null;
    this.onRematch = null;
    this.onCharacterSelect = null;
    this.onMainMenu = null;
    this.selectedPerkId = null;

    this.buildRecapModal();
  }

  buildRecapModal() {
    this.container.innerHTML = `
      <style>
        #flowbound-recap-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(10, 15, 29, 0.85);
          backdrop-filter: blur(10px);
          display: none;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          pointer-events: auto;
          font-family: 'Cinzel Decorative', 'Cinzel', serif, system-ui;
        }

        .recap-victory-banner {
          width: 100%;
          background: linear-gradient(90deg, transparent 0%, rgba(15, 23, 42, 0.95) 20%, rgba(15, 23, 42, 0.95) 80%, transparent 100%);
          padding: 18px 0;
          text-align: center;
          border-top: 1px solid rgba(186, 230, 253, 0.35);
          border-bottom: 1px solid rgba(186, 230, 253, 0.35);
          box-shadow: 0 10px 36px rgba(0, 0, 0, 0.85);
        }

        .recap-victory-title {
          font-size: 38px;
          letter-spacing: 5px;
          color: #bae6fd;
          text-shadow: 0 0 20px rgba(56, 189, 248, 0.8), 0 4px 10px rgba(0, 0, 0, 0.9);
          margin: 0;
          font-weight: 900;
        }

        .recap-victory-title.victory {
          color: #fde047;
          text-shadow: 0 0 24px rgba(250, 204, 21, 0.85), 0 4px 12px rgba(0, 0, 0, 0.9);
        }

        .recap-victory-title.defeat {
          color: #f87171;
          text-shadow: 0 0 24px rgba(239, 68, 68, 0.85), 0 4px 12px rgba(0, 0, 0, 0.9);
        }

        .recap-card {
          margin-top: 16px;
          background: rgba(15, 23, 42, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 8px;
          padding: 20px 36px;
          width: 580px;
          display: flex;
          flex-direction: column;
          align-items: center;
          box-shadow: 0 14px 44px rgba(0, 0, 0, 0.85);
        }

        .recap-subtitle {
          font-size: 13px;
          letter-spacing: 3px;
          color: #f59e0b;
          font-weight: bold;
          margin-bottom: 4px;
        }

        .recap-best-player {
          font-size: 18px;
          letter-spacing: 2px;
          color: #f8fafc;
          font-weight: bold;
          margin-bottom: 12px;
        }

        .recap-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 4px;
          margin-bottom: 16px;
        }

        .recap-table th {
          font-size: 11px;
          letter-spacing: 2px;
          color: #94a3b8;
          text-align: center;
          padding-bottom: 8px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.15);
        }

        .recap-table th:first-child {
          text-align: left;
        }

        .recap-table td {
          font-size: 15px;
          color: #f8fafc;
          padding: 8px 6px;
          text-align: center;
          font-weight: bold;
        }

        .recap-table td:first-child {
          text-align: left;
          letter-spacing: 1px;
        }

        .recap-row-winner td {
          color: #38bdf8;
        }

        /* Power Perk Upgrade Selection */
        .recap-perks-section {
          width: 100%;
          margin-top: 6px;
          margin-bottom: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .recap-perks-title {
          font-size: 13px;
          letter-spacing: 3px;
          color: #38bdf8;
          margin-bottom: 10px;
          font-weight: 800;
          text-shadow: 0 0 12px rgba(56, 189, 248, 0.5);
        }

        .recap-perks-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          width: 100%;
        }

        .perk-card {
          background: rgba(30, 41, 59, 0.7);
          border: 1px solid rgba(56, 189, 248, 0.35);
          border-radius: 6px;
          padding: 12px 10px;
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
          transition: all 0.22s ease;
          position: relative;
        }

        .perk-card:hover {
          background: rgba(14, 116, 144, 0.4);
          border-color: #38bdf8;
          transform: translateY(-3px);
          box-shadow: 0 6px 18px rgba(56, 189, 248, 0.4);
        }

        .perk-card.selected {
          background: rgba(14, 116, 144, 0.65);
          border-color: #fde047;
          box-shadow: 0 0 20px rgba(250, 204, 21, 0.6);
          transform: translateY(-3px) scale(1.02);
        }

        .perk-icon {
          font-size: 26px;
          margin-bottom: 6px;
        }

        .perk-name {
          font-size: 13px;
          font-weight: 800;
          color: #f8fafc;
          letter-spacing: 1px;
          margin-bottom: 4px;
          text-align: center;
        }

        .perk-desc {
          font-size: 10px;
          color: #94a3b8;
          font-family: system-ui, sans-serif;
          text-align: center;
          line-height: 1.3;
        }

        .stat-growth-banner {
          margin-top: 6px;
          margin-bottom: 8px;
          background: rgba(14, 116, 144, 0.35);
          border: 1px solid #38bdf8;
          border-radius: 4px;
          padding: 6px 14px;
          font-size: 11px;
          color: #bae6fd;
          letter-spacing: 1.5px;
          font-weight: 700;
          text-shadow: 0 0 10px rgba(56, 189, 248, 0.6);
          text-align: center;
        }

        /* Action Buttons */
        .recap-actions-row {
          display: flex;
          gap: 16px;
          width: 100%;
          justify-content: center;
          margin-top: 10px;
        }

        .recap-btn {
          background: rgba(14, 116, 144, 0.35);
          border: 1px solid #38bdf8;
          color: #f8fafc;
          font-family: 'Cinzel', serif;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 2px;
          padding: 12px 28px;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.25s ease;
          box-shadow: 0 0 14px rgba(56, 189, 248, 0.3);
        }

        .recap-btn:hover {
          background: #38bdf8;
          color: #09090b;
          box-shadow: 0 0 24px rgba(56, 189, 248, 0.7);
          transform: translateY(-2px);
        }

        .recap-btn-primary {
          background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
          border-color: #38bdf8;
          font-size: 14px;
          padding: 13px 34px;
        }

        .recap-btn-primary:hover {
          background: linear-gradient(135deg, #38bdf8 0%, #0284c7 100%);
          box-shadow: 0 0 28px rgba(56, 189, 248, 0.85);
        }

        .recap-btn-secondary {
          background: rgba(30, 41, 59, 0.85);
          border-color: rgba(255, 255, 255, 0.25);
        }

        .recap-btn-secondary:hover {
          background: #e2e8f0;
          color: #0f172a;
          box-shadow: 0 0 20px rgba(255, 255, 255, 0.6);
        }
      </style>

      <div class="recap-victory-banner">
        <h1 class="recap-victory-title" id="recap-banner-text">WHOISCOBRAA WINS THE ROUND</h1>
      </div>

      <div class="recap-card">
        <div class="recap-subtitle" id="recap-round-num">LEVEL 1 COMPLETE</div>
        <div class="recap-best-player" id="recap-best-name">CURRENT SCORE: PLAYER 1 - 0 RIVAL</div>

        <table class="recap-table">
          <thead>
            <tr>
              <th>FIGHTER</th>
              <th>DAMAGE</th>
              <th>FINISHERS</th>
              <th>KO</th>
            </tr>
          </thead>
          <tbody id="recap-table-body">
            <!-- Dynamic Rows -->
          </tbody>
        </table>

        <!-- Roguelike Power Perks Selection -->
        <div class="recap-perks-section" id="recap-perks-area" style="display: none;">
          <div class="recap-perks-title">⚔️ CHOOSE A POWER UPGRADE</div>
          <div class="recap-perks-grid" id="recap-perks-grid">
            <!-- Dynamic Perk Cards -->
          </div>
        </div>

        <div id="recap-footer-area" style="width: 100%; display: flex; justify-content: center;">
          <!-- Action Buttons -->
        </div>
      </div>
    `;
  }

  showRecap(data) {
    const banner = document.getElementById('recap-banner-text');
    const roundNum = document.getElementById('recap-round-num');
    const bestName = document.getElementById('recap-best-name');
    const tbody = document.getElementById('recap-table-body');
    const perksArea = document.getElementById('recap-perks-area');
    const perksGrid = document.getElementById('recap-perks-grid');
    const footer = document.getElementById('recap-footer-area');

    banner.className = 'recap-victory-title';

    const currentLevel = data.level || 1;
    const currentRound = data.round || 1;
    const isLevelOver = !!data.isLevelOver;
    const playerWonLevel = !!data.playerWonLevel;

    if (data.isMatchOver) {
      if (data.playerWonMatch) {
        banner.innerText = 'VICTORY · GRANDMASTER CHAMPION';
        banner.classList.add('victory');
        roundNum.innerText = `CAMPAIGN CONQUERED: ALL 3 LEVELS CLEARED!`;
      } else {
        banner.innerText = 'MATCH OVER · DEFEATED';
        banner.classList.add('defeat');
        roundNum.innerText = `LEVEL ${currentLevel} FAILED · TRAIN HARDER`;
      }
      bestName.innerText = `FINAL SERIES SCORE: PLAYER ${data.playerWins || 0} - ${data.botWins || 0} RIVAL`;
    } else if (isLevelOver) {
      if (playerWonLevel) {
        banner.innerText = `LEVEL ${currentLevel} CONQUERED!`;
        banner.classList.add('victory');
        roundNum.innerText = `ROUND VICTORIES: ${data.playerWins} - ${data.botWins} · PREPARE FOR LEVEL ${currentLevel + 1}`;
      } else {
        banner.innerText = `LEVEL ${currentLevel} LOST`;
        banner.classList.add('defeat');
        roundNum.innerText = `ROUND VICTORIES: ${data.playerWins} - ${data.botWins}`;
      }
      bestName.innerText = `CURRENT SCORE: PLAYER ${data.playerWins || 0} - ${data.botWins || 0} RIVAL`;
    } else {
      banner.innerText = `${(data.winnerName || 'ROUND WINNER').toUpperCase()} WINS ROUND ${currentRound}`;
      roundNum.innerText = `LEVEL ${currentLevel} · ROUND ${currentRound} (BEST OF 3)`;
      bestName.innerText = `LEVEL SCORE: PLAYER ${data.playerWins || 0} - ${data.botWins || 0} RIVAL`;
    }

    // Natural Stat Growth Display
    const hpGrowth = 25;
    const poiseGrowth = 20;
    const pwrGrowth = 12;

    tbody.innerHTML = '';
    if (data.stats) {
      data.stats.forEach((s) => {
        const tr = document.createElement('tr');
        if (s.isWinner) tr.className = 'recap-row-winner';
        tr.innerHTML = `
          <td>${s.name}</td>
          <td>${s.damage || 0}</td>
          <td>${s.finishers || 0}</td>
          <td>${s.kos || 0}</td>
        `;
        tbody.appendChild(tr);
      });
    }

    // Clean up any previous defeat notice
    const oldNotice = document.getElementById('recap-defeat-notice');
    if (oldNotice) oldNotice.remove();

    // Power Perks Selection (STRICT: ONLY when player won the round!)
    if (!data.isMatchOver && data.playerWonRound && data.availablePerks && data.availablePerks.length > 0) {
      perksArea.style.display = 'flex';
      const perksTitle = perksArea.querySelector('.recap-perks-title');
      if (perksTitle) perksTitle.innerText = '🏆 VICTORY BLESSING: CHOOSE YOUR ASCENSION PERK';

      perksGrid.innerHTML = `
        <div class="stat-growth-banner" style="grid-column: 1 / -1;">
          ⚡ VICTORY REWARD: +${hpGrowth} MAX HP · +${poiseGrowth} POISE · +${pwrGrowth}% STRIKE DAMAGE
        </div>
      `;
      this.selectedPerkId = data.availablePerks[0]?.id || null;

      data.availablePerks.forEach((perk, idx) => {
        const card = document.createElement('div');
        card.className = `perk-card ${idx === 0 ? 'selected' : ''}`;
        card.innerHTML = `
          <div class="perk-icon">${perk.icon || '⚡'}</div>
          <div class="perk-name">${perk.name}</div>
          <div class="perk-desc">${perk.desc}</div>
        `;
        card.onclick = () => {
          document.querySelectorAll('.perk-card').forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
          this.selectedPerkId = perk.id;
        };
        perksGrid.appendChild(card);
      });
    } else {
      perksArea.style.display = 'none';
      this.selectedPerkId = null;

      if (!data.isMatchOver && !data.playerWonRound) {
        // Player lost: display clear message that power perks are rewards for wins only!
        const defeatNotice = document.createElement('div');
        defeatNotice.id = 'recap-defeat-notice';
        defeatNotice.style.cssText = 'background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 6px; padding: 10px 18px; margin: 12px 0; color: #fca5a5; font-size: 12px; font-weight: 700; letter-spacing: 2px; text-align: center; text-shadow: 0 0 10px rgba(239, 68, 68, 0.7);';
        defeatNotice.innerText = '⚔️ ROUND DEFEAT: NO BLESSINGS AWARDED FOR LOSSES. REFOCUS & STRIKE BACK!';
        perksArea.parentNode.insertBefore(defeatNotice, perksArea);
      }
    }

    // Action Buttons
    if (data.isMatchOver) {
      footer.innerHTML = `
        <div class="recap-actions-row">
          <button class="recap-btn recap-btn-primary" id="btn-recap-rematch">⚔️ PLAY AGAIN / REMATCH</button>
          <button class="recap-btn recap-btn-secondary" id="btn-recap-select">🥋 SELECT FIGHTER</button>
          <button class="recap-btn recap-btn-secondary" id="btn-recap-menu">🏛️ MAIN MENU</button>
        </div>
      `;

      document.getElementById('btn-recap-rematch')?.addEventListener('click', () => {
        this.hide();
        if (this.onRematch) this.onRematch();
      });
      document.getElementById('btn-recap-select')?.addEventListener('click', () => {
        this.hide();
        if (this.onCharacterSelect) this.onCharacterSelect();
      });
      document.getElementById('btn-recap-menu')?.addEventListener('click', () => {
        this.hide();
        if (this.onMainMenu) this.onMainMenu();
      });

    } else {
      let buttonLabel = `⚔️ CLAIM BLESSING & COMMENCE ROUND ${currentRound + 1} ❯`;
      if (!data.playerWonRound) {
        buttonLabel = `🥊 COMMENCE ROUND ${currentRound + 1} ❯`;
      } else if (isLevelOver && playerWonLevel) {
        buttonLabel = `🥋 CONQUERED! CLAIM BLESSING & ENTER LEVEL ${currentLevel + 1} ❯`;
      }
      footer.innerHTML = `
        <div class="recap-actions-row">
          <button class="recap-btn recap-btn-primary" id="btn-recap-next-round">
            ${buttonLabel}
          </button>
        </div>
      `;

      document.getElementById('btn-recap-next-round')?.addEventListener('click', () => {
        this.hide();
        if (this.onNextRound) {
          this.onNextRound(this.selectedPerkId);
        }
      });
    }

    this.container.style.display = 'flex';
  }

  hide() {
    this.container.style.display = 'none';
  }
}
