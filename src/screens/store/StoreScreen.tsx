/**
 * SELL ON ERAVENDA / MY STORE
 * GET /stores/me
 *   404      -> no application yet: explain and offer "Open a store"
 *   pending  -> under review (1-2 business days)
 *   approved -> store is live; if the account role is still "buyer" we refresh it so the Seller tab appears
 *   rejected / suspended -> show the admin's reason
 * The account becomes a seller on the SERVER when an admin approves the store; the app just re-reads it.
 */
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Image } from 'expo-image';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { Header } from '../../components/Section';
import { colors, font, radius } from '../../config/theme';
import { useAuth } from '../../context/AuthContext';
import type { RootStackParamList } from '../../navigation/types';
import { ApiError } from '../../services/http';
import { sellerService } from '../../services/sellerService';
import type { Store } from '../../types/api';
import { absoluteUrl } from '../../utils/format';

type Props = NativeStackScreenProps<RootStackParamList, 'Store'>;

const COPY: Record<Store['status'], { title: string; body: string; color: string }> = {
  pending: { title: 'Under review', body: 'Our team usually reviews new stores within 1-2 business days. We will email you when it is decided.', color: colors.accent },
  approved: { title: 'Approved', body: 'Your store is live. Add products from the Seller tab.', color: colors.success },
  rejected: { title: 'Not approved', body: 'Your application was not approved.', color: colors.danger },
  suspended: { title: 'Suspended', body: 'Your store is currently suspended.', color: colors.danger },
};

export function StoreScreen({ navigation }: Props) {
  const { user, refreshUser } = useAuth();
  const [store, setStore] = useState<Store | null | undefined>(undefined); // undefined = loading, null = none
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    let alive = true;
    sellerService
      .store()
      .then(async (s) => {
        if (!alive) return;
        setStore(s);
        setError(null);
        // Approval flips the role on the server; pick it up so the Seller tab appears without re-login.
        if (s.status === 'approved' && user?.role === 'buyer') await refreshUser().catch(() => undefined);
      })
      .catch((e) => {
        if (!alive) return;
        if (e instanceof ApiError && e.status === 404) setStore(null);
        else setError(e.message);
      });
    return () => { alive = false; };
  }, [user?.role, refreshUser]));

  if (error) return <Screen><Header title="My store" onBack={() => navigation.goBack()} /><Text style={styles.err}>{error}</Text></Screen>;
  if (store === undefined) return <Screen><Header title="My store" onBack={() => navigation.goBack()} /><ActivityIndicator style={{ marginTop: 50 }} color={colors.primary} /></Screen>;

  if (store === null) {
    return (
      <Screen>
        <Header title="Sell on EraVenda" onBack={() => navigation.goBack()} />
        <View style={styles.pad}>
          <Text style={styles.big}>Reach buyers across Ghana</Text>
          <Text style={styles.muted}>Apply for a store, add your products, and get paid when orders are delivered. EraVenda reviews every store before it goes live.</Text>
          <Button title="Open a store" onPress={() => navigation.navigate('StoreForm')} />
        </View>
      </Screen>
    );
  }

  const info = COPY[store.status];
  return (
    <Screen>
      <Header title="My store" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.pad}>
        {!!store.banner_url && <Image source={{ uri: absoluteUrl(store.banner_url) }} style={styles.banner} contentFit="cover" />}
        <View style={styles.row}>
          {!!store.logo_url && <Image source={{ uri: absoluteUrl(store.logo_url) }} style={styles.logo} contentFit="cover" />}
          <View style={{ flex: 1 }}>
            <Text style={styles.big}>{store.store_name}</Text>
            <Text style={styles.muted}>{[store.sub_town, store.city, store.region].filter(Boolean).join(', ')}</Text>
          </View>
        </View>
        <View style={[styles.status, { borderColor: info.color }]}>
          <Text style={[styles.statusTitle, { color: info.color }]}>{info.title}</Text>
          <Text style={styles.body}>{info.body}</Text>
          {!!store.rejection_reason && <Text style={[styles.body, { marginTop: 6 }]}>Reason: {store.rejection_reason}</Text>}
          {(store.status === 'rejected' || store.status === 'suspended') && <Text style={[styles.body, { marginTop: 6 }]}>Contact EraVenda support if you would like this reviewed again.</Text>}
        </View>
        {!!store.description && <Text style={styles.body}>{store.description}</Text>}
        <Button title="Edit store details" variant="outline" onPress={() => navigation.navigate('StoreForm', { store })} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 16, gap: 14 },
  err: { color: colors.danger, padding: 20 },
  big: { fontSize: font.xl, fontWeight: '800', color: colors.text },
  muted: { color: colors.textMuted, lineHeight: 20 },
  body: { color: colors.text, lineHeight: 20 },
  banner: { width: '100%', height: 120, borderRadius: radius.lg, backgroundColor: colors.skeleton },
  logo: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.skeleton },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  status: { borderWidth: 1.5, borderRadius: radius.md, padding: 12, backgroundColor: colors.surface },
  statusTitle: { fontWeight: '800', marginBottom: 4 },
});
