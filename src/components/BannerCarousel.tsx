import { Image } from 'expo-image';
import React, { useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { colors, radius } from '../config/theme';

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
  const itemWidth = width - 32; // 16pt page padding each side
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList>(null);

  // Auto-advance every 4s; the effect restarts after a manual swipe so it doesn't fight the user.
  useEffect(() => {
    const id = setInterval(() => {
      const next = (index + 1) % BANNERS.length;
      listRef.current?.scrollToIndex({ index: next, animated: true });
      setIndex(next);
    }, 4000);
    return () => clearInterval(id);
  }, [index]);

  return (
    <View style={styles.wrap}>
      <FlatList
        ref={listRef}
        data={BANNERS}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => String(i)}
        getItemLayout={(_, i) => ({ length: itemWidth, offset: itemWidth * i, index: i })}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / itemWidth))}
        renderItem={({ item, index: slide }) => <Pressable onPress={() => onSlidePress?.(slide)} accessibilityRole="button" accessibilityLabel={['Handyman Hub', 'EraVenda marketplace', 'EraTrends store'][slide]}><Image source={typeof item === 'string' ? { uri: item } : item} style={{ width: itemWidth, height: itemWidth * 0.45, borderRadius: radius.lg }} contentFit="cover" /></Pressable>}
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
  wrap: { marginHorizontal: 16, marginTop: 12 },
  dots: { flexDirection: 'row', justifyContent: 'center', marginTop: 8, gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
  dotActive: { width: 18, backgroundColor: colors.primary },
});
