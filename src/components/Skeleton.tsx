import React, { useEffect, useRef } from 'react';
import { Animated, DimensionValue, StyleSheet, View, ViewStyle } from 'react-native';
import { colors, radius } from '../config/theme';

/** Pulsing placeholder block shown while data loads. */
export function Skeleton({ width = '100%', height = 16, style }: { width?: DimensionValue; height?: number; style?: ViewStyle }) {
  const opacity = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return <Animated.View style={[{ width, height, backgroundColor: colors.skeleton, borderRadius: radius.sm, opacity }, style]} />;
}

/** Skeleton shaped like a ProductCard so the grid doesn't jump when real data arrives. */
export function ProductCardSkeleton() {
  return (
    <View style={styles.card}>
      <Skeleton height={150} style={{ borderRadius: radius.md }} />
      <Skeleton width="85%" height={14} style={{ marginTop: 10 }} />
      <Skeleton width="50%" height={14} style={{ marginTop: 8 }} />
    </View>
  );
}

const styles = StyleSheet.create({ card: { flex: 1, margin: 6, padding: 8 } });
