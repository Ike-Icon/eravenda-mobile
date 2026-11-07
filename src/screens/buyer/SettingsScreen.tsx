import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Header } from '../../components/Section';
import { Screen } from '../../components/Screen';
import { colors, font, radius } from '../../config/theme';
import { useAuth } from '../../context/AuthContext';
import { usePreferences, type CurrencyCode, type DensityMode, type LanguageCode, type ThemeMode } from '../../context/PreferencesContext';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

const currencyOptions: { value: CurrencyCode; label: string }[] = [
  { value: 'GHS', label: 'GH₵' }, { value: 'USD', label: 'US$' }, { value: 'EUR', label: '€' }, { value: 'GBP', label: '£' },
];
const languageOptions: { value: LanguageCode; label: string }[] = [
  { value: 'en', label: 'English' }, { value: 'tw', label: 'Twi' }, { value: 'ee', label: 'Ewe' }, { value: 'ha', label: 'Hausa' },
];

export function SettingsScreen({ navigation }: Props) {
  const { status } = useAuth();
  const signedIn = status === 'signedIn';
  const { preferences, isDark, updatePreference } = usePreferences();
  const palette = isDark ? { panel: '#17221D', text: '#F0F5F2', muted: '#B0BDB6', border: '#2D3B34', selected: '#254E3A' } : { panel: colors.surface, text: colors.text, muted: colors.textMuted, border: colors.border, selected: colors.primarySoft };

  const requireSignIn = (screen: 'EditProfile' | 'Notifications' | 'Addresses' | 'BlockedStores' | 'DeleteAccount') => {
    if (signedIn) navigation.navigate(screen);
    else navigation.navigate('Login');
  };
  const openTab = (screen: 'Orders' | 'Wishlist') => {
    if (!signedIn && screen === 'Wishlist') return navigation.navigate('Login');
    navigation.navigate('Tabs', { screen } as never);
  };

  return <Screen>
    <Header title="Settings" onBack={() => navigation.goBack()} />
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={[styles.copy, { color: palette.muted }]}>Manage how EraVenda looks and the preferences saved on this device.</Text>

      <Text style={[styles.section, { color: palette.muted }]}>APPEARANCE</Text>
      <View style={[styles.panel, { backgroundColor: palette.panel, borderColor: palette.border }]}>
        <Text style={[styles.rowTitle, { color: palette.text }]}>Theme</Text>
        <Text style={[styles.rowHint, { color: palette.muted }]}>Choose light, dark, or follow your device.</Text>
        <View style={styles.optionRow}>
          <Choice value="light" selected={preferences.theme} label="Light" icon="sunny-outline" onSelect={(v) => void updatePreference('theme', v as ThemeMode)} palette={palette} />
          <Choice value="dark" selected={preferences.theme} label="Dark" icon="moon-outline" onSelect={(v) => void updatePreference('theme', v as ThemeMode)} palette={palette} />
          <Choice value="system" selected={preferences.theme} label="Auto" icon="phone-portrait-outline" onSelect={(v) => void updatePreference('theme', v as ThemeMode)} palette={palette} />
        </View>
        <Text style={[styles.rowTitle, { color: palette.text, marginTop: 18 }]}>Interface density</Text>
        <Text style={[styles.rowHint, { color: palette.muted }]}>Save your preferred layout density for this device.</Text>
        <View style={styles.optionRow}>
          <Choice value="comfortable" selected={preferences.density} label="Comfortable" onSelect={(v) => void updatePreference('density', v as DensityMode)} palette={palette} />
          <Choice value="compact" selected={preferences.density} label="Compact" onSelect={(v) => void updatePreference('density', v as DensityMode)} palette={palette} />
        </View>
      </View>

      <Text style={[styles.section, { color: palette.muted }]}>REGION & CURRENCY</Text>
      <View style={[styles.panel, { backgroundColor: palette.panel, borderColor: palette.border }]}>
        <Text style={[styles.rowTitle, { color: palette.text }]}>Display currency</Text>
        <Text style={[styles.rowHint, { color: palette.muted }]}>Save your preferred currency for the app.</Text>
        <View style={styles.chipRow}>{currencyOptions.map((option) => <Chip key={option.value} label={option.label} selected={preferences.currency === option.value} onPress={() => void updatePreference('currency', option.value)} palette={palette} />)}</View>
        <Text style={[styles.rowTitle, { color: palette.text, marginTop: 18 }]}>Language</Text>
        <Text style={[styles.rowHint, { color: palette.muted }]}>Save your preferred language for this device.</Text>
        <View style={styles.chipRow}>{languageOptions.map((option) => <Chip key={option.value} label={option.label} selected={preferences.language === option.value} onPress={() => void updatePreference('language', option.value)} palette={palette} />)}</View>
      </View>

      <Text style={[styles.section, { color: palette.muted }]}>NOTIFICATIONS</Text>
      <SettingLink icon="notifications-outline" label="Email & push notifications" hint="Order updates and this phone's notification permission" onPress={() => requireSignIn('Notifications')} palette={palette} />

      <Text style={[styles.section, { color: palette.muted }]}>ACCOUNT SHORTCUTS</Text>
      <SettingLink icon="person-circle-outline" label="Edit profile" hint="Name, phone and password" onPress={() => requireSignIn('EditProfile')} palette={palette} />
      <SettingLink icon="receipt-outline" label="My orders" onPress={() => openTab('Orders')} palette={palette} />
      <SettingLink icon="heart-outline" label="Wishlist" onPress={() => openTab('Wishlist')} palette={palette} />
      <SettingLink icon="location-outline" label="Delivery addresses" hint="Saved delivery locations" onPress={() => requireSignIn('Addresses')} palette={palette} />

      <Text style={[styles.section, { color: palette.muted }]}>PRIVACY & SECURITY</Text>
      <SettingLink icon="ban-outline" label="Blocked stores" hint="Stores hidden from your catalogue" onPress={() => requireSignIn('BlockedStores')} palette={palette} />
      {signedIn && <SettingLink icon="trash-outline" label="Delete account" hint="Review account deletion and its effects" danger onPress={() => requireSignIn('DeleteAccount')} palette={palette} />}
      {!signedIn && <View style={styles.guestNote}><Ionicons name="lock-closed-outline" size={17} color={palette.muted} /><Text style={[styles.guestCopy, { color: palette.muted }]}>Sign in to change account and privacy settings.</Text></View>}
    </ScrollView>
  </Screen>;
}

function Choice({ value, selected, label, icon, onSelect, palette }: { value: string; selected: string; label: string; icon?: keyof typeof Ionicons.glyphMap; onSelect: (value: string) => void; palette: { panel: string; text: string; muted: string; border: string; selected: string } }) {
  const active = value === selected;
  return <Pressable onPress={() => onSelect(value)} style={[styles.choice, { borderColor: active ? colors.primary : palette.border, backgroundColor: active ? palette.selected : palette.panel }]} accessibilityRole="button" accessibilityState={{ selected: active }}>
    {icon && <Ionicons name={icon} size={15} color={active ? colors.primary : palette.muted} />}
    <Text style={[styles.choiceText, { color: active ? colors.primary : palette.text }]}>{label}</Text>
  </Pressable>;
}

function Chip({ label, selected, onPress, palette }: { label: string; selected: boolean; onPress: () => void; palette: { panel: string; text: string; muted: string; border: string; selected: string } }) {
  return <Pressable onPress={onPress} style={[styles.chip, { borderColor: selected ? colors.primary : palette.border, backgroundColor: selected ? palette.selected : palette.panel }]} accessibilityRole="button" accessibilityState={{ selected }}><Text style={[styles.chipText, { color: selected ? colors.primary : palette.text }]}>{label}</Text></Pressable>;
}

function SettingLink({ icon, label, hint, onPress, palette, danger = false }: { icon: keyof typeof Ionicons.glyphMap; label: string; hint?: string; onPress: () => void; palette: { panel: string; text: string; muted: string; border: string; selected: string }; danger?: boolean }) {
  return <Pressable onPress={onPress} style={[styles.linkRow, { backgroundColor: palette.panel, borderColor: palette.border }]} accessibilityRole="button">
    <Ionicons name={icon} size={21} color={danger ? colors.danger : colors.primary} />
    <View style={{ flex: 1 }}><Text style={[styles.rowTitle, { color: danger ? colors.danger : palette.text }]}>{label}</Text>{!!hint && <Text style={[styles.rowHint, { color: palette.muted }]}>{hint}</Text>}</View>
    <Ionicons name="chevron-forward" size={17} color={palette.muted} />
  </Pressable>;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingBottom: 28 },
  copy: { fontSize: 13, lineHeight: 19, marginTop: 14 },
  section: { fontSize: 10, fontWeight: '900', letterSpacing: 1, marginTop: 22, marginBottom: 8 },
  panel: { borderWidth: 1, borderRadius: radius.md, padding: 14 },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  choice: { minHeight: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 11 },
  choiceText: { fontSize: 11, fontWeight: '800' },
  rowTitle: { fontSize: font.md, fontWeight: '700' },
  rowHint: { fontSize: 11, lineHeight: 16, marginTop: 3 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: { minHeight: 36, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: 13 },
  chipText: { fontSize: 12, fontWeight: '700' },
  linkRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth },
  guestNote: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 16 },
  guestCopy: { fontSize: 12 },
});
