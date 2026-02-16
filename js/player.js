/* ========================================
   Visual Novel Creator - Player Engine
   ======================================== */

const Player = {
  project: null,
  currentSceneIndex: 0,
  currentCommandIndex: 0,
  isPlaying: false,
  isAutoMode: false,
  isSkipMode: false,
  isTyping: false,
  typewriterTimer: null,
  autoTimer: null,
  textLog: [],
  visibleChars: {},   // { characterId: { position, expression } }
  currentBg: null,
  saveSlots: {},

  start(project) {
    this.project = JSON.parse(JSON.stringify(project)); // Deep copy
    this.currentSceneIndex = 0;
    this.currentCommandIndex = 0;
    this.isPlaying = true;
    this.isAutoMode = false;
    this.isSkipMode = false;
    this.isTyping = false;
    this.textLog = [];
    this.visibleChars = {};
    this.currentBg = null;

    // Load save slots from localStorage
    try {
      this.saveSlots = JSON.parse(localStorage.getItem('vn_save_slots') || '{}');
    } catch (e) {
      this.saveSlots = {};
    }

    // Show player view
    Utils.$('#player-view').classList.remove('hidden');
    Utils.$('#editor-view').style.display = 'none';
    Utils.$('#app-header').style.display = 'none';

    // Set font size
    Utils.$('#player-dialogue').style.fontSize = (this.project.settings.fontSize || 18) + 'px';

    // Reset UI
    this.clearCharacters();
    Utils.$('#player-bg').style.backgroundImage = '';
    Utils.$('#player-char-name').textContent = '';
    Utils.$('#player-dialogue').textContent = '';
    Utils.$('#player-click-indicator').classList.remove('visible');
    Utils.$('#player-choices').classList.add('hidden');

    // Bind events
    this.bindEvents();

    // Execute first command
    this.executeCurrentCommand();
  },

  stop() {
    this.isPlaying = false;
    this.isAutoMode = false;
    this.isSkipMode = false;
    this.clearTimers();

    // Hide player view
    Utils.$('#player-view').classList.add('hidden');
    Utils.$('#editor-view').style.display = '';
    Utils.$('#app-header').style.display = '';

    this.unbindEvents();
  },

  bindEvents() {
    this._onTextboxClick = () => this.onAdvance();
    this._onKeyPress = (e) => {
      if (e.key === ' ' || e.key === 'Enter') this.onAdvance();
      if (e.key === 'Escape') this.stop();
    };

    Utils.$('#player-textbox').addEventListener('click', this._onTextboxClick);
    document.addEventListener('keydown', this._onKeyPress);

    Utils.$('#btn-player-auto').addEventListener('click', () => this.toggleAuto());
    Utils.$('#btn-player-skip').addEventListener('click', () => this.toggleSkip());
    Utils.$('#btn-player-log').addEventListener('click', () => this.showLog());
    Utils.$('#btn-player-save').addEventListener('click', () => this.showSaveLoad('save'));
    Utils.$('#btn-player-load').addEventListener('click', () => this.showSaveLoad('load'));
    Utils.$('#btn-player-close').addEventListener('click', () => this.stop());
    Utils.$('#btn-close-log').addEventListener('click', () => this.hideLog());
    Utils.$('#btn-close-saveload').addEventListener('click', () => this.hideSaveLoad());
  },

  unbindEvents() {
    if (this._onTextboxClick) {
      Utils.$('#player-textbox').removeEventListener('click', this._onTextboxClick);
    }
    if (this._onKeyPress) {
      document.removeEventListener('keydown', this._onKeyPress);
    }
  },

  clearTimers() {
    if (this.typewriterTimer) {
      clearInterval(this.typewriterTimer);
      this.typewriterTimer = null;
    }
    if (this.autoTimer) {
      clearTimeout(this.autoTimer);
      this.autoTimer = null;
    }
  },

  // ---- Command Execution ----
  getCurrentScene() {
    return this.project.scenes[this.currentSceneIndex] || null;
  },

  getCurrentCommand() {
    const scene = this.getCurrentScene();
    if (!scene) return null;
    return scene.commands[this.currentCommandIndex] || null;
  },

  executeCurrentCommand() {
    const cmd = this.getCurrentCommand();
    if (!cmd) {
      this.onSceneEnd();
      return;
    }

    switch (cmd.type) {
      case 'dialogue':
        this.executeDialogue(cmd);
        break;
      case 'narration':
        this.executeNarration(cmd);
        break;
      case 'show':
        this.executeShow(cmd);
        this.advanceToNext();
        break;
      case 'hide':
        this.executeHide(cmd);
        this.advanceToNext();
        break;
      case 'bg':
        this.executeBg(cmd);
        this.advanceToNext();
        break;
      case 'choice':
        this.executeChoice(cmd);
        break;
      case 'jump':
        this.executeJump(cmd);
        break;
      case 'effect':
        this.executeEffect(cmd);
        break;
      default:
        this.advanceToNext();
    }
  },

  advanceToNext() {
    this.currentCommandIndex++;
    this.executeCurrentCommand();
  },

  onAdvance() {
    if (this.isTyping) {
      // Complete text immediately
      this.completeTypewriter();
      return;
    }

    // Move to next command
    this.clearTimers();
    this.currentCommandIndex++;
    this.executeCurrentCommand();
  },

  onSceneEnd() {
    // Check if there's a next scene
    if (this.currentSceneIndex < this.project.scenes.length - 1) {
      this.currentSceneIndex++;
      this.currentCommandIndex = 0;
      this.executeCurrentCommand();
    } else {
      // Game end
      Utils.$('#player-char-name').textContent = '';
      Utils.$('#player-dialogue').textContent = 'The End';
      Utils.$('#player-click-indicator').classList.remove('visible');
    }
  },

  // ---- Dialogue ----
  executeDialogue(cmd) {
    const char = this.project.characters.find(c => c.id === cmd.characterId);

    // Update character display
    if (char && cmd.position) {
      this.showCharacter(cmd.characterId, cmd.position, cmd.expression || 'default');
    }

    // Dim non-speaking characters
    this.updateCharacterHighlight(cmd.characterId);

    // Show name plate with character color as background
    const nameEl = Utils.$('#player-char-name');
    nameEl.textContent = char ? char.name : '';
    const namePlate = Utils.$('#player-name-plate');
    if (char && char.color) {
      // Convert hex color to rgba with opacity for bg
      const hex = char.color.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      namePlate.style.background = `rgba(${r}, ${g}, ${b}, 0.80)`;
      namePlate.style.borderColor = `rgba(${r + 60}, ${g + 60}, ${b + 60}, 0.5)`;
    } else {
      namePlate.style.background = '';
      namePlate.style.borderColor = '';
    }

    // Typewriter text
    this.startTypewriter(cmd.text || '');

    // Add to log
    this.textLog.push({
      name: char ? char.name : '',
      color: char ? char.color : '',
      text: cmd.text || ''
    });
  },

  executeNarration(cmd) {
    Utils.$('#player-char-name').textContent = '';
    Utils.$('#player-name-plate').style.background = '';
    Utils.$('#player-name-plate').style.borderColor = '';
    this.updateCharacterHighlight(null);
    this.startTypewriter(cmd.text || '');

    this.textLog.push({
      name: '',
      color: '',
      text: cmd.text || ''
    });
  },

  startTypewriter(text) {
    this.clearTimers();
    this.isTyping = true;

    const dialogueEl = Utils.$('#player-dialogue');
    const indicator = Utils.$('#player-click-indicator');
    indicator.classList.remove('visible');

    const speed = this.project.settings.textSpeed || 40;
    let currentIndex = 0;
    dialogueEl.textContent = '';

    if (this.isSkipMode) {
      dialogueEl.textContent = text;
      this.isTyping = false;
      indicator.classList.add('visible');
      this.onAutoAdvance();
      return;
    }

    this.typewriterTimer = setInterval(() => {
      if (currentIndex < text.length) {
        dialogueEl.textContent += text[currentIndex];
        currentIndex++;
      } else {
        this.completeTypewriter();
      }
    }, speed);

    this._pendingText = text;
  },

  completeTypewriter() {
    this.clearTimers();
    this.isTyping = false;

    if (this._pendingText) {
      Utils.$('#player-dialogue').textContent = this._pendingText;
      this._pendingText = null;
    }

    Utils.$('#player-click-indicator').classList.add('visible');

    if (this.isAutoMode || this.isSkipMode) {
      this.onAutoAdvance();
    }
  },

  onAutoAdvance() {
    const delay = this.isSkipMode ? 200 : (this.project.settings.autoSpeed || 2000);
    this.autoTimer = setTimeout(() => {
      this.onAdvance();
    }, delay);
  },

  // ---- Show/Hide Characters ----
  showCharacter(charId, position, expression) {
    const char = this.project.characters.find(c => c.id === charId);
    if (!char) return;

    // Remove from old position if exists
    if (this.visibleChars[charId]) {
      const oldSlot = Utils.$(`.player-char[data-position="${this.visibleChars[charId].position}"]`);
      if (oldSlot) oldSlot.innerHTML = '';
    }

    this.visibleChars[charId] = { position, expression };

    const slot = Utils.$(`.player-char[data-position="${position}"]`);
    if (!slot) return;

    const imgSrc = char.images[expression] || char.images['default'];
    if (imgSrc) {
      slot.innerHTML = `<img src="${imgSrc}" alt="${char.name}" style="opacity:0">`;
      // Fade in
      requestAnimationFrame(() => {
        const img = slot.querySelector('img');
        if (img) {
          img.style.transition = 'opacity 0.4s ease';
          img.style.opacity = '1';
        }
      });
    }
  },

  executeShow(cmd) {
    this.showCharacter(cmd.characterId, cmd.position, cmd.expression || 'default');
  },

  executeHide(cmd) {
    if (this.visibleChars[cmd.characterId]) {
      const pos = this.visibleChars[cmd.characterId].position;
      const slot = Utils.$(`.player-char[data-position="${pos}"]`);
      if (slot) {
        const img = slot.querySelector('img');
        if (img) {
          img.style.transition = 'opacity 0.4s ease';
          img.style.opacity = '0';
          setTimeout(() => { slot.innerHTML = ''; }, 400);
        } else {
          slot.innerHTML = '';
        }
      }
      delete this.visibleChars[cmd.characterId];
    }
  },

  clearCharacters() {
    Utils.$$('.player-char').forEach(slot => { slot.innerHTML = ''; });
    this.visibleChars = {};
  },

  updateCharacterHighlight(speakingCharId) {
    Utils.$$('.player-char').forEach(slot => {
      slot.classList.remove('speaking', 'dimmed');
    });

    if (!speakingCharId) return;

    Object.entries(this.visibleChars).forEach(([charId, info]) => {
      const slot = Utils.$(`.player-char[data-position="${info.position}"]`);
      if (!slot) return;
      if (charId === speakingCharId) {
        slot.classList.add('speaking');
      } else {
        slot.classList.add('dimmed');
      }
    });
  },

  // ---- Background ----
  executeBg(cmd) {
    const bgEl = Utils.$('#player-bg');
    if (cmd.background) {
      bgEl.style.backgroundImage = `url(${cmd.background})`;
      bgEl.classList.add('fade-in');
      setTimeout(() => bgEl.classList.remove('fade-in'), 600);
    } else {
      bgEl.style.backgroundImage = '';
    }
    this.currentBg = cmd.background;
  },

  // ---- Choice ----
  executeChoice(cmd) {
    Utils.$('#player-click-indicator').classList.remove('visible');
    const container = Utils.$('#player-choices');
    container.innerHTML = '';
    container.classList.remove('hidden');

    cmd.choices.forEach((choice) => {
      const btn = Utils.createElement('button', 'player-choice-btn', Utils.escapeHtml(choice.text));
      btn.addEventListener('click', () => {
        container.classList.add('hidden');

        if (choice.targetSceneId) {
          const targetIndex = this.project.scenes.findIndex(s => s.id === choice.targetSceneId);
          if (targetIndex >= 0) {
            this.currentSceneIndex = targetIndex;
            this.currentCommandIndex = 0;
            this.executeCurrentCommand();
            return;
          }
        }

        // No target, continue to next command
        this.currentCommandIndex++;
        this.executeCurrentCommand();
      });
      container.appendChild(btn);
    });

    this.textLog.push({
      name: '',
      color: '',
      text: '[ Choice: ' + cmd.choices.map(c => c.text).join(' / ') + ' ]'
    });
  },

  // ---- Jump ----
  executeJump(cmd) {
    if (cmd.targetSceneId) {
      const targetIndex = this.project.scenes.findIndex(s => s.id === cmd.targetSceneId);
      if (targetIndex >= 0) {
        this.currentSceneIndex = targetIndex;
        this.currentCommandIndex = 0;
        this.executeCurrentCommand();
        return;
      }
    }
    // Invalid jump, continue
    this.advanceToNext();
  },

  // ---- Effects ----
  executeEffect(cmd) {
    const overlay = Utils.$('#player-effect-overlay');

    // Remove existing animation classes
    overlay.className = '';

    requestAnimationFrame(() => {
      switch (cmd.effectType) {
        case 'fade-black':
          overlay.classList.add('fade-black');
          break;
        case 'fade-white':
          overlay.classList.add('fade-white');
          break;
        case 'shake':
          overlay.classList.add('shake');
          break;
      }

      const duration = cmd.effectType === 'shake' ? 500 : 1000;
      setTimeout(() => {
        overlay.className = '';
        this.advanceToNext();
      }, duration);
    });
  },

  // ---- Auto/Skip ----
  toggleAuto() {
    this.isAutoMode = !this.isAutoMode;
    this.isSkipMode = false;

    Utils.$('#btn-player-auto').classList.toggle('active', this.isAutoMode);
    Utils.$('#btn-player-skip').classList.remove('active');

    if (this.isAutoMode && !this.isTyping) {
      this.onAutoAdvance();
    }
  },

  toggleSkip() {
    this.isSkipMode = !this.isSkipMode;
    this.isAutoMode = false;

    Utils.$('#btn-player-skip').classList.toggle('active', this.isSkipMode);
    Utils.$('#btn-player-auto').classList.remove('active');

    if (this.isSkipMode) {
      if (this.isTyping) {
        this.completeTypewriter();
      } else {
        this.onAutoAdvance();
      }
    }
  },

  // ---- Text Log ----
  showLog() {
    const overlay = Utils.$('#player-log-overlay');
    const entries = Utils.$('#log-entries');
    entries.innerHTML = '';

    this.textLog.forEach(entry => {
      const el = Utils.createElement('div', 'log-entry');
      if (entry.name) {
        el.innerHTML = `
          <div class="log-entry-name" style="color:${entry.color || ''}">${Utils.escapeHtml(entry.name)}</div>
          <div class="log-entry-text">${Utils.escapeHtml(entry.text)}</div>
        `;
      } else {
        el.innerHTML = `<div class="log-entry-text">${Utils.escapeHtml(entry.text)}</div>`;
      }
      entries.appendChild(el);
    });

    overlay.classList.remove('hidden');
    entries.scrollTop = entries.scrollHeight;
  },

  hideLog() {
    Utils.$('#player-log-overlay').classList.add('hidden');
  },

  // ---- Save/Load ----
  showSaveLoad(mode) {
    const overlay = Utils.$('#player-saveload-overlay');
    const title = Utils.$('#saveload-title');
    const slotsContainer = Utils.$('#saveload-slots');

    title.textContent = mode === 'save' ? 'Save Game' : 'Load Game';
    slotsContainer.innerHTML = '';

    for (let i = 1; i <= 6; i++) {
      const slotKey = `slot_${i}`;
      const slotData = this.saveSlots[slotKey];

      const slot = Utils.createElement('div', 'save-slot');
      slot.innerHTML = `
        <div class="save-slot-title">Slot ${i}</div>
        <div class="save-slot-info">${slotData ? slotData.date + ' - ' + slotData.sceneName : 'Empty'}</div>
      `;

      slot.addEventListener('click', () => {
        if (mode === 'save') {
          this.saveToSlot(slotKey);
        } else {
          this.loadFromSlot(slotKey);
        }
        this.hideSaveLoad();
      });

      slotsContainer.appendChild(slot);
    }

    overlay.classList.remove('hidden');
  },

  hideSaveLoad() {
    Utils.$('#player-saveload-overlay').classList.add('hidden');
  },

  saveToSlot(slotKey) {
    const scene = this.getCurrentScene();
    this.saveSlots[slotKey] = {
      date: new Date().toLocaleString('ja-JP'),
      sceneName: scene ? scene.name : 'Unknown',
      sceneIndex: this.currentSceneIndex,
      commandIndex: this.currentCommandIndex,
      visibleChars: JSON.parse(JSON.stringify(this.visibleChars)),
      currentBg: this.currentBg,
      textLog: [...this.textLog]
    };

    try {
      localStorage.setItem('vn_save_slots', JSON.stringify(this.saveSlots));
    } catch (e) {
      // localStorage full, ignore
    }
  },

  loadFromSlot(slotKey) {
    const data = this.saveSlots[slotKey];
    if (!data) {
      alert('This slot is empty.');
      return;
    }

    this.currentSceneIndex = data.sceneIndex;
    this.currentCommandIndex = data.commandIndex;
    this.visibleChars = data.visibleChars || {};
    this.currentBg = data.currentBg;
    this.textLog = data.textLog || [];

    // Restore background
    if (this.currentBg) {
      Utils.$('#player-bg').style.backgroundImage = `url(${this.currentBg})`;
    }

    // Restore characters
    this.clearCharacters();
    Object.entries(this.visibleChars).forEach(([charId, info]) => {
      this.showCharacter(charId, info.position, info.expression);
    });

    this.executeCurrentCommand();
  }
};
