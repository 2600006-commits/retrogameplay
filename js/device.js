function detectDeviceType() {
  const ua = navigator.userAgent;
  const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0);
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  return (isMobile || isTouchDevice) ? 'mobile' : 'desktop';
}

function detectOrientation() {
  if (window.matchMedia && window.matchMedia('(orientation: landscape)').matches) return 'landscape';
  return window.innerWidth >= window.innerHeight ? 'landscape' : 'portrait';
}

function applyDeviceState() {
  const deviceType = detectDeviceType();
  const orientation = detectOrientation();

  document.body.classList.toggle('is-mobile-device', deviceType === 'mobile');
  document.body.classList.toggle('is-landscape', orientation === 'landscape');
  document.body.classList.toggle('is-portrait', orientation === 'portrait');

  document.dispatchEvent(new CustomEvent('app:orientationchange', { detail: { deviceType, orientation } }));
  return { deviceType, orientation };
}

function checkOrientation() {
  if (detectDeviceType() === 'mobile' && detectOrientation() === 'portrait') {
    console.warn("가로 모드(Landscape)로 회전하면 더 편하게 플레이할 수 있어요.");
  }
}

function handleOrientationOrResize() {
  applyDeviceState();
  checkOrientation();
}

window.addEventListener('resize', handleOrientationOrResize);
window.addEventListener('orientationchange', handleOrientationOrResize);
document.addEventListener('DOMContentLoaded', handleOrientationOrResize);
