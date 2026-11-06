/**
 * INCOMING ORDERS
 * GET /orders/store/mine. The API lets sellers set: processing, shipped, delivered, cancelled
 * ("paid"/"refunded" are money states set only by verified payments or admins).
 * Buttons map to the fulfilment flow:
 *   Accept  -> processing   (when paid, or pay-on-delivery still pending)
 *   Pack/Ship -> shipped    (asks for carrier + tracking number)
 *   Deliver -> delivered
 * Unpaid online-payment orders show "Awaiting payment" and cannot be accepted.
 */
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { Header } from '../../components/Section';
import { TextField } from '../../components/TextField';
import { colors, radius } from '../../config/theme';
import type { RootStackParamList } from '../../navigation/types';
import { orderService } from '../../services/orderService';
import type { Order, OrderStatus } from '../../types/api';
import { formatPrice } from '../../utils/format';
import { STATUS_LABEL } from '../../utils/orders';

type Props = NativeStackScreenProps<RootStackParamList, 'SellerOrders'>;

export function SellerOrdersScreen({ navigation }: Props) {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [shipFor, setShipFor] = useState<Order | null>(null);
  const [carrier, setCarrier] = useState('');
  const [tracking, setTracking] = useState('');

  const load = useCallback(async () => {
    try { setOrders(await orderService.storeOrders()); } catch (e: any) { Alert.alert('Orders', e.message); setOrders((o) => o ?? []); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const setStatus = async (o: Order, status: OrderStatus, extra: { shipping_carrier?: string; tracking_number?: string } = {}) => {
    setBusyId(o.id);
    try {
      const updated = await orderService.updateStatus(o.id, { status, ...extra });
      setOrders((l) => l?.map((x) => (x.id === updated.id ? updated : x)) ?? null);
    } catch (e: any) { Alert.alert('Could not update order', e.message); }
    finally { setBusyId(null); }
  };

  const canAccept = (o: Order) => o.status === 'paid' || (o.status === 'pending' && o.payment_method === 'cash_on_delivery');

  return (
    <Screen>
      <Header title="Incoming orders" onBack={() => navigation.goBack()} />
      {!orders ? <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} /> : (
        <FlatList
          data={orders}
          keyExtractor={(o) => o.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.primary} />}
          ListEmptyComponent={<Text style={{ textAlign: 'center', color: colors.textMuted, marginTop: 40 }}>No orders yet.</Text>}
          renderItem={({ item: o }) => (
            <View style={styles.card}>
              <View style={styles.top}>
                <Text style={styles.num}>#{o.order_number}{o.order_type === 'wholesale' ? '  · Wholesale' : ''}</Text>
                <Text style={styles.status}>{STATUS_LABEL[o.status]}</Text>
              </View>
              {o.items.map((i) => <Text key={i.id} style={styles.line}>{i.quantity} × {i.product_name}</Text>)}
              <Text style={styles.muted}>Order total {formatPrice(o.total_amount)} · You earn {formatPrice(o.subtotal - o.commission_amount)} · {o.payment_method === 'cash_on_delivery' ? 'Pay on delivery' : 'Online payment'}</Text>
              <View style={{ gap: 8, marginTop: 6 }}>
                {canAccept(o) && <Button title="Accept & start processing" onPress={() => setStatus(o, 'processing')} loading={busyId === o.id} />}
                {o.status === 'pending' && !canAccept(o) && <Text style={styles.muted}>Awaiting payment</Text>}
                {o.status === 'processing' && <Button title="Packed — mark as shipped" onPress={() => { setCarrier(o.shipping_carrier ?? ''); setTracking(o.tracking_number ?? ''); setShipFor(o); }} loading={busyId === o.id} />}
                {o.status === 'shipped' && <Button title="Mark as delivered" onPress={() => setStatus(o, 'delivered')} loading={busyId === o.id} />}
                {(o.status === 'pending' || o.status === 'paid' || o.status === 'processing') && (
                  <Button title="Cancel order" variant="ghost" onPress={() => Alert.alert('Cancel order', 'Cancel this order?', [{ text: 'No', style: 'cancel' }, { text: 'Cancel order', style: 'destructive', onPress: () => setStatus(o, 'cancelled') }])} />
                )}
              </View>
            </View>
          )}
        />
      )}

      <Modal visible={!!shipFor} transparent animationType="fade" onRequestClose={() => setShipFor(null)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.num}>Shipping details</Text>
            <TextField label="Carrier / rider (optional)" value={carrier} onChangeText={setCarrier} />
            <TextField label="Tracking number (optional)" value={tracking} onChangeText={setTracking} />
            <Button title="Mark as shipped" onPress={() => { const o = shipFor!; setShipFor(null); void setStatus(o, 'shipped', { shipping_carrier: carrier.trim() || undefined, tracking_number: tracking.trim() || undefined }); }} />
            <Button title="Cancel" variant="ghost" onPress={() => setShipFor(null)} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14, gap: 4 },
  top: { flexDirection: 'row', justifyContent: 'space-between' },
  num: { fontWeight: '800', color: colors.text, fontSize: 16 },
  status: { color: colors.primary, fontWeight: '800' },
  line: { color: colors.text },
  muted: { color: colors.textMuted, fontSize: 13 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 },
  sheet: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 18, gap: 6 },
});
