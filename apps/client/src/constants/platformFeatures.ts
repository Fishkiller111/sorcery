import { Platform } from 'react-native';

/** Forum UI + forum API calls are Web-only (iOS / Android keep Post Feed unchanged). */
export const FORUM_ENABLED = Platform.OS === 'web';
