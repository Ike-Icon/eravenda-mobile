import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font } from '../config/theme';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { AppDrawer } from './AppDrawer';

/**
 * Fixed-height app bar shown by the root stack on every page. The content row stays 58pt high;
 * only the safe-area area above it changes to fit the device's status bar.
 * Wishlist needs an account, so guests are sent to Login instead.
 */
export function AppHeader() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { status } = useAuth();
  const { count, wishlistIds } = useCart();
  const [menuVisible, setMenuVisible] = useState(false);
  const rootStack = navigation.getState?.()?.routeNames?.includes('Tabs') ?? false;
  const goTab = (tab: 'Home' | 'Cart') => rootStack
    ? navigation.navigate('Tabs', { screen: tab })
    : navigation.navigate(tab);

  return (
    <View style={[styles.shell, { height: insets.top + 58, paddingTop: insets.top }]}>
      <View style={styles.bar}>
        <Pressable onPress={() => goTab('Home')} style={styles.brand} accessibilityRole="button" accessibilityLabel="EraVenda, go to Home">
          <Image source={require('../../assets/logo-mark.png')} style={styles.logo} contentFit="contain" />
          <Text style={styles.word}>Era<Text style={styles.wordAccent}>Venda</Text></Text>
        </Pressable>

        <View style={styles.actions}>
          <Pressable onPress={() => (status === 'signedIn' ? navigation.navigate('Wishlist') : navigation.navigate('Login'))} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Wishlist">
            <Ionicons name={wishlistIds.size > 0 ? 'heart' : 'heart-outline'} size={22} color={wishlistIds.size > 0 ? colors.danger : colors.text} />
          </Pressable>
          <Pressable onPress={() => goTab('Cart')} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel={`Cart, ${count} items`}>
            <Ionicons name="cart-outline" size={23} color={colors.text} />
            {count > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text></View>}
          </Pressable>
          <Pressable onPress={() => setMenuVisible(true)} style={styles.menuBtn} accessibilityRole="button" accessibilityLabel="Open menu" accessibilityState={{ expanded: menuVisible }}>
            <Ionicons name="menu" size={25} color={colors.text} />
          </Pressable>
        </View>
      </View>
      <AppDrawer visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { backgroundColor: colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  bar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: { width: 34, height: 34 },
  word: { fontSize: font.xl, fontWeight: '800', color: colors.primary, letterSpacing: -0.3 },
  wordAccent: { color: colors.accent },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconBtn: { width: 38, height: 40, alignItems: 'center', justifyContent: 'center' },
  menuBtn: { width: 42, height: 40, marginLeft: 3, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#F5F7F5' },
  badge: { position: 'absolute', top: 0, right: 0, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: colors.white, fontSize: 11, fontWeight: '800' },
});
