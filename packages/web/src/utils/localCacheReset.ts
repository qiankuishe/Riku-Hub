export function restartCurrentSection() {
  if (typeof window === 'undefined') {
    return;
  }

  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

  try {
    window.sessionStorage.clear();
  } catch {
    // ignore sessionStorage failures
  }

  if ('clearResourceTimings' in window.performance) {
    window.performance.clearResourceTimings();
  }

  window.location.replace(`/reset?return=${encodeURIComponent(currentUrl)}`);
}
