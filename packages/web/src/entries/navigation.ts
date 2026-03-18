import { mountProtectedPage } from '../../src-rebuild/core/mount';
import NavigationPage from '../../src-rebuild/pages/navigation/NavigationPage.vue';

void mountProtectedPage({
  component: NavigationPage,
  currentPath: '/nav',
  title: '网站导航'
});
