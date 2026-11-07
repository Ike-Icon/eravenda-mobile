import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Text } from 'react-native';
import { ProductCard } from '../../components/ProductCard';
import { Screen } from '../../components/Screen';
import { Header } from '../../components/Section';
import { colors } from '../../config/theme';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import type { RootStackParamList } from '../../navigation/types';
import { accountService } from '../../services/accountService';
import type { Product } from '../../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'Wishlist'>;

export function WishlistScreen({ navigation }: Props) {
  const { status } = useAuth();
  const { toggleWishlist, addItem, wishlistProducts } = useCart();
  const [items, setItems] = useState<Product[] | null>(null);

  useFocusEffect(useCallback(() => {
    if (status !== 'signedIn') {
      setItems(wishlistProducts);
      return;
    }
    let active = true;
    accountService.wishlist().then((w) => {
      if (!active) return;
      const products = w.map((entry) => entry.product);
      const known = new Set(products.map((product) => product.id));
      setItems([...products, ...wishlistProducts.filter((product) => !known.has(product.id))]);
    }).catch((e) => { if (active) Alert.alert('Wishlist', e.message); });
    return () => { active = false; };
  }, [status, wishlistProducts]));

  const remove = async (id: string) => {
    try {
      const product = items?.find((item) => item.id === id);
      await toggleWishlist(id, product);
      setItems((l) => l?.filter((p) => p.id !== id) ?? null);
    } catch (e: any) { Alert.alert('Wishlist', e.message); }
  };

  const quickAdd = async (product: Product) => {
    if (product.colors?.length || product.sizes?.length || product.options?.length) return navigation.navigate('ProductDetails', { productId: product.id });
    const quantity = product.sales_type === 'wholesale' ? product.wholesale_min_quantity ?? 2 : 1;
    try { await addItem({ product_id: product.id, quantity }, product); Alert.alert('Added to cart', product.name); }
    catch (e: any) { Alert.alert('Could not add to cart', e.message || 'Please try again.'); }
  };

  return (
    <Screen>
      <Header title="My wishlist" onBack={() => navigation.goBack()} />
      {!items ? <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} /> : (
        <FlatList
          data={items}
          numColumns={2}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ paddingHorizontal: 10 }}
          ListEmptyComponent={<Text style={{ textAlign: 'center', color: colors.textMuted, marginTop: 40 }}>Nothing saved yet. Tap the heart on a product.</Text>}
          renderItem={({ item }) => <ProductCard product={item} wished onPress={() => navigation.navigate('ProductDetails', { productId: item.id })} onToggleWishlist={() => remove(item.id)} onAddToCart={() => quickAdd(item)} />}
        />
      )}
    </Screen>
  );
}
