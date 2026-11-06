import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { ProductCard } from '../../components/ProductCard';
import { Screen } from '../../components/Screen';
import { Header } from '../../components/Section';
import { SearchBar } from '../../components/SearchBar';
import { colors, radius } from '../../config/theme';
import { useAuth } from '../../context/AuthContext';
import { useBlocks } from '../../context/BlockContext';
import { useCart } from '../../context/CartContext';
import type { RootStackParamList } from '../../navigation/types';
import { catalogService } from '../../services/catalogService';
import type { Category, Product } from '../../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'Products'>;
const PAGE_SIZE = 20;

/** Dedicated equivalent of the web app's /products catalogue page. */
export function ProductsScreen({ navigation, route }: Props) {
  const { status } = useAuth();
  const { wishlistIds, toggleWishlist } = useCart();
  const { blockedIds } = useBlocks();
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<string | null>(route.params?.categoryId ?? null);
  const [salesType, setSalesType] = useState<'retail' | 'wholesale'>(route.params?.salesType ?? 'retail');
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setCategoryId(route.params?.categoryId ?? null);
    setSalesType(route.params?.salesType ?? 'retail');
  }, [route.params?.categoryId, route.params?.salesType]);

  useEffect(() => {
    const controller = new AbortController();
    catalogService.categories(controller.signal).then(setCategories).catch(() => undefined);
    return () => controller.abort();
  }, []);

  const load = useCallback(async (nextPage: number, append: boolean, signal?: AbortSignal) => {
    try {
      const result = await catalogService.products({
        page: nextPage,
        page_size: PAGE_SIZE,
        category_id: categoryId ?? undefined,
        sales_type: salesType,
        q: query || undefined,
      }, signal);
      setProducts((previous) => append ? [...previous, ...result.items] : result.items);
      setTotal(result.total);
      setPage(nextPage);
      setError('');
    } catch (e: any) {
      if (e.name !== 'AbortError') setError(e.message || 'Could not load products.');
    }
  }, [categoryId, query, salesType]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    void load(1, false, controller.signal).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [load]);

  const visible = useMemo(() => products.filter((product) => !blockedIds.has(product.store_id)), [blockedIds, products]);
  const title = categories.find((category) => category.id === categoryId)?.name || (salesType === 'wholesale' ? 'Wholesale products' : 'All products');
  const roots = categories.filter((category) => !category.parent_id);

  const loadMore = async () => {
    if (loading || loadingMore || products.length >= total) return;
    setLoadingMore(true);
    await load(page + 1, true);
    setLoadingMore(false);
  };
  const refresh = async () => {
    setRefreshing(true);
    await load(1, false);
    setRefreshing(false);
  };
  const heart = async (id: string) => {
    if (status !== 'signedIn') return navigation.navigate('Login');
    try { await toggleWishlist(id); } catch (e: any) { Alert.alert('Wishlist', e.message); }
  };

  return <Screen edges={['left', 'right', 'bottom']}>
    <Header title={title} onBack={() => navigation.goBack()} />
    <FlatList
      data={loading ? [] : visible}
      numColumns={2}
      keyExtractor={(product) => product.id}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={colors.primary} />}
      onEndReached={() => void loadMore()}
      onEndReachedThreshold={0.5}
      ListHeaderComponent={<View>
        <View style={styles.search}><SearchBar onSubmit={setQuery} onPickSuggestion={(product) => navigation.navigate('ProductDetails', { productId: product.id })} /></View>
        <View style={styles.modeRow}>{(['retail', 'wholesale'] as const).map((mode) => <Pressable key={mode} onPress={() => setSalesType(mode)} style={[styles.mode, salesType === mode && styles.modeActive]} accessibilityRole="button" accessibilityState={{ selected: salesType === mode }}><Text style={[styles.modeText, salesType === mode && styles.modeTextActive]}>{mode === 'retail' ? 'Retail' : 'Wholesale'}</Text></Pressable>)}</View>
        {roots.length > 0 && <FlatList
          horizontal
          data={[{ id: '', name: 'All products' } as Category, ...roots]}
          keyExtractor={(category) => category.id || 'all'}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryList}
          renderItem={({ item }) => <Pressable onPress={() => setCategoryId(item.id || null)} style={[styles.categoryChip, (categoryId ?? '') === item.id && styles.categoryChipActive]} accessibilityRole="button" accessibilityState={{ selected: (categoryId ?? '') === item.id }}><Text style={[styles.categoryText, (categoryId ?? '') === item.id && styles.categoryTextActive]}>{item.name}</Text></Pressable>}
        />}
        <View style={styles.resultsHeading}><View><Text style={styles.kicker}>{salesType === 'retail' ? 'SHOP THE MARKETPLACE' : 'BULK BUYING'}</Text><Text style={styles.heading}>{query ? `Results for “${query}”` : title}</Text></View><Text style={styles.count}>{total} items</Text></View>
      </View>}
      renderItem={({ item }) => <ProductCard product={item} wished={wishlistIds.has(item.id)} onPress={() => navigation.navigate('ProductDetails', { productId: item.id })} onToggleWishlist={() => void heart(item.id)} />}
      ListEmptyComponent={loading ? <ActivityIndicator style={{ margin: 36 }} color={colors.primary} /> : <View style={styles.empty}><Ionicons name={error ? 'cloud-offline-outline' : 'search-outline'} size={38} color={colors.textMuted} /><Text style={styles.emptyText}>{error || 'No products found. Try another category or search.'}</Text></View>}
      ListFooterComponent={loadingMore ? <ActivityIndicator style={{ margin: 18 }} color={colors.primary} /> : undefined}
    />
  </Screen>;
}

const styles = StyleSheet.create({
  list: { paddingBottom: 24 },
  search: { paddingHorizontal: 14, paddingTop: 8 },
  modeRow: { flexDirection: 'row', marginHorizontal: 14, marginTop: 10, padding: 3, borderRadius: radius.pill, backgroundColor: colors.border },
  mode: { flex: 1, minHeight: 36, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
  modeActive: { backgroundColor: colors.primary },
  modeText: { color: colors.text, fontSize: 12, fontWeight: '700' },
  modeTextActive: { color: colors.white },
  categoryList: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 4, gap: 8 },
  categoryChip: { minHeight: 34, paddingHorizontal: 12, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  categoryChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  categoryText: { color: colors.text, fontSize: 11, fontWeight: '700' },
  categoryTextActive: { color: colors.white },
  resultsHeading: { marginHorizontal: 14, marginTop: 12, marginBottom: 4, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  kicker: { color: colors.primary, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  heading: { color: colors.text, fontSize: 20, fontWeight: '900', marginTop: 3 },
  count: { color: colors.textMuted, fontSize: 11, marginBottom: 3 },
  empty: { alignItems: 'center', padding: 38, gap: 10 },
  emptyText: { color: colors.textMuted, textAlign: 'center' },
});
