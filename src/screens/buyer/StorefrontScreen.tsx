/**
 * STOREFRONT (buyer view of a vendor)
 *  GET /stores/{id}              public profile, follower count
 *  GET /stores/{id}/follow-status + POST/DELETE /stores/{id}/follow   (signed-in buyers)
 *  GET /products?store_id=...    the vendor's products. Needs the small backend patch in /backend-patch;
 *                                on an unpatched server the filter is ignored, which we detect and report
 *                                instead of showing other vendors' products as this store's.
 */
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Image } from 'expo-image';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { ProductCard } from '../../components/ProductCard';
import { Screen } from '../../components/Screen';
import { Header } from '../../components/Section';
import { colors, font, radius } from '../../config/theme';
import { useAuth } from '../../context/AuthContext';
import { useBlocks } from '../../context/BlockContext';
import { useCart } from '../../context/CartContext';
import type { RootStackParamList } from '../../navigation/types';
import { catalogService } from '../../services/catalogService';
import type { Product, Store } from '../../types/api';
import { absoluteUrl } from '../../utils/format';

type Props = NativeStackScreenProps<RootStackParamList, 'Storefront'>;
const PAGE_SIZE = 20;

export function StorefrontScreen({ route, navigation }: Props) {
  const { storeId } = route.params;
  const { status } = useAuth();
  const { wishlistIds, toggleWishlist } = useCart();
  const { blockedIds, block, unblock } = useBlocks();

  const [store, setStore] = useState<Store | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [following, setFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [unsupported, setUnsupported] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const pageRef = useRef(1);

  useEffect(() => {
    catalogService.store(storeId).then(setStore).catch((e) => setError(e.message));
  }, [storeId]);

  useEffect(() => {
    if (status !== 'signedIn') return setFollowing(false);
    catalogService.followStatus(storeId).then((r) => setFollowing(r.is_following)).catch(() => undefined);
  }, [storeId, status]);

  const load = useCallback(async (page: number) => {
    try {
      const res = await catalogService.products({ store_id: storeId, page, page_size: PAGE_SIZE });
      // An unpatched server ignores store_id and returns everyone's products.
      if (res.items.some((p) => p.store_id !== storeId)) return setUnsupported(true);
      pageRef.current = page;
      setTotal(res.total);
      setProducts((prev) => (page === 1 ? res.items : [...prev, ...res.items]));
    } catch (e: any) {
      setError(e.message);
    }
  }, [storeId]);

  useEffect(() => {
    setLoading(true);
    load(1).finally(() => setLoading(false));
  }, [load]);

  const onEnd = async () => {
    if (loading || loadingMore || unsupported || products.length >= total) return;
    setLoadingMore(true);
    await load(pageRef.current + 1);
    setLoadingMore(false);
  };

  const toggleFollow = async () => {
    if (status !== 'signedIn') return navigation.navigate('Login');
    setFollowBusy(true);
    try {
      if (following) await catalogService.unfollow(storeId);
      else await catalogService.follow(storeId);
      setFollowing(!following);
      setStore((s) => (s ? { ...s, follower_count: Math.max(0, (s.follower_count ?? 0) + (following ? -1 : 1)) } : s));
    } catch (e: any) {
      Alert.alert('Follow', e.message); // e.g. "You can't follow your own store"
    } finally {
      setFollowBusy(false);
    }
  };

  const isBlocked = blockedIds.has(storeId);

  const toggleBlock = () => {
    if (status !== 'signedIn') return navigation.navigate('Login');
    const run = async () => {
      try {
        if (isBlocked) await unblock(storeId);
        else await block(storeId, store?.store_name ?? 'Store');
      } catch (e: any) {
        Alert.alert('Block', e.message);
      }
    };
    if (isBlocked) return void run();
    Alert.alert('Block this store?', "Its products will be hidden from your Home and search. You can unblock it any time in Account > Blocked stores.", [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Block store', style: 'destructive', onPress: run },
    ]);
  };

  const reportStore = () =>
    status === 'signedIn'
      ? navigation.navigate('Report', { targetType: 'store', targetId: storeId, title: store?.store_name ?? 'Store', storeId })
      : navigation.navigate('Login');

  const heart = async (id: string) => {
    if (status !== 'signedIn') return navigation.navigate('Login');
    try { await toggleWishlist(id); } catch (e: any) { Alert.alert('Wishlist', e.message); }
  };

  if (error && !store) return <Screen><Header title="Store" onBack={() => navigation.goBack()} /><Text style={styles.err}>{error}</Text></Screen>;
  if (!store) return <Screen><Header title="Store" onBack={() => navigation.goBack()} /><ActivityIndicator style={{ marginTop: 50 }} color={colors.primary} /></Screen>;

  const header = (
    <View>
      {!!store.banner_url && <Image source={{ uri: absoluteUrl(store.banner_url) }} style={styles.banner} contentFit="cover" />}
      <View style={styles.card}>
        <View style={styles.row}>
          {store.logo_url ? <Image source={{ uri: absoluteUrl(store.logo_url) }} style={styles.logo} contentFit="cover" /> : <View style={[styles.logo, styles.center]}><Ionicons name="storefront-outline" size={26} color={colors.primary} /></View>}
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{store.store_name}</Text>
            <Text style={styles.muted}>{[store.sub_town, store.city, store.region].filter(Boolean).join(', ')}</Text>
            <Text style={styles.muted}>{store.follower_count ?? 0} follower{(store.follower_count ?? 0) === 1 ? '' : 's'}</Text>
          </View>
        </View>
        {!!store.description && <Text style={styles.desc}>{store.description}</Text>}
        {/* Following your own store is rejected by the server with a clear message. */}
        <Button title={following ? 'Following' : 'Follow'} variant={following ? 'outline' : 'primary'} onPress={toggleFollow} loading={followBusy} />
        <View style={styles.safety}>
          <Pressable onPress={reportStore} hitSlop={8}><Text style={styles.safetyLink}>Report store</Text></Pressable>
          <Pressable onPress={toggleBlock} hitSlop={8}><Text style={styles.safetyLink}>{isBlocked ? 'Unblock store' : 'Block store'}</Text></Pressable>
        </View>
      </View>
      <Text style={styles.heading}>Products</Text>
    </View>
  );

  return (
    <Screen>
      <Header title="Store" onBack={() => navigation.goBack()} />
      <FlatList
        data={loading || unsupported || isBlocked ? [] : products}
        numColumns={2}
        keyExtractor={(p) => p.id}
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: 24 }}
        onEndReached={onEnd}
        onEndReachedThreshold={0.5}
        renderItem={({ item }) => (
          <ProductCard product={item} wished={wishlistIds.has(item.id)} onPress={() => navigation.push('ProductDetails', { productId: item.id })} onToggleWishlist={() => heart(item.id)} />
        )}
        ListEmptyComponent={
          loading ? <ActivityIndicator style={{ margin: 24 }} color={colors.primary} />
          : isBlocked ? <Text style={styles.empty}>You blocked this store, so its products are hidden. Tap Unblock store to see them again.</Text>
          : unsupported ? <Text style={styles.empty}>This store's product list needs a small server update (see backend-patch in the app project).</Text>
          : <Text style={styles.empty}>{error ?? 'No products yet.'}</Text>
        }
        ListFooterComponent={loadingMore ? <ActivityIndicator style={{ margin: 16 }} color={colors.primary} /> : undefined}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  err: { color: colors.danger, padding: 20 },
  banner: { height: 110, marginHorizontal: 6, borderRadius: radius.lg, backgroundColor: colors.skeleton },
  card: { backgroundColor: colors.surface, margin: 6, borderRadius: radius.lg, padding: 14, gap: 10 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  logo: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primarySoft },
  center: { alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: font.xl, fontWeight: '800', color: colors.text },
  muted: { color: colors.textMuted, fontSize: 13 },
  desc: { color: colors.text, lineHeight: 20 },
  safety: { flexDirection: 'row', justifyContent: 'space-between' },
  safetyLink: { color: colors.textMuted, fontSize: 13, textDecorationLine: 'underline' },
  heading: { fontSize: font.lg, fontWeight: '800', color: colors.text, marginHorizontal: 6, marginTop: 8, marginBottom: 2 },
  empty: { textAlign: 'center', color: colors.textMuted, padding: 30, lineHeight: 20 },
});
