import { clearFaviconCache } from './faviconCache';

async function clearCacheStorage() {
  if (typeof window === 'undefined' || typeof window.caches === 'undefined') {
    return;
  }

  try {
    const keys = await window.caches.keys();
    await Promise.allSettled(keys.map((key) => window.caches.delete(key)));
  } catch {
    // ignore cache storage failures
  }
}

export async function clearAppLocalCache() {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.clear();
  } catch {
    // ignore localStorage failures
  }

  try {
    window.sessionStorage.clear();
  } catch {
    // ignore sessionStorage failures
  }

  await Promise.allSettled([clearFaviconCache(), clearCacheStorage()]);
}

export async function clearAppLocalCacheAndReload() {
  if (typeof window === 'undefined') {
    return;
  }

  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  await clearAppLocalCache();
  window.location.replace(currentUrl);
}
