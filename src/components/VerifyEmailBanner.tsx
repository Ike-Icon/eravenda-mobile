import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../config/theme';
import { useAuth } from '../context/AuthContext';
import { accountService } from '../services/accountService';

/**
 * Shown while user.is_verified is false.
 * "Resend link"        -> POST /auth/resend-verification (server limits this to 5 per hour)
 * "I've confirmed it"  -> GET /auth/me again, which flips is_verified and hides the banner.
 * The link in the email opens the EraVenda website, where the token is confirmed.
 */
export function VerifyEmailBanner() {
  const { user, refreshUser } = useAuth();
  const [busy, setBusy] = useState<'send' | 'check' | null>(null);
  const [note, setNote] = useState<{ text: string; error: boolean } | null>(null);
  const [cooldown, setCooldown] = useState(false);

  if (!user || user.is_verified) return null;

  const resend = async () => {
    setBusy('send');
    setNote(null);
    try {
      const res = await accountService.resendVerification();
      setNote({ text: res.message, error: false });
      setCooldown(true); // stops accidental double-taps; the server enforces the real limit
      setTimeout(() => setCooldown(false), 30000);
    } catch (e: any) {
      setNote({ text: e.message, error: true });
    } finally {
      setBusy(null);
    }
  };

  const check = async () => {
    setBusy('check');
    setNote(null);
    try {
      await refreshUser();
      // refreshUser updates the user; if it is still unverified this banner stays and we say so.
      setNote({ text: 'Not confirmed yet. Open the link in your email first.', error: true });
    } catch (e: any) {
      setNote({ text: e.message, error: true });
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={styles.box} accessibilityRole="alert">
      <Text style={styles.title}>Confirm your email</Text>
      <Text style={styles.body}>We sent a link to {user.email}. Some actions, like checkout, may need a confirmed email.</Text>
      {!!note && <Text style={[styles.note, note.error && { color: colors.danger }]}>{note.text}</Text>}
      <View style={styles.row}>
        <Pressable onPress={resend} disabled={busy !== null || cooldown} style={[styles.btn, (busy !== null || cooldown) && { opacity: 0.5 }]}>
          <Text style={styles.btnText}>{busy === 'send' ? 'Sending…' : cooldown ? 'Link sent' : 'Resend link'}</Text>
        </Pressable>
        <Pressable onPress={check} disabled={busy !== null} style={[styles.btn, styles.btnAlt, busy !== null && { opacity: 0.5 }]}>
          <Text style={[styles.btnText, { color: colors.primary }]}>{busy === 'check' ? 'Checking…' : "I've confirmed it"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: '#FEF3C7', borderRadius: radius.md, padding: 12, marginHorizontal: 16, marginTop: 12, gap: 6 },
  title: { fontWeight: '800', color: '#92400E' },
  body: { color: '#92400E', fontSize: 13 },
  note: { color: colors.success, fontSize: 13, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 8, marginTop: 4 },
  btn: { backgroundColor: colors.primary, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 9 },
  btnAlt: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primary },
  btnText: { color: colors.white, fontWeight: '700', fontSize: 13 },
});
