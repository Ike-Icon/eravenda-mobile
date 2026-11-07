import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, font, radius, shadow } from '../config/theme';
import { usePreferences } from '../context/PreferencesContext';
import type { Product } from '../types/api';
import { discountPercent, effectivePrice, formatPrice, inStock, primaryImage } from '../utils/format';

interface Props {
  product: Product;
  wished?: boolean;
  onPress: () => void;
  onToggleWishlist?: () => void;
  onAddToCart?: () => Promise<void> | void;
}

/** Product tile used in the Home grid (2 columns). */
export function ProductCard({ product, wished, onPress, onToggleWishlist, onAddToCart }: Props) {
  const discountPercentValue = discountPercent(product);
  const available = inStock(product);
  const { isDark } = usePreferences();
  const [adding, setAdding] = useState(false);
  const add = async () => {
    if (!onAddToCart || adding || !available) return;
    setAdding(true);
    try { await onAddToCart(); } finally { setAdding(false); }
  };
  return (
    <View style={[styles.card, isDark && styles.cardDark]}>
      <View style={styles.imageWrap}>
        <Image source={{ uri: primaryImage(product) }} style={styles.image} contentFit="cover" transition={150} />
        {product.sales_type === 'wholesale' && (
          <View style={styles.wholesale}>
            <Text style={styles.badgeText}>Wholesale · min {product.wholesale_min_quantity ?? 2}</Text>
          </View>
        )}
        {onToggleWishlist && (
          <Pressable onPress={onToggleWishlist} hitSlop={10} style={styles.heart} accessibilityLabel="Toggle wishlist">
            <Ionicons name={wished ? 'heart' : 'heart-outline'} size={18} color={wished ? colors.danger : isDark ? '#F0F5F2' : colors.text} />
          </Pressable>
        )}
      </View>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={product.name}>
      <Text numberOfLines={2} style={[styles.name, isDark && styles.nameDark]}>
        {product.name}
      </Text>
      <View style={styles.priceRow}>
        <Text style={styles.price}>{formatPrice(effectivePrice(product))}</Text>
        {discountPercentValue > 0 && <Text style={[styles.old, isDark && styles.metaDark]}>{formatPrice(product.price)}</Text>}
      </View>
      <View style={styles.metaRow}>
        {product.review_count > 0 ? (
          <Text style={[styles.meta, isDark && styles.metaDark]}>
            <Ionicons name="star" size={12} color={colors.accent} /> {product.average_rating.toFixed(1)} ({product.review_count})
          </Text>
        ) : (
          <Text style={[styles.meta, isDark && styles.metaDark]}>No reviews yet</Text>
        )}
        {!available && <Text style={styles.out}>Out of stock</Text>}
      </View>
      </Pressable>
      {onAddToCart && <Pressable onPress={() => void add()} disabled={!available || adding} style={({ pressed }) => [styles.addButton, (!available || adding) && styles.addDisabled, pressed && styles.addPressed]} accessibilityRole="button" accessibilityLabel={`Add ${product.name} to cart`} accessibilityState={{ disabled: !available || adding }}>
        {adding ? <ActivityIndicator size="small" color={colors.white} /> : <><Ionicons name="cart-outline" size={16} color={colors.white} /><Text style={styles.addText}>Add to Cart</Text></>}
      </Pressable>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, margin: 6, padding: 8, backgroundColor: colors.surface, borderRadius: radius.lg, ...shadow.card },
  cardDark: { backgroundColor: '#17221D', shadowOpacity: 0.22 },
  imageWrap: { position: 'relative' },
  image: { width: '100%', height: 150, borderRadius: radius.md, backgroundColor: colors.skeleton },
  wholesale: { position: 'absolute', bottom: 8, left: 8, backgroundColor: colors.primaryButton, borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { color: colors.white, fontSize: 11, fontWeight: '800' },
  heart: { position: 'absolute', top: 8, right: 8, backgroundColor: colors.surface, borderRadius: radius.pill, padding: 6 },
  name: { marginTop: 8, fontSize: font.sm, color: colors.text, minHeight: 34 },
  nameDark: { color: '#F0F5F2' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  price: { fontSize: font.md, fontWeight: '800', color: colors.primary },
  old: { fontSize: 12, color: colors.textMuted, textDecorationLine: 'line-through' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  meta: { fontSize: 12, color: colors.textMuted },
  metaDark: { color: '#A4B3AA' },
  out: { fontSize: 12, color: colors.danger, fontWeight: '700' },
  addButton: { minHeight: 36, marginTop: 9, borderRadius: radius.md, backgroundColor: colors.primaryButton, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  addDisabled: { opacity: 0.5 },
  addPressed: { opacity: 0.82 },
  addText: { color: colors.white, fontSize: 11, fontWeight: '800' },
});
