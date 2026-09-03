// ─────────────────────────────────────────────
// EmulatorJS 공식 CDN (jsdelivr의 npm 패키지는 4.0.9+ 부터
// 코어/바이너리 파일을 포함하지 않으므로 절대 사용하지 말 것)
// ─────────────────────────────────────────────
const EJS_CDN_BASE = 'https://cdn.emulatorjs.org/stable/data/';

// 중복 등록 방지 및 blob URL 정리를 위한 상태값
let keydownHandlerAttached = false;
let currentObjectUrl = null;

// 로딩 인디케이터 / CDN 에러 안내 타이머
let engineLoadTimeoutId = null;
// 이 타이머는 "엔진 UI 자체"(loader.js + emulator.min.js/css)가 뜨는지만 감시합니다.
// 실제 코어(wasm)·롬 다운로드는 사용자가 EmulatorJS의 Play 버튼을 누른 뒤 시작되며,
// 그 이후 진행 상황은 EmulatorJS 자체 로딩 화면이 보여주므로 별도로 타임아웃을 걸지 않습니다.
const ENGINE_LOAD_TIMEOUT_MS = 30000; // 30초 내 엔진 UI가 뜨지 않으면 실패로 간주

// ─────────────────────────────────────────────
// 모바일 가상 조이스틱 레이아웃
//
// 동작 원리: #game-container를 실제 게임 화면비(4:3)보다
// 훨씬 넓게(가로 모드) 또는 길게(세로 모드) 만들어두면
// (play.css의 #game-container.is-mobile.is-landscape / is-portrait 참고)
// EmulatorJS가 게임 화면을 가운데 정렬(letterbox)하면서
// 좌우 또는 상하에 빈 여백이 생깁니다. 아래 좌표들은 그 여백,
// 즉 "실제 게임 화면 밖" 영역에 버튼이 위치하도록 지정한 값입니다.
// 이 원리 덕분에 폰이든 아이패드 같은 태블릿이든, 화면 크기와 무관하게
// 가상 버튼이 실제 플레이 화면을 절대 가리지 않습니다.
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

// EmulatorJS 상단 컨트롤 바 버튼 노출 설정
// (요구사항: 세이브 스테이트 빠른 저장/불러오기 버튼 노출)
const EJS_BUTTON_CONFIG = {
  playPause: true,
  restart: true,
  mute: true,
  settings: true,
  fullscreen: true,
  saveState: true,
  loadState: true,
  screenshot: false,
  gamepad: true,
  cheat: false,
  volume: true,
  saveSavFiles: true,
  loadSavFiles: true,
  quickSave: true,
  quickLoad: true,
  screenRecord: false,
  cacheManager: false
};

// 현재 재생 세션 정보 (방향 전환 시 재사용)
let activeSession = null;

function applyMobileLayoutClasses(orientation, formFactor) {
  const bezel = document.getElementById('crtBezel');
  const container = document.getElementById('game-container');
  [bezel, container].forEach(el => {
    if (!el) return;
    el.classList.add('is-mobile');
    el.classList.toggle('is-landscape', orientation === 'landscape');
    el.classList.toggle('is-portrait', orientation === 'portrait');
    el.classList.toggle('is-tablet', formFactor === 'tablet');
  });
}

// ─────────────────────────────────────────────
// 로딩 인디케이터 / 에러 오버레이
// ─────────────────────────────────────────────
function showLoadingOverlay(message) {
  const overlay = document.getElementById('emulator-loading');
  const errorOverlay = document.getElementById('emulator-error');
  if (errorOverlay) errorOverlay.classList.add('hidden');
  if (!overlay) return;
  const text = document.getElementById('emulator-loading-text');
  if (text && message) text.textContent = message;
  overlay.classList.remove('hidden');
}

// 로딩/에러 오버레이를 모두 닫고 타임아웃을 정리합니다.
// (버그 수정: 이전엔 로딩 오버레이만 닫아서, 타임아웃으로 에러가 먼저 뜬 뒤
//  뒤늦게 엔진이 실제로 준비돼도 에러 문구가 화면에 계속 남아있었습니다.)
function hideAllOverlays() {
  const loading = document.getElementById('emulator-loading');
  const error = document.getElementById('emulator-error');
  if (loading) loading.classList.add('hidden');
  if (error) error.classList.add('hidden');
  if (engineLoadTimeoutId) {
    clearTimeout(engineLoadTimeoutId);
    engineLoadTimeoutId = null;
  }
}

function showEmulatorError(message) {
  hideAllOverlays();
  const overlay = document.getElementById('emulator-error');
  const text = document.getElementById('emulator-error-text');
  if (text) text.textContent = message;
  if (overlay) overlay.classList.remove('hidden');
}

function retryEmulatorLoad() {
  // 코어/롬 상태가 남아있는 새로고침이 가장 안전 (EmulatorJS는 재초기화를 공식 지원하지 않음)
  location.reload();
}

// ─────────────────────────────────────────────
// 전체화면 + 가로모드 고정 (모바일 전용)
// 반드시 사용자 클릭(제스처) 콜스택 안에서 동기적으로 호출되어야
// 브라우저가 전체화면 요청을 허용합니다.
// (버그 수정: 이전엔 #crtBezel을 대상으로 했는데, 이 함수가 호출되는 시점엔
//  #emulator-ui가 아직 display:none 상태라 크롬/사파리가 전체화면 요청을
//  조용히 거부했습니다. 항상 렌더링되어 있는 document.documentElement를 대상으로
//  바꿔서 이 경쟁 조건을 근본적으로 없앴습니다.)
// ─────────────────────────────────────────────
function requestFullscreenAndLockLandscape() {
  const el = document.documentElement;
  const requestFS = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;

  const tryLockOrientation = () => {
    if (screen.orientation && typeof screen.orientation.lock === 'function') {
      screen.orientation.lock('landscape').catch(() => {
        // 일부 브라우저(예: iOS Safari)는 orientation lock을 지원하지 않음 - 무시하고 진행
      });
    }
  };

  if (requestFS) {
    try {
      const result = requestFS.call(el);
      if (result && typeof result.then === 'function') {
        result.then(tryLockOrientation).catch(() => { /* 전체화면 거부/미지원 - 무시 */ });
      } else {
        tryLockOrientation();
      }
    } catch (e) {
      // 전체화면 API 미지원 기기 - 무시하고 일반 모드로 진행
    }
  }
}

function exitFullscreenIfNeeded() {
  if (document.fullscreenElement || document.webkitFullscreenElement) {
    const exit = document.exitFullscreen || document.webkitExitFullscreen;
    if (exit) {
      try {
        // 구형 WebKit의 webkitExitFullscreen()은 Promise를 반환하지 않으므로
        // 반환값이 thenable인지 확인 후에만 .catch()를 붙임
        const result = exit.call(document);
        if (result && typeof result.then === 'function') result.catch(() => {});
      } catch (e) { /* 무시 */ }
    }
  }
  if (screen.orientation && typeof screen.orientation.unlock === 'function') {
    try { screen.orientation.unlock(); } catch (e) { /* 무시 */ }
  }
}

// 페이지를 떠나거나 새로고침할 때 전체화면/가로고정 해제 (다음 방문 시 깨끗한 상태로 시작)
window.addEventListener('beforeunload', exitFullscreenIfNeeded);

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
  showLoadingOverlay('에뮬레이터 엔진을 불러오는 중...');

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
  window.EJS_Buttons = EJS_BUTTON_CONFIG;

  // CSS 변수(var(--accent-color))는 EmulatorJS가 만드는 별도 렌더링 컨텍스트에서
  // 부모 문서의 :root 변수를 상속받지 못해 깨질 수 있으므로 실제 색상값을 계산해 사용
  window.EJS_color = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim() || '#0a84ff';

  // (버그 수정) 이전에는 "게임이 실제로 시작된 시점"(EJS_onGameStart)에만 오버레이를 닫았는데,
  // EmulatorJS는 브라우저의 오디오 자동재생 정책 때문에 기본적으로 로딩이 끝나도
  // 자동으로 게임을 시작하지 않고 자체 "▶ Play" 화면을 띄운 뒤 사용자의 클릭을 기다립니다.
  // 그런데 우리 오버레이가 그 Play 화면을 완전히 가리고 있었기 때문에 사용자가 버튼을
  // 누를 수 없었고, 결국 로딩 타임아웃이 "엔진 로드 실패"로 잘못 표시했습니다.
  // → 엔진 UI가 준비되는 시점인 EJS_ready에서 오버레이를 닫아 Play 화면이 보이고
  //   클릭 가능하도록 수정했습니다. (onGameStart는 만약을 위한 이중 안전장치로 유지)
  window.EJS_ready = function () {
    hideAllOverlays();
  };
  window.EJS_onGameStart = function () {
    hideAllOverlays();
  };

  // 3. 디바이스 환경에 따른 UI 및 컨트롤러 세팅
  const orientation = (typeof detectOrientation === 'function') ? detectOrientation() : 'landscape';
  const formFactor = (typeof detectFormFactor === 'function') ? detectFormFactor() : 'phone';

  if (deviceType === 'mobile') {
    applyMobileLayoutClasses(orientation, formFactor);
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

  // 엔진 UI 자체가 너무 오래 걸리면(예: CDN 차단/장애) 사용자에게 안내
  // (EJS_ready에서 clearTimeout되므로, UI가 정상적으로 뜨면 아래 콜백은 실행되지 않음)
  if (engineLoadTimeoutId) clearTimeout(engineLoadTimeoutId);
  engineLoadTimeoutId = setTimeout(() => {
    const overlay = document.getElementById('emulator-loading');
    if (overlay && !overlay.classList.contains('hidden')) {
      showEmulatorError('에뮬레이터 엔진을 불러오지 못했습니다. 광고 차단 확장 프로그램을 꺼보거나 네트워크 연결(방화벽/CDN 차단 여부)을 확인한 뒤 다시 시도해주세요. (강력 새로고침: Ctrl/Cmd+Shift+R, 계속되면 브라우저 개발자도구(F12) Console 탭의 에러 메시지를 확인해주세요)');
    }
  }, ENGINE_LOAD_TIMEOUT_MS);

  // 5. 엔진 스크립트 로드
  if (!document.getElementById('ejs-script')) {
    const script = document.createElement('script');
    script.id = 'ejs-script';
    script.src = EJS_CDN_BASE + 'loader.js';
    script.onerror = function () {
      showEmulatorError('에뮬레이터 엔진 스크립트를 불러오지 못했습니다. 광고 차단 확장 프로그램을 꺼보거나 네트워크 연결을 확인한 뒤 다시 시도해주세요.');
    };
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
  applyMobileLayoutClasses(e.detail.orientation, e.detail.formFactor);
});

// CRT 효과 토글 이벤트
document.getElementById('crtToggle').addEventListener('change', (e) => {
  const overlay = document.getElementById('crt-overlay');
  if (e.target.checked) overlay.classList.remove('hidden');
  else overlay.classList.add('hidden');
});

// 에러 오버레이의 "다시 시도" 버튼
document.addEventListener('DOMContentLoaded', () => {
  const retryBtn = document.getElementById('emulator-retry-btn');
  if (retryBtn) retryBtn.addEventListener('click', retryEmulatorLoad);
});
