/** Default theme brand assets — from UI/Soulthread/image32.svg */
export const DEFAULT_IMAGES = {
  logo: require('../../../../assets/images/ui/default/soulthread_logo.svg'),
} as const;

/** Soul currency mark — used in Soul shop and wallet */
export const SOUL_IMAGES = {
  coin: require('../../../../assets/images/ui/default/soul/soul_coin.png'),
} as const;

/** Mobile bottom nav — Figma node 849:609 (idle / active dual-state icons). */
export const DEFAULT_NAV_IMAGES = {
  homeIdle: require('../../../../assets/images/ui/default/nav/nav_home_idle_v2.png'),
  homeActive: require('../../../../assets/images/ui/default/nav/nav_home_active_v2.png'),
  /** World tab (formerly Mode) — book + pen dual-state */
  worldIdle: require('../../../../assets/images/ui/default/nav/nav_world_idle.png'),
  worldActive: require('../../../../assets/images/ui/default/nav/nav_world_active.png'),
  /** @deprecated use worldIdle / worldActive */
  modeIdle: require('../../../../assets/images/ui/default/nav/nav_world_idle.png'),
  modeActive: require('../../../../assets/images/ui/default/nav/nav_world_active.png'),
  socialIdle: require('../../../../assets/images/ui/default/nav/nav_social_idle_v2.png'),
  socialActive: require('../../../../assets/images/ui/default/nav/nav_social_active_v2.png'),
  profileIdle: require('../../../../assets/images/ui/default/nav/nav_profile_idle_v2.png'),
  profileActive: require('../../../../assets/images/ui/default/nav/nav_profile_active_v2.png'),
  /** Create FAB — glass disk PNG (bg removed, tight crop) */
  createFab: require('../../../../assets/images/ui/default/nav/nav_create_fab_v4.png'),
} as const;

/** Social feed assets — Figma node 594:26 */
export const SOCIAL_IMAGES = {
  searchIcon: require('../../../../assets/images/ui/default/social/search-icon.svg'),
  comment: require('../../../../assets/images/ui/default/social/comment.svg'),
  share: require('../../../../assets/images/ui/default/social/share.svg'),
  more: require('../../../../assets/images/ui/default/social/more.svg'),
  mediaPlaceholder: require('../../../../assets/images/ui/default/social/media-placeholder.svg'),
  featureCard: require('../../../../assets/images/ui/default/social/feature-card.png'),
  pencil: require('../../../../assets/images/ui/default/social/pencil.svg'),
  composeAvatar: require('../../../../assets/images/ui/default/social/compose-avatar.svg'),
  avatarFallback: require('../../../../assets/images/ui/default/social/avatar-fallback.svg'),
} as const;

/** Agent Media page — Figma node 847:14 */
export const AGENT_MEDIA_IMAGES = {
  /** Gift CTA icon — group22.png from design */
  giftIcon: require('../../../../assets/group22.png'),
} as const;

/** Profile page — Figma node 1106:14 */
export const PROFILE_IMAGES = {
  menu: require('../../../../assets/images/ui/default/profile/icon_menu.svg'),
  edit: require('../../../../assets/images/ui/default/profile/icon_edit.svg'),
  plus: require('../../../../assets/images/ui/default/profile/icon_plus.svg'),
  star: require('../../../../assets/images/ui/default/profile/icon_star.svg'),
  vipCardBg: require('../../../../assets/images/ui/default/profile/card_vip_bg.png'),
  pointsCardBg: require('../../../../assets/images/ui/default/profile/card_points_bg.png'),
} as const;
