function loadEmulator(file, core) {
  // 1. UI 전환 (업로드 숨기고 게임 화면 표시)
  document.getElementById('upload-ui').style.display = 'none';
  document.getElementById('emulator-ui').style.display = 'block';

  // 2. EmulatorJS 설정 객체 생성
  // const romUrl = URL.createObjectURL(file); <- 이 줄을 삭제하세요.
  const device = detectDeviceType();

  window.EJS_player = '#game-container';
  window.EJS_core = core;
  window.EJS_gameUrl = file; // URL 변환 없이 File 객체 원본을 그대로 전달!
  window.EJS_pathtodata = 'https://cdn.jsdelivr.net/npm/emulatorjs@latest/data/'; // 필수 코어 데이터 경로
  window.EJS_color = 'var(--accent-color)';
  
  // 모바일인 경우 가상 게임패드 활성화
  if (device === 'mobile') {
    window.EJS_VirtualGamepadSettings = {
      // 터치 컨트롤 기본 설정 활성화
      active: true
    };
  }

  // 3. 스크립트 동적 로드 및 실행
  if (!document.getElementById('ejs-script')) {
    const script = document.createElement('script');
    script.id = 'ejs-script';
    script.src = 'https://cdn.jsdelivr.net/npm/emulatorjs@latest/data/loader.js';
    document.body.appendChild(script);
  } else {
    // 이미 로드된 경우 재시작 (EmulatorJS 내부 함수 호출이 필요할 수 있음)
    // 페이지 새로고침 없이 코어를 변경하려면 EJS 인스턴스 초기화 로직이 필요
    location.reload(); 
  }
}

// CRT 효과 토글 이벤트
document.getElementById('crtToggle').addEventListener('change', (e) => {
  const overlay = document.getElementById('crt-overlay');
  if (e.target.checked) overlay.classList.remove('hidden');
  else overlay.classList.add('hidden');
});
