import React, { useState } from 'react';
import { View, StyleSheet, Text, Platform, useWindowDimensions } from 'react-native';
import { DefaultSegmentTabs } from './components/DefaultSegmentTabs';
import { DefaultBackButton } from './components/DefaultBackButton';
import { DefaultVoiceLibraryPanel } from './components/creation-center/DefaultVoiceLibraryPanel';
import { DefaultGenerateImagePanel } from './components/creation-center/DefaultGenerateImagePanel';
import { DefaultGenerateVideoPanel } from './components/creation-center/DefaultGenerateVideoPanel';
import { useI18n } from '../../i18n/I18nContext';
import { DefaultShell } from './components/DefaultShell';
import { Typo } from '../../theme/typography';
import { TOKENS } from './theme/tokens';
import { useMobilePageContentPaddingStyle } from '../../hooks/useMobileSafeAreaPadding';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import { safeGoBack } from '../../utils/safeGoBack';

type CreationTab = 'voice' | 'image' | 'video';

/** 与生图 / 生视频面板保持一致的三列阈值 */
const STUDIO_SPLIT_MIN_WIDTH = 842;

type DefaultCreationCenterProps = {
  initialTab?: CreationTab;
  showTabs?: boolean;
};

export function DefaultCreationCenter({
  initialTab = 'image',
  showTabs = true,
}: DefaultCreationCenterProps) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<CreationTab>(initialTab);

  return (
    <View style={[styles.wrap, !showTabs && styles.wrapFill]}>
      {showTabs ? (
        <DefaultSegmentTabs
          tabs={[
            { key: 'voice', label: t('creationCenter.tabVoice') },
            { key: 'image', label: t('creationCenter.tabImage') },
            { key: 'video', label: t('creationCenter.tabVideo') },
          ]}
          activeKey={activeTab}
          onChange={setActiveTab}
        />
      ) : null}

      <View style={[styles.panel, !showTabs && styles.panelFill]}>
        {activeTab === 'voice' ? (
          <DefaultVoiceLibraryPanel />
        ) : activeTab === 'video' ? (
          <DefaultGenerateVideoPanel />
        ) : (
          <DefaultGenerateImagePanel />
        )}
      </View>
    </View>
  );
}

export function DefaultCreationCenterPage({
  initialTab = 'image',
  title,
}: {
  initialTab?: CreationTab;
  title: string;
}) {
  const pageContentPadding = useMobilePageContentPaddingStyle();
  /** 生图 / 生视频宽屏工作室：锁定单视口，列内滚动 */
  const isMediaStudio = initialTab === 'video' || initialTab === 'image';
  const isAppDesktop = useIsDesktop();
  const { width: windowWidth } = useWindowDimensions();
  const studioContentWidth =
    windowWidth -
    (isAppDesktop ? TOKENS.layout.sidebarWidth : 0) -
    TOKENS.layout.contentPadding * 2;
  /** 仅宽屏三列锁定视口高度；窄屏仍整页滚动 */
  const lockStudioHeight = isMediaStudio && studioContentWidth >= STUDIO_SPLIT_MIN_WIDTH;

  return (
    <DefaultShell scrollable={!lockStudioHeight}>
      <View style={[styles.page, pageContentPadding, lockStudioHeight && styles.pageStudio]}>
        <DefaultBackButton accessibilityLabel="Back" onPress={() => safeGoBack('/create-agent')} />
        <Text style={[styles.pageTitle, lockStudioHeight && styles.pageTitleStudio]}>{title}</Text>
        <View style={lockStudioHeight ? styles.studioPanel : undefined}>
          <DefaultCreationCenter initialTab={initialTab} showTabs={false} />
        </View>
      </View>
    </DefaultShell>
  );
}

const styles = StyleSheet.create({
  page: {
    width: '100%',
    paddingHorizontal: TOKENS.layout.contentPadding,
    paddingTop: 24,
    paddingBottom: 24,
    gap: 18,
  },
  /** 生图/生视频三列工作室：页头占固有高度，剩余全给 studioPanel（flex:1） */
  pageStudio: {
    flex: 1,
    minHeight: 0,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 10,
    ...(Platform.OS === 'web'
      ? ({
          display: 'flex',
          flexDirection: 'column',
        } as object)
      : {}),
  },
  studioPanel: {
    flex: 1,
    minHeight: 0,
    width: '100%',
  },
  pageTitle: Typo(
    {
      color: TOKENS.colors.text,
      fontSize: 28,
      lineHeight: 34,
      textAlign: 'center',
      letterSpacing: 0.4,
    },
    'serif',
  ),
  /** 工作室页压缩页头，把高度留给三列 */
  pageTitleStudio: {
    fontSize: 22,
    lineHeight: 28,
  },
  wrap: {
    width: '100%',
    gap: 16,
  },
  wrapFill: {
    flex: 1,
    minHeight: 0,
    width: '100%',
  },
  panel: {
    width: '100%',
  },
  panelFill: {
    flex: 1,
    minHeight: 0,
    width: '100%',
  },
});
