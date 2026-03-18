import { createApp, defineComponent, h, nextTick, type App as VueApp, type Component } from 'vue';
import { createPinia } from 'pinia';
import { authApi } from '../api';
import SectionShell from '../components/layout/SectionShell.vue';
import { getCurrentFullPath } from '../utils/pageConfig';
import { buildLoginRedirectUrl, rememberAppRoute, resolveAppRoute } from '../utils/routeMemory';
import '../styles/index.css';

interface ProtectedPageOptions {
  component: Component;
  currentPath: string;
  title: string;
  subtitle?: string;
}

let currentApp: VueApp<Element> | null = null;
let currentMountHandler: (() => Promise<void>) | null = null;
let restartInFlight = false;

function getMountTarget() {
  const target = document.querySelector('#app');
  if (!(target instanceof HTMLElement)) {
    throw new Error('Missing #app mount target');
  }

  return target;
}

function mount(component: Component) {
  const target = getMountTarget();
  target.innerHTML = '';
  const app = createApp(component);
  app.use(createPinia());
  app.mount(target);
  currentApp = app;
}

async function remountCurrentPage() {
  if (restartInFlight) {
    return;
  }

  if (!currentMountHandler) {
    window.location.reload();
    return;
  }

  restartInFlight = true;

  try {
    currentApp?.unmount();
    currentApp = null;
    await nextTick();
    await currentMountHandler();
  } finally {
    restartInFlight = false;
  }
}

function installRestartHook() {
  window.__qiankuiRestartCurrentSection = async () => {
    try {
      window.sessionStorage.clear();
    } catch {
      // ignore sessionStorage failures
    }

    if ('clearResourceTimings' in window.performance) {
      window.performance.clearResourceTimings();
    }

    await remountCurrentPage();
  };
}

function clearRestartHook() {
  window.__qiankuiRestartCurrentSection = null;
}

export async function mountProtectedPage(options: ProtectedPageOptions) {
  const currentRoute = getCurrentFullPath();
  rememberAppRoute(currentRoute);

  try {
    const { authenticated } = await authApi.check();
    if (!authenticated) {
      window.location.replace(buildLoginRedirectUrl(currentRoute));
      return;
    }
  } catch {
    window.location.replace(buildLoginRedirectUrl(currentRoute));
    return;
  }

  const Root = defineComponent({
    name: `${options.title}PageRoot`,
    setup() {
      return () =>
        h(
          SectionShell,
          {
            currentPath: options.currentPath,
            title: options.title,
            subtitle: options.subtitle ?? ''
          },
          {
            default: () => h(options.component)
          }
        );
    }
  });

  currentMountHandler = async () => {
    mount(Root);
  };
  installRestartHook();
  mount(Root);
}

export async function mountLoginPage(component: Component) {
  clearRestartHook();
  currentMountHandler = null;

  const redirect = new URLSearchParams(window.location.search).get('redirect');

  try {
    const { authenticated } = await authApi.check();
    if (authenticated) {
      window.location.replace(resolveAppRoute(redirect));
      return;
    }
  } catch {
    // noop
  }

  mount(component);
}

export function mountLauncherPage() {
  clearRestartHook();
  currentMountHandler = null;
  window.location.replace(resolveAppRoute(null));
}
