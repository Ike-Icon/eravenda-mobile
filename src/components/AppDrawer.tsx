import { Ionicons } from '@expo/vector-icons';
import { Animated, Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../config/theme';
import { SITE_ORIGIN } from '../config/env';
import { useAuth } from '../context/AuthContext';
import type { Category } from '../types/api';
import { catalogService } from '../services/catalogService';
import { handymanService } from '../services/handymanService';
import { request } from '../services/http';

interface Props { visible: boolean; onClose: () => void; navigation: any }

export function AppDrawer({ visible, onClose, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const drawerWidth = Math.min(screenWidth * 0.84, 360);
  const x = useRef(new Animated.Value(-drawerWidth)).current;
  const [modalVisible, setModalVisible] = useState(visible);
  const { status, user, signOut } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [helpOpen, setHelpOpen] = useState(false);
  const [hasProfessionalProfile, setHasProfessionalProfile] = useState(false);
  const [hasDeliveryProfile, setHasDeliveryProfile] = useState(false);

  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      x.setValue(-drawerWidth);
      Animated.timing(x, { toValue: 0, duration: 240, useNativeDriver: true }).start();
    } else if (modalVisible) {
      Animated.timing(x, { toValue: -drawerWidth, duration: 180, useNativeDriver: true }).start(({ finished }) => { if (finished) setModalVisible(false); });
    }
  }, [visible, modalVisible, drawerWidth, x]);

  useEffect(() => {
    const controller = new AbortController();
    catalogService.categories(controller.signal).then(setCategories).catch(() => undefined);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (status !== 'signedIn' || !user) { setHasProfessionalProfile(false); setHasDeliveryProfile(false); return; }
    if (!visible) return;
    let active = true;
    Promise.allSettled([handymanService.myProfile(), request<unknown>('/delivery/me')]).then(([professionalResult, deliveryResult]) => {
      if (!active) return;
      setHasProfessionalProfile(professionalResult.status === 'fulfilled');
      setHasDeliveryProfile(deliveryResult.status === 'fulfilled');
    });
    return () => { active = false; };
  }, [status, user?.id, visible]);

  const roots = useMemo(() => categories.filter((c) => !c.parent_id), [categories]);
  const childrenByParent = useMemo(() => {
    const map = new Map<string, Category[]>();
    categories.filter((c) => c.parent_id).forEach((c) => map.set(c.parent_id!, [...(map.get(c.parent_id!) ?? []), c]));
    return map;
  }, [categories]);

  const navigate = (action: () => void) => { onClose(); action(); };
  const openPage = (path: string) => navigate(() => { void Linking.openURL(`${SITE_ORIGIN}${path}`); });
  const isRootStack = navigation.getState?.()?.routeNames?.includes('Tabs');
  const goHome = (salesType: 'retail' | 'wholesale' = 'retail', categoryId?: string | null) => navigate(() => {
    const params = { salesType, categoryId: categoryId ?? null };
    if (isRootStack) navigation.navigate('Tabs', { screen: 'Home', params });
    else navigation.navigate('Home', params);
  });
  const goProducts = (salesType: 'retail' | 'wholesale' = 'retail', categoryId?: string | null) => navigate(() => {
    const params = { salesType, categoryId: categoryId ?? null };
    const parent = !isRootStack ? navigation.getParent?.() : null;
    if (parent) parent.navigate('Products', params);
    else navigation.navigate('Products', params);
  });
  const goTab = (tab: string) => navigate(() => isRootStack ? navigation.navigate('Tabs', { screen: tab }) : navigation.navigate(tab));
  const toggleCategory = (id: string) => setExpanded((current) => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next; });

  return <Modal visible={modalVisible} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close menu" />
      <Animated.View style={[styles.drawer, { width: drawerWidth, paddingTop: insets.top, paddingBottom: insets.bottom, transform: [{ translateX: x }] }]}>
        <View style={styles.drawerHeader}>
          <Pressable onPress={onClose} style={styles.closeButton} accessibilityRole="button" accessibilityLabel="Close menu"><Ionicons name="close" size={25} color={colors.text} /></Pressable>
          <Pressable onPress={() => goHome()} style={styles.drawerBrand} accessibilityRole="button" accessibilityLabel="EraVenda home">
            <Image source={require('../../assets/logo-mark.png')} style={styles.drawerLogo} resizeMode="contain" />
            <Text style={styles.brandText}>Era<Text style={{ color: colors.accent }}>Venda</Text><Text style={{ color: colors.accent }}>.</Text></Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <Pressable style={styles.sectionHeading} onPress={() => setHelpOpen((v) => !v)} accessibilityRole="button" accessibilityState={{ expanded: helpOpen }}>
            <Text style={styles.sectionTitle}>Need help?</Text><Ionicons name={helpOpen ? 'chevron-down' : 'chevron-forward'} size={19} color={colors.textMuted} />
          </Pressable>
          {helpOpen && <View style={styles.subGroup}>
            <MenuAction icon="help-buoy-outline" label="Help centre & FAQ" onPress={() => openPage('/faq')} />
            <MenuAction icon="chatbubble-ellipses-outline" label="Contact us" onPress={() => openPage('/contact')} />
            <MenuAction icon="logo-whatsapp" label="Chat on WhatsApp" onPress={() => navigate(() => { void Linking.openURL('https://wa.me/233554372279?text=Hello%20EraVenda%2C%20I%20need%20help%20with%20'); })} />
            <MenuAction icon="mail-outline" label="Email support" onPress={() => navigate(() => { void Linking.openURL('mailto:support@eravenda.com?subject=EraVenda%20support%20request'); })} />
          </View>}

          <Pressable style={[styles.sectionHeading, { marginTop: 12 }]} onPress={() => goTab('Account')} accessibilityRole="button"><Text style={styles.sectionTitle}>My EraVenda account</Text><Ionicons name="chevron-forward" size={18} color={colors.textMuted} /></Pressable>
          {status === 'signedIn' && user ? <>
            <Pressable style={styles.profile} onPress={() => goTab('Account')}>
              {user.avatar_url ? <Image source={{ uri: user.avatar_url }} style={styles.avatar} /> : <View style={styles.avatarFallback}><Text style={styles.avatarLetter}>{user.full_name?.[0]?.toUpperCase() || '?'}</Text></View>}
              <View style={{ flex: 1 }}><Text numberOfLines={1} style={styles.profileName}>Hi, {user.full_name.split(' ')[0]}</Text><Text numberOfLines={1} style={styles.profileEmail}>{user.email}</Text></View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
            {user.role === 'admin' && <MenuAction icon="speedometer-outline" label="Admin Dashboard" onPress={() => openPage('/admin/dashboard.html')} />}
            {user.role === 'seller' && <MenuAction icon="grid-outline" label="My Store" onPress={() => goTab('Seller')} />}
            {user.role !== 'seller' && user.role !== 'admin' && <MenuAction icon="storefront-outline" label="Become a Seller" onPress={() => navigate(() => navigation.navigate('Store'))} />}
            {hasProfessionalProfile && <MenuAction icon="briefcase-outline" label="Pro Dashboard" onPress={() => navigate(() => navigation.navigate('HandymanDashboard'))} />}
            {hasDeliveryProfile && <MenuAction icon="car-outline" label="Delivery Dashboard" onPress={() => openPage('/delivery/dashboard')} />}
            <MenuAction icon="receipt-outline" label="Orders" onPress={() => goTab('Orders')} />
            <MenuAction icon="heart-outline" label="Wishlist" onPress={() => navigate(() => navigation.navigate('Wishlist'))} />
            <MenuAction icon="cart-outline" label="Cart" onPress={() => goTab('Cart')} />
            <MenuAction icon="clipboard-outline" label="My Handyman Bookings" onPress={() => navigate(() => navigation.navigate('ServiceBookings'))} />
            <MenuAction icon="person-outline" label="Account" onPress={() => goTab('Account')} />
            <MenuAction icon="settings-outline" label="Settings" onPress={() => navigate(() => navigation.navigate('Settings'))} />
            <MenuAction icon="log-out-outline" label="Log out" danger onPress={() => navigate(() => { void signOut(); })} />
          </> : <>
            <MenuAction icon="log-in-outline" label="Log in" onPress={() => navigate(() => navigation.navigate('Login'))} />
            <MenuAction icon="person-add-outline" label="Sign up" onPress={() => navigate(() => navigation.navigate('Register'))} />
            <MenuAction icon="heart-outline" label="Wishlist" onPress={() => navigate(() => navigation.navigate('Login'))} />
            <MenuAction icon="cart-outline" label="Cart" onPress={() => goTab('Cart')} />
            <MenuAction icon="settings-outline" label="Settings" onPress={() => navigate(() => navigation.navigate('Settings'))} />
          </>}

          <View style={styles.headingSplit}><Text style={styles.sectionTitle}>Our categories</Text><Pressable onPress={() => goProducts()}><Text style={styles.seeAll}>See all</Text></Pressable></View>
          {roots.map((category) => {
            const children = childrenByParent.get(category.id) ?? [];
            const isOpen = expanded.has(category.id);
            return <View key={category.id} style={styles.categoryGroup}>
              <View style={styles.categoryRow}>
                <Pressable style={styles.categoryMain} onPress={() => goProducts('retail', category.id)}><Ionicons name="pricetag-outline" size={18} color={colors.primary} /><Text numberOfLines={1} style={styles.actionLabel}>{category.name}</Text></Pressable>
                {children.length > 0 && <Pressable onPress={() => toggleCategory(category.id)} style={styles.expandButton} accessibilityLabel={`${isOpen ? 'Collapse' : 'Expand'} ${category.name}`}><Ionicons name={isOpen ? 'chevron-down' : 'chevron-forward'} size={16} color={colors.textMuted} /></Pressable>}
              </View>
              {children.length > 0 && isOpen && <View style={styles.childCategories}>
                <Pressable onPress={() => goProducts('retail', category.id)}><Text style={[styles.childLabel, styles.childAll]}>All {category.name}</Text></Pressable>
                {children.map((child) => <Pressable key={child.id} onPress={() => goProducts('retail', child.id)}><Text style={styles.childLabel}>{child.name}</Text></Pressable>)}
              </View>}
            </View>;
          })}

          <View style={styles.headingSplit}><Text style={styles.sectionTitle}>More from EraVenda</Text></View>
          <MenuAction icon="storefront-outline" label="Marketplace" onPress={() => goProducts()} />
          <MenuAction icon="albums-outline" label="Wholesale" onPress={() => goProducts('wholesale')} />
          <MenuAction icon="pricetag-outline" label="Sell on EraVenda" onPress={() => status === 'signedIn' ? navigate(() => navigation.navigate('Store')) : navigate(() => navigation.navigate('Login'))} />
          <MenuAction icon="construct-outline" label="Hire a Handyman" onPress={() => navigate(() => navigation.navigate('HandymanHub'))} />
          <MenuAction icon="person-add-outline" label="Join as a Handyman" onPress={() => status === 'signedIn' ? navigate(() => navigation.navigate('HandymanRegister')) : navigate(() => navigation.navigate('Login'))} />
          <MenuAction icon="information-circle-outline" label="About, help & more" onPress={() => navigate(() => navigation.navigate('FooterInfo'))} />
        </ScrollView>
      </Animated.View>
    </View>
  </Modal>;
}

function MenuAction({ icon, label, onPress, danger = false }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; danger?: boolean }) {
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.action, pressed && styles.actionPressed]} accessibilityRole="button"><Ionicons name={icon} size={19} color={danger ? colors.danger : colors.textMuted} /><Text style={[styles.actionLabel, danger && { color: colors.danger }]}>{label}</Text><Ionicons name="chevron-forward" size={15} color={colors.border} /></Pressable>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, flexDirection: 'row', backgroundColor: 'transparent' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(10, 20, 16, 0.48)' },
  drawer: { height: '100%', backgroundColor: colors.surface, borderTopRightRadius: 18, borderBottomRightRadius: 18, overflow: 'hidden', elevation: 18, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 16, shadowOffset: { width: 3, height: 0 } },
  drawerHeader: { height: 58, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border, gap: 10 },
  closeButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19 },
  drawerBrand: { flexDirection: 'row', alignItems: 'center', gap: 7 }, drawerLogo: { width: 30, height: 30 }, brandText: { color: colors.primary, fontSize: 21, fontWeight: '900', letterSpacing: -0.4 },
  body: { paddingHorizontal: 15, paddingBottom: 22 },
  sectionHeading: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },
  subGroup: { paddingLeft: 5, paddingBottom: 5, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  action: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#F0F1EF', paddingHorizontal: 4 }, actionPressed: { backgroundColor: colors.primarySoft }, actionLabel: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '600' },
  profile: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 5, paddingHorizontal: 4 }, avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primarySoft }, avatarFallback: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }, avatarLetter: { fontSize: 18, color: colors.primary, fontWeight: '800' }, profileName: { color: colors.text, fontSize: 14, fontWeight: '800' }, profileEmail: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  headingSplit: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border }, seeAll: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  categoryGroup: { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#F0F1EF' }, categoryRow: { minHeight: 46, flexDirection: 'row', alignItems: 'center' }, categoryMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }, expandButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }, childCategories: { paddingLeft: 31, paddingBottom: 8, gap: 2 }, childLabel: { paddingVertical: 8, color: colors.textMuted, fontSize: 13 }, childAll: { color: colors.primary, fontWeight: '700' },
});
