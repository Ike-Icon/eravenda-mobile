import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { Button } from '../../components/Button';
import { AuthLegalNotice } from '../../components/AuthLegalNotice';
import { SocialButtons } from '../../components/SocialButtons';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { Header } from '../../components/Section';
import { colors, font } from '../../config/theme';
import { useAuth } from '../../context/AuthContext';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

export function RegisterScreen({ navigation }: Props) {
  const { signUp } = useAuth();
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.full_name.trim()) return setError('Enter your full name.');
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return setError('Enter a valid email address.');
    if (form.password.length < 8) return setError('Password must be at least 8 characters.');
    setBusy(true);
    setError(null);
    try {
      await signUp({ ...form, full_name: form.full_name.trim() });
      navigation.goBack();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen edges={['bottom', 'left', 'right']}>
      <Header title="Create an account" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.sub}>Shop from local vendors across Ghana</Text>
          <TextField label="Full name" value={form.full_name} onChangeText={set('full_name')} autoComplete="name" />
          <TextField label="Email" value={form.email} onChangeText={set('email')} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
          <TextField label="Phone (optional)" value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" autoComplete="tel" />
          <TextField label="Password" value={form.password} onChangeText={set('password')} secureTextEntry placeholder="At least 8 characters" />
          {!!error && <Text style={styles.error}>{error}</Text>}
          <Button title="Sign up" onPress={submit} loading={busy} />
          <SocialButtons onSuccess={() => navigation.goBack()} onError={setError} />
          <AuthLegalNotice />
          <Button title="I already have an account" variant="ghost" onPress={() => navigation.replace('Login')} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { padding: 24, paddingTop: 32 },
  title: { fontSize: font.xxl, fontWeight: '800', color: colors.primary },
  sub: { color: colors.textMuted, marginTop: 4, marginBottom: 24, fontSize: font.md },
  error: { color: colors.danger, marginBottom: 12 },
});
