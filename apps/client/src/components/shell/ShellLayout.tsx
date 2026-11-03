import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import { BottomNav } from './BottomNav';
import { SideNav } from './SideNav';
import { GrainOverlay } from '../common/GrainOverlay';
import { LangToggle } from '../common/LangToggle';
import { COLORS } from '../../theme/colors';
import { SIDEBAR_WIDTH } from '../../constants/layout';
import { APP_NAV_ITEMS, APP_NAV_ITEMS_MOBILE } from '../../constants/appNav';

interface ShellLayoutProps {
  children: React.ReactNode;
  scrollable?: boolean;
  showLangToggle?: boolean;
}

export function ShellLayout({ children, scrollable = true, showLangToggle = true }: ShellLayoutProps) {
  const isDesktop = useIsDesktop();

  const childrenWrapper = (
    <View
      style={[
        styles.children,
        scrollable && styles.childrenScrollable,
        isDesktop && styles.childrenDesktop,
      ]}
    >
      {children}
    </View>
  );

  const body = scrollable ? (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[styles.scrollContent, isDesktop && styles.scrollContentDesktop]}
      showsVerticalScrollIndicator={false}
    >
      {childrenWrapper}
    </ScrollView>
  ) : (
    <View style={[styles.staticContent, isDesktop && styles.staticContentDesktop]}>
      {childrenWrapper}
    </View>
  );

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <GrainOverlay />
      {showLangToggle ? <LangToggle /> : null}

      <View style={styles.body}>{body}</View>

      {isDesktop ? (
        <SideNav items={APP_NAV_ITEMS} />
      ) : (
        <BottomNav items={APP_NAV_ITEMS_MOBILE} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg.primary,
  },
  body: {
    flex: 1,
    minHeight: 0,
  },
  scrollView: {
    flex: 1,
    zIndex: 20,
  },
  scrollContent: {
    minHeight: '100%',
    flexGrow: 1,
  },
  scrollContentDesktop: {
    paddingLeft: SIDEBAR_WIDTH,
  },
  staticContent: {
    flex: 1,
    zIndex: 20,
  },
  staticContentDesktop: {
    paddingLeft: SIDEBAR_WIDTH,
  },
  children: {
    flex: 1,
  },
  childrenScrollable: {},
  childrenDesktop: {
    paddingBottom: 0,
  },
});
