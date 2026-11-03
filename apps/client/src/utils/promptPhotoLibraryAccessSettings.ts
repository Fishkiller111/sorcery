import { Alert, Linking, Platform } from 'react-native';

/** 相册权限被拒绝时，弹出系统风格对话框，引导用户前往系统设置开启。 */
export function promptPhotoLibraryAccessSettings(t: (key: string) => string): void {
  if (Platform.OS === 'web') return;

  Alert.alert(
    t('permissions.photoLibraryDeniedTitle'),
    t('permissions.photoLibraryDeniedMessage'),
    [
      { text: t('confirmModal.cancel'), style: 'cancel' },
      {
        text: t('permissions.openSystemSettings'),
        onPress: () => {
          void Linking.openSettings();
        },
      },
    ],
  );
}

/** 麦克风权限被拒绝时，弹出系统风格对话框，引导用户前往系统设置开启。 */
export function promptMicrophoneAccessSettings(t: (key: string) => string): void {
  if (Platform.OS === 'web') return;

  Alert.alert(
    t('permissions.microphoneDeniedTitle'),
    t('permissions.microphoneDeniedMessage'),
    [
      { text: t('confirmModal.cancel'), style: 'cancel' },
      {
        text: t('permissions.openSystemSettings'),
        onPress: () => {
          void Linking.openSettings();
        },
      },
    ],
  );
}
