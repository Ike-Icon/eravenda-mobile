import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../config/theme';

const WHATSAPP_URL = 'https://wa.me/233554372279';
const EMAIL_URL = 'mailto:support@eravenda.com';

/** Compact footer on every page; opens the complete web-style link directory from any route. */
export function AppFooter() {
  const navigation = useNavigation<any>();
  const openDirectory = () => {
    const state = navigation.getState?.();
    if (state?.routeNames?.includes('FooterInfo')) navigation.navigate('FooterInfo');
    else navigation.getParent?.()?.navigate('FooterInfo');
  };
  const open = async (url: string) => {
    try { await Linking.openURL(url); }
    catch { Alert.alert('Could not open link', 'Please try again in a moment.'); }
  };

  return <View style={styles.footer}>
    <Pressable onPress={openDirectory} style={styles.directory} accessibilityRole="button" accessibilityLabel="Open all EraVenda footer links">
      <Text style={styles.brand}>EraVenda</Text>
      <Text style={styles.directoryText}>About, help & legal</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.primary} />
    </Pressable>
    <View style={styles.contacts}>
      <Pressable onPress={() => void open(WHATSAPP_URL)} hitSlop={8} accessibilityRole="link" accessibilityLabel="Contact EraVenda on WhatsApp">
        <Ionicons name="logo-whatsapp" size={18} color="#25A765" />
      </Pressable>
      <Pressable onPress={() => void open(EMAIL_URL)} hitSlop={8} accessibilityRole="link" accessibilityLabel="Email EraVenda support">
        <Ionicons name="mail-outline" size={19} color={colors.primary} />
      </Pressable>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  footer: { minHeight: 44, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  directory: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  brand: { color: colors.text, fontSize: 12, fontWeight: '800' },
  directoryText: { color: colors.textMuted, fontSize: 11 },
  contacts: { flexDirection: 'row', alignItems: 'center', gap: 18 },
});
