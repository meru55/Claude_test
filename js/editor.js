/* ========================================
   Visual Novel Creator - Editor Module
   ======================================== */

const Editor = {
  init() {
    this.bindSceneControls();
    this.bindCharacterControls();
    this.bindCommandToolbar();
    this.bindBgModal();
    BgRemover.init();
  },

  renderAll() {
    this.renderSceneList();
    this.renderCharacterList();
    this.renderCommands();
    this.renderProperties();
    this.updatePreview();
  },

  // ---- Scene Management ----
  bindSceneControls() {
    Utils.$('#btn-add-scene').addEventListener('click', () => {
      const scene = VNProject.createScene('Scene ' + (AppState.project.scenes.length + 1));
      AppState.project.scenes.push(scene);
      AppState.selectedSceneId = scene.id;
      AppState.selectedCommandId = null;
      this.renderAll();
    });
  },

  renderSceneList() {
    const container = Utils.$('#scene-list');
    container.innerHTML = '';

    AppState.project.scenes.forEach((scene, index) => {
      const item = Utils.createElement('div', `list-item${scene.id === AppState.selectedSceneId ? ' active' : ''}`);
      item.innerHTML = `
        <span class="item-icon">&#128196;</span>
        <span class="item-name">${Utils.escapeHtml(scene.name)}</span>
        <div class="item-actions">
          <button class="item-action-btn edit" title="Rename">&#9998;</button>
          <button class="item-action-btn delete" title="Delete">&#128465;</button>
        </div>
      `;

      item.addEventListener('click', (e) => {
        if (e.target.closest('.item-action-btn')) return;
        AppState.selectedSceneId = scene.id;
        AppState.selectedCommandId = null;
        this.renderAll();
      });

      item.querySelector('.edit').addEventListener('click', () => {
        const newName = prompt('Scene name:', scene.name);
        if (newName !== null && newName.trim()) {
          scene.name = newName.trim();
          this.renderAll();
        }
      });

      item.querySelector('.delete').addEventListener('click', () => {
        if (!confirm(`Delete scene "${scene.name}"?`)) return;
        AppState.project.scenes = AppState.project.scenes.filter(s => s.id !== scene.id);
        if (AppState.selectedSceneId === scene.id) {
          AppState.selectedSceneId = null;
          AppState.selectedCommandId = null;
        }
        this.renderAll();
      });

      container.appendChild(item);
    });
  },

  // ---- Character Management ----
  bindCharacterControls() {
    Utils.$('#btn-add-character').addEventListener('click', () => {
      this.openCharacterModal(null);
    });

    Utils.$('#btn-char-cancel').addEventListener('click', () => {
      Utils.$('#modal-character').classList.add('hidden');
    });

    Utils.$('#btn-char-save').addEventListener('click', () => {
      this.saveCharacter();
    });

    Utils.$('#btn-add-expression').addEventListener('click', () => {
      this.addExpressionSlot();
    });
  },

  openCharacterModal(characterId) {
    const modal = Utils.$('#modal-character');
    const isEdit = !!characterId;
    const character = isEdit ? AppState.getCharacter(characterId) : null;

    Utils.$('#modal-char-title').textContent = isEdit ? 'Edit Character' : 'Add Character';
    Utils.$('#char-name-input').value = isEdit ? character.name : '';
    Utils.$('#char-color-input').value = isEdit ? character.color : VNProject.randomColor();

    AppState.editingCharacterId = characterId;

    // Render expression slots
    const exprContainer = Utils.$('#char-expressions');
    exprContainer.innerHTML = '';

    if (isEdit && character.images) {
      Object.keys(character.images).forEach(expr => {
        this.createExpressionSlot(exprContainer, expr, character.images[expr]);
      });
    }

    if (exprContainer.children.length === 0) {
      this.createExpressionSlot(exprContainer, 'default', null);
    }

    modal.classList.remove('hidden');
  },

  createExpressionSlot(container, exprName, imageData) {
    const item = Utils.createElement('div', 'expression-item');
    item.dataset.expression = exprName;

    const isDefault = exprName === 'default';

    item.innerHTML = `
      <div class="expression-preview">
        ${imageData ? `<img src="${imageData}" alt="${exprName}">` : '<span class="no-image">No Image</span>'}
      </div>
      <input type="text" class="expression-name-input" value="${exprName}"
        style="width:80px;font-size:11px;padding:2px 4px;text-align:center;border:1px solid var(--border);border-radius:4px;background:var(--bg-tertiary);color:var(--text-primary);"
        ${isDefault ? 'readonly' : ''}>
      <button class="btn-upload-expression btn-small">Upload</button>
      <button class="btn-remove-bg" title="Remove background from image" style="display:${imageData ? 'inline-block' : 'none'}">&#10024; Remove BG</button>
      ${!isDefault ? '<button class="btn-remove-expr">&times;</button>' : ''}
    `;

    const preview = item.querySelector('.expression-preview');
    const uploadBtn = item.querySelector('.btn-upload-expression');
    const removeBgBtn = item.querySelector('.btn-remove-bg');

    const handleUpload = () => {
      const input = Utils.$('#expression-file-input');
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const dataUrl = await Utils.readFileAsDataURL(file);
        preview.innerHTML = `<img src="${dataUrl}" alt="${exprName}">`;
        item._imageData = dataUrl;
        removeBgBtn.style.display = 'inline-block';
        input.value = '';
      };
      input.click();
    };

    preview.addEventListener('click', handleUpload);
    uploadBtn.addEventListener('click', handleUpload);

    // Open background removal modal
    removeBgBtn.addEventListener('click', () => {
      if (!item._imageData) {
        alert('Upload an image first.');
        return;
      }
      BgRemover.open(item, item._imageData);
    });

    // Set stored image data
    if (imageData) {
      item._imageData = imageData;
    }

    // Remove expression
    const removeBtn = item.querySelector('.btn-remove-expr');
    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        item.remove();
      });
    }

    container.appendChild(item);
    return item;
  },

  addExpressionSlot() {
    const container = Utils.$('#char-expressions');
    const exprName = prompt('Expression name (e.g., happy, sad, angry):');
    if (!exprName || !exprName.trim()) return;
    this.createExpressionSlot(container, exprName.trim().toLowerCase(), null);
  },

  saveCharacter() {
    const name = Utils.$('#char-name-input').value.trim();
    if (!name) {
      alert('Please enter a character name.');
      return;
    }

    const color = Utils.$('#char-color-input').value;
    const images = {};

    Utils.$$('#char-expressions .expression-item').forEach(item => {
      const nameInput = item.querySelector('.expression-name-input');
      const exprName = nameInput ? nameInput.value.trim() : item.dataset.expression;
      if (exprName && item._imageData) {
        images[exprName] = item._imageData;
      }
    });

    if (AppState.editingCharacterId) {
      // Edit existing
      const char = AppState.getCharacter(AppState.editingCharacterId);
      if (char) {
        char.name = name;
        char.color = color;
        char.images = images;
      }
    } else {
      // Create new
      const char = VNProject.createCharacter(name);
      char.color = color;
      char.images = images;
      AppState.project.characters.push(char);
    }

    Utils.$('#modal-character').classList.add('hidden');
    this.renderAll();
  },

  renderCharacterList() {
    const container = Utils.$('#character-list');
    container.innerHTML = '';

    AppState.project.characters.forEach(char => {
      const item = Utils.createElement('div', 'list-item');
      item.innerHTML = `
        <span class="char-color-dot" style="background:${char.color}"></span>
        <span class="item-name">${Utils.escapeHtml(char.name)}</span>
        <div class="item-actions">
          <button class="item-action-btn edit" title="Edit">&#9998;</button>
          <button class="item-action-btn delete" title="Delete">&#128465;</button>
        </div>
      `;

      item.querySelector('.edit').addEventListener('click', () => {
        this.openCharacterModal(char.id);
      });

      item.querySelector('.delete').addEventListener('click', () => {
        if (!confirm(`Delete character "${char.name}"?`)) return;
        AppState.project.characters = AppState.project.characters.filter(c => c.id !== char.id);
        this.renderAll();
      });

      // Click on char item: do nothing special, just allow edit/delete
      item.addEventListener('click', (e) => {
        if (e.target.closest('.item-action-btn')) return;
        this.openCharacterModal(char.id);
      });

      container.appendChild(item);
    });
  },

  // ---- Command Management ----
  bindCommandToolbar() {
    Utils.$$('.cmd-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.type;
        if (!AppState.selectedScene) {
          alert('Please select a scene first.');
          return;
        }

        if (type === 'bg') {
          this.openBgModal();
          return;
        }

        const command = VNProject.createCommand(type);

        // Auto-assign first character for character-related commands
        if (['dialogue', 'show', 'hide'].includes(type) && AppState.project.characters.length > 0) {
          command.characterId = AppState.project.characters[0].id;
        }

        AppState.selectedScene.commands.push(command);
        AppState.selectedCommandId = command.id;
        this.renderCommands();
        this.renderProperties();
        this.updatePreview();
      });
    });
  },

  renderCommands() {
    const container = Utils.$('#command-list');
    const scene = AppState.selectedScene;

    Utils.$('#current-scene-name').textContent = scene ? scene.name : 'Select a scene';

    if (!scene || scene.commands.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>Select a scene and add commands to build your story.</p></div>';
      return;
    }

    container.innerHTML = '';

    scene.commands.forEach((cmd, index) => {
      const item = Utils.createElement('div', `command-item${cmd.id === AppState.selectedCommandId ? ' active' : ''}`);
      item.draggable = true;
      item.dataset.commandId = cmd.id;
      item.dataset.index = index;

      const summary = this.getCommandSummary(cmd);

      item.innerHTML = `
        <span class="cmd-drag-handle" title="Drag to reorder">&#8942;&#8942;</span>
        <span class="cmd-order">${index + 1}</span>
        <span class="cmd-type-badge ${cmd.type}">${cmd.type}</span>
        <span class="cmd-summary">${Utils.escapeHtml(summary)}</span>
        <div class="cmd-actions">
          <button class="item-action-btn cmd-duplicate" title="Duplicate">&#128203;</button>
          <button class="item-action-btn cmd-move-up" title="Move Up">&#9650;</button>
          <button class="item-action-btn cmd-move-down" title="Move Down">&#9660;</button>
          <button class="item-action-btn delete" title="Delete">&#128465;</button>
        </div>
      `;

      // Select command
      item.addEventListener('click', (e) => {
        if (e.target.closest('.item-action-btn') || e.target.closest('.cmd-drag-handle')) return;
        AppState.selectedCommandId = cmd.id;
        this.renderCommands();
        this.renderProperties();
        this.updatePreview();
      });

      // Duplicate
      item.querySelector('.cmd-duplicate').addEventListener('click', () => {
        const copy = JSON.parse(JSON.stringify(cmd));
        copy.id = VNProject.uid();
        scene.commands.splice(index + 1, 0, copy);
        this.renderCommands();
      });

      // Move up
      item.querySelector('.cmd-move-up').addEventListener('click', () => {
        if (index === 0) return;
        [scene.commands[index - 1], scene.commands[index]] = [scene.commands[index], scene.commands[index - 1]];
        this.renderCommands();
      });

      // Move down
      item.querySelector('.cmd-move-down').addEventListener('click', () => {
        if (index >= scene.commands.length - 1) return;
        [scene.commands[index], scene.commands[index + 1]] = [scene.commands[index + 1], scene.commands[index]];
        this.renderCommands();
      });

      // Delete
      item.querySelector('.delete').addEventListener('click', () => {
        scene.commands.splice(index, 1);
        if (AppState.selectedCommandId === cmd.id) {
          AppState.selectedCommandId = null;
        }
        this.renderCommands();
        this.renderProperties();
        this.updatePreview();
      });

      // Drag & Drop
      item.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', index.toString());
        item.classList.add('dragging');
      });

      item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
        container.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
      });

      item.addEventListener('dragover', (e) => {
        e.preventDefault();
        item.classList.add('drag-over');
      });

      item.addEventListener('dragleave', () => {
        item.classList.remove('drag-over');
      });

      item.addEventListener('drop', (e) => {
        e.preventDefault();
        item.classList.remove('drag-over');
        const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
        const toIndex = index;
        if (fromIndex === toIndex) return;
        const [moved] = scene.commands.splice(fromIndex, 1);
        scene.commands.splice(toIndex, 0, moved);
        this.renderCommands();
      });

      container.appendChild(item);
    });
  },

  getCommandSummary(cmd) {
    const char = cmd.characterId ? AppState.getCharacter(cmd.characterId) : null;
    switch (cmd.type) {
      case 'dialogue':
        return `${char ? char.name : '???'}: "${Utils.truncate(cmd.text, 40)}"`;
      case 'narration':
        return Utils.truncate(cmd.text, 50);
      case 'show':
        return `Show ${char ? char.name : '???'} at ${cmd.position} (${cmd.expression})`;
      case 'hide':
        return `Hide ${char ? char.name : '???'}`;
      case 'bg':
        return cmd.background ? 'Change background' : 'Set background';
      case 'choice':
        return cmd.choices.map(c => c.text).join(' / ');
      case 'jump':
        const targetScene = AppState.getScene(cmd.targetSceneId);
        return `Jump to: ${targetScene ? targetScene.name : '(none)'}`;
      case 'effect':
        return `Effect: ${cmd.effectType}`;
      default:
        return cmd.type;
    }
  },

  // ---- Properties Panel ----
  renderProperties() {
    const container = Utils.$('#properties-content');
    const cmd = AppState.selectedCommand;

    if (!cmd) {
      container.innerHTML = '<div class="empty-state"><p>Select a command to edit its properties.</p></div>';
      return;
    }

    let html = '';

    switch (cmd.type) {
      case 'dialogue':
        html = this.buildDialogueProperties(cmd);
        break;
      case 'narration':
        html = this.buildNarrationProperties(cmd);
        break;
      case 'show':
        html = this.buildShowProperties(cmd);
        break;
      case 'hide':
        html = this.buildHideProperties(cmd);
        break;
      case 'bg':
        html = this.buildBgProperties(cmd);
        break;
      case 'choice':
        html = this.buildChoiceProperties(cmd);
        break;
      case 'jump':
        html = this.buildJumpProperties(cmd);
        break;
      case 'effect':
        html = this.buildEffectProperties(cmd);
        break;
    }

    container.innerHTML = html;
    this.bindPropertyEvents(cmd);
  },

  buildCharacterSelect(selectedId, selectId = 'prop-character') {
    let opts = '<option value="">-- Select --</option>';
    AppState.project.characters.forEach(c => {
      opts += `<option value="${c.id}" ${c.id === selectedId ? 'selected' : ''}>${Utils.escapeHtml(c.name)}</option>`;
    });
    return `<select id="${selectId}">${opts}</select>`;
  },

  buildExpressionSelect(characterId, selectedExpr, selectId = 'prop-expression') {
    const char = AppState.getCharacter(characterId);
    let opts = '<option value="default">default</option>';
    if (char && char.images) {
      Object.keys(char.images).forEach(expr => {
        if (expr !== 'default') {
          opts += `<option value="${expr}" ${expr === selectedExpr ? 'selected' : ''}>${expr}</option>`;
        }
      });
    }
    if (selectedExpr === 'default') {
      opts = opts.replace('value="default">', 'value="default" selected>');
    }
    return `<select id="${selectId}">${opts}</select>`;
  },

  buildPositionSelect(selectedPos, selectId = 'prop-position') {
    return `<select id="${selectId}">
      <option value="left" ${selectedPos === 'left' ? 'selected' : ''}>Left</option>
      <option value="center" ${selectedPos === 'center' ? 'selected' : ''}>Center</option>
      <option value="right" ${selectedPos === 'right' ? 'selected' : ''}>Right</option>
    </select>`;
  },

  buildSceneSelect(selectedId, selectId = 'prop-target-scene') {
    let opts = '<option value="">-- Select --</option>';
    AppState.project.scenes.forEach(s => {
      opts += `<option value="${s.id}" ${s.id === selectedId ? 'selected' : ''}>${Utils.escapeHtml(s.name)}</option>`;
    });
    return `<select id="${selectId}">${opts}</select>`;
  },

  buildDialogueProperties(cmd) {
    return `
      <div class="prop-group">
        <label>Character</label>
        ${this.buildCharacterSelect(cmd.characterId)}
      </div>
      <div class="prop-group">
        <label>Expression</label>
        ${this.buildExpressionSelect(cmd.characterId, cmd.expression)}
      </div>
      <div class="prop-group">
        <label>Position</label>
        ${this.buildPositionSelect(cmd.position)}
      </div>
      <div class="prop-group">
        <label>Dialogue Text</label>
        <textarea id="prop-text" placeholder="Enter dialogue...">${Utils.escapeHtml(cmd.text)}</textarea>
      </div>
    `;
  },

  buildNarrationProperties(cmd) {
    return `
      <div class="prop-group">
        <label>Narration Text</label>
        <textarea id="prop-text" placeholder="Enter narration...">${Utils.escapeHtml(cmd.text)}</textarea>
      </div>
    `;
  },

  buildShowProperties(cmd) {
    return `
      <div class="prop-group">
        <label>Character</label>
        ${this.buildCharacterSelect(cmd.characterId)}
      </div>
      <div class="prop-group">
        <label>Expression</label>
        ${this.buildExpressionSelect(cmd.characterId, cmd.expression)}
      </div>
      <div class="prop-group">
        <label>Position</label>
        ${this.buildPositionSelect(cmd.position)}
      </div>
    `;
  },

  buildHideProperties(cmd) {
    return `
      <div class="prop-group">
        <label>Character</label>
        ${this.buildCharacterSelect(cmd.characterId)}
      </div>
    `;
  },

  buildBgProperties(cmd) {
    return `
      <div class="prop-group">
        <label>Background Image</label>
        <div class="scene-bg-preview" id="prop-bg-preview">
          ${cmd.background ? `<img src="${cmd.background}" alt="BG">` : '<span class="placeholder">Click to set background</span>'}
        </div>
        <button class="btn-small" id="prop-bg-clear" style="width:100%">Clear Background</button>
      </div>
    `;
  },

  buildChoiceProperties(cmd) {
    let choicesHtml = '';
    cmd.choices.forEach((choice, i) => {
      choicesHtml += `
        <div class="choice-item" data-index="${i}">
          <input type="text" class="choice-text" value="${Utils.escapeHtml(choice.text)}" placeholder="Choice text">
          ${this.buildSceneSelect(choice.targetSceneId, `choice-target-${i}`)}
          <button class="btn-remove-choice" title="Remove">&times;</button>
        </div>
      `;
    });

    return `
      <div class="prop-group">
        <label>Choices</label>
        <div id="choices-container">${choicesHtml}</div>
        <button class="btn-small btn-add-choice" id="btn-add-choice-prop">+ Add Choice</button>
      </div>
    `;
  },

  buildJumpProperties(cmd) {
    return `
      <div class="prop-group">
        <label>Target Scene</label>
        ${this.buildSceneSelect(cmd.targetSceneId)}
      </div>
    `;
  },

  buildEffectProperties(cmd) {
    return `
      <div class="prop-group">
        <label>Effect Type</label>
        <select id="prop-effect-type">
          <option value="fade-black" ${cmd.effectType === 'fade-black' ? 'selected' : ''}>Fade to Black</option>
          <option value="fade-white" ${cmd.effectType === 'fade-white' ? 'selected' : ''}>Fade to White</option>
          <option value="shake" ${cmd.effectType === 'shake' ? 'selected' : ''}>Screen Shake</option>
        </select>
      </div>
    `;
  },

  bindPropertyEvents(cmd) {
    const update = () => {
      this.renderCommands();
      this.updatePreview();
    };

    // Character select
    const charSelect = Utils.$('#prop-character');
    if (charSelect) {
      charSelect.addEventListener('change', (e) => {
        cmd.characterId = e.target.value;
        this.renderProperties();
        update();
      });
    }

    // Expression select
    const exprSelect = Utils.$('#prop-expression');
    if (exprSelect) {
      exprSelect.addEventListener('change', (e) => {
        cmd.expression = e.target.value;
        update();
      });
    }

    // Position select
    const posSelect = Utils.$('#prop-position');
    if (posSelect) {
      posSelect.addEventListener('change', (e) => {
        cmd.position = e.target.value;
        update();
      });
    }

    // Text field
    const textField = Utils.$('#prop-text');
    if (textField) {
      textField.addEventListener('input', (e) => {
        cmd.text = e.target.value;
        this.renderCommands();
        this.updatePreview();
      });
    }

    // BG preview click
    const bgPreview = Utils.$('#prop-bg-preview');
    if (bgPreview) {
      bgPreview.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
          const file = e.target.files[0];
          if (!file) return;
          cmd.background = await Utils.readFileAsDataURL(file);
          this.renderProperties();
          update();
        };
        input.click();
      });
    }

    const bgClear = Utils.$('#prop-bg-clear');
    if (bgClear) {
      bgClear.addEventListener('click', () => {
        cmd.background = null;
        this.renderProperties();
        update();
      });
    }

    // Target scene
    const targetScene = Utils.$('#prop-target-scene');
    if (targetScene) {
      targetScene.addEventListener('change', (e) => {
        cmd.targetSceneId = e.target.value;
        update();
      });
    }

    // Effect type
    const effectType = Utils.$('#prop-effect-type');
    if (effectType) {
      effectType.addEventListener('change', (e) => {
        cmd.effectType = e.target.value;
        update();
      });
    }

    // Choice items
    Utils.$$('.choice-item').forEach((item) => {
      const index = parseInt(item.dataset.index);
      const textInput = item.querySelector('.choice-text');
      const targetSelect = item.querySelector(`#choice-target-${index}`);
      const removeBtn = item.querySelector('.btn-remove-choice');

      if (textInput) {
        textInput.addEventListener('input', (e) => {
          cmd.choices[index].text = e.target.value;
          this.renderCommands();
        });
      }

      if (targetSelect) {
        targetSelect.addEventListener('change', (e) => {
          cmd.choices[index].targetSceneId = e.target.value;
        });
      }

      if (removeBtn) {
        removeBtn.addEventListener('click', () => {
          if (cmd.choices.length <= 1) return;
          cmd.choices.splice(index, 1);
          this.renderProperties();
          update();
        });
      }
    });

    const addChoiceBtn = Utils.$('#btn-add-choice-prop');
    if (addChoiceBtn) {
      addChoiceBtn.addEventListener('click', () => {
        cmd.choices.push({ text: `Choice ${cmd.choices.length + 1}`, targetSceneId: '' });
        this.renderProperties();
        update();
      });
    }
  },

  // ---- Background Modal ----
  bindBgModal() {
    const modal = Utils.$('#modal-bg');
    const uploadArea = Utils.$('#bg-upload-area');
    const fileInput = Utils.$('#bg-file-input');
    let pendingBgData = null;

    uploadArea.addEventListener('click', () => fileInput.click());

    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.style.borderColor = 'var(--accent-primary)';
    });

    uploadArea.addEventListener('dragleave', () => {
      uploadArea.style.borderColor = '';
    });

    uploadArea.addEventListener('drop', async (e) => {
      e.preventDefault();
      uploadArea.style.borderColor = '';
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        pendingBgData = await Utils.readFileAsDataURL(file);
        Utils.$('#bg-preview-area').classList.remove('hidden');
        Utils.$('#bg-preview-img').src = pendingBgData;
      }
    });

    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      pendingBgData = await Utils.readFileAsDataURL(file);
      Utils.$('#bg-preview-area').classList.remove('hidden');
      Utils.$('#bg-preview-img').src = pendingBgData;
      fileInput.value = '';
    });

    Utils.$('#btn-bg-cancel').addEventListener('click', () => {
      modal.classList.add('hidden');
      pendingBgData = null;
      Utils.$('#bg-preview-area').classList.add('hidden');
    });

    Utils.$('#btn-bg-save').addEventListener('click', () => {
      if (!pendingBgData || !AppState.selectedScene) return;

      // Create a bg command and add it
      const cmd = VNProject.createCommand('bg');
      cmd.background = pendingBgData;
      AppState.selectedScene.commands.push(cmd);
      AppState.selectedCommandId = cmd.id;

      modal.classList.add('hidden');
      pendingBgData = null;
      Utils.$('#bg-preview-area').classList.add('hidden');
      this.renderCommands();
      this.renderProperties();
      this.updatePreview();
    });
  },

  openBgModal() {
    Utils.$('#bg-preview-area').classList.add('hidden');
    Utils.$('#modal-bg').classList.remove('hidden');
  },

  // ---- Scene Preview ----
  updatePreview() {
    const scene = AppState.selectedScene;
    const preview = Utils.$('#scene-preview');
    const bgEl = Utils.$('#preview-bg');
    const nameEl = Utils.$('#preview-name');
    const textEl = Utils.$('#preview-text');

    // Reset
    Utils.$$('.preview-char-slot').forEach(slot => { slot.innerHTML = ''; });

    if (!scene) {
      bgEl.style.backgroundImage = '';
      nameEl.textContent = 'Character';
      textEl.textContent = 'Select a scene to preview.';
      return;
    }

    // Walk through commands up to selected command to build state
    const state = { bg: null, chars: {}, lastDialogue: null, lastNarration: null };

    const stopIndex = AppState.selectedCommandId
      ? scene.commands.findIndex(c => c.id === AppState.selectedCommandId)
      : scene.commands.length - 1;

    for (let i = 0; i <= stopIndex && i < scene.commands.length; i++) {
      const cmd = scene.commands[i];
      switch (cmd.type) {
        case 'bg':
          state.bg = cmd.background;
          break;
        case 'show':
          state.chars[cmd.characterId] = { position: cmd.position, expression: cmd.expression };
          break;
        case 'hide':
          delete state.chars[cmd.characterId];
          break;
        case 'dialogue':
          state.lastDialogue = cmd;
          state.lastNarration = null;
          if (cmd.characterId && cmd.position) {
            state.chars[cmd.characterId] = { position: cmd.position, expression: cmd.expression || 'default' };
          }
          break;
        case 'narration':
          state.lastNarration = cmd;
          state.lastDialogue = null;
          break;
      }
    }

    // Apply background
    if (state.bg) {
      bgEl.style.backgroundImage = `url(${state.bg})`;
    } else if (scene.background) {
      bgEl.style.backgroundImage = `url(${scene.background})`;
    } else {
      bgEl.style.backgroundImage = '';
    }

    // Apply characters
    Object.entries(state.chars).forEach(([charId, info]) => {
      const char = AppState.getCharacter(charId);
      if (!char) return;
      const slot = Utils.$(`.preview-char-slot[data-position="${info.position}"]`);
      if (!slot) return;
      const imgSrc = char.images[info.expression] || char.images['default'];
      if (imgSrc) {
        slot.innerHTML = `<img src="${imgSrc}" alt="${char.name}">`;
      }
    });

    // Apply text with new name plate style
    const namePlate = Utils.$('#preview-name-plate');
    if (state.lastDialogue) {
      const char = AppState.getCharacter(state.lastDialogue.characterId);
      nameEl.textContent = char ? char.name : '???';
      textEl.textContent = state.lastDialogue.text || '...';
      if (char && char.color) {
        const hex = char.color.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        namePlate.style.background = `rgba(${r}, ${g}, ${b}, 0.82)`;
      } else {
        namePlate.style.background = '';
      }
      namePlate.style.display = '';
    } else if (state.lastNarration) {
      nameEl.textContent = '';
      namePlate.style.display = 'none';
      textEl.textContent = state.lastNarration.text || '...';
    } else {
      nameEl.textContent = '';
      namePlate.style.display = 'none';
      textEl.textContent = '';
    }
  }
};

// ========================================
// Background Removal Engine
// ========================================
const BgRemover = {
  canvas: null,
  ctx: null,
  originalImageData: null,
  currentImageData: null,
  targetItem: null,   // expression-item element
  tolerance: 30,
  selectedColor: null,

  init() {
    this.canvas = Utils.$('#bgr-canvas');
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });

    Utils.$('#bgr-tolerance').addEventListener('input', (e) => {
      this.tolerance = parseInt(e.target.value);
      Utils.$('#bgr-tolerance-val').textContent = this.tolerance;
    });

    Utils.$('#btn-bgr-auto').addEventListener('click', () => {
      this.autoRemove();
    });

    Utils.$('#btn-bgr-reset').addEventListener('click', () => {
      this.reset();
    });

    Utils.$('#btn-bgr-cancel').addEventListener('click', () => {
      Utils.$('#modal-bg-remove').classList.add('hidden');
    });

    Utils.$('#btn-bgr-confirm').addEventListener('click', () => {
      this.applyToTarget();
    });

    Utils.$('#btn-bgr-apply-click').addEventListener('click', () => {
      if (this.selectedColor) {
        this.removeColorByFloodFill(this.selectedColor[0], this.selectedColor[1], this.selectedColor[2]);
      }
    });

    // Close backdrop
    Utils.$('#modal-bg-remove .modal-backdrop').addEventListener('click', () => {
      Utils.$('#modal-bg-remove').classList.add('hidden');
    });
    Utils.$('#modal-bg-remove .btn-modal-close').addEventListener('click', () => {
      Utils.$('#modal-bg-remove').classList.add('hidden');
    });

    // Canvas click: sample color for removal
    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      const x = Math.floor((e.clientX - rect.left) * scaleX);
      const y = Math.floor((e.clientY - rect.top) * scaleY);

      const pixel = this.ctx.getImageData(x, y, 1, 1).data;
      this.selectedColor = [pixel[0], pixel[1], pixel[2]];

      const swatch = Utils.$('#bgr-color-swatch');
      swatch.style.background = `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;
      Utils.$('#bgr-selected-color').classList.remove('hidden');
    });
  },

  open(targetItem, imageDataUrl) {
    this.targetItem = targetItem;
    const modal = Utils.$('#modal-bg-remove');
    modal.classList.remove('hidden');
    Utils.$('#bgr-selected-color').classList.add('hidden');
    this.selectedColor = null;

    const img = new Image();
    img.onload = () => {
      // Resize canvas to image dimensions (max 600px width)
      const maxW = 560;
      const maxH = 380;
      let w = img.width;
      let h = img.height;
      if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
      if (h > maxH) { w = Math.round(w * maxH / h); h = maxH; }

      this.canvas.width = w;
      this.canvas.height = h;
      this.canvas.style.width = w + 'px';
      this.canvas.style.height = h + 'px';

      this.ctx.clearRect(0, 0, w, h);
      this.ctx.drawImage(img, 0, 0, w, h);
      this.originalImageData = this.ctx.getImageData(0, 0, w, h);
      this.currentImageData = this.ctx.getImageData(0, 0, w, h);
    };
    img.src = imageDataUrl;
  },

  reset() {
    if (!this.originalImageData) return;
    const copy = new ImageData(
      new Uint8ClampedArray(this.originalImageData.data),
      this.originalImageData.width,
      this.originalImageData.height
    );
    this.currentImageData = copy;
    this.ctx.putImageData(copy, 0, 0);
    this.selectedColor = null;
    Utils.$('#bgr-selected-color').classList.add('hidden');
  },

  // Auto-detect background color from corners and edges, then remove
  autoRemove() {
    if (!this.currentImageData) return;
    const data = this.currentImageData.data;
    const w = this.currentImageData.width;
    const h = this.currentImageData.height;

    // Sample corners and edges to find most likely background color
    const samples = [
      [0, 0], [w-1, 0], [0, h-1], [w-1, h-1],
      [Math.floor(w/2), 0], [0, Math.floor(h/2)],
      [w-1, Math.floor(h/2)], [Math.floor(w/2), h-1]
    ];

    // Use the top-left corner as primary background color
    const idx = 0;
    const bgR = data[idx], bgG = data[idx+1], bgB = data[idx+2];

    this.removeColorByFloodFill(bgR, bgG, bgB);
  },

  removeColorByFloodFill(bgR, bgG, bgB) {
    if (!this.currentImageData) return;

    // Work on a copy
    const src = this.currentImageData;
    const newData = new Uint8ClampedArray(src.data);
    const w = src.width;
    const h = src.height;
    const tol = this.tolerance;
    const visited = new Uint8Array(w * h);

    // BFS from all four corners
    const queue = [];
    [[0,0],[w-1,0],[0,h-1],[w-1,h-1]].forEach(([cx, cy]) => {
      queue.push(cy * w + cx);
    });

    const colorMatch = (di) => {
      const dr = newData[di] - bgR;
      const dg = newData[di+1] - bgG;
      const db = newData[di+2] - bgB;
      return Math.sqrt(dr*dr + dg*dg + db*db) <= tol;
    };

    let head = 0;
    while (head < queue.length) {
      const pixIdx = queue[head++];
      if (visited[pixIdx]) continue;
      visited[pixIdx] = 1;

      const di = pixIdx * 4;
      if (!colorMatch(di)) continue;

      // Make transparent
      newData[di + 3] = 0;

      const x = pixIdx % w;
      const y = Math.floor(pixIdx / w);
      if (x > 0) queue.push(pixIdx - 1);
      if (x < w-1) queue.push(pixIdx + 1);
      if (y > 0) queue.push(pixIdx - w);
      if (y < h-1) queue.push(pixIdx + w);
    }

    const imageData = new ImageData(newData, w, h);
    this.currentImageData = imageData;
    this.ctx.clearRect(0, 0, w, h);
    this.ctx.putImageData(imageData, 0, 0);
  },

  applyToTarget() {
    if (!this.targetItem || !this.canvas) return;
    const resultDataUrl = this.canvas.toDataURL('image/png');

    // Update the expression preview
    const preview = this.targetItem.querySelector('.expression-preview');
    if (preview) {
      preview.innerHTML = `<img src="${resultDataUrl}" alt="expression">`;
    }
    this.targetItem._imageData = resultDataUrl;

    Utils.$('#modal-bg-remove').classList.add('hidden');
  }
};
