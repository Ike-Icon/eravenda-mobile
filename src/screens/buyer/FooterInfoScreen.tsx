import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { Screen } from '../../components/Screen';
import { Header } from '../../components/Section';
import { colors, radius } from '../../config/theme';
import { SITE_ORIGIN } from '../../config/env';
import { useAuth } from '../../context/AuthContext';
import type { RootStackParamList } from '../../navigation/types';
import { request } from '../../services/http';

type Props = NativeStackScreenProps<RootStackParamList, 'FooterInfo'>;
type LinkItem = { label: string; icon: keyof typeof Ionicons.glyphMap; action: () => void };

export function FooterInfoScreen({ navigation }: Props) {
  const { status, user } = useAuth();
  const [email, setEmail] = useState(user?.email ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [hasDeliveryProfile, setHasDeliveryProfile] = useState(false);

  useEffect(() => {
    if (status !== 'signedIn') { setHasDeliveryProfile(false); return; }
    let active = true;
    request<unknown>('/delivery/me').then(() => { if (active) setHasDeliveryProfile(true); }).catch(() => { if (active) setHasDeliveryProfile(false); });
    return () => { active = false; };
  }, [status, user?.id]);

  const web = (path: string) => { void Linking.openURL(`${SITE_ORIGIN}${path}`).catch(() => Alert.alert('Could not open page', 'Please try again in a moment.')); };
  const tab = (screen: 'Orders' | 'Seller') => navigation.navigate('Tabs', { screen } as never);
  const signedInRoute = (screen: 'HandymanRegister' | 'Login') => navigation.navigate(status === 'signedIn' ? screen : 'Login' as never);
  const link = (label: string, icon: LinkItem['icon'], action: () => void): LinkItem => ({ label, icon, action });

  const sections: { title: string; links: LinkItem[] }[] = [
    { title: 'About', links: [link('Our story', 'book-outline', () => web('/about')), link('FAQ', 'help-circle-outline', () => web('/faq'))] },
    { title: 'Help', links: [
      link('Track an order', 'cube-outline', () => tab('Orders')),
      link('Returns & refunds', 'refresh-circle-outline', () => web('/faq')),
      link('Contact support', 'chatbubble-ellipses-outline', () => web('/contact')),
      link('Pay an order', 'card-outline', () => tab('Orders')),
    ] },
    { title: 'Handyman Hub', links: [
      link('Hire a Handyman', 'construct-outline', () => navigation.navigate('HandymanHub')),
      link('Join as a Handyman', 'person-add-outline', () => signedInRoute('HandymanRegister')),
    ] },
    { title: 'Delivery partners', links: [
      ...(hasDeliveryProfile ? [link('Delivery dashboard', 'speedometer-outline', () => web('/delivery/dashboard'))] : []),
      link('Join as a delivery person', 'bicycle-outline', () => web('/delivery/register')),
      link('Delivery terms', 'document-text-outline', () => web('/delivery/terms')),
    ] },
    { title: 'Selling', links: [
      link('Start selling', 'storefront-outline', () => user?.role === 'seller' ? tab('Seller') : navigation.navigate(status === 'signedIn' ? 'Store' : 'Login' as never)),
      link('Fees & commission', 'pricetag-outline', () => web('/faq')),
    ] },
    { title: 'Legal', links: [link('Terms of service', 'document-text-outline', () => web('/terms')), link('Privacy policy', 'shield-checkmark-outline', () => web('/privacy'))] },
  ];

  const subscribe = async () => {
    const clean = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(clean)) return Alert.alert('Check your email', 'Enter a valid email address to subscribe.');
    setSubmitting(true);
    try {
      const response = await request<{ message: string }>('/newsletter/subscribe', { method: 'POST', json: { email: clean }, auth: false });
      Alert.alert('Newsletter', response.message || 'You are subscribed.');
    } catch (e: any) {
      Alert.alert('Could not subscribe', e.message || 'Please check your connection and try again.');
    } finally { setSubmitting(false); }
  };

  const external = (url: string) => { void Linking.openURL(url).catch(() => Alert.alert('Could not open link', 'Please try again in a moment.')); };

  return <Screen>
    <Header title="About & support" onBack={() => navigation.goBack()} />
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.newsletter}>
        <View style={styles.newsletterIcon}><Ionicons name="mail-open-outline" size={22} color={colors.accent} /></View>
        <Text style={styles.newsletterTitle}>Get new-arrival alerts</Text>
        <Text style={styles.newsletterCopy}>One email a week. Deals, new sellers, nothing else.</Text>
        <View style={styles.subscribeRow}>
          <TextInput value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor="#83968E" keyboardType="email-address" autoCapitalize="none" autoComplete="email" style={styles.emailInput} accessibilityLabel="Email for newsletter" />
          <Pressable onPress={() => void subscribe()} disabled={submitting} style={styles.subscribeButton} accessibilityRole="button">
            {submitting ? <ActivityIndicator size="small" color={colors.text} /> : <Text style={styles.subscribeText}>Subscribe</Text>}
          </Pressable>
        </View>
      </View>

      {sections.map((section) => <View key={section.title} style={styles.linkSection}>
        <Text style={styles.sectionTitle}>{section.title}</Text>
        {section.links.map((item) => <Pressable key={item.label} onPress={item.action} style={({ pressed }) => [styles.linkRow, pressed && styles.linkPressed]} accessibilityRole="link">
          <Ionicons name={item.icon} size={18} color={colors.primary} />
          <Text style={styles.linkText}>{item.label}</Text>
          <Ionicons name="chevron-forward" size={15} color={colors.textMuted} />
        </Pressable>)}
      </View>)}

      <View style={styles.paymentPanel}>
        <Text style={styles.paymentTitle}>We accept</Text>
        <View style={styles.paymentTags}>
          <PaymentTag icon="car-outline" title="Pay on delivery" />
          <PaymentTag icon="phone-portrait-outline" title="Mobile Money" />
          <PaymentTag icon="card-outline" title="Card · Visa · Mastercard" />
        </View>
        <Text style={styles.secureCopy}>Card and Mobile Money payments are processed securely.</Text>
      </View>

      <View style={styles.brandPanel}>
        <Pressable onPress={() => navigation.navigate('Tabs', { screen: 'Home' } as never)} style={styles.brandRow} accessibilityRole="button" accessibilityLabel="EraVenda home">
          <Image source={require('../../../assets/logo-mark.png')} style={styles.logo} contentFit="contain" />
          <Text style={styles.wordmark}>Era<Text style={styles.wordAccent}>Venda.</Text></Text>
        </Pressable>
        <Pressable onPress={() => external('tel:+233554372279')} style={styles.contactRow}><Ionicons name="call-outline" size={17} color={colors.accent} /><Text style={styles.contactText}>+233 55 437 2279</Text></Pressable>
        <Pressable onPress={() => external('mailto:support@eravenda.com')} style={styles.contactRow}><Ionicons name="mail-outline" size={17} color={colors.accent} /><Text style={styles.contactText}>support@eravenda.com</Text></Pressable>
        <View style={styles.contactRow}><Ionicons name="location-outline" size={17} color={colors.accent} /><Text style={styles.contactText}>Sunyani, Bono Region, Ghana</Text></View>
        <View style={styles.socialRow}>
          <SocialButton icon="logo-whatsapp" label="WhatsApp" onPress={() => external('https://wa.me/+233554372279')} />
          <SocialButton icon="logo-facebook" label="Facebook" onPress={() => external('https://www.facebook.com/profile.php?id=61594438107592')} />
          <SocialButton icon="logo-tiktok" label="TikTok" onPress={() => external('https://www.tiktok.com/@eravenda.com?_r=1&_t=ZS-9AZrxGfrPlO')} />
        </View>
      </View>
      <Text style={styles.copyright}>© {new Date().getFullYear()} EraVenda Market. All rights reserved.</Text>
    </ScrollView>
  </Screen>;
}

function PaymentTag({ icon, title }: { icon: LinkItem['icon']; title: string }) {
  return <View style={styles.paymentTag}><Ionicons name={icon} size={15} color={colors.accent} /><Text style={styles.paymentTagText}>{title}</Text></View>;
}

function SocialButton({ icon, label, onPress }: { icon: LinkItem['icon']; label: string; onPress: () => void }) {
  return <Pressable onPress={onPress} style={styles.socialButton} accessibilityRole="link" accessibilityLabel={label}><Ionicons name={icon} size={20} color={colors.white} /></Pressable>;
}

const styles = StyleSheet.create({
  content: { paddingBottom: 26, backgroundColor: '#073C35' },
  newsletter: { padding: 19, borderBottomWidth: 1, borderBottomColor: '#285B51' },
  newsletterIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#15574B', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  newsletterTitle: { color: colors.white, fontSize: 19, fontWeight: '900' },
  newsletterCopy: { color: '#D2E5DF', fontSize: 12, marginTop: 3 },
  subscribeRow: { flexDirection: 'row', marginTop: 13, minHeight: 44, overflow: 'hidden', borderRadius: radius.md },
  emailInput: { flex: 1, minWidth: 0, color: colors.text, backgroundColor: colors.surface, paddingHorizontal: 12, fontSize: 13 },
  subscribeButton: { minWidth: 96, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent },
  subscribeText: { color: '#18251F', fontSize: 12, fontWeight: '900' },
  linkSection: { paddingTop: 17, paddingHorizontal: 18 },
  sectionTitle: { color: colors.white, fontSize: 14, fontWeight: '900', marginBottom: 5 },
  linkRow: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#285B51' },
  linkPressed: { opacity: 0.7 },
  linkText: { flex: 1, color: '#D2E5DF', fontSize: 12, fontWeight: '600' },
  paymentPanel: { marginHorizontal: 16, marginTop: 20, padding: 14, borderRadius: radius.md, backgroundColor: '#105247' },
  paymentTitle: { color: '#D2E5DF', fontSize: 11, fontWeight: '800', marginBottom: 8 },
  paymentTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  paymentTag: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 9, paddingVertical: 7, borderRadius: radius.sm, backgroundColor: '#1A6659' },
  paymentTagText: { color: colors.white, fontSize: 10, fontWeight: '700' },
  secureCopy: { color: '#B7D3CB', fontSize: 10, lineHeight: 15, marginTop: 9 },
  brandPanel: { marginTop: 19, paddingHorizontal: 18, paddingTop: 18, borderTopWidth: 1, borderTopColor: '#285B51' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 11 },
  logo: { width: 42, height: 42 },
  wordmark: { color: colors.white, fontSize: 24, fontWeight: '900', fontStyle: 'italic', letterSpacing: -0.5 },
  wordAccent: { color: colors.accent },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 32 },
  contactText: { color: '#D2E5DF', fontSize: 12 },
  socialRow: { flexDirection: 'row', gap: 10, marginTop: 13 },
  socialButton: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: '#15574B' },
  copyright: { color: '#B7D3CB', fontSize: 10, textAlign: 'center', paddingHorizontal: 12, paddingVertical: 15, marginTop: 16, borderTopWidth: 1, borderTopColor: '#285B51' },
});
