import { mountProtectedPage } from '../../src-rebuild/core/mount';
import LogsPage from '../../src-rebuild/pages/logs/LogsPage.vue';

void mountProtectedPage({
  component: LogsPage,
  currentPath: '/logs',
  title: '运行日志'
});
