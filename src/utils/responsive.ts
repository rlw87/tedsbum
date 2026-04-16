export const DESIGN_WIDTH = 1280;
export const DESIGN_HEIGHT = 720;

export function isPortrait(): boolean {
  return window.innerHeight > window.innerWidth;
}

export function attachOrientationPrompt(): void {
  const el = document.getElementById('rotate-prompt');
  if (!el) return;
  const update = () => {
    const small = Math.min(window.innerWidth, window.innerHeight) < 900;
    if (isPortrait() && small) el.classList.add('show');
    else el.classList.remove('show');
  };
  update();
  window.addEventListener('resize', update);
  window.addEventListener('orientationchange', update);
}
