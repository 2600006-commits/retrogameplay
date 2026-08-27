function loadEmulator(file, core) {
  // 1. UI 전환 (업로드 숨기고 게임 화면 표시)
  document.getElementById('upload-ui').style.display = 'none';
  document.getElementById('emulator-ui').style.display = 'block';

  // 2. EmulatorJS 설정 객체 생성
  const romUrl = URL.createObjectURL(file);
  const device = detectDeviceType();

  window.EJS_player = '#game-container';
  window.EJS_core = core;
  window.EJS_gameUrl = romUrl;
  // ⚠️ 중요: jsdelivr/npm 경로(emulatorjs@latest)는 실제 코어 데이터가 없는 잘못된 경로입니다.
  // 반드시 EmulatorJS 공식 CDN을 사용해야 코어(wasm)와 데이터 파일을 정상적으로 받아옵니다.
  window.EJS_pathtodata = 'https://cdn.emulatorjs.org/stable/data/';
  // EJS_color는 CSS 변수가 아닌 실제 hex 컬러 코드만 인식합니다.
  window.EJS_color = '#00d2ff';
  // 저장 파일(세이브 스테이트) 이름을 롬 파일명 기준으로 지정 (blob URL은 확장자 정보가 없음)
  window.EJS_gameName = file.name.replace(/\.(zip|7z)$/i, '');

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
    script.src = 'https://cdn.emulatorjs.org/stable/data/loader.js';
    document.body.appendChild(script);
  } else {
    // 이미 EmulatorJS가 로드된 상태에서 다른 롬으로 다시 시작하려면
    // 코어 인스턴스를 안전하게 재초기화하기 위해 페이지를 새로고침합니다.
    // 새로고침 후에도 선택된 코어 정보를 잃지 않도록 sessionStorage에 저장해둡니다.
    sessionStorage.setItem('selectedCore', core);
    location.reload();
  }
}

// CRT 효과 토글 이벤트
document.getElementById('crtToggle').addEventListener('change', (e) => {
  const overlay = document.getElementById('crt-overlay');
  if (e.target.checked) overlay.classList.remove('hidden');
  else overlay.classList.add('hidden');
});
