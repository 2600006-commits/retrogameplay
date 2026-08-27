// 전역 상태 (빌드 도구 없이 공유하기 위함)
window.appState = {
  selectedCore: null
};

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
    const coreName = window.appState.selectedCore === 'fbneo' ? 'NEOGEO/CPS' : 'MAME';
    document.getElementById('play-title').innerText = `${coreName} 준비됨`;
    document.getElementById('upload-ui').style.display = 'flex';
    document.getElementById('emulator-ui').style.display = 'none';
  }
}

window.addEventListener('hashchange', handleRouting);
document.addEventListener('DOMContentLoaded', handleRouting);
handleRouting(); // 이벤트 기다리지 않고 스크립트 로드 즉시 화면 렌더링 강제 실행

// 2. 화면 1 (에뮬레이터 선택) 로직
function selectCore(core) {
  window.appState.selectedCore = core;
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

// 4. 화면 3 (파일 업로드 이벤트 처리)
document.getElementById('romFile').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  if (!file.name.toLowerCase().endsWith('.zip')) {
    alert("ZIP 형식의 파일만 지원합니다.");
    return;
  }
  
  // 에뮬레이터 실행 (emulator.js로 전달)
  loadEmulator(file, window.appState.selectedCore);
});

// 드래그 앤 드롭 업로드 처리
const uploadBox = document.getElementById('upload-ui');
uploadBox.addEventListener('dragover', (e) => { e.preventDefault(); uploadBox.style.borderColor = 'var(--accent-color)'; });
uploadBox.addEventListener('dragleave', () => { uploadBox.style.borderColor = 'var(--glass-border)'; });
uploadBox.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadBox.style.borderColor = 'var(--glass-border)';
  if (e.dataTransfer.files.length) {
    document.getElementById('romFile').files = e.dataTransfer.files;
    document.getElementById('romFile').dispatchEvent(new Event('change'));
  }
});