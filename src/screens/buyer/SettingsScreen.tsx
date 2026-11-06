import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Header, MenuRow } from '../../components/Section';
import { Screen } from '../../components/Screen';
import { colors } from '../../config/theme';
import { useAuth } from '../../context/AuthContext';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export function SettingsScreen({ navigation }: Props) {
  const { status } = useAuth();
  const signedIn = status === 'signedIn';
  const requireSignIn = (screen: 'EditProfile' | 'Notifications' | 'Addresses' | 'BlockedStores' | 'DeleteAccount') => {
    if (signedIn) navigation.navigate(screen);
    else navigation.navigate('Login');
  };

  return <Screen>
    <Header title="Settings" onBack={() => navigation.goBack()} />
    <View style={styles.header}><Text style={styles.copy}>Manage your EraVenda account and app preferences.</Text></View>
    <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
      <Text style={styles.section}>ACCOUNT</Text>
      <MenuRow icon="person-circle-outline" label="Profile and password" hint="Update your name, phone number or password" onPress={() => requireSignIn('EditProfile')} />
      <MenuRow icon="notifications-outline" label="Notifications" hint="Order email updates and phone notifications" onPress={() => requireSignIn('Notifications')} />
      <MenuRow icon="location-outline" label="Delivery addresses" hint="Saved delivery locations" onPress={() => requireSignIn('Addresses')} />
      <Text style={styles.section}>PRIVACY & SECURITY</Text>
      <MenuRow icon="ban-outline" label="Blocked stores" hint="Stores hidden from your catalogue" onPress={() => requireSignIn('BlockedStores')} />
      {signedIn && <MenuRow icon="trash-outline" label="Delete account" hint="Review account deletion and its effects" danger onPress={() => requireSignIn('DeleteAccount')} />}
      {!signedIn && <View style={styles.guestNote}><Ionicons name="lock-closed-outline" size={17} color={colors.textMuted} /><Text style={styles.guestCopy}>Sign in to open account and privacy settings.</Text></View>}
    </ScrollView>
  </Screen>;
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 18, paddingTop: 20, paddingBottom: 8 },
  copy: { color: colors.textMuted, fontSize: 13, marginTop: 5 },
  section: { color: colors.textMuted, fontSize: 10, fontWeight: '900', letterSpacing: 1, marginTop: 20, marginBottom: 6, marginHorizontal: 16 },
  guestNote: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingVertical: 16 },
  guestCopy: { color: colors.textMuted, fontSize: 12 },
});
