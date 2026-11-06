/**
 * MY PRODUCTS: list (GET /products/store/mine), mark out of stock, edit, delete.
 * The API has no separate "availability" flag for sellers: availability is stock_quantity.
 *  - "Mark out of stock" -> PUT stock_quantity: 0
 *  - "Restock"           -> opens the edit form to enter a new quantity
 * Status badge: pending (awaiting admin approval), approved, rejected (reason shown).
 */
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Image } from 'expo-image';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { Header } from '../../components/Section';
import { colors, radius } from '../../config/theme';
import type { RootStackParamList } from '../../navigation/types';
import { sellerService } from '../../services/sellerService';
import type { Product } from '../../types/api';
import { effectivePrice, formatPrice, primaryImage } from '../../utils/format';

type Props = NativeStackScreenProps<RootStackParamList, 'SellerProducts'>;

export function SellerProductsScreen({ navigation }: Props) {
  const [items, setItems] = useState<Product[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    sellerService.products().then(setItems).catch((e) => { Alert.alert('Products', e.message); setItems([]); });
  }, []));

  const replace = (p: Product) => setItems((l) => l?.map((x) => (x.id === p.id ? p : x)) ?? null);

  const markOut = async (p: Product) => {
    // With variants the server recomputes stock from them, so setting stock to 0 here would be ignored.
    if (p.sizes?.length || p.colors?.length || p.options?.length) {
      return Alert.alert('Stock comes from variants', 'Set the stock of each size, colour or option to 0 in the editor.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open editor', onPress: () => navigation.navigate('SellerProductForm', { product: p }) },
      ]);
    }
    setBusyId(p.id);
    try { replace(await sellerService.update(p.id, { stock_quantity: 0 })); }
    catch (e: any) { Alert.alert('Could not update', e.message); }
    finally { setBusyId(null); }
  };

  const remove = (p: Product) =>
    Alert.alert('Delete product', `Delete "${p.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await sellerService.remove(p.id); setItems((l) => l?.filter((x) => x.id !== p.id) ?? null); }
        catch (e: any) { Alert.alert('Could not delete', e.message); }
      } },
    ]);

  return (
    <Screen>
      <Header title="My products" onBack={() => navigation.goBack()} />
      {!items ? <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} /> : (
        <FlatList
          data={items}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          ListEmptyComponent={<Text style={{ textAlign: 'center', color: colors.textMuted, marginTop: 40 }}>No products yet.</Text>}
          renderItem={({ item: p }) => (
            <View style={[styles.card, busyId === p.id && { opacity: 0.5 }]}>
              <Image source={{ uri: primaryImage(p) }} style={styles.thumb} contentFit="cover" />
              <View style={{ flex: 1, gap: 2 }}>
                <Text numberOfLines={2} style={styles.name}>{p.name}</Text>
                <Text style={styles.price}>{formatPrice(effectivePrice(p))}{p.sales_type === 'wholesale' ? `  · Wholesale, min ${p.wholesale_min_quantity ?? 2}` : ''}</Text>
                <Text style={styles.muted}>Stock: {p.stock_quantity} · <Text style={{ fontWeight: '800', color: p.status === 'approved' ? colors.success : p.status === 'rejected' ? colors.danger : colors.accent }}>{p.status}</Text></Text>
                {p.status === 'rejected' && !!(p as any).rejection_reason && <Text style={{ color: colors.danger, fontSize: 12 }}>{(p as any).rejection_reason}</Text>}
                <View style={styles.actions}>
                  <Pressable onPress={() => navigation.navigate('SellerProductForm', { product: p })}><Text style={styles.link}>Edit</Text></Pressable>
                  {p.stock_quantity > 0
                    ? <Pressable onPress={() => markOut(p)}><Text style={styles.link}>Mark out of stock</Text></Pressable>
                    : <Pressable onPress={() => navigation.navigate('SellerProductForm', { product: p })}><Text style={styles.link}>Restock</Text></Pressable>}
                  <Pressable onPress={() => remove(p)}><Text style={[styles.link, { color: colors.danger }]}>Delete</Text></Pressable>
                </View>
              </View>
            </View>
          )}
        />
      )}
      <View style={{ padding: 16 }}><Button title="Add product" onPress={() => navigation.navigate('SellerProductForm')} /></View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: 12, backgroundColor: colors.surface, borderRadius: radius.lg, padding: 10 },
  thumb: { width: 84, height: 84, borderRadius: radius.md, backgroundColor: colors.skeleton },
  name: { fontWeight: '700', color: colors.text },
  price: { color: colors.primary, fontWeight: '800' },
  muted: { color: colors.textMuted, fontSize: 13 },
  actions: { flexDirection: 'row', gap: 16, marginTop: 6, flexWrap: 'wrap' },
  link: { color: colors.primary, fontWeight: '700', fontSize: 13 },
});
