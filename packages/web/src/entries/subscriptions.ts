import { mountProtectedPage } from '../../src-rebuild/core/mount';
import SubscriptionsPage from '../../src-rebuild/pages/subscriptions/SubscriptionsPage.vue';

void mountProtectedPage({
  component: SubscriptionsPage,
  currentPath: '/subscriptions',
  title: '订阅聚合'
});
