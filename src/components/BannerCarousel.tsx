import { Image } from 'expo-image';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, FlatList, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import { colors } from '../config/theme';

/**
 * The API has no banner endpoint, so banners are the two hero images bundled from the website.
 * To make them dynamic later, add an endpoint and replace BANNERS with fetched data.
 */
const BANNERS: (number | string)[] = [
  'https://res.cloudinary.com/ni2pcrua/image/upload/v1789761496/eravenda-handyman-hero.jpg',
  require('../../assets/banners/eravenda-wholesale-retail-900.webp'),
  require('../../assets/banners/eratrends-900.webp'),
];

export function BannerCarousel({ onSlidePress }: { onSlidePress?: (index: number) => void }) {
  const { width } = useWindowDimensions();
  const [pageWidth, setPageWidth] = useState(Math.max(0, width - 20));
  const itemWidth = pageWidth || Math.max(0, width - 20);
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList>(null);
  const heroZoom = useRef(new Animated.Value(1)).current;
  const measureWidth = (event: LayoutChangeEvent) => {
    const measured = Math.round(event.nativeEvent.layout.width);
    if (measured > 0 && measured !== pageWidth) setPageWidth(measured);
  };

  // Auto-advance every 4s; the effect restarts after a manual swipe so it doesn't fight the user.
  useEffect(() => {
    const id = setInterval(() => {
      const next = (index + 1) % BANNERS.length;
      listRef.current?.scrollToIndex({ index: next, animated: true });
      setIndex(next);
    }, 4000);
    return () => clearInterval(id);
  }, [index]);

  useEffect(() => {
    heroZoom.setValue(1);
    const zoom = Animated.loop(Animated.sequence([
      Animated.timing(heroZoom, { toValue: 1.045, duration: 2100, useNativeDriver: true }),
      Animated.timing(heroZoom, { toValue: 1, duration: 2100, useNativeDriver: true }),
    ]));
    zoom.start();
    return () => zoom.stop();
  }, [heroZoom, index]);

  return (
    <View style={styles.wrap} onLayout={measureWidth}>
      <FlatList
        ref={listRef}
        data={BANNERS}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => String(i)}
        getItemLayout={(_, i) => ({ length: itemWidth, offset: itemWidth * i, index: i })}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / itemWidth))}
        renderItem={({ item, index: slide }) => <Pressable onPress={() => onSlidePress?.(slide)} accessibilityRole="button" accessibilityLabel={['Handyman Hub', 'EraVenda marketplace', 'EraTrends store'][slide]} style={{ width: itemWidth, height: itemWidth * 0.45, overflow: 'hidden' }}><Animated.View style={{ width: itemWidth, height: itemWidth * 0.45, transform: [{ scale: slide === index ? heroZoom : 1 }] }}><Image source={typeof item === 'string' ? { uri: item } : item} style={{ width: itemWidth, height: itemWidth * 0.45 }} contentFit="cover" transition={300} /></Animated.View></Pressable>}
      />
      <View style={styles.dots}>
        {BANNERS.map((_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', marginTop: 12, overflow: 'hidden' },
  dots: { flexDirection: 'row', justifyContent: 'center', marginTop: 8, gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
  dotActive: { width: 18, backgroundColor: colors.primaryButton },
});
