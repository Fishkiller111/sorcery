import React, { useEffect, useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../theme/colors';
import { Typo } from '../../theme/typography';
import { useI18n } from '../../i18n/I18nContext';

export type MessageType = 'success' | 'error' | 'warning';

export type MessageOptions = {
  duration?: number;
};

type MessageItem = {
  id: string;
  type: MessageType;
  content: string;
  duration: number;
};

const DEFAULT_DURATION = 3200;

let messages: MessageItem[] = [];
const listeners = new Set<() => void>();

/** 后挂载的 Host 抢占渲染权，避免根 Host 与 Modal 内 Host 各画一条。 */
const hostStack: symbol[] = [];
const hostListeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function emitHosts() {
  hostListeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function subscribeHosts(listener: () => void) {
  hostListeners.add(listener);
  return () => hostListeners.delete(listener);
}

function getSnapshot() {
  return messages;
}

function registerHost(id: symbol) {
  hostStack.push(id);
  emitHosts();
  return () => {
    const index = hostStack.lastIndexOf(id);
    if (index >= 0) hostStack.splice(index, 1);
    emitHosts();
  };
}

function isTopHost(id: symbol) {
  return hostStack[hostStack.length - 1] === id;
}

function show(type: MessageType, content: string, options?: MessageOptions) {
  const trimmed = content.trim();
  if (!trimmed) return;

  const duration = options?.duration ?? DEFAULT_DURATION;
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  messages = [...messages, { id, type, content: trimmed, duration }];
  emit();

  setTimeout(() => {
    messages = messages.filter((item) => item.id !== id);
    emit();
  }, duration);
}

export const Message = {
  success: (content: string, options?: MessageOptions) => show('success', content, options),
  error: (content: string, options?: MessageOptions) => show('error', content, options),
  warning: (content: string, options?: MessageOptions) => show('warning', content, options),
};

const TYPE_CONFIG: Record<
  MessageType,
  {
    icon: React.ComponentProps<typeof Ionicons>['name'];
    accent: string;
    border: string;
    glow: string;
  }
> = {
  success: {
    icon: 'checkmark-circle',
    accent: '#3d9a5f',
    border: 'rgba(61, 154, 95, 0.55)',
    glow: 'rgba(61, 154, 95, 0.14)',
  },
  error: {
    icon: 'close-circle',
    accent: COLORS.soviet.embroideryLight,
    border: 'rgba(196, 30, 58, 0.55)',
    glow: 'rgba(196, 30, 58, 0.14)',
  },
  warning: {
    icon: 'warning',
    accent: COLORS.soviet.stainLight,
    border: 'rgba(181, 139, 31, 0.55)',
    glow: 'rgba(181, 139, 31, 0.14)',
  },
};

function ToastItem({ item }: { item: MessageItem }) {
  const { lang } = useI18n();

  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-16)).current;
  const config = TYPE_CONFIG[item.type];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 220,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
  }, [opacity, translateY]);

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          opacity,
          transform: [{ translateY }],
          borderColor: config.border,
          backgroundColor: COLORS.bg.elevated,
          ...(Platform.OS === 'web'
            ? { boxShadow: `0 8px 24px ${config.glow}` }
            : { shadowColor: config.accent, shadowOpacity: 0.25, shadowRadius: 12 }),
        },
      ]}
    >
      <View style={[styles.accentBar, { backgroundColor: config.accent }]} />
      <View style={[styles.iconWrap, { backgroundColor: config.glow }]}>
        <Ionicons name={config.icon} size={20} color={config.accent} />
      </View>
      <Text style={Typo(styles.content, 'sans', lang)} selectable>
        {item.content}
      </Text>
    </Animated.View>
  );
}

export function MessageHost({ style }: { style?: StyleProp<ViewStyle> }) {
  const insets = useSafeAreaInsets();
  const hostId = useRef(Symbol('MessageHost')).current;
  const isTop = useSyncExternalStore(
    subscribeHosts,
    () => isTopHost(hostId),
    () => isTopHost(hostId),
  );
  const items = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useLayoutEffect(() => registerHost(hostId), [hostId]);

  if (!isTop) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.host, { top: insets.top + 8 }, style]}
    >
      {items.map((item) => <ToastItem key={item.id} item={item} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 99999,
    elevation: 99999,
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
    ...(Platform.OS === 'web' ? { position: 'fixed' as 'absolute' } : null),
  },
  toast: {
    width: '100%',
    maxWidth: 480,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 2,
    paddingVertical: 12,
    paddingRight: 14,
    paddingLeft: 0,
    gap: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  accentBar: {
    width: 3,
    alignSelf: 'stretch',
    marginRight: 2,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    color: COLORS.agents.paleGold,
    fontSize: 14,
    lineHeight: 20,
  },
});
