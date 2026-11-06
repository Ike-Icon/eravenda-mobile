/**
 * SELLER DASHBOARD (tab shown only when user.role === 'seller')
 * Earnings are ESTIMATED on the device from GET /orders/store/mine:
 *   seller proceeds per order = subtotal - commission_amount
 *   "Earned"  = delivered orders      "In progress" = paid / processing / shipped
 * Payout records live on the server/admin side; this is a quick overview, not an accounting ledger.
 */
import { useFocusEffect } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { Header, MenuRow } from '../../components/Section';
import { colors, font, radius } from '../../config/theme';
import type { RootStackParamList, TabParamList } from '../../navigation/types';
import { orderService } from '../../services/orderService';
import { sellerService } from '../../services/sellerService';
import type { Order, Store } from '../../types/api';
import { formatPrice } from '../../utils/format';

type Props = CompositeScreenProps<BottomTabScreenProps<TabParamList, 'Seller'>, NativeStackScreenProps<RootStackParamList>>;

export const proceeds = (o: Order) => o.subtotal - o.commission_amount;

export function SellerDashboardScreen({ navigation }: Props) {
  const [store, setStore] = useState<Store | null>(null);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    Promise.all([sellerService.store(), orderService.storeOrders()])
      .then(([s, o]) => { setStore(s); setOrders(o); setError(null); })
      .catch((e) => setError(e.message));
  }, []));

  if (error) return <Screen edges={['left', 'right']}><Header title="Seller dashboard" /><Text style={styles.err}>{error}</Text></Screen>;
  if (!store || !orders) return <Screen edges={['left', 'right']}><ActivityIndicator style={{ marginTop: 60 }} color={colors.primary} /></Screen>;

  const earned = orders.filter((o) => o.status === 'delivered').reduce((n, o) => n + proceeds(o), 0);
  const inProgress = orders.filter((o) => ['paid', 'processing', 'shipped'].includes(o.status)).reduce((n, o) => n + proceeds(o), 0);
  const toAct = orders.filter((o) => o.status === 'paid' || (o.status === 'pending' && o.payment_method === 'cash_on_delivery')).length;

  return (
    <Screen edges={['left', 'right']}>
      <Header title={store.store_name} />
      <ScrollView>
        {store.status !== 'approved' && (
          <Text style={styles.warn}>Your store is {store.status}. {store.rejection_reason ?? 'You can list products once it is approved.'}</Text>
        )}
        <View style={styles.stats}>
          <View style={styles.stat}><Text style={styles.statLabel}>Earned</Text><Text style={styles.statValue}>{formatPrice(earned)}</Text></View>
          <View style={styles.stat}><Text style={styles.statLabel}>In progress</Text><Text style={styles.statValue}>{formatPrice(inProgress)}</Text></View>
        </View>
        <View style={styles.stats}>
          <View style={styles.stat}><Text style={styles.statLabel}>Total orders</Text><Text style={styles.statValue}>{orders.length}</Text></View>
          <View style={styles.stat}><Text style={styles.statLabel}>Need action</Text><Text style={styles.statValue}>{toAct}</Text></View>
        </View>
        <MenuRow icon="cube-outline" label="My products" onPress={() => navigation.navigate('SellerProducts')} />
        <MenuRow icon="storefront-outline" label="Store profile" onPress={() => navigation.navigate('Store')} />
        <MenuRow icon="receipt-outline" label="Incoming orders" hint={toAct ? `${toAct} waiting for you` : undefined} onPress={() => navigation.navigate('SellerOrders')} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  err: { color: colors.danger, padding: 20 },
  warn: { backgroundColor: '#FEF3C7', color: '#92400E', margin: 16, padding: 12, borderRadius: radius.md },
  stats: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, marginBottom: 12 },
  stat: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14 },
  statLabel: { color: colors.textMuted, fontSize: 13 },
  statValue: { fontSize: font.xl, fontWeight: '800', color: colors.primary, marginTop: 4 },
});
