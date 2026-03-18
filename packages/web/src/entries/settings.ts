import { mountProtectedPage } from '../../src-rebuild/core/mount';
import SettingsPage from '../../src-rebuild/pages/settings/SettingsPage.vue';

void mountProtectedPage({
  component: SettingsPage,
  currentPath: '/settings',
  title: '系统设置'
});
