import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Text } from 'react-native';
import { ProductCard } from '../../components/ProductCard';
import { Screen } from '../../components/Screen';
import { Header } from '../../components/Section';
import { colors } from '../../config/theme';
import { useCart } from '../../context/CartContext';
import type { RootStackParamList } from '../../navigation/types';
import { accountService } from '../../services/accountService';
import type { Product } from '../../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'Wishlist'>;

export function WishlistScreen({ navigation }: Props) {
  const { toggleWishlist } = useCart();
  const [items, setItems] = useState<Product[] | null>(null);

  useFocusEffect(useCallback(() => {
    accountService.wishlist().then((w) => setItems(w.map((e) => e.product))).catch((e) => Alert.alert('Wishlist', e.message));
  }, []));

  const remove = async (id: string) => {
    try {
      await toggleWishlist(id);
      setItems((l) => l?.filter((p) => p.id !== id) ?? null);
    } catch (e: any) { Alert.alert('Wishlist', e.message); }
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
          renderItem={({ item }) => <ProductCard product={item} wished onPress={() => navigation.navigate('ProductDetails', { productId: item.id })} onToggleWishlist={() => remove(item.id)} />}
        />
      )}
    </Screen>
  );
}
