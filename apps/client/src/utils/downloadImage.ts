import { Platform } from 'react-native';
import { notifyError, notifySuccess } from './notify';
import { promptPhotoLibraryAccessSettings } from './promptPhotoLibraryAccessSettings';

type DownloadT = (key: string) => string;

/**
 * 一键下载：Web 走浏览器下载；原生先缓存再写入系统相册。
 */
export async function downloadImageToDevice(
  imageUrl: string,
  filename: string,
  t: DownloadT,
): Promise<void> {
  const url = (imageUrl || '').trim();
  if (!url) {
    notifyError(t('creationCenter.downloadFailed'));
    return;
  }
  const safeName = (filename || 'soulthread-image.png').replace(/[^\w.\-]+/g, '_');

  if (Platform.OS === 'web') {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = safeName;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
      notifySuccess(t('creationCenter.downloadStarted'));
      return;
    } catch (e) {
      try {
        window.open(url, '_blank', 'noopener,noreferrer');
        notifySuccess(t('creationCenter.downloadStarted'));
        return;
      } catch {
        notifyError(t('creationCenter.downloadFailed'), e instanceof Error ? e.message : undefined);
        return;
      }
    }
  }

  try {
    const FileSystem = await import('expo-file-system/legacy');
    // SDK 57：saveToLibraryAsync 须从 legacy 子路径导入，主包会抛 deprecated 错误
    const MediaLibrary = await import('expo-media-library/legacy');
    const dest = `${FileSystem.cacheDirectory || FileSystem.documentDirectory}${safeName}`;
    const result = await FileSystem.downloadAsync(url, dest);
    if (!result?.uri) {
      throw new Error('empty download');
    }

    const permission = await MediaLibrary.requestPermissionsAsync(true);
    if (!permission.granted) {
      promptPhotoLibraryAccessSettings(t);
      return;
    }

    await MediaLibrary.createAssetAsync(result.uri);
    notifySuccess(t('creationCenter.downloadSaved'));
  } catch (e) {
    notifyError(t('creationCenter.downloadFailed'), e instanceof Error ? e.message : undefined);
  }
}
