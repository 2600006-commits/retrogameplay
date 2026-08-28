// ─────────────────────────────────────────────
// EmulatorJS 공식 CDN (jsdelivr의 npm 패키지는 4.0.9+ 부터
// 코어/바이너리 파일을 포함하지 않으므로 절대 사용하지 말 것)
// ─────────────────────────────────────────────
const EJS_CDN_BASE = 'https://cdn.emulatorjs.org/stable/data/';

// 중복 등록 방지 및 blob URL 정리를 위한 상태값
let keydownHandlerAttached = false;
let currentObjectUrl = null;

// ─────────────────────────────────────────────
// 모바일 가상 조이스틱 레이아웃
//
// 동작 원리: #game-container를 실제 게임 화면비(4:3)보다
// 훨씬 넓게(가로 모드) 또는 길게(세로 모드) 만들어두면
// (play.css의 #game-container.is-mobile.is-landscape / is-portrait 참고)
// EmulatorJS가 게임 화면을 가운데 정렬(letterbox)하면서
// 좌우 또는 상하에 빈 여백이 생깁니다. 아래 좌표들은 그 여백,
// 즉 "실제 게임 화면 밖" 영역에 버튼이 위치하도록 지정한 값입니다.
//
// ※ 좌표(left/top, %)는 기기마다 살짝 다르게 보일 수 있어
//   실제 배포 후 기기에서 확인하며 미세 조정하는 것을 권장합니다.
// ─────────────────────────────────────────────

// 가로 모드: 왼쪽 여백에 D패드, 오른쪽 여백에 액션 버튼
const EJS_GAMEPAD_LANDSCAPE = [
  { type: "dpad", location: "left", left: "9%", top: "50%", inputValues: [4, 5, 6, 7] },

  { type: "button", text: "Y", id: "y", location: "right", left: "4%",  top: "38%", bold: true, input_value: 9 },
  { type: "button", text: "X", id: "x", location: "right", left: "22%", top: "18%", bold: true, input_value: 1 },
  { type: "button", text: "B", id: "b", location: "right", left: "22%", top: "58%", bold: true, input_value: 8 },
  { type: "button", text: "A", id: "a", location: "right", left: "40%", top: "38%", bold: true, input_value: 0 },

  { type: "button", text: "Select", id: "select", location: "center", left: "38%", top: "3%", fontSize: 13, input_value: 2 },
  { type: "button", text: "Start",  id: "start",  location: "center", left: "56%", top: "3%", fontSize: 13, input_value: 3 }
];

// 세로 모드: 화면 하단 여백에 왼손(D패드) / 오른손(버튼) 배치, 위쪽 여백에 Start/Select
const EJS_GAMEPAD_PORTRAIT = [
  { type: "dpad", location: "left", left: "20%", top: "84%", inputValues: [4, 5, 6, 7] },

  { type: "button", text: "Y", id: "y", location: "right", left: "62%", top: "78%", bold: true, input_value: 9 },
  { type: "button", text: "X", id: "x", location: "right", left: "80%", top: "78%", bold: true, input_value: 1 },
  { type: "button", text: "B", id: "b", location: "right", left: "80%", top: "90%", bold: true, input_value: 8 },
  { type: "button", text: "A", id: "a", location: "right", left: "62%", top: "90%", bold: true, input_value: 0 },

  { type: "button", text: "Select", id: "select", location: "center", left: "38%", top: "8%", fontSize: 13, input_value: 2 },
  { type: "button", text: "Start",  id: "start",  location: "center", left: "56%", top: "8%", fontSize: 13, input_value: 3 }
];

// 현재 재생 세션 정보 (방향 전환 시 재사용)
let activeSession = null;

function applyMobileLayoutClasses(orientation) {
  const bezel = document.getElementById('crtBezel');
  const container = document.getElementById('game-container');
  [bezel, container].forEach(el => {
    if (!el) return;
    el.classList.add('is-mobile');
    el.classList.toggle('is-landscape', orientation === 'landscape');
    el.classList.toggle('is-portrait', orientation === 'portrait');
  });
}

function loadEmulator(file, core, deviceType) {
  // 0. 선택한 코어와 롬 파일 확장자가 맞는지 사전 검증
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

  // 이전에 생성한 blob URL이 남아있다면 메모리 누수 방지를 위해 해제
  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl);
  }
  currentObjectUrl = URL.createObjectURL(file);
  window.EJS_gameUrl = currentObjectUrl;
  window.EJS_gameName = file.name; // ★ 브라우저가 숨긴 원본 파일명을 엔진에 강제로 알려줌
  window.EJS_pathtodata = EJS_CDN_BASE;

  // CSS 변수(var(--accent-color))는 EmulatorJS가 만드는 별도 렌더링 컨텍스트에서
  // 부모 문서의 :root 변수를 상속받지 못해 깨질 수 있으므로 실제 색상값을 계산해 사용
  window.EJS_color = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim() || '#0a84ff';

  // 3. 디바이스 환경에 따른 UI 및 컨트롤러 세팅
  const orientation = (typeof detectOrientation === 'function') ? detectOrientation() : 'landscape';

  if (deviceType === 'mobile') {
    applyMobileLayoutClasses(orientation);
    window.EJS_VirtualGamepadSettings = orientation === 'portrait' ? EJS_GAMEPAD_PORTRAIT : EJS_GAMEPAD_LANDSCAPE;
    document.getElementById('pc-key-guide').style.display = 'none';
  } else {
    // 데스크톱은 EmulatorJS가 터치 미지원 기기에서 자동으로 가상 패드를 숨깁니다.
    window.EJS_VirtualGamepadSettings = undefined;
    document.getElementById('pc-key-guide').style.display = 'block';
  }

  // 방향 전환 시 재사용할 수 있도록 현재 세션 정보 저장
  activeSession = { core, deviceType };

  // 4. 키보드 씹힘(스크롤) 방지 및 포커스 유지 로직 (중복 등록 방지)
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
    // 새로고침 후 처음부터 다시 초기화합니다. (선택한 코어는 sessionStorage에 남아있음)
    location.reload();
  }
}

// 재생 중 화면을 회전했을 때: 게임 화면 비율(letterbox 여백) 클래스는 즉시 갱신합니다.
// (참고: EmulatorJS 자체의 가상 버튼 좌표는 실행 중 안전하게 재구성하는 공식 API가
//  없어 최초 로드 시점의 배치를 유지합니다 — 다만 좌표를 %로 지정했기 때문에
//  베젤이 새 비율로 바뀌어도 버튼이 화면 안쪽으로 넘어오지는 않습니다.)
document.addEventListener('app:orientationchange', (e) => {
  if (!activeSession || activeSession.deviceType !== 'mobile') return;
  applyMobileLayoutClasses(e.detail.orientation);
});

// CRT 효과 토글 이벤트
document.getElementById('crtToggle').addEventListener('change', (e) => {
  const overlay = document.getElementById('crt-overlay');
  if (e.target.checked) overlay.classList.remove('hidden');
  else overlay.classList.add('hidden');
});
