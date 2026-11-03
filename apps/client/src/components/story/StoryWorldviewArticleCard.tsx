import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Typo, FONT_FAMILY } from '../../theme/typography';
import { useI18n } from '../../i18n/I18nContext';

const SCENE_ROW_BG = require('../../../assets/images/ui/story/scene_row_bg.png');

const PAPER_ACTION = '#8B2318';
const PAPER_BODY = '#3D3834';

const EMPHASIS_SANS = {
  fontFamily: FONT_FAMILY.sansBold,
  fontWeight: '800' as const,
  ...(Platform.OS === 'web' ? ({ fontSynthesis: 'weight' } as object) : {}),
};

const FLOW_WEB = { display: 'flow-root' } as object;
const IMAGE_FLOAT = {
  float: 'left',
  marginRight: 12,
  marginBottom: 8,
} as object;
const TITLE_ROW = {
  overflow: 'hidden',
  marginBottom: 8,
} as object;

export function splitArticleParagraphs(text: string): string[] {
  const byBlankLine = text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  if (byBlankLine.length > 1) return byBlankLine;
  return text.split(/\n+/).map((p) => p.trim()).filter(Boolean);
}

export interface StoryWorldviewArticleCardProps {
  title: string;
  imageUrl?: string | null;
  body: string;
}

export function StoryWorldviewArticleCard({ title, imageUrl, body }: StoryWorldviewArticleCardProps) {
  const { lang } = useI18n();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const trimmedBody = body.trim();
  const imageWidth = Math.round(Math.min(200, Math.max(120, width * 0.32)));
  const paragraphs = splitArticleParagraphs(trimmedBody);

  if (!trimmedBody && !imageUrl) return null;

  const imageNode = imageUrl ? (
    <View style={[styles.imageWrap, { width: imageWidth }, isWeb && IMAGE_FLOAT]}>
      <ExpoImage source={{ uri: imageUrl }} style={styles.image} contentFit="cover" />
    </View>
  ) : null;

  const paragraphNodesNative = paragraphs.map((paragraph, index) => (
    <Text
      key={index}
      style={[Typo(styles.bodyText, 'sans', lang), index > 0 && styles.bodyParagraph]}
    >
      {paragraph}
    </Text>
  ));

  const paragraphNodeWeb = paragraphs.length > 0 ? (
    <Text style={Typo(styles.bodyText, 'sans', lang)}>
      {paragraphs.map((paragraph, index) => (
        <React.Fragment key={index}>
          {index > 0 ? '\n\n' : null}
          {paragraph}
        </React.Fragment>
      ))}
    </Text>
  ) : null;

  return (
    <View style={styles.card}>
      <ExpoImage source={SCENE_ROW_BG} style={styles.bgFill} contentFit="fill" pointerEvents="none" />
      {isWeb ? (
        <View style={FLOW_WEB}>
          {imageNode}
          <View style={TITLE_ROW}>
            <Text style={styles.title}>{title}</Text>
          </View>
          {paragraphNodeWeb}
        </View>
      ) : (
        <View style={[styles.layout, !imageUrl && styles.layoutStack]}>
          {imageNode}
          <View style={styles.textCol}>
            <Text style={styles.title}>{title}</Text>
            {paragraphNodesNative}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    borderRadius: 4,
    overflow: 'hidden',
    padding: 14,
  },
  bgFill: {
    ...StyleSheet.absoluteFill,
  },
  layout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  layoutStack: {
    flexDirection: 'column',
  },
  imageWrap: {
    flexShrink: 0,
    aspectRatio: 16 / 10,
    borderRadius: 3,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(44, 38, 32, 0.15)',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  textCol: {
    flex: 1,
    gap: 8,
    minWidth: 0,
  },
  title: {
    ...EMPHASIS_SANS,
    color: PAPER_ACTION,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: 0.4,
  },
  bodyText: {
    color: PAPER_BODY,
    fontSize: 13,
    lineHeight: 21,
    fontWeight: '700',
  },
  bodyParagraph: {
    marginTop: 10,
  },
});
