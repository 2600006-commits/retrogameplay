window.appState = {
  selectedCore: sessionStorage.getItem('selectedCore') || null
};

const THEME_STORAGE_KEY = 'rwa-theme';

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  try { localStorage.setItem(THEME_STORAGE_KEY, theme); } catch (e) {}

  document.querySelectorAll('.theme-dot').forEach(dot => {
    dot.classList.toggle('active', dot.dataset.theme === theme);
  });
}

function initThemePicker() {
  const picker = document.getElementById('themePicker');
  if (!picker) return;

  const currentTheme = document.documentElement.getAttribute('data-theme') || 'blue';
  applyTheme(currentTheme);

  picker.addEventListener('click', (e) => {
    const dot = e.target.closest('.theme-dot');
    if (!dot) return;
    applyTheme(dot.dataset.theme);
  });
}

document.addEventListener('DOMContentLoaded', initThemePicker);

function handleRouting() {
  const hash = window.location.hash || '#select';

  document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));

  const targetScreen = document.querySelector(`#screen-${hash.replace('#', '')}`);
  if (targetScreen) targetScreen.classList.add('active');

  const activeLink = document.querySelector(`.nav-link[href="${hash}"]`);
  if (activeLink) activeLink.classList.add('active');

  if (hash === '#play') {
    if (!window.appState.selectedCore) {
      alert("먼저 에뮬레이터 코어를 선택해주세요.");
      window.location.hash = '#select';
      return;
    }
    const coreName = CORE_LABELS[window.appState.selectedCore] || window.appState.selectedCore;
    document.getElementById('play-title').innerText = `${coreName} 준비됨`;
    document.getElementById('upload-ui').style.display = 'flex';
    document.getElementById('emulator-ui').style.display = 'none';
    checkRecentRom();
  }
}

window.addEventListener('hashchange', handleRouting);
document.addEventListener('DOMContentLoaded', handleRouting);
handleRouting();

function selectCore(core) {
  window.appState.selectedCore = core;
  sessionStorage.setItem('selectedCore', core);
  window.location.hash = '#play';
}

function renderLibrary(filter = 'all', search = '') {
  const tbody = document.getElementById('gamesTableBody');
  tbody.innerHTML = '';

  const filteredGames = gamesData.filter(game => {
    const matchCore = filter === 'all' || game.core === filter;
    const matchSearch = game.name.toLowerCase().includes(search.toLowerCase());
    return matchCore && matchSearch;
  });

  filteredGames.forEach(game => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${game.name}</strong></td>
      <td><span class="badge">${game.core}</span></td>
      <td>${game.genre}</td>
      <td>${game.year}</td>
      <td>${game.status}</td>
      <td><button class="btn-metal" onclick="selectCore('${game.core}')" style="padding: 5px 10px; font-size:0.8rem;">이 코어로 시작</button></td>
    `;
    tbody.appendChild(tr);
  });
}

document.getElementById('searchInput').addEventListener('input', (e) => renderLibrary(document.getElementById('coreFilter').value, e.target.value));
document.getElementById('coreFilter').addEventListener('change', (e) => renderLibrary(e.target.value, document.getElementById('searchInput').value));
window.addEventListener('load', () => renderLibrary());

window.pendingFile = null;

// 드래그 앤 드롭 및 파일 업로드 로직
const uploadBox = document.getElementById('upload-ui');

uploadBox.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadBox.style.borderColor = 'var(--accent-color)';
  uploadBox.style.background = 'var(--glass-bg-strong)';
});

uploadBox.addEventListener('dragleave', () => {
  uploadBox.style.borderColor = 'var(--glass-border)';
  uploadBox.style.background = 'var(--glass-bg)';
});

uploadBox.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadBox.style.borderColor = 'var(--glass-border)';
  uploadBox.style.background = 'var(--glass-bg)';
  if (e.dataTransfer.files.length > 0) handleFileSelect(e.dataTransfer.files[0]);
});

document.getElementById('romFile').addEventListener('change', function (e) {
  if (e.target.files.length > 0) handleFileSelect(e.target.files[0]);
});

function handleFileSelect(file) {
  const fileName = file.name.toLowerCase();
  const selectedCore = window.appState.selectedCore;
  const allowedExts = CORE_EXTENSIONS[selectedCore];

  if (allowedExts && !allowedExts.some(ext => fileName.endsWith(ext))) {
    const coreLabel = CORE_LABELS[selectedCore] || selectedCore;
    alert(`현재 선택된 시스템(${coreLabel})은 ${allowedExts.join(', ')} 파일만 지원합니다.`);
    document.getElementById('romFile').value = '';
    return;
  }

  window.pendingFile = file;
  saveRecentRom(file, selectedCore);

  document.getElementById('upload-ui').style.display = 'none';
  document.getElementById('device-modal').style.display = 'block';
}

window.startGameWithDevice = function (deviceType) {
  document.getElementById('device-modal').style.display = 'none';
  loadEmulator(window.pendingFile, window.appState.selectedCore, deviceType);
};

// 최근 플레이 파일 저장 (IndexedDB)
function initIndexedDB() {
  return new Promise((resolve) => {
    const request = indexedDB.open('RetroWebArcade', 1);
    request.onupgradeneeded = (e) => e.target.result.createObjectStore('roms');
    request.onsuccess = (e) => resolve(e.target.result);
  });
}

async function saveRecentRom(file, core) {
  const db = await initIndexedDB();
  const tx = db.transaction('roms', 'readwrite');
  tx.objectStore('roms').put({ file, core, date: new Date() }, 'lastPlayed');
}

async function checkRecentRom() {
  const db = await initIndexedDB();
  const tx = db.transaction('roms', 'readonly');
  const request = tx.objectStore('roms').get('lastPlayed');

  request.onsuccess = () => {
    if (request.result && window.appState.selectedCore === request.result.core) {
      document.getElementById('btn-recent-play').style.display = 'inline-block';
      window.recentRomData = request.result.file;
    } else {
      document.getElementById('btn-recent-play').style.display = 'none';
    }
  };
}

window.loadRecentRom = function() {
  if (window.recentRomData) handleFileSelect(window.recentRomData);
};
