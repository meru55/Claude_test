/* ========================================
   Visual Novel Creator - Application Core
   ======================================== */

// ---- Data Model ----
class VNProject {
  constructor() {
    this.title = 'My Visual Novel';
    this.author = '';
    this.version = '1.0';
    this.characters = [];
    this.scenes = [];
    this.settings = {
      textSpeed: 40,
      autoSpeed: 2000,
      fontSize: 18
    };
  }

  static createCharacter(name = 'New Character') {
    return {
      id: VNProject.uid(),
      name,
      color: VNProject.randomColor(),
      images: {}
    };
  }

  static createScene(name = 'New Scene') {
    return {
      id: VNProject.uid(),
      name,
      background: null,
      commands: []
    };
  }

  static createCommand(type) {
    const base = { id: VNProject.uid(), type };
    switch (type) {
      case 'dialogue':
        return { ...base, characterId: '', expression: 'default', text: '', position: 'center' };
      case 'narration':
        return { ...base, text: '' };
      case 'show':
        return { ...base, characterId: '', expression: 'default', position: 'center' };
      case 'hide':
        return { ...base, characterId: '' };
      case 'bg':
        return { ...base, background: null };
      case 'choice':
        return { ...base, choices: [{ text: 'Choice 1', targetSceneId: '' }, { text: 'Choice 2', targetSceneId: '' }] };
      case 'jump':
        return { ...base, targetSceneId: '' };
      case 'effect':
        return { ...base, effectType: 'fade-black' };
      default:
        return base;
    }
  }

  static uid() {
    return '_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
  }

  static randomColor() {
    const colors = ['#ff6b9d', '#74b9ff', '#55efc4', '#ffeaa7', '#a29bfe', '#fd79a8', '#fab1a0', '#81ecec', '#e17bff', '#ff9f43'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  toJSON() {
    return {
      title: this.title,
      author: this.author,
      version: this.version,
      characters: this.characters,
      scenes: this.scenes,
      settings: this.settings
    };
  }

  static fromJSON(json) {
    const project = new VNProject();
    project.title = json.title || 'Untitled';
    project.author = json.author || '';
    project.version = json.version || '1.0';
    project.characters = json.characters || [];
    project.scenes = json.scenes || [];
    project.settings = { ...project.settings, ...(json.settings || {}) };
    return project;
  }
}

// ---- Application State ----
const AppState = {
  project: new VNProject(),
  selectedSceneId: null,
  selectedCommandId: null,
  editingCharacterId: null,
  isPlayerMode: false,

  get selectedScene() {
    return this.project.scenes.find(s => s.id === this.selectedSceneId) || null;
  },

  get selectedCommand() {
    const scene = this.selectedScene;
    if (!scene) return null;
    return scene.commands.find(c => c.id === this.selectedCommandId) || null;
  },

  getCharacter(id) {
    return this.project.characters.find(c => c.id === id) || null;
  },

  getScene(id) {
    return this.project.scenes.find(s => s.id === id) || null;
  }
};

// ---- Utility Functions ----
const Utils = {
  $(selector) {
    return document.querySelector(selector);
  },

  $$(selector) {
    return document.querySelectorAll(selector);
  },

  createElement(tag, className, innerHTML) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (innerHTML) el.innerHTML = innerHTML;
    return el;
  },

  readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  downloadFile(content, filename, mimeType = 'application/json') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  truncate(text, maxLen = 50) {
    if (!text) return '';
    return text.length > maxLen ? text.substring(0, maxLen) + '...' : text;
  }
};

// ---- Event Bus ----
const EventBus = {
  _listeners: {},

  on(event, callback) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(callback);
  },

  off(event, callback) {
    if (!this._listeners[event]) return;
    this._listeners[event] = this._listeners[event].filter(cb => cb !== callback);
  },

  emit(event, data) {
    if (!this._listeners[event]) return;
    this._listeners[event].forEach(cb => cb(data));
  }
};

// ---- Initialize Application ----
document.addEventListener('DOMContentLoaded', () => {
  // Initialize editor
  Editor.init();

  // Header button bindings
  Utils.$('#btn-save-project').addEventListener('click', () => {
    const json = JSON.stringify(AppState.project.toJSON(), null, 2);
    const filename = (AppState.project.title || 'project').replace(/[^a-zA-Z0-9_\-\u3000-\u9fff\uf900-\ufaff]/g, '_') + '.vnproject';
    Utils.downloadFile(json, filename);
  });

  Utils.$('#btn-load-project').addEventListener('click', () => {
    Utils.$('#load-project-input').click();
  });

  Utils.$('#load-project-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      AppState.project = VNProject.fromJSON(json);
      AppState.selectedSceneId = null;
      AppState.selectedCommandId = null;
      Utils.$('#project-title').value = AppState.project.title;
      Editor.renderAll();
    } catch (err) {
      alert('Failed to load project: ' + err.message);
    }
    e.target.value = '';
  });

  Utils.$('#btn-export').addEventListener('click', () => {
    Utils.$('#export-title').value = AppState.project.title;
    Utils.$('#export-author').value = AppState.project.author;
    Utils.$('#modal-export').classList.remove('hidden');
  });

  Utils.$('#btn-preview').addEventListener('click', () => {
    if (AppState.project.scenes.length === 0) {
      alert('Please create at least one scene first.');
      return;
    }
    Player.start(AppState.project);
  });

  Utils.$('#project-title').addEventListener('change', (e) => {
    AppState.project.title = e.target.value;
  });

  // Settings bindings
  Utils.$('#setting-text-speed').addEventListener('input', (e) => {
    AppState.project.settings.textSpeed = parseInt(e.target.value);
  });

  Utils.$('#setting-auto-speed').addEventListener('input', (e) => {
    AppState.project.settings.autoSpeed = parseInt(e.target.value);
  });

  Utils.$('#setting-font-size').addEventListener('input', (e) => {
    AppState.project.settings.fontSize = parseInt(e.target.value);
  });

  // Export modal
  Utils.$('#btn-export-cancel').addEventListener('click', () => {
    Utils.$('#modal-export').classList.add('hidden');
  });

  Utils.$('#btn-export-confirm').addEventListener('click', () => {
    AppState.project.title = Utils.$('#export-title').value;
    AppState.project.author = Utils.$('#export-author').value;
    Exporter.exportAsHTML(AppState.project);
    Utils.$('#modal-export').classList.add('hidden');
  });

  // Close modals on backdrop click
  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', () => {
      backdrop.closest('.modal').classList.add('hidden');
    });
  });

  document.querySelectorAll('.btn-modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.closest('.modal').classList.add('hidden');
    });
  });

  // Load demo project
  loadDemoProject();
});

function loadDemoProject() {
  const project = AppState.project;

  // Create sample characters
  const char1 = VNProject.createCharacter('Alice');
  char1.color = '#ff6b9d';

  const char2 = VNProject.createCharacter('Bob');
  char2.color = '#74b9ff';

  project.characters.push(char1, char2);

  // Create sample scenes
  const scene1 = VNProject.createScene('Chapter 1 - Beginning');
  scene1.commands = [
    { ...VNProject.createCommand('narration'), text: 'It was a quiet morning in the small town...' },
    { ...VNProject.createCommand('show'), characterId: char1.id, expression: 'default', position: 'center' },
    { ...VNProject.createCommand('dialogue'), characterId: char1.id, expression: 'default', text: 'Good morning! What a beautiful day.', position: 'center' },
    { ...VNProject.createCommand('show'), characterId: char2.id, expression: 'default', position: 'right' },
    { ...VNProject.createCommand('dialogue'), characterId: char2.id, expression: 'default', text: 'Hey Alice! Do you want to go to the park today?', position: 'right' },
    { ...VNProject.createCommand('choice'), choices: [
      { text: 'Go to the park', targetSceneId: '' },
      { text: 'Stay home', targetSceneId: '' }
    ]}
  ];

  const scene2 = VNProject.createScene('Chapter 2 - The Park');
  scene2.commands = [
    { ...VNProject.createCommand('narration'), text: 'They walked together to the park under the clear blue sky.' },
    { ...VNProject.createCommand('show'), characterId: char1.id, expression: 'default', position: 'left' },
    { ...VNProject.createCommand('show'), characterId: char2.id, expression: 'default', position: 'right' },
    { ...VNProject.createCommand('dialogue'), characterId: char1.id, expression: 'default', text: 'The flowers are so beautiful this time of year!', position: 'left' },
    { ...VNProject.createCommand('dialogue'), characterId: char2.id, expression: 'default', text: 'Yeah, I\'m glad we came here.', position: 'right' },
  ];

  // Link choice to scene2
  scene1.commands[5].choices[0].targetSceneId = scene2.id;

  project.scenes.push(scene1, scene2);

  Utils.$('#project-title').value = project.title;
  Editor.renderAll();
}
