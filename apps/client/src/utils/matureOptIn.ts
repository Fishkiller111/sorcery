import { Platform } from 'react-native';

let localMatureOptIn = false;

/** App Store: iOS never exposes adult content; ignore any local/Web toggle. */
export function isIosAdultContentForcedOff(): boolean {
  return Platform.OS === 'ios';
}

/** Local R18 switch (Web/Android). On iOS this is a no-op and always stays off. */
export function setLocalMatureOptIn(on: boolean) {
  if (isIosAdultContentForcedOff()) {
    localMatureOptIn = false;
    return;
  }
  localMatureOptIn = Boolean(on);
}

export function getLocalMatureOptIn(): boolean {
  if (isIosAdultContentForcedOff()) return false;
  return localMatureOptIn;
}

/** App Store fail-closed: iOS always hides all R + Mature. */
export function isIosSafeContentMode(): boolean {
  return isIosAdultContentForcedOff();
}

/** iOS must never send X-Mature-Opt-In (server also forces safe mode). */
export function matureOptInHeaderValue(): string | undefined {
  return undefined;
}
