import { Ionicons } from '@expo/vector-icons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Image } from 'expo-image';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { MenuRow } from '../../components/Section';
import { VerifyEmailBanner } from '../../components/VerifyEmailBanner';
import { Screen } from '../../components/Screen';
import { colors, font, radius, shadow } from '../../config/theme';
import { useAuth } from '../../context/AuthContext';
import type { RootStackParamList, TabParamList } from '../../navigation/types';
import { absoluteUrl } from '../../utils/format';

type Props = CompositeScreenProps<BottomTabScreenProps<TabParamList, 'Account'>, NativeStackScreenProps<RootStackParamList>>;

export function AccountScreen({ navigation }: Props) {
  const { status, user, signOut } = useAuth();

  if (status !== 'signedIn' || !user) {
    return <Screen edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.guestContent}>
        <View style={styles.guestIcon}><Ionicons name="person-outline" size={38} color={colors.primary} /></View>
        <Text style={styles.guestTitle}>Your EraVenda account</Text>
        <Text style={styles.guestCopy}>Sign in to manage orders, saved addresses, your wishlist and service bookings.</Text>
        <Button title="Sign in" onPress={() => navigation.navigate('Login')} style={{ alignSelf: 'stretch' }} />
        <Button title="Create an account" variant="outline" onPress={() => navigation.navigate('Register')} style={{ alignSelf: 'stretch' }} />
        <View style={styles.guestDivider} />
        <MenuRow icon="storefront-outline" label="Browse all products" hint="Shop products from Ghanaian merchants" onPress={() => navigation.navigate('Products')} />
        <MenuRow icon="construct-outline" label="Handyman Hub" hint="Find trusted local professionals" onPress={() => navigation.navigate('HandymanHub')} />
      </ScrollView>
    </Screen>;
  }

  return <Screen edges={['left', 'right']}>
    <ScrollView contentContainerStyle={styles.content}>
      <VerifyEmailBanner />
      <View style={styles.profileCard}>
        {user.avatar_url
          ? <Image source={{ uri: absoluteUrl(user.avatar_url) }} style={styles.avatar} contentFit="cover" />
          : <View style={[styles.avatar, styles.avatarFallback]}><Text style={styles.initial}>{user.full_name?.trim()?.[0]?.toUpperCase() || '?'}</Text></View>}
        <View style={styles.profileText}>
          <Text style={styles.eyebrow}>MY ERAVENDA ACCOUNT</Text>
          <Text numberOfLines={2} style={styles.name}>{user.full_name}</Text>
          <Text numberOfLines={1} style={styles.email}>{user.email}</Text>
          <Text style={styles.role}>{user.role}</Text>
        </View>
        <Pressable onPress={() => navigation.navigate('EditProfile')} style={styles.editButton} accessibilityRole="button" accessibilityLabel="Edit profile">
          <Ionicons name="create-outline" size={19} color={colors.primary} />
        </Pressable>
      </View>
      <Pressable onPress={() => navigation.navigate('EditProfile')} style={styles.editProfileLink}><Text style={styles.editProfileText}>Edit profile details</Text><Ionicons name="arrow-forward" size={15} color={colors.primary} /></Pressable>

      <Text style={styles.sectionTitle}>Shopping</Text>
      <MenuRow icon="receipt-outline" label="My orders" hint="Track purchases and payments" onPress={() => navigation.navigate('Orders')} />
      <MenuRow icon="heart-outline" label="Wishlist" hint="Products you saved" onPress={() => navigation.navigate('Wishlist')} />
      <MenuRow icon="storefront-outline" label="Stores you follow" hint="Visit or unfollow your favourite stores" onPress={() => navigation.navigate('FollowedStores')} />
      <MenuRow icon="location-outline" label="Delivery addresses" hint="Add or update your saved addresses" onPress={() => navigation.navigate('Addresses')} />

      <Text style={styles.sectionTitle}>Services & business</Text>
      <MenuRow icon="construct-outline" label="Handyman Hub" hint="Find and book local professionals" onPress={() => navigation.navigate('HandymanHub')} />
      <MenuRow icon="clipboard-outline" label="My service bookings" hint="View your service requests" onPress={() => navigation.navigate('ServiceBookings')} />
      <MenuRow icon="build-outline" label="Professional dashboard" hint="Manage a service profile and jobs" onPress={() => navigation.navigate('HandymanDashboard')} />
      {user.role === 'seller'
        ? <MenuRow icon="grid-outline" label="Seller dashboard" hint="Manage your store, products and incoming orders" onPress={() => navigation.navigate('Seller')} />
        : <MenuRow icon="storefront-outline" label="Sell on EraVenda" hint="Open a store or check your application" onPress={() => navigation.navigate('Store')} />}

      <Text style={styles.sectionTitle}>Preferences & security</Text>
      <MenuRow icon="person-circle-outline" label="Profile and password" hint="Update your personal details and password" onPress={() => navigation.navigate('EditProfile')} />
      <MenuRow icon="notifications-outline" label="Notifications" hint="Choose order email and push updates" onPress={() => navigation.navigate('Notifications')} />
      <MenuRow icon="ban-outline" label="Blocked stores" hint="Manage stores hidden from your catalogue" onPress={() => navigation.navigate('BlockedStores')} />
      <MenuRow icon="information-circle-outline" label="About, help & support" hint="Contact, legal, delivery and payment information" onPress={() => navigation.navigate('FooterInfo')} />

      <View style={styles.bottomActions}>
        <Button title="Sign out" variant="outline" onPress={() => void signOut()} />
        <MenuRow icon="trash-outline" label="Delete account" danger onPress={() => navigation.navigate('DeleteAccount')} />
      </View>
    </ScrollView>
  </Screen>;
}

const styles = StyleSheet.create({
  content: { paddingBottom: 30 },
  guestContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 18, paddingVertical: 28 },
  guestIcon: { width: 76, height: 76, borderRadius: 38, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 14 },
  guestTitle: { color: colors.text, fontSize: font.xl, fontWeight: '900', textAlign: 'center' },
  guestCopy: { color: colors.textMuted, fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 7, marginBottom: 20 },
  guestDivider: { height: 1, backgroundColor: colors.border, marginVertical: 18 },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 13, margin: 14, marginBottom: 4, padding: 15, borderRadius: radius.lg, backgroundColor: colors.surface, ...shadow.card },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primarySoft },
  avatarFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  initial: { color: colors.white, fontSize: 25, fontWeight: '900' },
  profileText: { flex: 1, minWidth: 0 },
  eyebrow: { color: colors.primary, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  name: { color: colors.text, fontSize: 18, fontWeight: '900', marginTop: 4 },
  email: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  role: { alignSelf: 'flex-start', overflow: 'hidden', marginTop: 6, paddingHorizontal: 9, paddingVertical: 3, borderRadius: radius.pill, backgroundColor: colors.primarySoft, color: colors.primary, fontSize: 10, fontWeight: '800', textTransform: 'capitalize' },
  editButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  editProfileLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, alignSelf: 'flex-end', paddingHorizontal: 18, paddingVertical: 8 },
  editProfileText: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  sectionTitle: { marginTop: 18, marginBottom: 7, marginHorizontal: 16, color: colors.textMuted, fontSize: 11, fontWeight: '900', letterSpacing: 0.9, textTransform: 'uppercase' },
  bottomActions: { marginTop: 22, paddingHorizontal: 16, gap: 8 },
});
