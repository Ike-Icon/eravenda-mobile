/**
 * CART
 * Reads the shared cart from CartContext (GET /cart). Quantity +/- calls PUT /cart/items/{id};
 * remove calls DELETE /cart/items/{id}. Both return the whole cart, so totals are always the server's.
 * "Proceed to checkout" opens the Checkout screen.
 */
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Image } from 'expo-image';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { colors, font, radius, shadow } from '../../config/theme';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import type { RootStackParamList, TabParamList } from '../../navigation/types';
import type { CartItem } from '../../types/api';
import { effectivePrice, formatPrice, primaryImage } from '../../utils/format';
import { lineUnitPrice } from '../../utils/variants';

type Props = CompositeScreenProps<BottomTabScreenProps<TabParamList, 'Cart'>, NativeStackScreenProps<RootStackParamList>>;

export function CartScreen({ navigation }: Props) {
  const { status } = useAuth();
  const { cart, loading, setQuantity, removeItem } = useCart();
  const [busyId, setBusyId] = useState<string | null>(null);

  if (status !== 'signedIn') {
    return (
      <Screen edges={['left', 'right']}>
        <View style={styles.empty}>
          <Ionicons name="cart-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>Sign in to see your cart</Text>
          <Button title="Sign in" onPress={() => navigation.navigate('Login')} style={{ alignSelf: 'stretch' }} />
        </View>
      </Screen>
    );
  }

  const run = async (id: string, fn: () => Promise<void>) => {
    setBusyId(id);
    try {
      await fn();
    } catch (e: any) {
      Alert.alert('Cart', e.message);
    } finally {
      setBusyId(null);
    }
  };

  const confirmRemove = (item: CartItem) =>
    Alert.alert('Remove item', `Remove ${item.product.name} from your cart?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => run(item.id, () => removeItem(item.id)) },
    ]);

  const items = cart?.items ?? [];

  return (
    <Screen edges={['left', 'right']}>
      <Text style={styles.title}>My Cart</Text>
      {loading && !cart ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="cart-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Button title="Start shopping" onPress={() => navigation.navigate('Home')} style={{ alignSelf: 'stretch' }} />
        </View>
      ) : (
        <>
          <FlatList
            data={items}
            keyExtractor={(i) => i.id}
            contentContainerStyle={{ padding: 16, gap: 12 }}
            renderItem={({ item }) => {
              const variant = [item.color, item.size, item.option].filter(Boolean).join(' · ');
              const busy = busyId === item.id;
              // Wholesale minimums are counted per product across all its lines, so the fix button sits on the first line only.
              const issue = cart?.wholesale_issues.find((w) => w.product_id === item.product.id);
              const firstLine = items.find((i) => i.product.id === item.product.id)?.id === item.id;
              const deficit = issue?.kind === 'minimum' ? issue.minimum_quantity - issue.current_quantity : 0;
              return (
                <View style={[styles.row, busy && { opacity: 0.5 }]}>
                  <Image source={{ uri: primaryImage(item.product) }} style={styles.thumb} contentFit="cover" />
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={2} style={styles.name}>
                      {item.product.name}
                    </Text>
                    {!!variant && <Text style={styles.variant}>{variant}</Text>}
                    {item.product.sales_type === 'wholesale' && <Text style={styles.wholesaleTag}>Wholesale · min {item.product.wholesale_min_quantity ?? 2}</Text>}
                    {!!issue && <Text style={styles.issue}>{issue.message}</Text>}
                    {!!issue && firstLine && deficit > 0 && (
                      <Pressable disabled={busy} onPress={() => run(item.id, () => setQuantity(item.id, item.product.id, item.quantity + deficit))} style={styles.fix}>
                        <Text style={styles.fixText}>Add {deficit} more to reach the minimum</Text>
                      </Pressable>
                    )}
                    <Text style={styles.price}>{formatPrice(lineUnitPrice(item.product, item.option, effectivePrice(item.product)))}</Text>
                    <View style={styles.controls}>
                      <Pressable disabled={busy || item.quantity <= 1} onPress={() => run(item.id, () => setQuantity(item.id, item.product.id, item.quantity - 1))} hitSlop={8}>
                        <Ionicons name="remove-circle-outline" size={26} color={item.quantity <= 1 ? colors.border : colors.primary} />
                      </Pressable>
                      <Text style={styles.qty}>{item.quantity}</Text>
                      <Pressable disabled={busy} onPress={() => run(item.id, () => setQuantity(item.id, item.product.id, item.quantity + 1))} hitSlop={8}>
                        <Ionicons name="add-circle-outline" size={26} color={colors.primary} />
                      </Pressable>
                      <View style={{ flex: 1 }} />
                      <Pressable onPress={() => confirmRemove(item)} hitSlop={8} accessibilityLabel="Remove item">
                        <Ionicons name="trash-outline" size={22} color={colors.danger} />
                      </Pressable>
                    </View>
                  </View>
                </View>
              );
            }}
          />
          <View style={styles.footer}>
            {!!cart?.wholesale_issues.length && <Text style={styles.warn}>Fix the wholesale items above to continue to checkout.</Text>}
            {cart?.items.some((i) => i.product.sales_type === 'wholesale') && cart.items.some((i) => i.product.sales_type !== 'wholesale') && (
              <Text style={styles.hint}>Wholesale and retail items are delivered as separate orders.</Text>
            )}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.total}>{formatPrice(cart?.subtotal ?? 0)}</Text>
            </View>
            <Text style={styles.hint}>Delivery fee is calculated at checkout.</Text>
            <Button
              title="Proceed to checkout"
              disabled={!!cart?.wholesale_issues.length}
              onPress={() => navigation.navigate('Checkout')}
            />
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: font.xl, fontWeight: '800', color: colors.text, marginHorizontal: 16, marginTop: 12 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14 },
  emptyTitle: { fontSize: font.lg, fontWeight: '700', color: colors.text },
  row: { flexDirection: 'row', gap: 12, backgroundColor: colors.surface, borderRadius: radius.lg, padding: 10, ...shadow.card },
  thumb: { width: 88, height: 88, borderRadius: radius.md, backgroundColor: colors.skeleton },
  name: { fontSize: font.sm, color: colors.text },
  variant: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  price: { fontWeight: '800', color: colors.primary, marginTop: 4 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  qty: { fontWeight: '800', minWidth: 20, textAlign: 'center' },
  footer: { backgroundColor: colors.surface, padding: 16, gap: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  totalLabel: { fontSize: font.md, color: colors.textMuted },
  total: { fontSize: font.xl, fontWeight: '800', color: colors.text },
  hint: { fontSize: 12, color: colors.textMuted },
  wholesaleTag: { alignSelf: 'flex-start', marginTop: 4, backgroundColor: colors.primarySoft, color: colors.primary, fontSize: 11, fontWeight: '800', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' },
  issue: { color: colors.danger, fontSize: 12, marginTop: 4 },
  fix: { alignSelf: 'flex-start', marginTop: 6, backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  fixText: { color: colors.white, fontSize: 12, fontWeight: '700' },
  warn: { color: colors.danger, fontSize: font.sm },
});
