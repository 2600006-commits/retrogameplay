// 디바이스 타입 판별 함수
function detectDeviceType() {
  const ua = navigator.userAgent;
  const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0);
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);

  return (isMobile || isTouchDevice) ? 'mobile' : 'desktop';
}

// 화면 방향 감지 (모바일 가로 모드 유도용)
function checkOrientation() {
  if (detectDeviceType() === 'mobile') {
    if (window.innerHeight > window.innerWidth) {
      console.warn("가로 모드(Landscape)로 회전해 주세요.");
      // 필요 시 여기에 오버레이 UI를 표시하는 로직 추가 가능
    }
  }
}
window.addEventListener('resize', checkOrientation);