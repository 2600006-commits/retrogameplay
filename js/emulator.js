// ─────────────────────────────────────────────
// ★ 버그 수정 (핵심): EmulatorJS 데이터 CDN 경로
//
// 기존 코드는 jsdelivr의 npm 패키지 경로
// (cdn.jsdelivr.net/npm/emulatorjs@latest/data/)를 사용했지만,
// EmulatorJS는 v4.0.9부터 코어/에뮬레이터 바이너리 파일을
// 저장소·npm 패키지에서 아예 제거했습니다.
// 즉 loader.js는 받아와도 실제 게임을 구동할 코어 데이터가
// 없어서 "롬을 넣어도 실행이 안 되는" 문제가 발생했습니다.
//
// 반드시 EmulatorJS 공식 CDN(cdn.emulatorjs.org)을 사용해야 합니다.
// ─────────────────────────────────────────────
const EJS_CDN_BASE = 'https://cdn.emulatorjs.org/stable/data/';

// 중복 등록 방지 및 blob URL 정리를 위한 상태값
let keydownHandlerAttached = false;
let currentObjectUrl = null;

function loadEmulator(file, core, deviceType) {
  // 0. (버그 수정) 선택한 코어와 롬 파일 확장자가 맞는지 사전 검증
  //    맞지 않으면 EmulatorJS가 아무 에러 메시지도 없이 조용히 실패합니다.
  const fileName = file.name.toLowerCase();
  const allowedExts = (typeof CORE_EXTENSIONS !== 'undefined') ? CORE_EXTENSIONS[core] : null;
  if (allowedExts && !allowedExts.some(ext => fileName.endsWith(ext))) {
    const coreLabel = (typeof CORE_LABELS !== 'undefined' && CORE_LABELS[core]) || core;
    alert(`선택한 시스템(${coreLabel})은 ${allowedExts.join(', ')} 파일만 지원합니다.\n파일을 다시 선택해 주세요.`);
    document.getElementById('device-modal').style.display = 'none';
    document.getElementById('upload-ui').style.display = 'flex';
    return;
  }

  // 1. UI 전환
  document.getElementById('emulator-ui').style.display = 'block';

  // 2. EmulatorJS 설정
  window.EJS_player = '#game-container';
  window.EJS_core = core;

  // (버그 수정) 이전에 생성한 blob URL이 남아있다면 메모리 누수 방지를 위해 해제
  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl);
  }
  currentObjectUrl = URL.createObjectURL(file);
  window.EJS_gameUrl = currentObjectUrl;
  window.EJS_gameName = file.name; // ★ 브라우저가 숨긴 원본 파일명을 엔진에 강제로 알려줌
  window.EJS_pathtodata = EJS_CDN_BASE;

  // (버그 수정) CSS 변수(var(--accent-color))는 EmulatorJS가 만드는
  // iframe/별도 렌더링 컨텍스트에서 부모 문서의 :root 변수를 상속받지 못해
  // 색상이 깨질 수 있으므로 실제 색상값을 직접 지정합니다. (style.css의 --accent-color와 동일)
  window.EJS_color = '#00d2ff';

  // 3. 디바이스 환경에 따른 UI 및 컨트롤러 세팅
  if (deviceType === 'mobile') {
    window.EJS_VirtualGamepadSettings = { active: true }; // 모바일 가상 조이스틱 켬
    document.getElementById('pc-key-guide').style.display = 'none';
  } else {
    window.EJS_VirtualGamepadSettings = { active: false }; // 데스크톱 조이스틱 끔
    document.getElementById('pc-key-guide').style.display = 'block';
  }

  // 4. 키보드 씹힘(스크롤) 방지 및 포커스 유지 로직 (매우 중요)
  //    (버그 수정) 게임을 여러 번 로드해도 리스너가 중복 등록되지 않도록 가드 추가
  if (!keydownHandlerAttached) {
    window.addEventListener("keydown", function (e) {
      // 방향키, 스페이스바, 엔터 등을 누를 때 브라우저 화면이 움직이는 것을 차단
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "Enter"].indexOf(e.code) > -1) {
        e.preventDefault();
      }
    }, false);
    keydownHandlerAttached = true;
  }

  // 게임 화면 클릭 시 강제로 iframe에 포커스 주기
  const gameContainer = document.getElementById('game-container');
  gameContainer.addEventListener('click', () => {
    const iframe = gameContainer.querySelector('iframe');
    if (iframe) iframe.focus();
  });

  // 5. 엔진 스크립트 로드
  if (!document.getElementById('ejs-script')) {
    const script = document.createElement('script');
    script.id = 'ejs-script';
    script.src = EJS_CDN_BASE + 'loader.js';
    document.body.appendChild(script);
  } else {
    // EmulatorJS는 실행 중 코어/롬 교체를 공식적으로 지원하지 않으므로
    // 새로고침 후 처음부터 다시 초기화합니다. (선택한 코어는 sessionStorage에 남아있어
    // 새로고침 후에도 다시 선택할 필요는 없습니다.)
    location.reload();
  }
}

// CRT 효과 토글 이벤트
document.getElementById('crtToggle').addEventListener('change', (e) => {
  const overlay = document.getElementById('crt-overlay');
  if (e.target.checked) overlay.classList.remove('hidden');
  else overlay.classList.add('hidden');
});
