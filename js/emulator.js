function loadEmulator(file, core, deviceType) {
  // 1. UI 전환
  document.getElementById('emulator-ui').style.display = 'block';

  // 2. EmulatorJS 설정
  window.EJS_player = '#game-container';
  window.EJS_core = core;
  window.EJS_gameUrl = file; 
  window.EJS_pathtodata = 'https://cdn.jsdelivr.net/npm/emulatorjs@latest/data/';
  window.EJS_color = 'var(--accent-color)';
  
  // 3. 디바이스 환경에 따른 UI 및 컨트롤러 세팅
  if (deviceType === 'mobile') {
    window.EJS_VirtualGamepadSettings = { active: true }; // 모바일 가상 조이스틱 켬
    document.getElementById('pc-key-guide').style.display = 'none';
  } else {
    window.EJS_VirtualGamepadSettings = { active: false }; // 데스크톱 조이스틱 끔
    document.getElementById('pc-key-guide').style.display = 'block';
  }

  // 4. 키보드 씹힘(스크롤) 방지 및 포커스 유지 로직 (매우 중요)
  window.addEventListener("keydown", function(e) {
    // 방향키, 스페이스바, 엔터 등을 누를 때 브라우저 화면이 움직이는 것을 차단
    if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," ","Enter"].indexOf(e.code) > -1) {
      e.preventDefault(); 
    }
  }, false);

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
    script.src = 'https://cdn.jsdelivr.net/npm/emulatorjs@latest/data/loader.js';
    document.body.appendChild(script);
  } else {
    location.reload(); 
  }
}

// CRT 효과 토글 이벤트
document.getElementById('crtToggle').addEventListener('change', (e) => {
  const overlay = document.getElementById('crt-overlay');
  if (e.target.checked) overlay.classList.remove('hidden');
  else overlay.classList.add('hidden');
});
