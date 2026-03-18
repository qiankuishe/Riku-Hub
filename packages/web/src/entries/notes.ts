import { mountProtectedPage } from '../../src-rebuild/core/mount';
import NotesPage from '../../src-rebuild/pages/notes/NotesPage.vue';

void mountProtectedPage({
  component: NotesPage,
  currentPath: '/notes',
  title: '笔记'
});
