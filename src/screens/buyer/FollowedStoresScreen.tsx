import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Image } from 'expo-image';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { Header } from '../../components/Section';
import { colors, radius, shadow } from '../../config/theme';
import type { RootStackParamList } from '../../navigation/types';
import { catalogService } from '../../services/catalogService';
import type { StoreFollow } from '../../types/api';
import { absoluteUrl } from '../../utils/format';

type Props = NativeStackScreenProps<RootStackParamList, 'FollowedStores'>;

export function FollowedStoresScreen({ navigation }: Props) {
  const [items, setItems] = useState<StoreFollow[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try { setItems(await catalogService.following()); setError(''); }
    catch (e: any) { setError(e.message || 'Could not load followed stores.'); setItems((current) => current ?? []); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const unfollow = (follow: StoreFollow) => Alert.alert('Unfollow this store?', `You will stop following ${follow.store.store_name}.`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Unfollow', style: 'destructive', onPress: async () => {
      setBusyId(follow.store.id);
      try { await catalogService.unfollow(follow.store.id); setItems((current) => current?.filter((item) => item.store.id !== follow.store.id) ?? []); }
      catch (e: any) { Alert.alert('Could not unfollow', e.message); }
      finally { setBusyId(''); }
    } },
  ]);

  return <Screen>
    <Header title="Stores you follow" onBack={() => navigation.goBack()} />
    {!items ? <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} /> : <FlatList
      data={items}
      keyExtractor={(item) => item.store.id}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.primary} />}
      ListEmptyComponent={<View style={styles.empty}><Ionicons name="storefront-outline" size={40} color={colors.textMuted} /><Text style={styles.emptyTitle}>{error || 'No followed stores yet'}</Text><Text style={styles.emptyCopy}>Follow a merchant from their store page and it will appear here.</Text><Button title="Browse products" onPress={() => navigation.navigate('Products')} style={{ marginTop: 8 }} /></View>}
      renderItem={({ item }) => <View style={styles.card}>
        <Pressable onPress={() => navigation.navigate('Storefront', { storeId: item.store.id })} style={styles.storeInfo}>
          {item.store.logo_url ? <Image source={{ uri: absoluteUrl(item.store.logo_url) }} style={styles.logo} contentFit="cover" /> : <View style={[styles.logo, styles.logoFallback]}><Text style={styles.initial}>{item.store.store_name?.[0]?.toUpperCase() || '?'}</Text></View>}
          <View style={{ flex: 1 }}><Text numberOfLines={1} style={styles.storeName}>{item.store.store_name}</Text><Text style={styles.location}>{[item.store.city, item.store.region].filter(Boolean).join(', ') || 'Ghana'}</Text><Text style={styles.followed}>Following since {new Date(item.created_at).toLocaleDateString()}</Text></View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
        <Pressable onPress={() => unfollow(item)} disabled={busyId === item.store.id} style={styles.unfollow} accessibilityRole="button">
          {busyId === item.store.id ? <ActivityIndicator size="small" color={colors.danger} /> : <><Ionicons name="heart-dislike-outline" size={16} color={colors.danger} /><Text style={styles.unfollowText}>Unfollow</Text></>}
        </Pressable>
      </View>}
    />}
  </Screen>;
}

const styles = StyleSheet.create({
  list: { padding: 14, gap: 10, flexGrow: 1 },
  card: { padding: 13, borderRadius: radius.lg, backgroundColor: colors.surface, ...shadow.card },
  storeInfo: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  logo: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.primarySoft },
  logoFallback: { alignItems: 'center', justifyContent: 'center' },
  initial: { color: colors.primary, fontSize: 20, fontWeight: '900' },
  storeName: { color: colors.text, fontSize: 14, fontWeight: '900' },
  location: { color: colors.textMuted, fontSize: 11, marginTop: 3 },
  followed: { color: colors.textMuted, fontSize: 10, marginTop: 3 },
  unfollow: { alignSelf: 'flex-end', minWidth: 92, minHeight: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10, borderRadius: radius.pill, backgroundColor: '#FFF2F2' },
  unfollowText: { color: colors.danger, fontSize: 11, fontWeight: '800' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 8 },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '900', textAlign: 'center' },
  emptyCopy: { color: colors.textMuted, fontSize: 12, lineHeight: 18, textAlign: 'center' },
});
