/**
 * CHECKOUT
 * 1. GET /auth/addresses        pick (or add) a delivery address
 * 2. POST /orders/delivery-quote re-quoted whenever the address changes -> delivery fee
 * 3. choose Pickup or Delivery, and Mobile Money (Paystack) or Pay on Delivery
 * 4. POST /orders/checkout       creates one order per store (cart is emptied by the server)
 * 5. mobile money: open Paystack for the first order; any others show "Pay now" in Orders.
 * Pay on Delivery is only offered when every cart item allows it (product.cod_eligible).
 */
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { Header } from '../../components/Section';
import { VerifyEmailBanner } from '../../components/VerifyEmailBanner';
import { colors, font, radius } from '../../config/theme';
import { useCart } from '../../context/CartContext';
import type { RootStackParamList } from '../../navigation/types';
import { accountService } from '../../services/accountService';
import { orderService } from '../../services/orderService';
import type { Address, PaymentMethod } from '../../types/api';
import { formatPrice } from '../../utils/format';
import { payForOrder } from '../../utils/orders';
import { promptResendIfUnverified } from '../../utils/verifyPrompt';

type Props = NativeStackScreenProps<RootStackParamList, 'Checkout'>;

export function CheckoutScreen({ navigation }: Props) {
  const { cart, refresh } = useCart();
  const insets = useSafeAreaInsets(); // the footer is pinned to the screen bottom, so it pads the home-indicator inset itself
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [addressId, setAddressId] = useState<string | null>(null);
  const [pickup, setPickup] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>('mobile_money');
  const [fee, setFee] = useState<number | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const codAllowed = cart?.items.every((i) => i.product.cod_eligible) ?? false;

  useFocusEffect(
    useCallback(() => {
      accountService.addresses().then((list) => {
        setAddresses(list);
        setAddressId((cur) => cur && list.some((a) => a.id === cur) ? cur : (list.find((a) => a.is_default) ?? list[0])?.id ?? null);
      }).catch((e) => Alert.alert('Addresses', e.message));
    }, []),
  );

  useEffect(() => {
    if (!codAllowed && method === 'cash_on_delivery') setMethod('mobile_money');
  }, [codAllowed, method]);

  // Re-quote the delivery fee whenever the address changes.
  useEffect(() => {
    if (!addressId) return setFee(null);
    setFee(null);
    setQuoteError(null);
    orderService.quote(addressId).then((q) => setFee(q.delivery_fee)).catch((e) => setQuoteError(e.message));
  }, [addressId]);

  const subtotal = cart?.subtotal ?? 0;
  const deliveryFee = pickup ? 0 : fee ?? 0;
  const total = subtotal + deliveryFee;

  const place = async () => {
    if (!addressId) return Alert.alert('Address needed', 'Add a delivery address first.');
    if (!pickup && fee === null) return Alert.alert('Please wait', quoteError ?? 'Calculating delivery fee…');
    setBusy(true);
    try {
      const orders = await orderService.checkout({ address_id: addressId, payment_method: method, is_pickup: pickup });
      await refresh(); // the server emptied the cart
      if (method === 'mobile_money') {
        const result = await payForOrder(orders[0].id);
        if (result?.status === 'success') Alert.alert('Payment received', 'Thank you! Your order is being prepared.');
        else Alert.alert('Payment not completed', 'You can finish paying from your Orders at any time.');
      } else {
        Alert.alert('Order placed', 'Pay the rider when your order arrives.');
      }
      navigation.reset({ index: 0, routes: [{ name: 'Tabs', params: undefined }] });
      if (orders.length === 1) navigation.navigate('OrderDetails', { orderId: orders[0].id });
    } catch (e: any) {
      // The server blocks checkout for unconfirmed emails (when REQUIRE_VERIFIED_EMAIL is on); offer the fix right here.
      if (!promptResendIfUnverified(e.message)) Alert.alert('Checkout failed', e.message); // e.g. wholesale minimums, empty cart
    } finally {
      setBusy(false);
    }
  };

  const Option = ({ on, title, sub, onPress }: { on: boolean; title: string; sub?: string; onPress: () => void }) => (
    <Pressable onPress={onPress} style={[styles.option, on && styles.optionOn]}>
      <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={20} color={on ? colors.primary : colors.textMuted} />
      <View style={{ flex: 1 }}>
        <Text style={styles.optTitle}>{title}</Text>
        {!!sub && <Text style={styles.optSub}>{sub}</Text>}
      </View>
    </Pressable>
  );

  if (!addresses) return <Screen edges={['left', 'right']}><ActivityIndicator style={{ marginTop: 60 }} color={colors.primary} /></Screen>;

  return (
    <Screen edges={['left', 'right']}>
      <Header title="Checkout" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 170 + insets.bottom }}>
        <View style={{ marginHorizontal: -16, marginTop: -12 }}><VerifyEmailBanner /></View>
        <Text style={styles.h}>Delivery address</Text>
        {addresses.map((a) => (
          <Option key={a.id} on={a.id === addressId} onPress={() => setAddressId(a.id)} title={a.label || a.recipient_name} sub={`${a.recipient_name} · ${a.phone}\n${[a.landmark, a.area, a.city, a.region].filter(Boolean).join(', ')}`} />
        ))}
        <Button title={addresses.length ? 'Add another address' : 'Add delivery address'} variant="outline" onPress={() => navigation.navigate('AddressForm')} />

        <Text style={styles.h}>Fulfilment</Text>
        <Option on={!pickup} onPress={() => setPickup(false)} title="Delivery" sub={quoteError ?? (fee === null ? 'Calculating fee…' : formatPrice(fee))} />
        <Option on={pickup} onPress={() => setPickup(true)} title="Pickup" sub="No delivery fee" />

        <Text style={styles.h}>Payment</Text>
        <Option on={method === 'mobile_money'} onPress={() => setMethod('mobile_money')} title="Mobile Money / Card (Paystack)" sub="Secure online payment" />
        <Option on={method === 'cash_on_delivery'} onPress={() => codAllowed && setMethod('cash_on_delivery')} title="Pay on delivery" sub={codAllowed ? 'Pay in cash when it arrives' : 'Not available: an item in your cart requires online payment'} />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: 16 + insets.bottom }]}>
        <View style={styles.row}><Text style={styles.muted}>Subtotal</Text><Text>{formatPrice(subtotal)}</Text></View>
        <View style={styles.row}><Text style={styles.muted}>Delivery</Text><Text>{pickup ? 'Free (pickup)' : fee === null ? '—' : formatPrice(fee)}</Text></View>
        <View style={styles.row}><Text style={styles.total}>Total</Text><Text style={styles.total}>{formatPrice(total)}</Text></View>
        <Button title={method === 'mobile_money' ? 'Place order & pay' : 'Place order'} onPress={place} loading={busy} disabled={!addressId || !cart?.items.length} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  h: { fontSize: font.lg, fontWeight: '800', color: colors.text, marginTop: 8 },
  option: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  optionOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  optTitle: { fontWeight: '700', color: colors.text },
  optSub: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.surface, padding: 16, gap: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  muted: { color: colors.textMuted },
  total: { fontSize: font.lg, fontWeight: '800', color: colors.text },
});
