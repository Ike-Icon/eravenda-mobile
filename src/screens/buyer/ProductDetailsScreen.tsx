/**
 * PRODUCT DETAILS
 * GET /products/{id} -> gallery, price, stock, variants, description.
 * "Add to Cart" -> POST /cart/items (needs login; guests are sent to Login).
 * "Buy Now"     -> add to cart, then jump to the Cart tab.
 */
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Image } from 'expo-image';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Platform, Pressable, ScrollView, Share, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { Skeleton } from '../../components/Skeleton';
import { colors, font, radius } from '../../config/theme';
import { SITE_ORIGIN } from '../../config/env';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import type { RootStackParamList } from '../../navigation/types';
import { catalogService } from '../../services/catalogService';
import type { Product, Store } from '../../types/api';
import { absoluteUrl, effectivePrice, formatPrice, inStock } from '../../utils/format';
import { optionPrices, variantEntries, type VariantEntry } from '../../utils/variants';

type Props = NativeStackScreenProps<RootStackParamList, 'ProductDetails'>;

/** Descriptions are sanitised HTML on the server; show them as plain text in the app. */
const stripHtml = (s: string) =>
  s.replace(/<br\s*\/?>|<\/p>|<\/li>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\n{3,}/g, '\n\n').trim();

export function ProductDetailsScreen({ route, navigation }: Props) {
  const { width } = useWindowDimensions();
  const { status } = useAuth();
  const { addItem, wishlistIds, toggleWishlist } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imageIndex, setImageIndex] = useState(0);
  const [qty, setQty] = useState(1);
  const [color, setColor] = useState<string | null>(null);
  const [size, setSize] = useState<string | null>(null);
  const [option, setOption] = useState<string | null>(null);
  const [busy, setBusy] = useState<'cart' | 'buy' | null>(null);

  useEffect(() => {
    catalogService
      .product(route.params.productId)
      .then((p) => {
        setProduct(p);
        // Vendor info is best-effort: the page still works if the store lookup fails.
        catalogService.store(p.store_id).then(setStore).catch(() => undefined);
      })
      .catch((e) => setError(e.message));
  }, [route.params.productId]);

  if (error) {
    return (
      <Screen>
        <Text style={styles.center}>{error}</Text>
      </Screen>
    );
  }
  if (!product) {
    return (
      <Screen>
        <Skeleton height={width} style={{ borderRadius: 0 }} />
        <View style={{ padding: 16, gap: 10 }}>
          <Skeleton width="80%" height={22} />
          <Skeleton width="40%" height={22} />
          <Skeleton height={80} />
        </View>
      </Screen>
    );
  }

  const colorsList = variantEntries(product.colors);
  const sizesList = variantEntries(product.sizes);
  const optionsList = variantEntries(product.options);
  const available = inStock(product);

  // A priced option (e.g. "500ml") replaces the product price, exactly like the server's cart maths.
  const selectedOption = optionsList.find((o) => o.label === option);
  const base = optionPrices(selectedOption, effectivePrice(product));
  const unitPrice = selectedOption ? base.price : effectivePrice(product);
  const listPrice = selectedOption ? base.list : product.price;
  const discountPercentValue = unitPrice < listPrice ? Math.round(((listPrice - unitPrice) / listPrice) * 100) : 0;
  // Products sold by priced option show "from <cheapest option>" until the buyer picks one.
  const lowestOption = optionsList.filter((o) => o.available && o.price).sort((a, b) => optionPrices(a, 0).price - optionPrices(b, 0).price)[0];
  const wished = wishlistIds.has(product.id);
  const showFrom = !selectedOption && !!lowestOption;

  // Never offer more than the tightest selected variant (or the product) has in stock.
  const picked = [sizesList.find((s) => s.label === size), colorsList.find((c) => c.label === color), selectedOption];
  const limits = [product.stock_quantity, ...picked.map((v) => v?.stock).filter((n): n is number => typeof n === 'number')];
  const maxQty = Math.max(1, Math.min(...limits));
  const isWholesale = product.sales_type === 'wholesale';
  const minQty = isWholesale ? product.wholesale_min_quantity ?? 2 : 1;
  // Wholesale starts at the seller's minimum. If stock is below that minimum the item can't be ordered at all.
  const cannotMeetMin = isWholesale && maxQty < minQty;
  const shownQty = Math.min(Math.max(qty, minQty), maxQty);

  const needsChoice = (colorsList.some((c) => c.available) && !color) || (sizesList.some((s) => s.available) && !size) || (optionsList.some((o) => o.available) && !option);

  const add = async (thenGoToCart: boolean) => {
    if (needsChoice) return Alert.alert('Choose options', 'Please select a colour, size or option first.');
    setBusy(thenGoToCart ? 'buy' : 'cart');
    try {
      await addItem({ product_id: product.id, quantity: shownQty, color, size, option }, product);
      if (thenGoToCart) navigation.navigate('Tabs', { screen: 'Cart' } as never);
      else Alert.alert('Added to cart', product.name);
    } catch (e: any) {
      Alert.alert('Could not add to cart', e.message);
    } finally {
      setBusy(null);
    }
  };

  const heart = async () => {
    try {
      await toggleWishlist(product.id, product);
    } catch (e: any) {
      Alert.alert('Wishlist', e.message);
    }
  };

  const shareProduct = async () => {
    const url = `${SITE_ORIGIN}/product/${encodeURIComponent(product.id)}`;
    const message = `Check out ${product.name} on Eravenda Market`;
    try {
      await Share.share(Platform.OS === 'ios' ? { title: product.name, message, url } : { title: product.name, message: `${message}\n${url}` });
    } catch {
      Alert.alert('Could not share product', 'Please try again.');
    }
  };

  const Chips = ({ label, items, value, onChange }: { label: string; items: VariantEntry[]; value: string | null; onChange: (v: string) => void }) =>
    items.length ? (
      <View style={{ marginTop: 14 }}>
        <Text style={styles.sectionLabel}>{label}</Text>
        <View style={styles.chipRow}>
          {items.map((i) => {
            const on = value === i.label;
            return (
              <Pressable
                key={i.label}
                disabled={!i.available}
                onPress={() => { onChange(i.label); setQty(1); }}
                style={[styles.chip, on && styles.chipActive, !i.available && styles.chipOff]}
                accessibilityState={{ selected: on, disabled: !i.available }}
              >
                {!!i.hex && <View style={[styles.swatch, { backgroundColor: i.hex.startsWith('#') ? i.hex : `#${i.hex}` }]} />}
                <Text style={[styles.chipText, on && { color: colors.white }, !i.available && { color: colors.textMuted, textDecorationLine: 'line-through' }]}>
                  {i.label}{label === 'Option' && i.price ? `  ·  ${formatPrice(optionPrices(i, 0).price)}` : ''}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    ) : null;

  return (
    <Screen edges={['left', 'right']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Image gallery: horizontal pager with a counter */}
        <View>
          <FlatList
            data={product.images}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(i) => i.id}
            onMomentumScrollEnd={(e) => setImageIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
            renderItem={({ item }) => <Image source={{ uri: absoluteUrl(item.image_url) }} style={{ width, height: width }} contentFit="contain" />}
            ListEmptyComponent={<View style={{ width, height: width, backgroundColor: colors.skeleton }} />}
          />
          {product.images.length > 1 && (
            <View style={styles.counter}>
              <Text style={styles.counterText}>
                {imageIndex + 1}/{product.images.length}
              </Text>
            </View>
          )}
          <Pressable onPress={() => navigation.goBack()} style={[styles.round, { left: 12 }]} accessibilityLabel="Back">
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>
          <Pressable onPress={heart} style={[styles.round, { right: 58 }]} accessibilityLabel="Toggle wishlist">
            <Ionicons name={wished ? 'heart' : 'heart-outline'} size={22} color={wished ? colors.danger : colors.text} />
          </Pressable>
          <Pressable onPress={shareProduct} style={[styles.round, { right: 12 }]} accessibilityRole="button" accessibilityLabel="Share product">
            <Ionicons name="share-social-outline" size={22} color={colors.text} />
          </Pressable>
        </View>

        <View style={styles.body}>
          {!!product.brand && <Text style={styles.brand}>{product.brand}</Text>}
          <Text style={styles.name}>{product.name}</Text>
          <Text style={styles.note}>
            <Ionicons name="star" size={13} color={colors.accent} />{' '}
            {product.review_count > 0 ? `${product.average_rating.toFixed(1)} · ${product.review_count} review${product.review_count === 1 ? '' : 's'}` : 'No reviews yet'}
          </Text>
          <View style={styles.priceRow}>
            {showFrom && <Text style={styles.old}>from</Text>}
            <Text style={styles.price}>{formatPrice(showFrom ? optionPrices(lowestOption, 0).price : unitPrice)}</Text>
            {discountPercentValue > 0 && !showFrom && <Text style={styles.old}>{formatPrice(listPrice)}</Text>}
            {discountPercentValue > 0 && !showFrom && <Text style={styles.discountBadge}>-{discountPercentValue}%</Text>}
          </View>
          <Text style={[styles.stock, { color: available ? colors.success : colors.danger }]}>
            {available ? (product.stock_quantity <= 5 ? `Only ${product.stock_quantity} left` : 'In stock') : 'Out of stock'}
          </Text>
          {isWholesale && <Text style={[styles.note, { color: colors.primary, fontWeight: '700' }]}>Wholesale · price per unit · minimum order {minQty}</Text>}
          {cannotMeetMin && <Text style={[styles.note, { color: colors.danger }]}>Only {maxQty} in stock, which is below the minimum order of {minQty}.</Text>}
          {product.cod_eligible && <Text style={styles.note}>Pay on delivery available</Text>}

          {!!store && (
            <Pressable style={styles.vendor} onPress={() => navigation.navigate('Storefront', { storeId: store.id })} accessibilityRole="button" accessibilityLabel={`Visit ${store.store_name}`}>
              {store.logo_url ? <Image source={{ uri: absoluteUrl(store.logo_url) }} style={styles.vendorLogo} contentFit="cover" /> : <View style={[styles.vendorLogo, { alignItems: 'center', justifyContent: 'center' }]}><Ionicons name="storefront-outline" size={18} color={colors.primary} /></View>}
              <View style={{ flex: 1 }}>
                <Text style={styles.vendorLabel}>Sold by</Text>
                <Text style={styles.vendorName}>{store.store_name}</Text>
                {!!(store.city || store.region) && <Text style={styles.vendorLabel}>{[store.city, store.region].filter(Boolean).join(', ')}</Text>}
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          )}

          <Chips label="Colour" items={colorsList} value={color} onChange={setColor} />
          <Chips label="Size" items={sizesList} value={size} onChange={setSize} />
          <Chips label="Option" items={optionsList} value={option} onChange={setOption} />

          <View style={styles.qtyRow}>
            <Text style={styles.sectionLabel}>Quantity</Text>
            <View style={styles.stepper}>
              <Pressable onPress={() => setQty(Math.max(minQty, shownQty - 1))} hitSlop={8}>
                <Ionicons name="remove-circle-outline" size={28} color={colors.primary} />
              </Pressable>
              <Text style={styles.qty}>{shownQty}</Text>
              <Pressable onPress={() => setQty(Math.min(maxQty, shownQty + 1))} hitSlop={8}>
                <Ionicons name="add-circle-outline" size={28} color={colors.primary} />
              </Pressable>
            </View>
          </View>

          {isWholesale && <Text style={[styles.note, { textAlign: 'right' }]}>Total for {shownQty}: {formatPrice(unitPrice * shownQty)}</Text>}

          <Pressable
            onPress={() => (status === 'signedIn' ? navigation.navigate('Report', { targetType: 'product', targetId: product.id, title: product.name, storeId: product.store_id }) : navigation.navigate('Login'))}
            style={styles.report}
            accessibilityRole="button"
          >
            <Ionicons name="flag-outline" size={16} color={colors.textMuted} />
            <Text style={styles.reportText}>Report this listing</Text>
          </Pressable>

          {!!product.description && (
            <View style={{ marginTop: 20 }}>
              <Text style={styles.sectionLabel}>Description</Text>
              <Text style={styles.desc}>{stripHtml(product.description)}</Text>
            </View>
          )}
        </View>
      </ScrollView>
      {/* Sticky action bar */}
      <Screen edges={['bottom']} style={styles.actions} showFooter={false}>
        <View style={{ flexDirection: 'row', gap: 10, padding: 12 }}>
          <Button title="Add to Cart" icon="cart-outline" variant="outline" style={{ flex: 1 }} onPress={() => add(false)} loading={busy === 'cart'} disabled={!available || cannotMeetMin} />
          <Button title="Buy Now" icon="flash-outline" style={{ flex: 1 }} onPress={() => add(true)} loading={busy === 'buy'} disabled={!available || cannotMeetMin} />
        </View>
      </Screen>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center', margin: 40, color: colors.textMuted },
  round: { position: 'absolute', top: 48, backgroundColor: colors.surface, borderRadius: radius.pill, padding: 8 },
  counter: { position: 'absolute', bottom: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  counterText: { color: colors.white, fontSize: 12, fontWeight: '700' },
  body: { padding: 16, backgroundColor: colors.surface },
  brand: { color: colors.primary, fontWeight: '700', fontSize: font.sm },
  name: { fontSize: font.xl, fontWeight: '800', color: colors.text, marginTop: 2 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: 8 },
  price: { fontSize: font.xxl, fontWeight: '800', color: colors.primary },
  old: { color: colors.textMuted, textDecorationLine: 'line-through' },
  discountBadge: { color: colors.danger, fontWeight: '800' },
  stock: { marginTop: 6, fontWeight: '700' },
  note: { color: colors.textMuted, marginTop: 4, fontSize: font.sm },
  sectionLabel: { fontWeight: '700', color: colors.text, fontSize: font.md },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8 },
  vendor: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14, padding: 10, borderRadius: radius.md, backgroundColor: colors.background },
  vendorLogo: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primarySoft },
  vendorLabel: { fontSize: 12, color: colors.textMuted },
  vendorName: { fontWeight: '800', color: colors.text },
  report: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 16 },
  reportText: { color: colors.textMuted, fontSize: 13, textDecorationLine: 'underline' },
  chipOff: { backgroundColor: colors.background, opacity: 0.7 },
  swatch: { width: 14, height: 14, borderRadius: 7, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primaryButton, borderColor: colors.primary },
  chipText: { color: colors.text },
  qtyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  qty: { fontSize: font.lg, fontWeight: '800', minWidth: 24, textAlign: 'center' },
  desc: { color: colors.textMuted, marginTop: 8, lineHeight: 21 },
  actions: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, flex: 0 },
});
