/**
 * DELETE ACCOUNT (required by Apple and Google for apps that let people sign up)
 * State flow:
 *   open            -> GET /users/me/deletion-check
 *                      can_delete=false -> show the plain-language blockers and stop (nothing to type)
 *                      can_delete=true  -> show what is deleted / kept, ask for password + the word DELETE
 *   press Delete    -> one last native confirmation -> POST /users/me/delete
 *   204             -> signOut() clears the token and local state -> back to Home as a guest
 * The server enforces every rule again; this screen only makes the outcome clear before the person commits.
 * Errors are shown inline. A wrong password is a 400 (not a 401), so it never signs the person out by mistake.
 */
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { Header } from '../../components/Section';
import { TextField } from '../../components/TextField';
import { colors, font, radius } from '../../config/theme';
import { useAuth } from '../../context/AuthContext';
import type { RootStackParamList } from '../../navigation/types';
import { accountService } from '../../services/accountService';
import type { DeletionCheck } from '../../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'DeleteAccount'>;

const DELETED = [
  'Your name, email, phone number, password and photo',
  'Saved addresses, cart, wishlist and followed stores',
  'Notification settings and registered phones',
  'The text of your reviews',
  'If you sell: your store details. Your store is closed and its products are hidden',
];
const KEPT = [
  'Order, payment and receipt records, as the law requires (up to six years). They are no longer linked to your name, email or phone',
  'Delivery details on past orders are reduced to region and city',
  'Star ratings you gave, so product ratings stay accurate',
];

function Bullets({ items }: { items: string[] }) {
  return (
    <View style={{ gap: 6 }}>
      {items.map((t) => (
        <Text key={t} style={styles.bullet}>• {t}</Text>
      ))}
    </View>
  );
}

export function DeleteAccountScreen({ navigation }: Props) {
  const { signOut } = useAuth();
  const [check, setCheck] = useState<DeletionCheck | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [word, setWord] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    accountService.deletionCheck().then(setCheck).catch((e) => setLoadError(e.message));
  }, []);

  const ready = word.trim().toUpperCase() === 'DELETE' && (!check?.requires_password || password.length > 0);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      await accountService.deleteAccount({ confirm: word.trim(), password: check?.requires_password ? password : undefined });
      await signOut(); // token is already useless; this clears local state and returns the app to guest mode
      navigation.reset({ index: 0, routes: [{ name: 'Tabs' }] });
      Alert.alert('Account deleted', 'Your account and personal details have been removed. We have sent a confirmation to your email.');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const confirm = () =>
    Alert.alert('Delete your account?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete forever', style: 'destructive', onPress: run },
    ]);

  return (
    <Screen>
      <Header title="Delete account" onBack={() => navigation.goBack()} />
      {loadError && !check ? (
        <Text style={styles.err}>{loadError}</Text>
      ) : !check ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : !check.can_delete ? (
        <ScrollView contentContainerStyle={styles.pad}>
          <Text style={styles.big}>You can't delete your account yet</Text>
          <View style={styles.blockCard}>
            {check.blockers.map((b) => (
              <Text key={b} style={styles.blocker}>{b}</Text>
            ))}
          </View>
          <Text style={styles.muted}>Come back here once these are finished. Nothing has been changed.</Text>
          <Button title="View my orders" variant="outline" onPress={() => navigation.navigate('Tabs', { screen: 'Orders' } as never)} />
        </ScrollView>
      ) : (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
            <Text style={styles.big}>This permanently deletes your account</Text>
            <Text style={styles.h}>What we delete</Text>
            <Bullets items={DELETED} />
            <Text style={styles.h}>What we keep</Text>
            <Bullets items={KEPT} />
            <Text style={styles.muted}>You will not be able to sign in again or recover this account. You can always create a new one.</Text>

            {check.requires_password && <TextField label="Your password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" />}
            <TextField label="Type DELETE to confirm" value={word} onChangeText={setWord} autoCapitalize="characters" autoCorrect={false} />
            {!!error && <Text style={styles.err}>{error}</Text>}
            <Button title="Delete my account" onPress={confirm} loading={busy} disabled={!ready} style={{ backgroundColor: colors.danger }} />
            <Button title="Keep my account" variant="ghost" onPress={() => navigation.goBack()} />
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 16, gap: 12 },
  big: { fontSize: font.xl, fontWeight: '800', color: colors.text },
  h: { fontSize: font.md, fontWeight: '800', color: colors.text, marginTop: 6 },
  bullet: { color: colors.text, lineHeight: 20 },
  muted: { color: colors.textMuted, lineHeight: 20 },
  err: { color: colors.danger, padding: 4, lineHeight: 20 },
  blockCard: { backgroundColor: colors.warningSurface, borderRadius: radius.md, padding: 14, gap: 10 },
  blocker: { color: colors.warningText, lineHeight: 20 },
});
