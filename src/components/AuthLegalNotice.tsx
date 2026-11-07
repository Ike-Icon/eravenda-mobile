import React from 'react';
import { Alert, Linking, StyleSheet, Text, View } from 'react-native';
import { SITE_ORIGIN } from '../config/env';
import { colors } from '../config/theme';

async function open(path: string) {
  try { await Linking.openURL(`${SITE_ORIGIN}${path}`); }
  catch { Alert.alert('Could not open page', 'Please try again in a moment.'); }
}

/** Account registration/sign-in notice shared with the web app's auth pages. */
export function AuthLegalNotice() {
  return <View style={styles.wrap}>
    <Text style={styles.legal}>By continuing you agree to the{' '}
      <Text accessibilityRole="link" style={styles.link} onPress={() => void open('/terms')}>Terms of Service</Text>
      {' '}and{' '}
      <Text accessibilityRole="link" style={styles.link} onPress={() => void open('/privacy')}>Privacy Policy</Text>.
    </Text>
    <Text style={styles.age}>You must be at least 18 years old to create an EraVenda account. Objectionable, misleading, harassing, or illegal content is not allowed.</Text>
  </View>;
}

const styles = StyleSheet.create({
  wrap: { marginTop: 14, marginBottom: 8 },
  legal: { color: colors.textMuted, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  age: { color: colors.textMuted, opacity: 0.85, fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 6 },
  link: { color: colors.primary, fontWeight: '700', textDecorationLine: 'underline' },
});
