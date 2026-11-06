/**
 * NOTIFICATIONS: one place for email AND push preferences.
 *  GET /users/me/notification-preferences   on open
 *  PUT /users/me/notification-preferences   per switch (optimistic: flips instantly, rolls back on failure)
 * Below the switches it shows whether THIS phone can receive push (OS permission) and links to Settings if blocked.
 * Receipts and payment-confirmation emails are transactional and are not controlled here.
 */
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Notifications from 'expo-notifications';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, AppState, Linking, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { Header } from '../../components/Section';
import { colors, font, radius } from '../../config/theme';
import { useAuth } from '../../context/AuthContext';
import type { RootStackParamList } from '../../navigation/types';
import { accountService } from '../../services/accountService';
import { registerForPush } from '../../services/pushService';
import type { NotificationPrefs } from '../../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'Notifications'>;
type PermState = 'granted' | 'denied' | 'undetermined';

export function NotificationsScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [perm, setPerm] = useState<PermState>('undetermined');

  const checkPermission = useCallback(async () => {
    try {
      const p = await Notifications.getPermissionsAsync();
      setPerm(p.status === 'granted' ? 'granted' : p.canAskAgain ? 'undetermined' : 'denied');
    } catch {
      /* permission lookup is informational only */
    }
  }, []);

  useEffect(() => {
    accountService.notificationPrefs().then(setPrefs).catch((e) => setError(e.message));
    void checkPermission();
    // The buyer may come back from the system Settings app after changing the permission.
    const sub = AppState.addEventListener('change', (s) => s === 'active' && void checkPermission());
    return () => sub.remove();
  }, [checkPermission]);

  const toggle = async (key: keyof NotificationPrefs, value: boolean) => {
    if (!prefs) return;
    const before = prefs;
    setPrefs({ ...prefs, [key]: value }); // optimistic
    try {
      setPrefs(await accountService.updateNotificationPrefs({ [key]: value }));
      // Turning a push switch on is a good moment to ask for the OS permission if we never did.
      if (value && key !== 'order_updates_email' && perm === 'undetermined') {
        await registerForPush();
        await checkPermission();
      }
    } catch (e: any) {
      setPrefs(before);
      Alert.alert('Could not save', e.message);
    }
  };

  const Row = ({ title, sub, k }: { title: string; sub: string; k: keyof NotificationPrefs }) => (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSub}>{sub}</Text>
      </View>
      <Switch value={prefs?.[k] ?? false} onValueChange={(v) => toggle(k, v)} trackColor={{ true: colors.primary }} accessibilityLabel={title} />
    </View>
  );

  return (
    <Screen>
      <Header title="Notifications" onBack={() => navigation.goBack()} />
      {error && !prefs ? (
        <Text style={styles.err}>{error}</Text>
      ) : !prefs ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
          <Text style={styles.section}>Your orders</Text>
          <Row k="order_updates_push" title="Push notifications" sub="Payment received, preparing, dispatched, delivered, cancelled" />
          <Row k="order_updates_email" title="Email updates" sub="The same updates, sent to your email address" />

          {user?.role === 'seller' && (
            <>
              <Text style={styles.section}>Your store</Text>
              <Row k="seller_orders_push" title="Push notifications" sub="New orders, payments and cancellations" />
            </>
          )}

          <Text style={styles.section}>This phone</Text>
          <View style={styles.card}>
            {perm === 'granted' && <Text style={styles.ok}>Push notifications are allowed on this phone.</Text>}
            {perm === 'undetermined' && (
              <>
                <Text style={styles.rowSub}>This phone hasn't been asked yet. Allow notifications to get order updates.</Text>
                <Button title="Allow notifications" onPress={async () => { await registerForPush(); await checkPermission(); }} style={{ marginTop: 10 }} />
              </>
            )}
            {perm === 'denied' && (
              <>
                <Text style={[styles.rowSub, { color: colors.danger }]}>Notifications are blocked for EraVenda in your phone's settings.</Text>
                <Button title="Open phone settings" variant="outline" onPress={() => Linking.openSettings()} style={{ marginTop: 10 }} />
              </>
            )}
          </View>
          <Text style={styles.foot}>Receipts and payment confirmations are always emailed because they are records of your purchase.</Text>
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  err: { color: colors.danger, padding: 20 },
  section: { fontSize: font.sm, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', marginTop: 20, marginBottom: 8, marginHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  rowTitle: { fontSize: font.md, fontWeight: '700', color: colors.text },
  rowSub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  card: { backgroundColor: colors.surface, marginHorizontal: 16, borderRadius: radius.md, padding: 14 },
  ok: { color: colors.success, fontWeight: '700' },
  foot: { fontSize: 12, color: colors.textMuted, margin: 16, lineHeight: 18 },
});
