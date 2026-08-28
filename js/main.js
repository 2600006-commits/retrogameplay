// 전역 상태 (빌드 도구 없이 공유하기 위함)
// 페이지가 새로고침되어도(예: 롬 교체 시) 선택된 코어를 잃지 않도록 sessionStorage에서 복원
window.appState = {
  selectedCore: sessionStorage.getItem('selectedCore') || null
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
    // (버그 수정) 기존엔 fbneo 외에는 전부 'MAME'으로 표시되어
    // 'snes' 코어를 선택해도 타이틀이 잘못 나왔습니다.
    // games-data.js의 CORE_LABELS를 이용해 정확한 이름을 표시합니다.
    const coreName = CORE_LABELS[window.appState.selectedCore] || window.appState.selectedCore;
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

// 4. 화면 3 (파일 업로드 이벤트 처리)
document.getElementById('romFile').addEventListener('change', function (e) {
  const file = e.target.files[0];
  if (!file) return;

  const fileName = file.name.toLowerCase();

  // 기본 확장자 체크
  if (!fileName.endsWith('.zip') && !fileName.endsWith('.smc') && !fileName.endsWith('.sfc')) {
    alert("지원하는 롬 파일 확장자가 아닙니다 (.zip, .smc, .sfc)");
    e.target.value = ''; // (버그 수정) 초기화하지 않으면 같은 파일을 다시 선택해도 change 이벤트가 발생하지 않음
    return;
  }

  // (버그 수정) 선택한 코어와 실제 파일 확장자가 맞는지 추가 검증
  // 예: MAME/FBNeo(.zip 전용) 코어를 선택해놓고 .smc(슈퍼패미컴) 롬을 넣으면
  // 이전에는 그대로 통과되어 에뮬레이터가 조용히 실행 실패했습니다.
  const selectedCore = window.appState.selectedCore;
  const allowedExts = CORE_EXTENSIONS[selectedCore];
  if (allowedExts && !allowedExts.some(ext => fileName.endsWith(ext))) {
    const coreLabel = CORE_LABELS[selectedCore] || selectedCore;
    alert(`현재 선택된 시스템(${coreLabel})은 ${allowedExts.join(', ')} 파일만 지원합니다.`);
    e.target.value = '';
    return;
  }

  // 파일을 임시 저장하고, 업로드 창을 숨긴 뒤 선택 모달 띄우기
  window.pendingFile = file;
  document.getElementById('upload-ui').style.display = 'none';
  document.getElementById('device-modal').style.display = 'block';
});

// 디바이스 선택 완료 시 게임 실행 함수
window.startGameWithDevice = function (deviceType) {
  document.getElementById('device-modal').style.display = 'none';
  // emulator.js의 loadEmulator 함수 호출 (deviceType 전달)
  loadEmulator(window.pendingFile, window.appState.selectedCore, deviceType);
};
