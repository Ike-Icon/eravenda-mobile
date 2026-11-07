import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../config/theme';
import type { OrderStatus } from '../types/api';
import { stepIndex, TRACK_STEPS } from '../utils/orders';

/** Four-step progress bar: Placed → Processing → Dispatched → Delivered. */
export function OrderTracker({ status }: { status: OrderStatus }) {
  if (status === 'cancelled' || status === 'refunded') {
    return (
      <View style={styles.cancel}>
        <Ionicons name="close-circle" size={20} color={colors.danger} />
        <Text style={{ color: colors.danger, fontWeight: '700', textTransform: 'capitalize' }}>Order {status}</Text>
      </View>
    );
  }
  const active = stepIndex(status);
  return (
    <View style={styles.wrap}>
      {TRACK_STEPS.map((label, i) => {
        const done = i <= active;
        return (
          <View key={label} style={styles.step}>
            <View style={styles.lineRow}>
              <View style={[styles.line, i > 0 && done && styles.lineDone, i === 0 && { backgroundColor: 'transparent' }]} />
              <View style={[styles.dot, done && styles.dotDone]}>{done && <Ionicons name="checkmark" size={12} color={colors.white} />}</View>
              <View style={[styles.line, i < TRACK_STEPS.length - 1 && i < active && styles.lineDone, i === TRACK_STEPS.length - 1 && { backgroundColor: 'transparent' }]} />
            </View>
            <Text style={[styles.label, done && { color: colors.primary, fontWeight: '700' }]}>{label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row' },
  step: { flex: 1, alignItems: 'center' },
  lineRow: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  line: { flex: 1, height: 3, backgroundColor: colors.border },
  lineDone: { backgroundColor: colors.primaryButton },
  dot: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  dotDone: { backgroundColor: colors.primaryButton },
  label: { marginTop: 6, fontSize: 11, color: colors.textMuted },
  cancel: { flexDirection: 'row', gap: 8, alignItems: 'center' },
});
