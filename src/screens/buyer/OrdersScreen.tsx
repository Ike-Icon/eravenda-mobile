import { useFocusEffect } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { Header } from '../../components/Section';
import { colors, radius, shadow } from '../../config/theme';
import { useAuth } from '../../context/AuthContext';
import type { RootStackParamList, TabParamList } from '../../navigation/types';
import { orderService } from '../../services/orderService';
import type { Order } from '../../types/api';
import { formatPrice } from '../../utils/format';
import { payForOrder, STATUS_LABEL } from '../../utils/orders';

type Props = CompositeScreenProps<BottomTabScreenProps<TabParamList, 'Orders'>, NativeStackScreenProps<RootStackParamList>>;

export function OrdersScreen({ navigation }: Props) {
  const { status } = useAuth();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setOrders(await orderService.mine());
    } catch (e: any) {
      Alert.alert('Orders', e.message);
      setOrders((o) => o ?? []);
    }
  }, []);

  useFocusEffect(useCallback(() => { if (status === 'signedIn') void load(); }, [status, load]));

  if (status !== 'signedIn') {
    return (
      <Screen edges={['left', 'right']}>
        <Header title="My orders" />
        <View style={styles.center}>
          <Text style={styles.muted}>Sign in to see your orders.</Text>
          <Button title="Sign in" onPress={() => navigation.navigate('Login')} style={{ alignSelf: 'stretch' }} />
        </View>
      </Screen>
    );
  }

  const pay = async (o: Order) => {
    try {
      const r = await payForOrder(o.id);
      Alert.alert(r?.status === 'success' ? 'Payment received' : 'Payment not completed', r?.status === 'success' ? 'Thank you!' : 'You can try again any time.');
      await load();
    } catch (e: any) {
      Alert.alert('Payment', e.message);
    }
  };

  return (
    <Screen edges={['left', 'right']}>
      <Header title="My orders" />
      {!orders ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o) => o.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.primary} />}
          ListEmptyComponent={<Text style={[styles.muted, { textAlign: 'center', marginTop: 40 }]}>No orders yet.</Text>}
          renderItem={({ item: o }) => (
            <Pressable style={styles.card} onPress={() => navigation.navigate('OrderDetails', { orderId: o.id })}>
              <View style={styles.top}>
                <Text style={styles.num}>#{o.order_number}{o.order_type === 'wholesale' ? '  · Wholesale' : ''}</Text>
                <Text style={[styles.badge, o.status === 'cancelled' && { color: colors.danger }]}>{STATUS_LABEL[o.status]}</Text>
              </View>
              <Text style={styles.muted}>{new Date(o.created_at).toLocaleDateString()} · {o.items.length} item{o.items.length === 1 ? '' : 's'}</Text>
              <Text style={styles.total}>{formatPrice(o.total_amount)}</Text>
              {o.status === 'pending' && (
                <Button title={o.payment_method === 'cash_on_delivery' ? 'Pay online instead' : 'Pay now'} variant="outline" onPress={() => pay(o)} />
              )}
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14 },
  muted: { color: colors.textMuted },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14, gap: 6, ...shadow.card },
  top: { flexDirection: 'row', justifyContent: 'space-between' },
  num: { fontWeight: '800', color: colors.text },
  badge: { color: colors.primary, fontWeight: '800' },
  total: { fontWeight: '800', fontSize: 17, color: colors.text },
});
