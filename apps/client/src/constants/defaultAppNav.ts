import type { ModernNavItem } from './appNav';
import { DEFAULT_NAV_IMAGES } from '../pages/default/theme/images';

/** Default theme primary nav — desktop SideNav（含 Chat + 联盟申请）+ mobile 共用基表. */
export const DEFAULT_APP_NAV_ITEMS: ModernNavItem[] = [
  {
    key: 'home',
    labelKey: 'defaultNav.home',
    route: '/',
    ionicon: 'home-outline',
    activeIonicon: 'home',
    icon: DEFAULT_NAV_IMAGES.homeIdle,
    activeIcon: DEFAULT_NAV_IMAGES.homeActive,
    replace: true,
  },
  {
    key: 'chat',
    labelKey: 'defaultNav.chat',
    route: '/chats',
    ionicon: 'chatbubbles-outline',
    activeIonicon: 'chatbubbles',
    requireAuth: true,
  },
  {
    key: 'world',
    labelKey: 'defaultNav.world',
    route: '/mode-select',
    ionicon: 'grid-outline',
    activeIonicon: 'grid',
    icon: DEFAULT_NAV_IMAGES.worldIdle,
    activeIcon: DEFAULT_NAV_IMAGES.worldActive,
  },
  {
    key: 'create',
    labelKey: 'defaultNav.create',
    route: '/create-agent',
    ionicon: 'add',
    activeIonicon: 'add',
    fabIcon: DEFAULT_NAV_IMAGES.createFab,
    requireAuth: true,
  },
  {
    key: 'social',
    labelKey: 'defaultNav.social',
    route: '/social',
    ionicon: 'share-social-outline',
    activeIonicon: 'share-social',
    icon: DEFAULT_NAV_IMAGES.socialIdle,
    activeIcon: DEFAULT_NAV_IMAGES.socialActive,
  },
  {
    key: 'affiliateApply',
    labelKey: 'defaultNav.affiliateApply',
    route: '/affiliate/apply',
    ionicon: 'ribbon-outline',
    activeIonicon: 'ribbon',
  },
  {
    key: 'profile',
    labelKey: 'defaultNav.profile',
    route: '/profile',
    ionicon: 'person-outline',
    activeIonicon: 'person',
    icon: DEFAULT_NAV_IMAGES.profileIdle,
    activeIcon: DEFAULT_NAV_IMAGES.profileActive,
  },
];

/** 移动端底栏：不含 Chat / 联盟申请，保持原先五项. */
export const DEFAULT_APP_NAV_ITEMS_MOBILE: ModernNavItem[] = DEFAULT_APP_NAV_ITEMS.filter(
  (item) => item.key !== 'chat' && item.key !== 'affiliateApply',
);
