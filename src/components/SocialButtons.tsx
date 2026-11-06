import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, font, radius } from '../config/theme';
import { useAuth } from '../context/AuthContext';
import { getGoogleIdToken, googleAvailable } from '../services/socialAuth';

/**
 * Google sign-in: native account chooser -> ID token -> POST /auth/google -> EraVenda session.
 * Renders only when a web client ID is configured; the native module is required to complete sign-in.
 */
export function SocialButtons({ onSuccess, onError }: { onSuccess: () => void; onError: (message: string) => void }) {
  const { signInWithGoogle } = useAuth();
  const [google, setGoogle] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setGoogle(googleAvailable());
  }, []);

  if (!google) return null;

  const run = async () => {
    setBusy(true);
    try {
      const idToken = await getGoogleIdToken();
      if (!idToken) return;
      await signInWithGoogle(idToken);
      onSuccess();
    } catch (e: any) {
      onError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.divider}>
        <View style={styles.line} />
        <Text style={styles.or}>or</Text>
        <View style={styles.line} />
      </View>
      <Pressable onPress={run} disabled={busy} style={({ pressed }) => [styles.google, (pressed || busy) && { opacity: 0.7 }]} accessibilityRole="button" accessibilityLabel="Continue with Google">
          <Ionicons name="logo-google" size={20} color="#4285F4" />
          <Text style={styles.googleText}>{busy ? 'Signing in…' : 'Continue with Google'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 18, gap: 12 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  or: { color: colors.textMuted, fontSize: font.sm },
  google: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  googleText: { fontSize: font.md, fontWeight: '700', color: colors.text },
});
