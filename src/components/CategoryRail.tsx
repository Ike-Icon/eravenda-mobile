import { Image } from 'expo-image';
import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../config/theme';
import type { Category } from '../types/api';
import { absoluteUrl } from '../utils/format';
import { Skeleton } from './Skeleton';
import { usePreferences } from '../context/PreferencesContext';

interface Props {
  categories: Category[] | null; // null = still loading
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export const CATEGORY_IMAGES: Record<string, number> = {
  'auto-accessories': require('../../assets/categories/auto-accessories.png'),
  'audio-wearables': require('../../assets/categories/audio-wearables.png'),
  'home-decor': require('../../assets/categories/home-decor.png'),
  'baby-care': require('../../assets/categories/baby-care.png'),
  'tools-home-improvement': require('../../assets/categories/tools-home-improvement.png'),
  'mobile-accessories': require('../../assets/categories/mobile-accessories.png'),
  furniture: require('../../assets/categories/furniture.png'),
  'mens-wear': require('../../assets/categories/mens-wear.png'),
  'packaged-foods': require('../../assets/categories/packaged-foods.png'),
  'sports-equipment': require('../../assets/categories/sports-equipment.png'),
  footwear: require('../../assets/categories/footwear.png'),
  'womens-wear': require('../../assets/categories/womens-wear.png'),
  'household-supplies': require('../../assets/categories/household-supplies.png'),
  skincare: require('../../assets/categories/skincare.png'),
  'toys-games': require('../../assets/categories/toys-games.png'),
  'bags-accessories': require('../../assets/categories/bags-accessories.png'),
  'bedding-bath': require('../../assets/categories/bedding-bath.png'),
  'computers-office': require('../../assets/categories/computers-office.png'),
  'makeup-cosmetics': require('../../assets/categories/makeup-cosmetics.png'),
  beverages: require('../../assets/categories/beverages.png'),
  'home-entertainment': require('../../assets/categories/home-entertainment.png'),
  'outdoor-gear': require('../../assets/categories/outdoor-gear.png'),
  haircare: require('../../assets/categories/haircare.png'),
  'personal-care': require('../../assets/categories/personal-care.png'),
  'cleaning-supplies': require('../../assets/categories/cleaning-supplies.png'),
  'kitchen-dining': require('../../assets/categories/kitchen-dining.png'),
  'fitness-exercise': require('../../assets/categories/fitness-exercise.png'),
};

/** Horizontal category chips. Tapping the active one clears the filter. */
export function CategoryRail({ categories, selectedId, onSelect }: Props) {
  const { isDark } = usePreferences();
  if (!categories) {
    return (
      <View style={styles.row}>
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} width={64} height={80} style={{ marginRight: 12, borderRadius: radius.md }} />
        ))}
      </View>
    );
  }
  return (
    <FlatList
      horizontal
      data={categories}
      keyExtractor={(c) => c.id}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      renderItem={({ item }) => {
        const active = item.id === selectedId;
        return (
          <Pressable onPress={() => onSelect(active ? null : item.id)} style={styles.item} accessibilityRole="button" accessibilityLabel={item.name}>
            <View style={[styles.circle, isDark && styles.circleDark, active && styles.circleActive]}>
              <CategoryIcon uri={absoluteUrl(item.icon_url)} slug={item.slug} />
            </View>
            <Text numberOfLines={2} style={[styles.label, isDark && styles.labelDark, active && { color: colors.primary, fontWeight: '800' }]}>
              {item.name}
            </Text>
          </Pressable>
        );
      }}
    />
  );
}

export function CategoryIcon({ uri, slug }: { uri?: string; slug: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [uri, slug]);
  const localImage = CATEGORY_IMAGES[slug.trim().toLowerCase().replace(/_/g, '-')];
  return uri && !failed ? (
    <Image source={{ uri }} style={styles.icon} contentFit="cover" onError={() => setFailed(true)} />
  ) : localImage ? (
    <Image source={localImage} style={styles.icon} contentFit="cover" />
  ) : (
    <Ionicons name="pricetag-outline" size={24} color={colors.primary} style={{ alignSelf: 'center', marginTop: 16 }} />
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row' },
  item: { width: 72, alignItems: 'center', marginRight: 12 },
  circle: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.primarySoft, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent' },
  circleDark: { backgroundColor: '#26352E' },
  circleActive: { borderColor: colors.primary },
  icon: { width: '100%', height: '100%' },
  label: { marginTop: 6, fontSize: 11, textAlign: 'center', color: colors.text },
  labelDark: { color: '#E7F0EA' },
});
