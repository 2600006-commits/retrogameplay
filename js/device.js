// 디바이스 타입 판별 함수
function detectDeviceType() {
  const ua = navigator.userAgent;
  const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0);
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);

  return (isMobile || isTouchDevice) ? 'mobile' : 'desktop';
}

// 현재 화면 방향 ('landscape' | 'portrait')
function detectOrientation() {
  if (window.matchMedia && window.matchMedia('(orientation: landscape)').matches) {
    return 'landscape';
  }
  return window.innerWidth >= window.innerHeight ? 'landscape' : 'portrait';
}

// body에 상태 클래스를 반영하고, 방향이 바뀌면 다른 스크립트(emulator.js)가
// 반응할 수 있도록 커스텀 이벤트를 발행합니다.
// (요구사항: 가로/세로 모드에 따라 가상 조이스틱 배치가 자연스럽게 바뀌도록)
function applyDeviceState() {
  const deviceType = detectDeviceType();
  const orientation = detectOrientation();

  document.body.classList.toggle('is-mobile-device', deviceType === 'mobile');
  document.body.classList.toggle('is-landscape', orientation === 'landscape');
  document.body.classList.toggle('is-portrait', orientation === 'portrait');

  document.dispatchEvent(new CustomEvent('app:orientationchange', {
    detail: { deviceType, orientation }
  }));

  return { deviceType, orientation };
}

// 화면 방향 감지 (모바일 가로 모드 유도용 - 콘솔 안내)
function checkOrientation() {
  if (detectDeviceType() === 'mobile' && detectOrientation() === 'portrait') {
    console.warn("가로 모드(Landscape)로 회전하면 더 편하게 플레이할 수 있어요.");
    // 필요 시 여기에 오버레이 UI를 표시하는 로직 추가 가능
  }
}

function handleOrientationOrResize() {
  applyDeviceState();
  checkOrientation();
}

// 최초 로드 시점 + 리사이즈/회전 시점 모두 반영
window.addEventListener('resize', handleOrientationOrResize);
window.addEventListener('orientationchange', handleOrientationOrResize);
document.addEventListener('DOMContentLoaded', handleOrientationOrResize);
