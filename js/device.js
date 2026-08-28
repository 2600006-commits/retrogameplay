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

// (버그 수정) 기존에는 'resize' 이벤트에만 연결되어 있어서
// 페이지를 처음 열었을 때(세로 모드로 접속한 경우) 방향 체크가 전혀 실행되지 않았습니다.
// 최초 로드 시점과 실제 기기 회전(orientationchange)에도 체크하도록 보강했습니다.
window.addEventListener('resize', checkOrientation);
window.addEventListener('orientationchange', checkOrientation);
document.addEventListener('DOMContentLoaded', checkOrientation);
