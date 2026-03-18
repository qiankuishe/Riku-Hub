import { mountProtectedPage } from '../../src-rebuild/core/mount';
import SnippetsPage from '../../src-rebuild/pages/snippets/SnippetsPage.vue';

void mountProtectedPage({
  component: SnippetsPage,
  currentPath: '/snippets',
  title: '剪贴板'
});
