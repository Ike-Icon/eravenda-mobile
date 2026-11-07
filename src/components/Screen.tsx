import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { colors } from '../config/theme';
import { usePreferences } from '../context/PreferencesContext';
import { AppFooter } from './AppFooter';

/**
 * Wraps screen content below the persistent root navigation. The global header
 * handles the status-bar inset; each screen can still opt into a top inset when needed.
 */
export function Screen({ children, edges = ['bottom', 'left', 'right'], style, showFooter = true }: { children: React.ReactNode; edges?: Edge[]; style?: ViewStyle; showFooter?: boolean }) {
  const { isDark } = usePreferences();
  return (
    <SafeAreaView edges={edges} style={[styles.root, isDark && styles.darkRoot, style]}>
      <View style={styles.content}>{children}</View>
      {showFooter && <AppFooter />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.background }, darkRoot: { backgroundColor: '#101714' }, content: { flex: 1, minHeight: 0 } });
