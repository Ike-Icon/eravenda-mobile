import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, font, radius, shadow } from '../config/theme';
import type { Product } from '../types/api';
import { discountPercent, effectivePrice, formatPrice, inStock, primaryImage } from '../utils/format';

interface Props {
  product: Product;
  wished?: boolean;
  onPress: () => void;
  onToggleWishlist?: () => void;
}

/** Product tile used in the Home grid (2 columns). */
export function ProductCard({ product, wished, onPress, onToggleWishlist }: Props) {
  const off = discountPercent(product);
  const available = inStock(product);
  return (
    <Pressable onPress={onPress} style={styles.card} accessibilityRole="button" accessibilityLabel={product.name}>
      <View>
        <Image source={{ uri: primaryImage(product) }} style={styles.image} contentFit="cover" transition={150} />
        {product.sales_type === 'wholesale' && (
          <View style={styles.wholesale}>
            <Text style={styles.badgeText}>Wholesale · min {product.wholesale_min_quantity ?? 2}</Text>
          </View>
        )}
        {off > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>-{off}%</Text>
          </View>
        )}
        {onToggleWishlist && (
          <Pressable onPress={onToggleWishlist} hitSlop={10} style={styles.heart} accessibilityLabel="Toggle wishlist">
            <Ionicons name={wished ? 'heart' : 'heart-outline'} size={18} color={wished ? colors.danger : colors.text} />
          </Pressable>
        )}
      </View>
      <Text numberOfLines={2} style={styles.name}>
        {product.name}
      </Text>
      <View style={styles.priceRow}>
        <Text style={styles.price}>{formatPrice(effectivePrice(product))}</Text>
        {off > 0 && <Text style={styles.old}>{formatPrice(product.price)}</Text>}
      </View>
      <View style={styles.metaRow}>
        {product.review_count > 0 ? (
          <Text style={styles.meta}>
            <Ionicons name="star" size={12} color={colors.accent} /> {product.average_rating.toFixed(1)} ({product.review_count})
          </Text>
        ) : (
          <Text style={styles.meta}>No reviews yet</Text>
        )}
        {!available && <Text style={styles.out}>Out of stock</Text>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, margin: 6, padding: 8, backgroundColor: colors.surface, borderRadius: radius.lg, ...shadow.card },
  image: { width: '100%', height: 150, borderRadius: radius.md, backgroundColor: colors.skeleton },
  badge: { position: 'absolute', top: 8, left: 8, backgroundColor: colors.danger, borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 2 },
  wholesale: { position: 'absolute', bottom: 8, left: 8, backgroundColor: colors.primary, borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { color: colors.white, fontSize: 11, fontWeight: '800' },
  heart: { position: 'absolute', top: 8, right: 8, backgroundColor: colors.surface, borderRadius: radius.pill, padding: 6 },
  name: { marginTop: 8, fontSize: font.sm, color: colors.text, minHeight: 34 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  price: { fontSize: font.md, fontWeight: '800', color: colors.primary },
  old: { fontSize: 12, color: colors.textMuted, textDecorationLine: 'line-through' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  meta: { fontSize: 12, color: colors.textMuted },
  out: { fontSize: 12, color: colors.danger, fontWeight: '700' },
});
