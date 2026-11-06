import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { SocialButtons } from '../../components/SocialButtons';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { Header } from '../../components/Section';
import { colors, font } from '../../config/theme';
import { useAuth } from '../../context/AuthContext';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password) return setError('Enter your email and password.');
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password); // success: AuthContext flips to signedIn
      navigation.goBack();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen edges={['bottom', 'left', 'right']}>
      <Header title="Sign in" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.sub}>Sign in to your EraVenda account</Text>
          <TextField label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
          <TextField label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" onSubmitEditing={submit} />
          {!!error && <Text style={styles.error}>{error}</Text>}
          <Button title="Sign in" onPress={submit} loading={busy} />
          <SocialButtons onSuccess={() => navigation.goBack()} onError={setError} />
          <View style={{ height: 8 }} />
          <Button title="Forgot password?" variant="ghost" onPress={() => navigation.navigate('ForgotPassword')} />
          <View style={{ height: 8 }} />
          <Button title="Create an account" variant="outline" onPress={() => navigation.replace('Register')} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { padding: 24, paddingTop: 48 },
  title: { fontSize: font.xxl, fontWeight: '800', color: colors.primary },
  sub: { color: colors.textMuted, marginTop: 4, marginBottom: 28, fontSize: font.md },
  error: { color: colors.danger, marginBottom: 12 },
});
