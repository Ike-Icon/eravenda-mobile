/**
 * HOME FEED
 * State flow:
 *   mount            -> GET /categories (once) and GET /products?page=1 (feed)
 *   category tap     -> categoryId changes -> feed reloads from page 1
 *   search submit    -> query changes     -> feed reloads (header switches to "Results for …")
 *   scroll to end    -> next page appended until total is reached
 *   pull to refresh  -> reload page 1
 * One FlatList virtualises the product grid and homepage sections. Search and catalogue mode
 * stay pinned above it, like the web app's persistent marketplace header.
 */
import { Ionicons } from '@expo/vector-icons';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { BannerCarousel } from '../../components/BannerCarousel';
import { CategoryGrid } from '../../components/CategoryGrid';
import { FloatingContactActions } from '../../components/FloatingContactActions';
import { ProductCard } from '../../components/ProductCard';
import { Screen } from '../../components/Screen';
import { SearchBar } from '../../components/SearchBar';
import { ProductCardSkeleton } from '../../components/Skeleton';
import { colors, radius, shadow } from '../../config/theme';
import { useAuth } from '../../context/AuthContext';
import { useBlocks } from '../../context/BlockContext';
import { useCart } from '../../context/CartContext';
import { usePreferences } from '../../context/PreferencesContext';
import type { RootStackParamList, TabParamList } from '../../navigation/types';
import { catalogService } from '../../services/catalogService';
import { handymanService } from '../../services/handymanService';
import type { Category, Handyman, Product, Store } from '../../types/api';
import { absoluteUrl, discountPercent, effectivePrice, formatPrice, primaryImage } from '../../utils/format';
import { variantEntries } from '../../utils/variants';

type Props = CompositeScreenProps<BottomTabScreenProps<TabParamList, 'Home'>, NativeStackScreenProps<RootStackParamList>>;

const PAGE_SIZE = 20;

export function HomeScreen({ navigation, route }: Props) {
  const { status } = useAuth();
  const { wishlistIds, toggleWishlist, addItem } = useCart();
  const { isDark } = usePreferences();
  const { blockedIds } = useBlocks();

  const [categories, setCategories] = useState<Category[] | null>(null);
  const [featuredHandymen, setFeaturedHandymen] = useState<Handyman[]>([]);
  const [featuredStores, setFeaturedStores] = useState<Store[]>([]);
  const [topRated, setTopRated] = useState<Product[]>([]);
  const [payOnDelivery, setPayOnDelivery] = useState<Product[]>([]);
  const [categoryId, setCategoryId] = useState<string | null>(route.params?.categoryId ?? null);
  const [discoveryFilter, setDiscoveryFilter] = useState(route.params?.categoryId ?? 'all');
  const [query, setQuery] = useState('');
  // Retail and wholesale are separate catalogues: wholesale items have minimum quantities and ship as their own orders.
  const [salesType, setSalesType] = useState<'retail' | 'wholesale'>(route.params?.salesType ?? 'retail');

  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pageRef = useRef(1);
  const listRef = useRef<FlatList<Product>>(null);

  useEffect(() => {
    if (route.params) {
      setCategoryId(route.params.categoryId ?? null);
      setDiscoveryFilter(route.params.categoryId ?? 'all');
      if (route.params.salesType) setSalesType(route.params.salesType);
    }
  }, [route.params?.categoryId, route.params?.salesType]);

  // The homepage category grid includes parent categories and their child categories.
  const refreshSupplemental = useCallback(() => {
    void catalogService.categories().then(setCategories).catch(() => undefined);
    void catalogService.products({ page: 1, page_size: 10, sales_type: 'retail', sort: 'rating' })
      .then((rated) => setTopRated(rated.items.filter((p) => p.review_count > 0))).catch(() => undefined);
    void catalogService.products({ page: 1, page_size: 10, sales_type: 'retail', cod_eligible: true })
      .then((cod) => setPayOnDelivery(cod.items)).catch(() => undefined);
    void handymanService.workers()
      .then((workers) => setFeaturedHandymen([...workers].sort((a, b) => Number(b.average_rating) - Number(a.average_rating) || b.review_count - a.review_count).slice(0, 6)))
      .catch(() => undefined);
  }, []);

  useEffect(() => { refreshSupplemental(); }, [refreshSupplemental]);

  const featuredStoreKey = useRef('');
  const loadFeaturedStores = useCallback(async (source: Product[], force = false) => {
    const ids = [...new Set(source.map((p) => p.store_id))].slice(0, 6);
    const key = ids.join('|');
    if (!key) { setFeaturedStores([]); return; }
    if (!force && featuredStoreKey.current === key) return;
    featuredStoreKey.current = key;
    const results = await Promise.allSettled(ids.map((id) => catalogService.store(id)));
    setFeaturedStores(results.flatMap((result) => result.status === 'fulfilled' && result.value.status === 'approved' ? [result.value] : []));
  }, []);

  useEffect(() => { if (products.length) void loadFeaturedStores(products); }, [loadFeaturedStores, products]);

  const load = useCallback(
    async (page: number, mode: 'replace' | 'append', signal?: AbortSignal): Promise<Product[] | null> => {
      try {
        const res = await catalogService.products({
          page,
          page_size: PAGE_SIZE,
          category_id: categoryId ?? undefined,
          q: query || undefined,
          sales_type: salesType,
        sort: discoveryFilter === 'hot' ? 'newest' : discoveryFilter === 'top-rated' ? 'rating' : undefined,
        }, signal);
        pageRef.current = page;
        setTotal(res.total);
        setProducts((prev) => (mode === 'append' ? [...prev, ...res.items] : res.items));
        setError(null);
        return res.items;
      } catch (e: any) {
        if (e.name !== 'AbortError') setError(e.message);
        return null;
      }
    },
    [categoryId, discoveryFilter, query, salesType],
  );

  // Reload from page 1 whenever the filters change.
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    load(1, 'replace', controller.signal).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [load]);

  const onEnd = async () => {
    if (loading || loadingMore || products.length >= total) return;
    setLoadingMore(true);
    await load(pageRef.current + 1, 'append');
    setLoadingMore(false);
  };

  const refreshInFlight = useRef(false);
  const onRefresh = useCallback(async () => {
    if (refreshInFlight.current) return;
    refreshInFlight.current = true;
    setRefreshing(true);
    refreshSupplemental();
    try {
      const refreshedProducts = await load(1, 'replace');
      if (refreshedProducts) void loadFeaturedStores(refreshedProducts, true);
    } finally {
      refreshInFlight.current = false;
      setRefreshing(false);
    }
  }, [load, loadFeaturedStores, refreshSupplemental]);

  const heart = async (product: Product) => {
    try {
      await toggleWishlist(product.id, product);
    } catch (e: any) {
      Alert.alert('Wishlist', e.message);
    }
  };

  const quickAdd = async (product: Product) => {
    const color = variantEntries(product.colors).find((v) => v.available)?.label ?? null;
    const size = variantEntries(product.sizes).find((v) => v.available)?.label ?? null;
    const option = variantEntries(product.options).find((v) => v.available)?.label ?? null;
    const quantity = product.sales_type === 'wholesale' ? product.wholesale_min_quantity ?? 2 : 1;
    try {
      await addItem({ product_id: product.id, quantity, color, size, option }, product);
      const selected = [color, size, option].filter(Boolean).join(' · ');
      Alert.alert('Added to cart', `${product.name}${selected ? ` · ${selected}` : ''} · ${quantity}`);
    } catch (e: any) {
      Alert.alert('Could not add to cart', e.message || 'Please try again.');
    }
  };

  const chooseCategory = (id: string | null) => { setCategoryId(id); setDiscoveryFilter(id ?? 'all'); };
  const chooseDiscoveryFilter = (filter: string) => {
    setDiscoveryFilter(filter);
    if (filter === 'all' || filter === 'hot' || filter === 'deals' || filter === 'top-rated') setCategoryId(null);
    else setCategoryId(filter);
  };
  const visibleProducts = products.filter((p) => {
    if (discoveryFilter === 'hot') return Date.now() - new Date(p.created_at).getTime() <= 30 * 24 * 60 * 60 * 1000;
    if (discoveryFilter === 'deals') return discountPercent(p) > 0;
    if (discoveryFilter === 'top-rated') return p.review_count > 0 && p.average_rating >= 4;
    return true;
  }).filter((p) => !blockedIds.has(p.store_id));
  const homeBrowsing = !query && !categoryId && salesType === 'retail';
  const hotArrivals = products.filter((p) => Date.now() - new Date(p.created_at).getTime() <= 30 * 24 * 60 * 60 * 1000).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 8);
  const flashDeals = products.filter((p) => discountPercent(p) > 0).slice(0, 8);
  const topDeals = [...products].filter((p) => discountPercent(p) > 0).sort((a, b) => (b.price - effectivePrice(b)) - (a.price - effectivePrice(a))).slice(0, 8);
  const heroPress = (slide: number) => {
    if (slide === 0) navigation.navigate('HandymanHub');
    if (slide === 1) setSalesType('retail');
    if (slide === 2) navigation.navigate('Storefront', { storeId: '41ee2f52-3c2e-4143-849e-437e7dc1ace4' });
  };

  const header = (
    <View>
      {!query && <BannerCarousel onSlidePress={heroPress} />}
      {!query && <CategoryGrid categories={categories} selectedId={categoryId} onSelect={chooseCategory} />}
      {!query && <ValueProposition />}
      {homeBrowsing && <>
        <ProductShowcase title="Hot Arrivals" eyebrow="JUST LANDED" subtitle="New in the last 30 days" items={hotArrivals} onPress={(p) => navigation.navigate('ProductDetails', { productId: p.id })} onAddToCart={quickAdd} />
        <ProductShowcase title="Flash Deals" eyebrow="LIMITED TIME" subtitle="Special discounts. Grab them while they last." items={flashDeals} onPress={(p) => navigation.navigate('ProductDetails', { productId: p.id })} onAddToCart={quickAdd} flashSale />
      </>}
      <View style={styles.discoverHeading}>
        <View><Text style={styles.eyebrow}>MARKETPLACE HIGHLIGHTS</Text><Text style={styles.discoverTitle}>{query ? `Results for “${query}”` : categoryId ? 'In this category' : salesType === 'wholesale' ? 'Wholesale products' : 'Discover Products'}</Text><Text style={styles.discoverSub}>Explore products from verified Ghanaian merchants</Text></View>
      </View>
      <ProductFilters categories={categories?.filter((c) => !c.parent_id).slice(0, 4) ?? []} selected={discoveryFilter} onSelect={chooseDiscoveryFilter} />
    </View>
  );

  const footer = homeBrowsing ? <View>
    <ProductShowcase title="Top Deals" eyebrow="SAVE MORE" subtitle="Biggest savings in the marketplace" items={topDeals} onPress={(p) => navigation.navigate('ProductDetails', { productId: p.id })} onAddToCart={quickAdd} />
    <ProductShowcase title="Pay on Delivery" eyebrow="SHOP WITH CONFIDENCE" subtitle="Eligible products delivered to your door" items={payOnDelivery} onPress={(p) => navigation.navigate('ProductDetails', { productId: p.id })} onAddToCart={quickAdd} />
    <ProductShowcase title="Highly Rated" eyebrow="SHOPPER FAVOURITES" subtitle="Products rated 4 stars and above" items={topRated} onPress={(p) => navigation.navigate('ProductDetails', { productId: p.id })} onAddToCart={quickAdd} />
    <HandymanHubFeature
      items={featuredHandymen}
      onOpen={() => navigation.navigate('HandymanHub')}
      onTrade={(profession) => navigation.navigate('HandymanHub', { profession })}
      onJoin={() => status === 'signedIn' ? navigation.navigate('HandymanRegister') : navigation.navigate('Login')}
      onProfile={(worker) => navigation.navigate('HandymanProfile', { handymanId: worker.id })}
      onBook={(worker) => status === 'signedIn'
        ? navigation.navigate('ServiceRequest', { handymanId: worker.id, professionalName: worker.professional_name || worker.job_title })
        : navigation.navigate('Login')}
    />
    <CampaignSection
      onShop={() => { setQuery(''); setCategoryId(null); setDiscoveryFilter('all'); setSalesType('retail'); listRef.current?.scrollToOffset({ offset: 0, animated: true }); }}
      onHandyman={() => navigation.navigate('HandymanHub')}
      onSell={() => navigation.navigate('Store')}
    />
    <StoreShowcase stores={featuredStores} onPress={(id) => navigation.navigate('Storefront', { storeId: id })} />
    <Testimonials />
  </View> : null;

  return (
    <Screen edges={['left', 'right']}>
      <View style={{ flex: 1 }}>
      <View style={[styles.fixedSearch, isDark && styles.fixedSearchDark]}>
        <SearchBar onSubmit={setQuery} onPickSuggestion={(p) => navigation.navigate('ProductDetails', { productId: p.id })} />
        <View style={styles.toggle}>
          {(['retail', 'wholesale'] as const).map((t) => <Pressable key={t} onPress={() => setSalesType(t)} style={[styles.toggleBtn, isDark && styles.toggleBtnDark, salesType === t && styles.toggleOn]} accessibilityRole="button" accessibilityState={{ selected: salesType === t }}><Text style={[styles.toggleText, isDark && styles.toggleTextDark, salesType === t && { color: colors.white }]}>{t === 'retail' ? 'Retail' : 'Wholesale'}</Text></Pressable>)}
        </View>
      </View>
      <FlatList
        ref={listRef}
        // Products from stores the buyer blocked are filtered out here (the server only stores the block list).
        data={loading ? [] : visibleProducts}
        numColumns={2}
        keyExtractor={(p) => p.id}
        ListHeaderComponent={header}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        onEndReached={onEnd}
        onEndReachedThreshold={0.5}
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            wished={wishlistIds.has(item.id)}
            onPress={() => navigation.navigate('ProductDetails', { productId: item.id })}
            onToggleWishlist={() => heart(item)}
            onAddToCart={() => quickAdd(item)}
          />
        )}
        ListEmptyComponent={
          loading ? (
            <View style={styles.skeletons}>
              {[0, 1, 2].map((r) => (
                <View key={r} style={{ flexDirection: 'row' }}>
                  <ProductCardSkeleton />
                  <ProductCardSkeleton />
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.empty}>
              <Ionicons name={error ? 'cloud-offline-outline' : 'search-outline'} size={40} color={colors.textMuted} />
              <Text style={styles.emptyText}>{error ?? 'No products found.'}</Text>
            </View>
          )
        }
        ListFooterComponent={loadingMore ? <ActivityIndicator style={{ margin: 16 }} color={colors.primary} /> : footer ?? undefined}
      />
      <FloatingContactActions onBackToTop={() => listRef.current?.scrollToOffset({ offset: 0, animated: true })} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fixedSearch: { paddingHorizontal: 10, paddingTop: 8, paddingBottom: 9, backgroundColor: colors.background, zIndex: 10 },
  fixedSearchDark: { backgroundColor: '#101714' },
  toggle: { flexDirection: 'row', marginHorizontal: 6, marginTop: 8, backgroundColor: colors.border, borderRadius: 999, padding: 3 },
  toggleBtn: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 999 },
  toggleBtnDark: { backgroundColor: '#26352E' },
  toggleOn: { backgroundColor: colors.primaryButton },
  toggleText: { fontWeight: '700', color: colors.text },
  toggleTextDark: { color: '#D3DED7' },
  discoverHeading: { marginHorizontal: 14, marginTop: 10, marginBottom: 4, flexDirection: 'row', alignItems: 'center' },
  eyebrow: { color: colors.primary, fontSize: 10, letterSpacing: 1.2, fontWeight: '900' },
  discoverTitle: { color: colors.text, fontSize: 23, fontWeight: '900', marginTop: 3 },
  discoverSub: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
  filters: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  filterChip: { minHeight: 36, paddingHorizontal: 13, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  filterActive: { backgroundColor: colors.primaryButton, borderColor: colors.primary },
  filterText: { color: colors.text, fontSize: 12, fontWeight: '700' },
  filterTextActive: { color: colors.white },
  shelfHeading: { marginHorizontal: 14, marginTop: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
  showcaseFlash: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E52323', borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 3, marginTop: 5 },
  flashDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF0A5' },
  showcaseFlashText: { color: colors.white, fontSize: 9, fontWeight: '900' },
  showcaseAdd: { minHeight: 32, marginTop: 8, borderRadius: radius.sm, backgroundColor: colors.primaryButton, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  showcaseAddText: { color: colors.white, fontSize: 10, fontWeight: '800' },
  shelfTitle: { color: colors.text, fontSize: 19, fontWeight: '900', marginTop: 2 },
  shelfTitleDark: { color: '#F0F5F2' },
  shelfSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  shelfSubDark: { color: '#A4B3AA' },
  valuePanel: { marginHorizontal: 14, marginTop: 4, marginBottom: 8, padding: 12, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', flexWrap: 'wrap' },
  valueItem: { width: '50%', flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9, paddingHorizontal: 4 },
  valueIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  valueEmoji: { color: colors.primary, fontSize: 16, fontWeight: '900' },
  valueTitle: { color: colors.text, fontSize: 11, fontWeight: '800' },
  valueSub: { color: colors.textMuted, fontSize: 9, marginTop: 2, flexShrink: 1 },
  sectionBlock: { marginTop: 22, marginBottom: 8, paddingHorizontal: 14 },
  campaignCard: { width: 250, height: 112, overflow: 'hidden', borderRadius: radius.md, backgroundColor: colors.skeleton },
  campaignImage: { width: '100%', height: '100%' },
  campaignShade: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 10, backgroundColor: 'rgba(0,0,0,0.52)' },
  campaignTitle: { color: colors.white, fontSize: 14, fontWeight: '900' },
  storeCard: { width: 150, minHeight: 132, padding: 12, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  storeAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 7 },
  storeLogo: { width: '100%', height: '100%', borderRadius: 24 },
  storeInitial: { color: colors.primary, fontWeight: '900', fontSize: 20 },
  storeName: { maxWidth: '100%', color: colors.text, fontSize: 12, fontWeight: '800' },
  storeVerified: { color: colors.primary, fontSize: 10, fontWeight: '700', marginTop: 4 },
  testimonialSection: { marginTop: 24, marginBottom: 8, paddingHorizontal: 16, paddingVertical: 22, backgroundColor: colors.primarySoft },
  testimonialTitle: { color: colors.text, fontSize: 20, fontWeight: '900', textAlign: 'center', marginTop: 4 },
  testimonialSub: { color: colors.textMuted, fontSize: 12, textAlign: 'center', lineHeight: 18, marginTop: 5, marginBottom: 12 },
  testimonialCard: { padding: 14, borderRadius: radius.md, backgroundColor: colors.surface, marginTop: 8, ...shadow.card },
  stars: { color: '#E7A51A', fontSize: 14, letterSpacing: 2 },
  quote: { color: colors.text, fontSize: 12, lineHeight: 18, marginTop: 7 },
  quoteBy: { color: colors.text, fontSize: 11, fontWeight: '800', marginTop: 9 },
  quoteMeta: { color: colors.textMuted, fontWeight: '500' },
  handymanPanel: { marginHorizontal: 12, marginTop: 20, padding: 16, borderRadius: radius.lg, backgroundColor: '#073C35' },
  handymanEyebrow: { color: '#A8E7D2', fontSize: 10, fontWeight: '900', letterSpacing: 1.1 },
  handymanTitle: { color: colors.white, fontSize: 22, lineHeight: 28, fontWeight: '900', marginTop: 8 },
  handymanCopy: { color: '#D0E8E0', fontSize: 12, lineHeight: 18, marginTop: 7 },
  handymanButtons: { flexDirection: 'row', gap: 9, marginTop: 14 },
  browsePros: { flex: 1, minHeight: 42, borderRadius: radius.md, backgroundColor: '#14A976', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  browseProsText: { color: colors.white, fontSize: 12, fontWeight: '900' },
  joinPro: { minHeight: 42, borderRadius: radius.md, borderWidth: 1, borderColor: '#91C7B8', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  joinProText: { color: colors.white, fontSize: 12, fontWeight: '800' },
  tradeGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, marginHorizontal: -4 },
  tradeTile: { width: '47%', padding: 10, margin: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: radius.md },
  tradeEmoji: { fontSize: 20 },
  tradeName: { color: colors.white, fontSize: 12, fontWeight: '900', marginTop: 5 },
  tradeDetail: { color: '#BFD9D1', fontSize: 10, marginTop: 2 },
  prosBlock: { marginTop: 17 },
  prosTitle: { color: colors.white, fontSize: 16, fontWeight: '900', marginBottom: 9 },
  proCard: { width: 240, padding: 10, borderRadius: radius.md, backgroundColor: colors.surface },
  proInfo: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  proImage: { width: 54, height: 54, borderRadius: 27, backgroundColor: colors.primarySoft },
  proPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  proName: { color: colors.text, fontSize: 12, fontWeight: '900' },
  proTrade: { color: colors.textMuted, fontSize: 10, marginTop: 2 },
  proRating: { color: '#C18A0C', fontSize: 10, fontWeight: '900', marginTop: 3 },
  proReview: { color: colors.textMuted, fontWeight: '500' },
  proButtons: { flexDirection: 'row', gap: 7, marginTop: 10 },
  profileButton: { flex: 1, minHeight: 34, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  profileButtonText: { color: colors.text, fontSize: 11, fontWeight: '800' },
  bookProButton: { flex: 1, minHeight: 34, borderRadius: radius.sm, backgroundColor: colors.primaryButton, alignItems: 'center', justifyContent: 'center' },
  bookProText: { color: colors.white, fontSize: 11, fontWeight: '800' },
  howBlock: { marginTop: 18, padding: 12, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.08)' },
  howTitle: { color: '#BCE9D9', fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  howRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  howStep: { flex: 1 },
  howNumber: { color: '#71DDB8', fontSize: 18, fontWeight: '900' },
  howStepTitle: { color: colors.white, fontSize: 10, lineHeight: 14, fontWeight: '700', marginTop: 3 },
  skeletons: { paddingTop: 4 },
  empty: { alignItems: 'center', padding: 40, gap: 10 },
  emptyText: { color: colors.textMuted, textAlign: 'center' },
});

function ProductShowcase({ title, subtitle, items, onPress, onAddToCart, eyebrow, flashSale = false }: { title: string; subtitle: string; items: Product[]; onPress: (p: Product) => void; onAddToCart: (p: Product) => Promise<void>; eyebrow?: string; flashSale?: boolean }) {
  const { isDark } = usePreferences();
  if (!items.length) return null;
  return <View style={{ marginBottom: 12 }}>
    <View style={styles.shelfHeading}><View style={{ flex: 1 }}><Text style={styles.eyebrow}>{eyebrow ?? 'ERAVENDA PICKS'}</Text><Text style={[styles.shelfTitle, isDark && styles.shelfTitleDark]}>{title}</Text><Text style={[styles.shelfSub, isDark && styles.shelfSubDark]}>{subtitle}</Text></View></View>
    <FlatList horizontal data={items} keyExtractor={(p) => p.id} showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 8 }} renderItem={({ item }) => (
      <View style={[{ width: 150, marginHorizontal: 4, padding: 8, backgroundColor: colors.surface, borderRadius: radius.md, ...shadow.card }, isDark && { backgroundColor: '#17221D', shadowOpacity: 0.22 }]}>
        <Pressable onPress={() => onPress(item)} accessibilityRole="button" accessibilityLabel={item.name}>
        <Image source={{ uri: primaryImage(item) }} style={{ width: 134, height: 104, borderRadius: radius.sm, backgroundColor: colors.skeleton }} contentFit="cover" />
        {flashSale && discountPercent(item) > 0 && <FlashLabel discount={discountPercent(item)} />}
        <Text numberOfLines={2} style={{ color: isDark ? '#F0F5F2' : colors.text, fontSize: 12, fontWeight: '700', marginTop: 4 }}>{item.name}</Text>
        <Text style={{ color: colors.primary, fontWeight: '800', marginTop: 4 }}>{formatPrice(effectivePrice(item))}</Text>
        </Pressable>
        <Pressable onPress={() => void onAddToCart(item)} style={styles.showcaseAdd} accessibilityRole="button" accessibilityLabel={`Add ${item.name} to cart`}><Ionicons name="cart-outline" size={14} color={colors.white} /><Text style={styles.showcaseAddText}>Add to Cart</Text></Pressable>
      </View>
    )} />
  </View>;
}

function FlashLabel({ discount }: { discount: number }) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.06, duration: 600, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [pulse]);
  return <Animated.View style={[styles.showcaseFlash, { transform: [{ scale: pulse }] }]}><View style={styles.flashDot} /><Text style={styles.showcaseFlashText}>FLASH · {discount}% OFF</Text></Animated.View>;
}

function ProductFilters({ categories, selected, onSelect }: { categories: Category[]; selected: string; onSelect: (id: string) => void }) {
  const options = [{ id: 'all', title: 'All Products' }, { id: 'hot', title: '🔥 Hot Arrivals' }, { id: 'deals', title: '🔥 Top Deals' }, { id: 'top-rated', title: '⭐ Highly Rated (4★+)' }, ...categories.map((c) => ({ id: c.id, title: c.name }))];
  return <FlatList horizontal data={options} keyExtractor={(o) => o.id} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters} renderItem={({ item }) => <Pressable onPress={() => onSelect(item.id)} style={[styles.filterChip, selected === item.id && styles.filterActive]} accessibilityRole="button" accessibilityState={{ selected: selected === item.id }}><Text style={[styles.filterText, selected === item.id && styles.filterTextActive]}>{item.title}</Text></Pressable>} />;
}

function ValueProposition() {
  const items = [
    ['🚚', 'Nationwide Delivery', 'Tracked across all Ghana regions'], ['🛡️', 'Escrow Protection', 'Funds held until you are satisfied'],
    ['✓', 'Vetted Handymen', 'Background checked professionals'], ['₵', 'Instant Local Pay', 'MTN MoMo, Telecel, AT & cards'],
  ];
  return <View style={styles.valuePanel}>{items.map(([icon, title, sub]) => <View key={title} style={styles.valueItem}><View style={styles.valueIcon}><Text style={styles.valueEmoji}>{icon}</Text></View><View style={{ flex: 1 }}><Text style={styles.valueTitle}>{title}</Text><Text style={styles.valueSub}>{sub}</Text></View></View>)}</View>;
}

function HandymanHubFeature({ items, onOpen, onTrade, onJoin, onProfile, onBook }: { items: Handyman[]; onOpen: () => void; onTrade: (profession: string) => void; onJoin: () => void; onProfile: (worker: Handyman) => void; onBook: (worker: Handyman) => void }) {
  const trades = [
    ['⚡', 'Electrician', 'Wiring & power'], ['🚰', 'Plumber', 'Pipes & leaks'], ['❄️', 'AC Technician', 'Cooling & gas'], ['🔨', 'Carpenter', 'Wood & doors'],
    ['🎨', 'Painter', 'Walls & finish'], ['🧱', 'Mason', 'Tiling & brick'], ['🔧', 'Appliance Repair', 'Fridge & wash'], ['🚗', 'Auto Mechanic', 'Auto & service'],
  ];
  return <View style={styles.handymanPanel}>
    <Text style={styles.handymanEyebrow}>🛠 HANDYMAN HUB</Text><Text style={styles.handymanTitle}>Verified Professionals for Any Repair or Installation</Text>
    <Text style={styles.handymanCopy}>Book vetted, rated electricians, plumbers, AC technicians and carpenters with safe escrow payments.</Text>
    <View style={styles.handymanButtons}><Pressable onPress={onOpen} style={styles.browsePros}><Text style={styles.browseProsText}>Browse All Pros  →</Text></Pressable><Pressable onPress={onJoin} style={styles.joinPro}><Text style={styles.joinProText}>Join as a Pro</Text></Pressable></View>
    <View style={styles.tradeGrid}>{trades.map(([icon, name, detail]) => <Pressable key={name} onPress={() => onTrade(name)} style={styles.tradeTile}><Text style={styles.tradeEmoji}>{icon}</Text><Text style={styles.tradeName}>{name}</Text><Text style={styles.tradeDetail}>{detail}</Text></Pressable>)}</View>
    {items.length > 0 && <View style={styles.prosBlock}>
      <Text style={styles.prosTitle}>Top-Rated Approved Pros</Text>
      <FlatList
        horizontal
        data={items}
        keyExtractor={(worker) => worker.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 10 }}
        renderItem={({ item }) => <View style={styles.proCard}>
          <Pressable onPress={() => onProfile(item)} style={styles.proInfo}>
            {item.portfolio[0]?.image_url
              ? <Image source={{ uri: absoluteUrl(item.portfolio[0].image_url) }} style={styles.proImage} contentFit="cover" />
              : <View style={[styles.proImage, styles.proPlaceholder]}><Ionicons name="person" size={24} color="#B7E5D5" /></View>}
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={styles.proName}>{item.professional_name || item.job_title}</Text>
              <Text numberOfLines={1} style={styles.proTrade}>{item.custom_job_title || item.job_title}</Text>
              <Text style={styles.proRating}>★ {Number(item.average_rating).toFixed(1)} <Text style={styles.proReview}>({item.review_count} reviews)</Text></Text>
            </View>
          </Pressable>
          <View style={styles.proButtons}>
            <Pressable onPress={() => onProfile(item)} style={styles.profileButton}><Text style={styles.profileButtonText}>Profile</Text></Pressable>
            <Pressable onPress={() => onBook(item)} style={styles.bookProButton}><Text style={styles.bookProText}>Book Pro</Text></Pressable>
          </View>
        </View>}
      />
    </View>}
    <View style={styles.howBlock}><Text style={styles.howTitle}>HOW IT WORKS: SAFE & EASY</Text><View style={styles.howRow}>{[['1', 'Choose Your Specialist'], ['2', 'Safe Escrow Booking'], ['3', 'Job Guaranteed & Done']].map(([number, title]) => <View key={number} style={styles.howStep}><Text style={styles.howNumber}>{number}</Text><Text style={styles.howStepTitle}>{title}</Text></View>)}</View></View>
  </View>;
}

function CampaignSection({ onShop, onHandyman, onSell }: { onShop: () => void; onHandyman: () => void; onSell: () => void }) {
  const cards = [
    { title: 'Made in Ghana products', uri: 'https://res.cloudinary.com/ni2pcrua/image/upload/v1789765535/shop_now.png', action: onShop },
    { title: 'Handyman Hub Services', uri: 'https://res.cloudinary.com/ni2pcrua/image/upload/v1789765535/handyman-hub.png', action: onHandyman },
    { title: 'Sell on EraVenda', uri: 'https://res.cloudinary.com/ni2pcrua/image/upload/v1789765539/sell_with_us.png', action: onSell },
  ];
  return <View style={styles.sectionBlock}><Text style={styles.eyebrow}>SPECIAL CAMPAIGNS</Text><Text style={styles.shelfTitle}>Shop Local & Grow Your Business</Text><FlatList horizontal data={cards} keyExtractor={(c) => c.title} showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingTop: 10 }} renderItem={({ item }) => <Pressable onPress={item.action} style={styles.campaignCard}><Image source={{ uri: item.uri }} style={styles.campaignImage} contentFit="cover" /><View style={styles.campaignShade}><Text style={styles.campaignTitle}>{item.title}</Text></View></Pressable>} /></View>;
}

function StoreShowcase({ stores, onPress }: { stores: Store[]; onPress: (id: string) => void }) {
  if (!stores.length) return null;
  return <View style={styles.sectionBlock}><Text style={styles.eyebrow}>INDEPENDENT SELLERS</Text><Text style={styles.shelfTitle}>Featured Merchant Stores</Text><FlatList horizontal data={stores} keyExtractor={(s) => s.id} showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 9, paddingTop: 10 }} renderItem={({ item }) => <Pressable onPress={() => onPress(item.id)} style={styles.storeCard}><View style={styles.storeAvatar}>{item.logo_url ? <Image source={{ uri: absoluteUrl(item.logo_url) }} style={styles.storeLogo} contentFit="cover" /> : <Text style={styles.storeInitial}>{item.store_name?.[0]?.toUpperCase() ?? '?'}</Text>}</View><Text numberOfLines={1} style={styles.storeName}>{item.store_name}</Text><Text style={styles.storeVerified}>✓ Verified Store</Text></Pressable>} /></View>;
}

function Testimonials() {
  const stories = [
    ['KA', 'Kofi A.', 'Verified Buyer · Sunyani', 'Ordered mobile accessories from Accra to Kumasi. Arrived in under 24 hours, packaged neatly. The MoMo checkout was super fast!'],
    ['AB', 'Abena B.', 'Service Client · Fiapre', 'Needed an emergency electrician for my salon. Found an approved pro on Handyman Hub in 20 minutes. Escrow payment gave total peace of mind!'],
    ['EO', 'Emmanuel O.', 'Store Vendor · Goaso', 'I sell handmade leather shoes. Setting up my store was easy, and integrated delivery handling took a massive burden off my shoulders.'],
  ];
  return <View style={styles.testimonialSection}><Text style={[styles.eyebrow, { textAlign: 'center' }]}>REAL STORIES</Text><Text style={styles.testimonialTitle}>Loved by Shoppers & Homeowners</Text><Text style={styles.testimonialSub}>EraVenda makes shopping and home maintenance easier across Ghana.</Text>{stories.map(([initial, name, role, quote]) => <View key={initial} style={styles.testimonialCard}><Text style={styles.stars}>★★★★★</Text><Text style={styles.quote}>“{quote}”</Text><Text style={styles.quoteBy}>{initial}  {name}<Text style={styles.quoteMeta}> · {role}</Text></Text></View>)}</View>;
}
