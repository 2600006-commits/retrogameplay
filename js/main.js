// 전역 상태 (빌드 도구 없이 공유하기 위함)
// 페이지가 새로고침되어도(예: 롬 교체 시) 선택된 코어를 잃지 않도록 sessionStorage에서 복원
window.appState = {
  selectedCore: sessionStorage.getItem('selectedCore') || null
};

// ─────────────────────────────────────────────
// 0. 테마 선택 위젯 (빨강/파랑/초록/노랑/보라/검정/흰색)
//    <html data-theme="..."> 속성만 바꾸면 style.css의 CSS 변수가
//    전부 갱신되어 사이트 전체 색상이 즉시 바뀝니다.
//    선택한 테마는 localStorage에 저장되어 재방문 시에도 유지됩니다.
//    (index.html <head>의 인라인 스크립트가 페인트 이전에 먼저 적용해
//     테마가 바뀌는 순간 깜빡이는 현상을 방지합니다. 최초 방문(저장된 값이
//     없을 때)에는 시스템의 prefers-color-scheme을 존중해 라이트/다크를 자동 선택합니다.)
// ─────────────────────────────────────────────
const THEME_STORAGE_KEY = 'rwa-theme';

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  try { localStorage.setItem(THEME_STORAGE_KEY, theme); } catch (e) { /* 저장소 접근 불가 시 무시 */ }

  document.querySelectorAll('.theme-dot').forEach(dot => {
    const isActive = dot.dataset.theme === theme;
    dot.classList.toggle('active', isActive);
    dot.setAttribute('aria-pressed', String(isActive));
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

// 1. 해시(Hash) 기반 라우팅
function handleRouting() {
  const hash = window.location.hash || '#select';

  // 모든 화면 숨김
  document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));

  // 타겟 화면 표시
  const targetScreen = document.querySelector(`#screen-${hash.replace('#', '')}`);
  if (targetScreen) targetScreen.classList.add('active');

  // 네비게이션 활성화 상태 변경
  const activeLink = document.querySelector(`.nav-link[href="${hash}"]`);
  if (activeLink) activeLink.classList.add('active');

  // 플레이 화면 진입 시 초기화
  if (hash === '#play') {
    if (!window.appState.selectedCore) {
      alert("먼저 에뮬레이터 코어를 선택해주세요.");
      window.location.hash = '#select';
      return;
    }
    // (버그 수정) 기존엔 fbneo 외에는 전부 'MAME'으로 표시되어
    // 'snes' 코어를 선택해도 타이틀이 잘못 나왔습니다.
    // games-data.js의 CORE_LABELS를 이용해 정확한 이름을 표시합니다.
    const coreName = CORE_LABELS[window.appState.selectedCore] || window.appState.selectedCore;
    document.getElementById('play-title').innerText = `${coreName} 준비됨`;
    document.getElementById('upload-ui').style.display = 'flex';
    document.getElementById('emulator-ui').style.display = 'none';
    renderRecentRoms();
  }
}

window.addEventListener('hashchange', handleRouting);
document.addEventListener('DOMContentLoaded', handleRouting);
handleRouting(); // 이벤트 기다리지 않고 스크립트 로드 즉시 화면 렌더링 강제 실행

// 2. 화면 1 (에뮬레이터 선택) 로직
function selectCore(core) {
  window.appState.selectedCore = core;
  sessionStorage.setItem('selectedCore', core);
  window.location.hash = '#play';
}

// 3. 화면 2 (라이브러리 렌더링 및 필터링) 로직
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

// 전역 변수로 선택한 파일 임시 저장
window.pendingFile = null;

// ─────────────────────────────────────────────
// 4. 화면 3 (파일 업로드 이벤트 처리)
//    - 파일 선택창(click)과 드래그앤드롭 두 경로 모두
//      아래 stageFileForPlay() 하나로 검증/처리를 공유합니다.
// ─────────────────────────────────────────────
function stageFileForPlay(file, { skipValidation = false } = {}) {
  if (!file) return;
  const fileName = file.name.toLowerCase();

  if (!skipValidation) {
    // 기본 확장자 체크
    if (!fileName.endsWith('.zip') && !fileName.endsWith('.smc') && !fileName.endsWith('.sfc')) {
      alert("지원하는 롬 파일 확장자가 아닙니다 (.zip, .smc, .sfc)");
      return;
    }

    // 선택한 코어와 실제 파일 확장자가 맞는지 추가 검증
    // 예: MAME/FBNeo(.zip 전용) 코어를 선택해놓고 .smc(슈퍼패미컴) 롬을 넣으면
    // 이전에는 그대로 통과되어 에뮬레이터가 조용히 실행 실패했습니다.
    const selectedCore = window.appState.selectedCore;
    const allowedExts = CORE_EXTENSIONS[selectedCore];
    if (allowedExts && !allowedExts.some(ext => fileName.endsWith(ext))) {
      const coreLabel = CORE_LABELS[selectedCore] || selectedCore;
      alert(`현재 선택된 시스템(${coreLabel})은 ${allowedExts.join(', ')} 파일만 지원합니다.`);
      return;
    }
  }

  // 파일을 임시 저장하고, 업로드 창을 숨긴 뒤 선택 모달 띄우기
  window.pendingFile = file;
  document.getElementById('upload-ui').style.display = 'none';
  document.getElementById('device-modal').style.display = 'block';

  // 브라우저 메모리(IndexedDB)에만 저장되는 "최근 플레이" 기록 (서버 전송 없음)
  saveRomToHistory(file, window.appState.selectedCore).catch(() => { /* 저장 실패는 조용히 무시 */ });
}

document.getElementById('romFile').addEventListener('change', function (e) {
  const file = e.target.files[0];
  stageFileForPlay(file);
  e.target.value = ''; // (버그 수정) 초기화하지 않으면 같은 파일을 다시 선택해도 change 이벤트가 발생하지 않음
});

// 드래그 앤 드롭 업로드
(function initDragAndDrop() {
  const dropZone = document.getElementById('upload-ui');
  if (!dropZone) return;

  ['dragenter', 'dragover'].forEach(evt => {
    dropZone.addEventListener(evt, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add('drag-over');
    });
  });

  ['dragleave', 'dragend'].forEach(evt => {
    dropZone.addEventListener(evt, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('drag-over');
    });
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    stageFileForPlay(file);
  });
})();

// 디바이스 선택 완료 시 게임 실행 함수
window.startGameWithDevice = function (deviceType) {
  document.getElementById('device-modal').style.display = 'none';

  // 전체화면+가로고정은 반드시 이 클릭 핸들러 안에서 "동기적으로" 호출해야
  // 브라우저가 사용자 제스처로 인식하고 허용합니다. (모바일에서만 시도)
  if (deviceType === 'mobile' && typeof requestFullscreenAndLockLandscape === 'function') {
    requestFullscreenAndLockLandscape();
  }

  // emulator.js의 loadEmulator 함수 호출 (deviceType 전달)
  loadEmulator(window.pendingFile, window.appState.selectedCore, deviceType);
};

// ─────────────────────────────────────────────
// 5. 최근 플레이한 롬 (IndexedDB)
//    - 롬 파일은 여전히 서버로 전송되지 않으며, 브라우저(IndexedDB)
//      안에만 저장됩니다. 사용자가 명시적으로 지우기 전까지 남아있습니다.
// ─────────────────────────────────────────────
const ROM_DB_NAME = 'rwa-rom-history';
const ROM_DB_VERSION = 1;
const ROM_STORE = 'roms';
const MAX_RECENT_ROMS = 6;

function openRomDB() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) { reject(new Error('IndexedDB unsupported')); return; }
    const req = indexedDB.open(ROM_DB_NAME, ROM_DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(ROM_STORE)) {
        const store = db.createObjectStore(ROM_STORE, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveRomToHistory(file, core) {
  if (!core) return;
  try {
    const db = await openRomDB();
    const id = `${core}::${file.name}`;
    const entry = { id, name: file.name, core, size: file.size, blob: file, timestamp: Date.now() };

    await new Promise((resolve, reject) => {
      const tx = db.transaction(ROM_STORE, 'readwrite');
      tx.objectStore(ROM_STORE).put(entry);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });

    // 오래된 기록 정리 (최대 개수 초과분 삭제)
    const all = await getRecentRoms(999);
    if (all.length > MAX_RECENT_ROMS) {
      const toDelete = all.slice(MAX_RECENT_ROMS);
      const db2 = await openRomDB();
      const tx2 = db2.transaction(ROM_STORE, 'readwrite');
      toDelete.forEach(item => tx2.objectStore(ROM_STORE).delete(item.id));
    }
  } catch (e) {
    console.warn('최근 플레이 기록 저장 실패:', e);
  }
}

async function getRecentRoms(limit = MAX_RECENT_ROMS) {
  try {
    const db = await openRomDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(ROM_STORE, 'readonly');
      const req = tx.objectStore(ROM_STORE).getAll();
      req.onsuccess = () => {
        const items = req.result || [];
        items.sort((a, b) => b.timestamp - a.timestamp);
        resolve(items.slice(0, limit));
      };
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    return [];
  }
}

async function deleteRomFromHistory(id) {
  try {
    const db = await openRomDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(ROM_STORE, 'readwrite');
      tx.objectStore(ROM_STORE).delete(id);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    renderRecentRoms();
  } catch (e) { /* 무시 */ }
}

function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0, val = bytes;
  while (val >= 1024 && i < units.length - 1) { val /= 1024; i++; }
  return `${val.toFixed(val >= 10 || i === 0 ? 0 : 1)}${units[i]}`;
}

async function renderRecentRoms() {
  const section = document.getElementById('recent-roms');
  const list = document.getElementById('recent-roms-list');
  if (!section || !list) return;

  const recent = await getRecentRoms();
  list.innerHTML = '';

  if (recent.length === 0) {
    section.classList.add('hidden');
    return;
  }

  section.classList.remove('hidden');
  recent.forEach(item => {
    const li = document.createElement('li');
    li.className = 'recent-rom-item';
    const coreLabel = (typeof CORE_LABELS !== 'undefined' && CORE_LABELS[item.core]) || item.core;
    li.innerHTML = `
      <div class="recent-rom-info">
        <span class="recent-rom-name">${item.name}</span>
        <span class="badge">${coreLabel}</span>
        <span class="recent-rom-size">${formatFileSize(item.size)}</span>
      </div>
      <div class="recent-rom-actions">
        <button class="btn-metal recent-rom-play" type="button">이어 하기</button>
        <button class="btn-metal recent-rom-delete" type="button" title="기록 삭제" aria-label="기록 삭제">✕</button>
      </div>
    `;
    li.querySelector('.recent-rom-play').addEventListener('click', () => {
      // 저장된 롬의 코어로 선택 코어를 맞춰준 뒤(다른 코어를 보고 있었을 수 있으므로) 그대로 진행
      window.appState.selectedCore = item.core;
      sessionStorage.setItem('selectedCore', item.core);
      const file = new File([item.blob], item.name, { type: item.blob.type });
      stageFileForPlay(file, { skipValidation: true });
    });
    li.querySelector('.recent-rom-delete').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteRomFromHistory(item.id);
    });
    list.appendChild(li);
  });
}

// ─────────────────────────────────────────────
// 6. PWA: 서비스 워커 등록 (홈 화면에 추가 지원용)
// ─────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // 서비스워커 등록 실패는 기능에 필수가 아니므로 조용히 무시
    });
  });
}
