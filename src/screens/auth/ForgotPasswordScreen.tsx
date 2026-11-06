import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { Header } from '../../components/Section';
import { colors, font } from '../../config/theme';
import { authService } from '../../services/authService';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPassword'>;

/** POST /auth/forgot-password emails a link that opens the EraVenda website's reset page. */
export function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Enter a valid email address.');
    setBusy(true);
    setError(null);
    try {
      const res = await authService.forgotPassword(email);
      setMessage(`${res.message} Open the link in the email to choose a new password, then sign in here.`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen edges={['bottom', 'left', 'right']}>
      <Header title="Reset password" onBack={() => navigation.goBack()} />
      <View style={styles.body}>
        <Text style={styles.title}>Reset password</Text>
        <Text style={styles.sub}>We'll email you a reset link.</Text>
        <TextField label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        {!!error && <Text style={styles.error}>{error}</Text>}
        {!!message && <Text style={styles.ok}>{message}</Text>}
        <Button title="Send reset link" onPress={submit} loading={busy} />
        <Button title="Back to sign in" variant="ghost" onPress={() => navigation.goBack()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { padding: 24, paddingTop: 48 },
  title: { fontSize: font.xxl, fontWeight: '800', color: colors.primary },
  sub: { color: colors.textMuted, marginTop: 4, marginBottom: 24, fontSize: font.md },
  error: { color: colors.danger, marginBottom: 12 },
  ok: { color: colors.success, marginBottom: 12, lineHeight: 20 },
});
