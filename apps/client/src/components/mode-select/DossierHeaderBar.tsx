import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Platform, ImageBackground } from 'react-native';
import { useI18n } from '../../i18n/I18nContext';
import { Typo } from '../../theme/typography';

/** Bar height / width — matches `pc-card_info_bg.png` (1234×146). */
export const DOSSIER_BAR_ASPECT = 146 / 1234;

const CARD_INFO_CAP = { left: 52, top: 24, right: 36, bottom: 24 };

type DossierHeaderBarProps = {
  width: number;
  /** Reserve space on the right so overlapping emblem does not cover meta text. */
  rightInset?: number;
};

type MetaFieldProps = {
  label: string;
  value: string;
  labelSize: number;
  valueSize: number;
  gap: number;
};

function MetaField({ label, labelSize, value, valueSize, gap }: MetaFieldProps) {
  return (
    <View style={{ gap }}>
      <Text style={[styles.metaLabel, { fontSize: labelSize, lineHeight: labelSize * 1.3 }]}>
        {label}:
      </Text>
      <Text style={[styles.metaValue, { fontSize: valueSize, lineHeight: valueSize * 1.1 }]}>
        {value}
      </Text>
    </View>
  );
}

export function DossierHeaderBar({ width, rightInset = 0 }: DossierHeaderBarProps) {
  const { t } = useI18n();

  const scaled = useMemo(() => {
    const height = Math.round(width * DOSSIER_BAR_ASPECT);
    const chamfer = Math.max(6, Math.round(height * 0.11));
    const padX = Math.round(width * 0.04);
    const padY = Math.round(height * 0.14);
    return {
      height,
      chamfer,
      padX,
      padY,
      labelSize: Math.max(7, Math.round(height * 0.1)),
      valueSize: Math.max(9, Math.round(height * 0.13)),
      titleSize: Math.max(14, Math.round(height * 0.24)),
      subtitleSize: Math.max(8, Math.round(height * 0.11)),
      metaRowSize: Math.max(7, Math.round(height * 0.095)),
      fieldGap: Math.max(4, Math.round(height * 0.06)),
      metaGap: Math.max(2, Math.round(height * 0.035)),
    };
  }, [width]);

  const clipStyle =
    Platform.OS === 'web'
      ? ({
          clipPath: `polygon(${scaled.chamfer}px 0, 100% 0, 100% 100%, ${scaled.chamfer}px 100%, 0 calc(100% - ${scaled.chamfer}px), 0 ${scaled.chamfer}px)`,
        } as object)
      : null;

  return (
    <View style={[styles.root, { width, height: scaled.height }]}>
      <ImageBackground
        source={require('../../../assets/images/ui/mode-select/pc-card_info_bg.png')}
        style={[
          styles.bar,
          clipStyle,
          {
            width,
            height: scaled.height,
            paddingHorizontal: scaled.padX,
            paddingVertical: scaled.padY,
            paddingRight: scaled.padX + rightInset,
          },
        ]}
        imageStyle={styles.barImage}
        resizeMode="stretch"
        capInsets={CARD_INFO_CAP}
      >
        <View style={styles.row}>
          <View style={[styles.leftCol, { gap: scaled.fieldGap }]}>
            <MetaField
              label={t('modeSelect.classification')}
              value={t('modeSelect.topSecret')}
              labelSize={scaled.labelSize}
              valueSize={scaled.valueSize}
              gap={scaled.metaGap}
            />
            <MetaField
              label={t('modeSelect.clearance')}
              value={t('modeSelect.levelRed')}
              labelSize={scaled.labelSize}
              valueSize={scaled.valueSize}
              gap={scaled.metaGap}
            />
          </View>

          <View style={styles.centerCol}>
            <Text
              style={[
                styles.title,
                { fontSize: scaled.titleSize, lineHeight: scaled.titleSize * 1.05, letterSpacing: scaled.titleSize * 0.04 },
              ]}
            >
              {t('modeSelect.dossierLabel').toUpperCase()}
            </Text>
            <Text
              style={[
                styles.subtitle,
                { fontSize: scaled.subtitleSize, lineHeight: scaled.subtitleSize * 1.35, marginTop: scaled.metaGap },
              ]}
            >
              {t('modeSelect.dossierNumber')}
            </Text>
          </View>

          <View style={[styles.rightCol, { gap: scaled.metaGap, maxWidth: Math.max(72, width * 0.28 - rightInset) }]}>
            <Text style={[styles.metaRow, { fontSize: scaled.metaRowSize, lineHeight: scaled.metaRowSize * 1.35 }]}>
              {t('modeSelect.issued')}: {t('modeSelect.issuedDate')}
            </Text>
            <Text style={[styles.metaRow, { fontSize: scaled.metaRowSize, lineHeight: scaled.metaRowSize * 1.35 }]}>
              {t('modeSelect.revised')}: {t('modeSelect.revisedDate')}
            </Text>
            <Text style={[styles.metaRow, { fontSize: scaled.metaRowSize, lineHeight: scaled.metaRowSize * 1.35 }]}>
              {t('modeSelect.officer')}: {t('modeSelect.officerId')}
            </Text>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'relative',
    alignSelf: 'center',
  },
  bar: {
    overflow: 'hidden',
  },
  barImage: {
    width: '100%',
    height: '100%',
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftCol: {
    flexShrink: 0,
    minWidth: '18%',
  },
  centerCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  rightCol: {
    flexShrink: 0,
    alignItems: 'flex-end',
    minWidth: '22%',
  },
  metaLabel: Typo(
    {
      color: 'rgba(168, 168, 168, 0.88)',
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    'mono',
  ),
  metaValue: Typo(
    {
      color: '#6e2a2a',
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    'sans',
  ),
  title: Typo(
    {
      color: 'rgba(228, 224, 214, 0.95)',
      textTransform: 'uppercase',
      textAlign: 'center',
    },
    'display',
  ),
  subtitle: Typo(
    {
      color: 'rgba(168, 168, 168, 0.82)',
      textAlign: 'center',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    'mono',
  ),
  metaRow: Typo(
    {
      color: 'rgba(168, 168, 168, 0.82)',
      textAlign: 'right',
      letterSpacing: 0.4,
    },
    'mono',
  ),
});
