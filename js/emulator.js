const EJS_CDN_BASE = 'https://cdn.emulatorjs.org/stable/data/';
let keydownHandlerAttached = false;
let currentObjectUrl = null;

const EJS_GAMEPAD_LANDSCAPE = [
  { type: "dpad", location: "left", left: "9%", top: "50%", inputValues: [4, 5, 6, 7] },
  { type: "button", text: "Y", id: "y", location: "right", left: "4%",  top: "38%", bold: true, input_value: 9 },
  { type: "button", text: "X", id: "x", location: "right", left: "22%", top: "18%", bold: true, input_value: 1 },
  { type: "button", text: "B", id: "b", location: "right", left: "22%", top: "58%", bold: true, input_value: 8 },
  { type: "button", text: "A", id: "a", location: "right", left: "40%", top: "38%", bold: true, input_value: 0 },
  { type: "button", text: "Select", id: "select", location: "center", left: "38%", top: "3%", fontSize: 13, input_value: 2 },
  { type: "button", text: "Start",  id: "start",  location: "center", left: "56%", top: "3%", fontSize: 13, input_value: 3 }
];

const EJS_GAMEPAD_PORTRAIT = [
  { type: "dpad", location: "left", left: "20%", top: "84%", inputValues: [4, 5, 6, 7] },
  { type: "button", text: "Y", id: "y", location: "right", left: "62%", top: "78%", bold: true, input_value: 9 },
  { type: "button", text: "X", id: "x", location: "right", left: "80%", top: "78%", bold: true, input_value: 1 },
  { type: "button", text: "B", id: "b", location: "right", left: "80%", top: "90%", bold: true, input_value: 8 },
  { type: "button", text: "A", id: "a", location: "right", left: "62%", top: "90%", bold: true, input_value: 0 },
  { type: "button", text: "Select", id: "select", location: "center", left: "38%", top: "8%", fontSize: 13, input_value: 2 },
  { type: "button", text: "Start",  id: "start",  location: "center", left: "56%", top: "8%", fontSize: 13, input_value: 3 }
];

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
  if (deviceType === 'mobile') {
    try {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().then(() => {
          if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock('landscape').catch(e => console.log('가로 고정 미지원:', e));
          }
        });
      }
    } catch (e) {
      console.warn("Fullscreen API 오류", e);
    }
  }

  document.getElementById('emulator-ui').style.display = 'block';
  document.getElementById('loading-spinner').style.display = 'flex';

  window.EJS_player = '#game-container';
  window.EJS_core = core;

  if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
  currentObjectUrl = URL.createObjectURL(file);
  window.EJS_gameUrl = currentObjectUrl;
  window.EJS_gameName = file.name;
  window.EJS_pathtodata = EJS_CDN_BASE;
  window.EJS_color = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim() || '#0a84ff';

  window.EJS_Buttons = {
    saveState: true,
    loadState: true,
    quickSave: true,
    quickLoad: true,
  };

  window.EJS_onGameStart = function() {
    document.getElementById('loading-spinner').style.display = 'none';
  };

  const orientation = (typeof detectOrientation === 'function') ? detectOrientation() : 'landscape';

  if (deviceType === 'mobile') {
    applyMobileLayoutClasses(orientation);
    window.EJS_VirtualGamepadSettings = orientation === 'portrait' ? EJS_GAMEPAD_PORTRAIT : EJS_GAMEPAD_LANDSCAPE;
    document.getElementById('pc-key-guide').style.display = 'none';
  } else {
    window.EJS_VirtualGamepadSettings = undefined;
    document.getElementById('pc-key-guide').style.display = 'block';
  }

  activeSession = { core, deviceType };

  if (!keydownHandlerAttached) {
    window.addEventListener("keydown", function (e) {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "Enter"].indexOf(e.code) > -1) {
        e.preventDefault();
      }
    }, false);
    keydownHandlerAttached = true;
  }

  const gameContainer = document.getElementById('game-container');
  gameContainer.addEventListener('click', () => {
    const iframe = gameContainer.querySelector('iframe');
    if (iframe) iframe.focus();
  });

  if (!document.getElementById('ejs-script')) {
    const script = document.createElement('script');
    script.id = 'ejs-script';
    script.src = EJS_CDN_BASE + 'loader.js';
    
    script.onerror = function() {
      document.getElementById('loading-spinner').style.display = 'none';
      alert("⚠️ 에뮬레이터 엔진을 불러오지 못했습니다.\n광고 차단 확장 프로그램이나 브라우저 보안 설정에 의해 cdn.emulatorjs.org가 차단되었을 수 있습니다.");
      location.reload();
    };
    
    document.body.appendChild(script);
  } else {
    location.reload();
  }
}

document.addEventListener('app:orientationchange', (e) => {
  if (!activeSession || activeSession.deviceType !== 'mobile') return;
  applyMobileLayoutClasses(e.detail.orientation);
});

document.getElementById('crtToggle').addEventListener('change', (e) => {
  const overlay = document.getElementById('crt-overlay');
  if (e.target.checked) overlay.classList.remove('hidden');
  else overlay.classList.add('hidden');
});
