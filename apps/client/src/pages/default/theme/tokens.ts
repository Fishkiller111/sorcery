/**
 * Default theme tokens — aligned with Figma.
 * Sidebar: #737373 @ 5% → #5B5F8E @ 34%
 * Main body: #202743 → #121722 @ 42% → #080A0F + radial overlays
 */
export const TOKENS = {
  colors: {
    bg: '#080A0F',
    /** Main content diagonal linear — top-left → bottom-right */
    mainGradientStart: '#202743',
    mainGradientMid: '#121722',
    mainGradientEnd: '#080A0F',
    bgElevated: '#141820',
    /** Sidebar linear gradient — #737373 @ 5% → #5B5F8E @ 34% */
    sidebarGradientStart: 'rgba(115, 115, 115, 0.05)',
    sidebarGradientEnd: 'rgba(91, 95, 142, 0.34)',
    /** Main radial blue — #31406E @ 62% → #10131A @ 0% */
    mainRadialBlue: '#31406E',
    mainRadialBlueFade: '#10131A',
    /** Main radial warm — #B33B45 @ 18% → transparent */
    mainRadialWarm: '#B33B45',
    card: 'rgba(8, 10, 15, 0.72)',
    cardSolid: '#141820',
    cardBorder: 'rgba(255, 255, 255, 0.1)',
    cardBorderFaint: 'rgba(255, 255, 255, 0.06)',
    inputBg: 'rgba(8, 10, 15, 0.85)',
    inputBorder: 'rgba(255, 255, 255, 0.08)',
    inputBorderFocus: 'rgba(186, 60, 71, 0.45)',
    accent: '#BA3C47',
    accentPressed: '#9A323C',
    searchAccent: '#BA3C47',
    text: '#F2F2F4',
    textSecondary: 'rgba(132, 132, 132, 0.85)',
    textMuted: 'rgba(132, 132, 132, 0.65)',
    /** Sidebar nav default — brighter than textMuted for dark glass background */
    navTextInactive: 'rgba(198, 200, 206, 0.9)',
    line: 'rgba(255, 255, 255, 0.12)',
    lineFaint: 'rgba(214, 214, 214, 0.15)',
    navBg: 'rgba(8, 10, 15, 0.92)',
    navBorder: 'rgba(255, 255, 255, 0.08)',
    inviteBanner: 'rgba(186, 60, 71, 0.1)',
    inviteBannerBorder: 'rgba(186, 60, 71, 0.28)',
    inviteBannerEnded: 'rgba(158, 27, 27, 0.15)',
    inviteBannerEndedBorder: 'rgba(158, 27, 27, 0.4)',
  },
  radius: {
    card: 12,
    cardLg: 16,
    input: 8,
    button: 8,
    pill: 999,
  },
  layout: {
    sidebarWidth: 268,
    contentPadding: 32,
  },
} as const;
