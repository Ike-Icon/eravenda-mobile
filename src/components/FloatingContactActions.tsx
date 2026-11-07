import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Linking, Pressable, StyleSheet, View } from 'react-native';
import { colors, radius } from '../config/theme';

const LINKS = {
  whatsapp: 'https://wa.me/233554372279?text=Hello%20EraVenda%2C%20I%20need%20help%20with%20',
  email: 'mailto:support@eravenda.com?subject=EraVenda%20support%20request',
  facebook: 'https://www.facebook.com/profile.php?id=61594438107592',
  tiktok: 'https://www.tiktok.com/@eravenda.com?_r=1&_t=ZS-9AZrxGfrPlO',
};

async function openLink(url: string) {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('Could not open link', 'Please try again in a moment.');
  }
}

/** Persistent, one-tap support actions with secondary social links behind a compact toggle. */
export function FloatingContactActions({ onBackToTop }: { onBackToTop: () => void }) {
  const [socialOpen, setSocialOpen] = useState(false);
  const socialProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(socialProgress, { toValue: socialOpen ? 1 : 0, useNativeDriver: true, friction: 7 }).start();
  }, [socialOpen, socialProgress]);

  const socialStyle = (offset: number) => ({
    opacity: socialProgress,
    transform: [
      { scale: socialProgress.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] }) },
      { translateY: socialProgress.interpolate({ inputRange: [0, 1], outputRange: [offset, 0] }) },
    ],
  });

  return <View style={styles.dock} pointerEvents="box-none">
    {socialOpen && <View style={styles.socialRow}>
      <Animated.View style={socialStyle(12)}><Action icon="logo-facebook" label="Visit EraVenda on Facebook" color="#1877F2" onPress={() => void openLink(LINKS.facebook)} /></Animated.View>
      <Animated.View style={socialStyle(8)}><Action icon="logo-tiktok" label="Visit EraVenda on TikTok" color="#171717" onPress={() => void openLink(LINKS.tiktok)} /></Animated.View>
    </View>}
    <Action icon="logo-whatsapp" label="Chat with EraVenda on WhatsApp" color="#25D366" onPress={() => void openLink(LINKS.whatsapp)} />
    <Action icon="mail" label="Email EraVenda support" color={colors.primary} onPress={() => void openLink(LINKS.email)} />
    <Pressable onPress={() => setSocialOpen((open) => !open)} style={[styles.button, styles.socialToggle]} accessibilityRole="button" accessibilityLabel={socialOpen ? 'Hide social links' : 'Show social links'}>
      <Ionicons name={socialOpen ? 'close' : 'share-social'} size={21} color={colors.white} />
    </Pressable>
    <Pressable onPress={onBackToTop} style={[styles.button, styles.top]} accessibilityRole="button" accessibilityLabel="Back to top">
      <Ionicons name="arrow-up" size={21} color={colors.primary} />
    </Pressable>
  </View>;
}

function Action({ icon, label, color, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; color: string; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[styles.button, { backgroundColor: color }]} accessibilityRole="link" accessibilityLabel={label}>
    <Ionicons name={icon} size={21} color={colors.white} />
  </Pressable>;
}

const styles = StyleSheet.create({
  dock: { position: 'absolute', right: 12, bottom: 12, alignItems: 'center', gap: 9 },
  socialRow: { flexDirection: 'row', gap: 8, marginBottom: 1 },
  button: { width: 46, height: 46, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', elevation: 5, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  socialToggle: { backgroundColor: '#405B54' },
  top: { width: 40, height: 40, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
});
