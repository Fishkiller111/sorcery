import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ImageBackground,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ShellLayout } from '../src/components/shell/ShellLayout';
import { PageBackground } from '../src/components/ui/PageBackground';
import { useI18n } from '../src/i18n/I18nContext';
import { COLORS } from '../src/theme/colors';
import { Typo } from '../src/theme/typography';
import { useMobilePageContentPaddingStyle } from '../src/hooks/useMobileSafeAreaPadding';

export default function Prologue() {
  const router = useRouter();
  const { t } = useI18n();
  const pageContentPadding = useMobilePageContentPaddingStyle();

  return (
    <ShellLayout scrollable={false}>
      <View style={[styles.container, pageContentPadding]}>
        <PageBackground variant="prologue" />

        <View style={styles.chapterHeader}>
          <Text style={styles.chapterBrand}>{t('index.chapterBrand')}</Text>
          <Image
            source={require('../assets/images/ui/prologue/prologue_header_divider.png')}
            style={styles.chapterDivider}
            resizeMode="contain"
          />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Image
            source={require('../assets/images/ui/prologue/title_mask.png')}
            style={styles.titleMask}
            resizeMode="contain"
          />

          <View style={styles.meta}>
            <Text style={styles.episode}>{t('index.episode')}</Text>
            <Text style={styles.subtitle}>{t('index.subtitle')}</Text>
          </View>

          <View style={styles.textboxWrap}>
            <Image
              source={require('../assets/images/ui/prologue/emblem_cccp_textbox.png')}
              style={styles.textboxEmblem}
              resizeMode="contain"
            />
            <ImageBackground
              source={require('../assets/images/ui/prologue/textbox_prologue.png')}
              style={styles.prologueBox}
              imageStyle={styles.prologueBoxImage}
              resizeMode="stretch"
            >
              <Image
                source={require('../assets/images/ui/prologue/textbox_redaction_bar.png')}
                style={styles.redactionBar}
                resizeMode="stretch"
              />
              <Text style={styles.prologueText}>{t('index.prologue1')}</Text>
              <Text style={styles.prologueText}>{t('index.prologue2')}</Text>
              <Image
                source={require('../assets/images/ui/prologue/divider_star.png')}
                style={styles.dateDivider}
                resizeMode="contain"
              />
              <Text style={styles.dateText}>{t('index.dateText')}</Text>
            </ImageBackground>
          </View>

          <TouchableOpacity
            style={styles.enterButton}
            onPress={() => router.push('/story')}
            activeOpacity={0.8}
          >
            <ImageBackground
              source={require('../assets/images/ui/prologue/button_enter_gold.png')}
              style={styles.enterButtonBg}
              imageStyle={styles.enterButtonImage}
              resizeMode="stretch"
            >
              <Text style={styles.enterText}>{t('index.enterDecorated')}</Text>
            </ImageBackground>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </ShellLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    zIndex: 1,
  },
  chapterHeader: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 2,
  },
  chapterBrand: Typo(
    {
      color: COLORS.soviet.stainLight,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 3,
      textTransform: 'uppercase',
      marginBottom: 6,
    },
    'sans',
  ),
  chapterDivider: {
    width: '78%',
    height: 16,
    opacity: 0.9,
  },
  scroll: {
    flex: 1,
    zIndex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 100,
    paddingBottom: 40,
    alignItems: 'center',
  },
  titleMask: {
    width: 260,
    height: 62,
    marginBottom: 14,
  },
  meta: {
    alignItems: 'center',
    marginBottom: 18,
  },
  episode: Typo(
    {
      color: COLORS.soviet.stainLight,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 2.5,
      textTransform: 'uppercase',
      marginBottom: 6,
    },
    'mono',
  ),
  subtitle: Typo(
    {
      color: COLORS.soviet.institutional,
      fontSize: 13,
      letterSpacing: 1,
    },
    'sans',
  ),
  textboxWrap: {
    width: '100%',
    maxWidth: 520,
    alignItems: 'center',
  },
  textboxEmblem: {
    width: 72,
    height: 72,
    marginBottom: -36,
    zIndex: 2,
  },
  prologueBox: {
    width: '100%',
    minHeight: 280,
    borderRadius: 4,
    overflow: 'hidden',
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 22,
  },
  prologueBoxImage: {
    borderRadius: 4,
  },
  redactionBar: {
    width: '100%',
    height: 36,
    marginBottom: 16,
    opacity: 0.95,
  },
  prologueText: Typo(
    {
      color: COLORS.soviet.parchment,
      fontSize: 13,
      lineHeight: 22,
      marginBottom: 14,
      opacity: 0.92,
    },
    'sans',
  ),
  dateDivider: {
    width: '100%',
    height: 12,
    marginBottom: 10,
    opacity: 0.85,
  },
  dateText: Typo(
    {
      color: COLORS.soviet.stainLight,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.8,
      textAlign: 'center',
    },
    'sans',
  ),
  enterButton: {
    width: '100%',
    maxWidth: 520,
    height: 58,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 18,
  },
  enterButtonBg: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  enterButtonImage: {
    borderRadius: 3,
  },
  enterText: Typo(
    {
      color: '#1a1208',
      fontSize: 14,
      letterSpacing: 1.2,
    },
    'display',
  ),
});
