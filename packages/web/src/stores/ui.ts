import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useUiStore = defineStore('ui', () => {
  const darkMode = ref(localStorage.getItem('darkMode') === 'true');
  const toastMessage = ref('');
  const mobileNavOpen = ref(false);
  let toastTimer: number | undefined;

  function applyTheme() {
    document.documentElement.classList.toggle('dark', darkMode.value);
  }

  function toggleDarkMode() {
    darkMode.value = !darkMode.value;
    localStorage.setItem('darkMode', String(darkMode.value));
    applyTheme();
  }

  function showToast(message: string) {
    toastMessage.value = message;
    if (toastTimer) {
      window.clearTimeout(toastTimer);
    }
    toastTimer = window.setTimeout(() => {
      toastMessage.value = '';
    }, 1800);
  }

  function hideToast() {
    toastMessage.value = '';
  }

  function openMobileNav() {
    mobileNavOpen.value = true;
  }

  function closeMobileNav() {
    mobileNavOpen.value = false;
  }

  applyTheme();

  return {
    darkMode,
    toastMessage,
    mobileNavOpen,
    toggleDarkMode,
    showToast,
    hideToast,
    openMobileNav,
    closeMobileNav
  };
});
