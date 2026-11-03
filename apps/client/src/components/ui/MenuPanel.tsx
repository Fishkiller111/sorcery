import React, {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  Platform,
  Dimensions,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { COLORS } from '../../theme/colors';
import { Typo } from '../../theme/typography';
import { useI18n } from '../../i18n/I18nContext';
import { TOKENS } from '../../pages/default/theme/tokens';
import { type FreeChatUiVariant, glassWebStyle } from '../free-chat/freeChatUi';

const DIVIDER = 'rgba(232, 213, 181, 0.22)';
const DEFAULT_GAP = 6;
const EDGE_MARGIN = 8;

export type MenuPanelAnchorRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type MenuPanelPlacement =
  | 'center'
  | 'bottom-start'
  | 'bottom-end'
  | 'top-start'
  | 'top-end';

function measureAnchor(ref: RefObject<View | null>): Promise<MenuPanelAnchorRect | null> {
  return new Promise((resolve) => {
    const node = ref.current;
    if (!node) {
      resolve(null);
      return;
    }
    node.measureInWindow((x, y, width, height) => {
      resolve({ x, y, width, height });
    });
  });
}

function resolveAnchoredPlacement(
  placement: Exclude<MenuPanelPlacement, 'center'>,
  anchor: MenuPanelAnchorRect,
  menuSize: { width: number; height: number },
  gap: number,
  screenHeight: number,
): Exclude<MenuPanelPlacement, 'center'> {
  if (menuSize.height <= 0 || !placement.startsWith('bottom')) {
    return placement;
  }
  const belowTop = anchor.y + anchor.height + gap;
  if (belowTop + menuSize.height > screenHeight - EDGE_MARGIN) {
    return placement.replace('bottom', 'top') as Exclude<MenuPanelPlacement, 'center'>;
  }
  return placement;
}

function computeAnchoredPosition(
  anchor: MenuPanelAnchorRect,
  placement: Exclude<MenuPanelPlacement, 'center'>,
  menuSize: { width: number; height: number },
  gap: number,
  offset: { x: number; y: number },
): ViewStyle {
  const screen = Dimensions.get('window');
  const resolved = resolveAnchoredPlacement(
    placement,
    anchor,
    menuSize,
    gap,
    screen.height,
  );

  const style: ViewStyle = { position: 'absolute', zIndex: 1 };
  let left: number | undefined;
  let right: number | undefined;
  let top: number;

  if (resolved === 'bottom-end' || resolved === 'top-end') {
    right = screen.width - anchor.x - anchor.width - offset.x;
  } else {
    left = anchor.x + offset.x;
  }

  if (resolved.startsWith('bottom')) {
    top = anchor.y + anchor.height + gap + offset.y;
  } else {
    const menuHeight = menuSize.height > 0 ? menuSize.height : 0;
    top = anchor.y - gap - menuHeight + offset.y;
  }

  if (left != null && menuSize.width > 0) {
    left = Math.max(EDGE_MARGIN, Math.min(left, screen.width - menuSize.width - EDGE_MARGIN));
  }
  if (right != null && menuSize.width > 0) {
    const leftFromRight = screen.width - menuSize.width - right;
    const clampedLeft = Math.max(
      EDGE_MARGIN,
      Math.min(leftFromRight, screen.width - menuSize.width - EDGE_MARGIN),
    );
    right = screen.width - menuSize.width - clampedLeft;
  }
  if (menuSize.height > 0) {
    top = Math.max(EDGE_MARGIN, Math.min(top, screen.height - menuSize.height - EDGE_MARGIN));
  }

  if (left != null) style.left = left;
  if (right != null) style.right = right;
  style.top = top;

  return style;
}

export type MenuPanelItem = {
  key: string;
  label: string;
  sublabel?: string;
  leading?: ReactNode;
  selected?: boolean;
  disabled?: boolean;
  onPress: () => void;
};

type MenuPanelProps = {
  title?: string;
  items: MenuPanelItem[];
  emptyText?: string;
  style?: StyleProp<ViewStyle>;
  variant?: FreeChatUiVariant;
};

type MenuPanelModalProps = {
  visible: boolean;
  onClose: () => void;
  placement?: MenuPanelPlacement;
  anchorRef?: RefObject<View | null>;
  anchorRect?: MenuPanelAnchorRect | null;
  gap?: number;
  offset?: { x?: number; y?: number };
  children: React.ReactNode;
};

function MenuPanelItemRow({
  item,
  isLast,
  variant = 'soviet',
}: {
  item: MenuPanelItem;
  isLast: boolean;
  variant?: FreeChatUiVariant;
}) {
  const isDefault = variant === 'default';
  const [hovered, setHovered] = useState(false);
  const highlighted = (hovered || item.selected) && !item.disabled;

  const hoverHandlers =
    Platform.OS === 'web'
      ? ({
          onMouseEnter: () => setHovered(true),
          onMouseLeave: () => setHovered(false),
        } as object)
      : {};

  return (
    <Pressable
      {...hoverHandlers}
      style={[
        styles.item,
        !isLast && styles.itemDivider,
        !isLast && isDefault && styles.itemDividerDefault,
        highlighted && styles.itemHighlighted,
        highlighted && isDefault && styles.itemHighlightedDefault,
        item.disabled && styles.itemDisabled,
      ]}
      onPress={item.onPress}
      disabled={item.disabled}
    >
      {item.leading ? <View style={styles.itemLeading}>{item.leading}</View> : null}
      <Text
        style={[
          styles.itemText,
          isDefault && styles.itemTextDefault,
          item.sublabel ? styles.itemTextWithSublabel : null,
          highlighted && styles.itemTextHighlighted,
          highlighted && isDefault && styles.itemTextHighlightedDefault,
        ]}
      >
        {item.label}
      </Text>
      {item.sublabel ? (
        <Text
          style={[
            styles.itemSublabel,
            isDefault && styles.itemSublabelDefault,
            highlighted && styles.itemSublabelHighlighted,
            highlighted && isDefault && styles.itemSublabelHighlightedDefault,
          ]}
        >
          {item.sublabel}
        </Text>
      ) : null}
    </Pressable>
  );
}

export function MenuPanel({ title, items, emptyText, style, variant = 'soviet' }: MenuPanelProps) {
  const { t } = useI18n();
  const isDefault = variant === 'default';
  const resolvedEmptyText = emptyText ?? t('common.empty');
  return (
    <View style={[styles.panel, isDefault && styles.panelDefault, isDefault && glassWebStyle, style]}>
      {title ? (
        <View style={[styles.titleWrap, isDefault && styles.titleWrapDefault]}>
          <Text style={[styles.title, isDefault && styles.titleDefault]}>{title}</Text>
        </View>
      ) : null}
      {items.length === 0 ? (
        <Text style={[styles.empty, isDefault && styles.emptyDefault]}>{resolvedEmptyText}</Text>
      ) : (
        items.map((item, index) => (
          <MenuPanelItemRow
            key={item.key}
            item={item}
            isLast={index === items.length - 1}
            variant={variant}
          />
        ))
      )}
    </View>
  );
}

export function MenuPanelModal({
  visible,
  onClose,
  placement = 'top-end',
  anchorRef,
  anchorRect: anchorRectProp = null,
  gap = DEFAULT_GAP,
  offset,
  children,
}: MenuPanelModalProps) {
  const offsetXY = { x: offset?.x ?? 0, y: offset?.y ?? 0 };
  const [measuredAnchor, setMeasuredAnchor] = useState<MenuPanelAnchorRect | null>(null);
  const [menuSize, setMenuSize] = useState({ width: 0, height: 0 });
  const [anchoredStyle, setAnchoredStyle] = useState<ViewStyle | null>(null);

  const anchorRect = anchorRectProp ?? measuredAnchor;
  const usesAnchor = placement !== 'center' && (anchorRef != null || anchorRectProp != null);

  useEffect(() => {
    if (!visible) {
      setMeasuredAnchor(null);
      setMenuSize({ width: 0, height: 0 });
      setAnchoredStyle(null);
      return;
    }
    if (!usesAnchor || anchorRectProp != null || !anchorRef) return;

    let cancelled = false;
    void measureAnchor(anchorRef).then((rect) => {
      if (!cancelled) setMeasuredAnchor(rect);
    });
    return () => {
      cancelled = true;
    };
  }, [visible, usesAnchor, anchorRectProp, anchorRef]);

  useEffect(() => {
    if (!visible || !usesAnchor || !anchorRect) {
      setAnchoredStyle(null);
      return;
    }
    setAnchoredStyle(
      computeAnchoredPosition(
        anchorRect,
        placement as Exclude<MenuPanelPlacement, 'center'>,
        menuSize,
        gap,
        offsetXY,
      ),
    );
  }, [visible, usesAnchor, anchorRect, placement, menuSize, gap, offsetXY.x, offsetXY.y]);

  const handleMenuLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setMenuSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
  }, []);

  const overlayStyle =
    placement === 'center'
      ? styles.overlayCenter
      : usesAnchor
        ? styles.overlay
        : styles.overlayTopEnd;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.overlay, overlayStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" />
        {usesAnchor ? (
          <View
            style={[anchoredStyle, !anchoredStyle && styles.menuHidden]}
            onLayout={handleMenuLayout}
          >
            {children}
          </View>
        ) : (
          children
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  overlayCenter: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  overlayTopEnd: {
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 110,
    paddingRight: 16,
  },
  menuHidden: {
    opacity: 0,
  },
  panelDefault: {
    backgroundColor: TOKENS.colors.card,
    borderRadius: TOKENS.radius.card,
    borderColor: TOKENS.colors.cardBorder,
    shadowOpacity: 0.2,
  },
  panel: {
    backgroundColor: 'rgba(18, 20, 26, 0.94)',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 4,
    minWidth: 180,
    borderWidth: 1,
    borderColor: 'rgba(232, 213, 181, 0.28)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1,
    overflow: 'hidden',
  },
  titleWrap: {
    borderBottomWidth: 1,
    borderBottomColor: DIVIDER,
    marginHorizontal: 2,
  },
  titleWrapDefault: {
    borderBottomColor: TOKENS.colors.lineFaint,
  },
  title: Typo(
    {
      fontSize: 11,
      color: COLORS.accent.red,
      fontWeight: '700',
      paddingHorizontal: 12,
      paddingVertical: 10,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    'display',
  ),
  titleDefault: Typo(
    {
      color: TOKENS.colors.accent,
      fontSize: 11,
      letterSpacing: 1.4,
    },
    'mono',
  ),
  empty: Typo(
    {
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: COLORS.agents.paleGoldMuted,
    },
    'mono',
  ),
  emptyDefault: {
    color: TOKENS.colors.textMuted,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginHorizontal: 2,
    ...(Platform.OS === 'web'
      ? ({ cursor: 'pointer', transition: 'background-color 0.15s ease' } as const)
      : {}),
  },
  itemDivider: {
    borderBottomWidth: 1,
    borderBottomColor: DIVIDER,
  },
  itemDividerDefault: {
    borderBottomColor: TOKENS.colors.lineFaint,
  },
  itemHighlighted: {
    backgroundColor: 'rgba(232, 213, 181, 0.1)',
  },
  itemHighlightedDefault: {
    backgroundColor: 'rgba(186, 60, 71, 0.1)',
  },
  itemDisabled: {
    opacity: 0.4,
  },
  itemLeading: {
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: Typo(
    {
      fontSize: 14,
      lineHeight: 21,
      color: COLORS.agents.paleGold,
      flex: 1,
      ...(Platform.OS === 'web' ? ({ transition: 'color 0.15s ease' } as const) : {}),
    },
    'mono',
  ),
  itemTextDefault: Typo(
    {
      color: TOKENS.colors.navTextInactive,
      fontSize: 14,
      letterSpacing: 0.4,
    },
    'mono',
  ),
  itemTextWithSublabel: {
    flex: 0,
    flexGrow: 1,
  },
  itemTextHighlighted: {
    color: COLORS.agents.brightGold,
  },
  itemTextHighlightedDefault: {
    color: TOKENS.colors.text,
  },
  itemSublabel: Typo(
    {
      fontSize: 13,
      fontWeight: '700',
      color: COLORS.agents.paleGoldMuted,
      marginLeft: 12,
      ...(Platform.OS === 'web' ? ({ transition: 'color 0.15s ease' } as const) : {}),
    },
    'sans',
  ),
  itemSublabelDefault: {
    color: TOKENS.colors.textMuted,
  },
  itemSublabelHighlighted: {
    color: COLORS.agents.brightGold,
  },
  itemSublabelHighlightedDefault: {
    color: TOKENS.colors.textSecondary,
  },
});
