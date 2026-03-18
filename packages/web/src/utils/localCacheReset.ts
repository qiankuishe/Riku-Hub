export function restartCurrentSection() {
  if (typeof window === 'undefined') {
    return;
  }

  if (typeof window.__qiankuiRestartCurrentSection === 'function') {
    void window.__qiankuiRestartCurrentSection();
    return;
  }

  window.location.reload();
}
