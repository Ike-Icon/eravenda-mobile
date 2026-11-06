/**
 * ORDER DETAILS + LIVE TRACKING
 * GET /orders/{id}, refreshed every 15s while the screen is focused ("real-time" via polling).
 * Buyers can cancel only while the order is still "pending" (server enforces this too).
 */
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Image } from 'expo-image';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { OrderTracker } from '../../components/OrderTracker';
import { Screen } from '../../components/Screen';
import { Header } from '../../components/Section';
import { colors, font, radius } from '../../config/theme';
import type { RootStackParamList } from '../../navigation/types';
import { orderService } from '../../services/orderService';
import type { Order } from '../../types/api';
import { absoluteUrl, formatPrice } from '../../utils/format';
import { payForOrder } from '../../utils/orders';

type Props = NativeStackScreenProps<RootStackParamList, 'OrderDetails'>;

export function OrderDetailsScreen({ route, navigation }: Props) {
  const { orderId } = route.params;
  const [order, setOrder] = useState<Order | null>(null);
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      const load = () => orderService.get(orderId).then((o) => alive && setOrder(o)).catch(() => undefined);
      void load();
      const id = setInterval(load, 15000);
      return () => { alive = false; clearInterval(id); };
    }, [orderId]),
  );

  if (!order) return <Screen><Header title="Order" onBack={() => navigation.goBack()} /><ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} /></Screen>;

  const cancel = () =>
    Alert.alert('Cancel order', 'Cancel this order?', [
      { text: 'Keep order', style: 'cancel' },
      { text: 'Cancel order', style: 'destructive', onPress: async () => {
        setBusy(true);
        try { setOrder(await orderService.cancel(order.id)); } catch (e: any) { Alert.alert('Could not cancel', e.message); } finally { setBusy(false); }
      } },
    ]);

  const pay = async () => {
    setBusy(true);
    try {
      const r = await payForOrder(order.id);
      setOrder(await orderService.get(order.id));
      if (r?.status !== 'success') Alert.alert('Payment not completed', 'You can try again any time.');
    } catch (e: any) { Alert.alert('Payment', e.message); } finally { setBusy(false); }
  };

  return (
    <Screen>
      <Header title={`Order #${order.order_number}`} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        {order.order_type === 'wholesale' && <Text style={{ color: colors.primary, fontWeight: '800' }}>Wholesale order</Text>}
        <View style={styles.card}><OrderTracker status={order.status} /></View>

        {(order.tracking_number || order.shipping_carrier || order.estimated_delivery || order.seller_note) && (
          <View style={styles.card}>
            {!!order.shipping_carrier && <Text style={styles.line}>Carrier: {order.shipping_carrier}</Text>}
            {!!order.tracking_number && <Text style={styles.line}>Tracking no: {order.tracking_number}</Text>}
            {!!order.estimated_delivery && <Text style={styles.line}>Estimated delivery: {new Date(order.estimated_delivery).toLocaleDateString()}</Text>}
            {!!order.seller_note && <Text style={styles.line}>Seller note: {order.seller_note}</Text>}
          </View>
        )}

        <View style={styles.card}>
          {order.items.map((i) => (
            <View key={i.id} style={styles.item}>
              <Image source={{ uri: absoluteUrl(i.image_url) }} style={styles.thumb} contentFit="cover" />
              <View style={{ flex: 1 }}>
                <Text numberOfLines={2} style={{ color: colors.text }}>{i.product_name}</Text>
                <Text style={styles.muted}>{[i.color, i.size, i.option].filter(Boolean).join(' · ')} × {i.quantity}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Text style={{ fontWeight: '700' }}>{formatPrice(i.line_total)}</Text>
                {order.status === 'delivered' && (
                  <Pressable onPress={() => navigation.navigate('Review', { productId: i.product_id, orderItemId: i.id, productName: i.product_name })} hitSlop={8}>
                    <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>Rate this</Text>
                  </Pressable>
                )}
              </View>
            </View>
          ))}
          <View style={styles.sum}><Text style={styles.muted}>Subtotal</Text><Text>{formatPrice(order.subtotal)}</Text></View>
          <View style={styles.sum}><Text style={styles.muted}>{order.is_pickup ? 'Pickup' : 'Delivery'}</Text><Text>{formatPrice(order.delivery_fee)}</Text></View>
          <View style={styles.sum}><Text style={styles.total}>Total</Text><Text style={styles.total}>{formatPrice(order.total_amount)}</Text></View>
          <Text style={styles.muted}>{order.payment_method === 'cash_on_delivery' ? 'Pay on delivery' : 'Mobile Money / Card'}</Text>
        </View>

        {order.status === 'pending' && (
          <>
            <Button title="Pay now" onPress={pay} loading={busy} />
            <Button title="Cancel order" variant="outline" onPress={cancel} disabled={busy} />
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14, gap: 8 },
  line: { color: colors.text },
  muted: { color: colors.textMuted, fontSize: 13 },
  item: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  thumb: { width: 52, height: 52, borderRadius: radius.sm, backgroundColor: colors.skeleton },
  sum: { flexDirection: 'row', justifyContent: 'space-between' },
  total: { fontSize: font.lg, fontWeight: '800' },
});
