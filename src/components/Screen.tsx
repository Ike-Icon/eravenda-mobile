import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { colors } from '../config/theme';

/**
 * Wraps screen content below the persistent root navigation. The global header
 * handles the status-bar inset; each screen can still opt into a top inset when needed.
 */
export function Screen({ children, edges = ['bottom', 'left', 'right'], style }: { children: React.ReactNode; edges?: Edge[]; style?: ViewStyle }) {
  return (
    <SafeAreaView edges={edges} style={[styles.root, style]}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.background } });
