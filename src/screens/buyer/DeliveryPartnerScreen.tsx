import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { Header } from '../../components/Section';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { colors } from '../../config/theme';
import { useAuth } from '../../context/AuthContext';
import type { RootStackParamList } from '../../navigation/types';
import { request } from '../../services/http';

type Props = NativeStackScreenProps<RootStackParamList, 'DeliveryPartner'>;
type DeliveryProfile = { id: string; status: string; location: string; vehicle_type: string; availability: string; rejection_reason?: string | null };
type DeliveryOrder = { id: string; order_number: string; status: string; buyer_name: string; buyer_phone?: string | null; buyer_email: string; delivery_location?: string | null; store_name: string; total_amount: number; delivery_fee: number; assignment_note?: string | null; created_at: string };
type DeliveryDashboard = { active_orders: DeliveryOrder[]; completed_orders: DeliveryOrder[]; total_deliveries: number; active_delivery_count: number; amount_received: number };
const TERMS = [
  ['1. Independent partner relationship', 'Delivery persons are independent partners, not employees of EraVenda. You are responsible for your equipment, vehicle, permits, insurance, taxes and compliance with applicable Ghanaian laws.'],
  ['2. Accurate information and review', 'Provide truthful identity, contact, location, vehicle and licence information. EraVenda may verify your application, approve or reject your profile, and suspend access when information is inaccurate or safety concerns arise.'],
  ['3. Delivery standards', 'Accept only assignments you can complete, handle products carefully, communicate promptly with EraVenda and the buyer, protect delivery information, and follow each order’s instructions.'],
  ['4. Buyer contact and privacy', 'Buyer contact information is provided only to complete an assigned order. Do not use it for marketing, harassment, off-platform transactions, or unrelated purposes.'],
  ['5. Conduct and accountability', 'Fraud, theft, intimidation, discrimination, unsafe conduct, tampering, or repeated failure to complete assignments may result in suspension or removal. Report incidents promptly.'],
  ['6. Changes and termination', 'EraVenda may update these terms or end a partnership for policy violations, inactivity, or operational reasons. Complete or hand back ongoing assignments before withdrawing.'],
  ['7. Disputes', 'Contact EraVenda first so delivery records can be reviewed and a resolution attempted. Unresolved disputes are governed by the laws of the Republic of Ghana.'],
];

export function DeliveryPartnerScreen({ navigation }: Props) {
  const { status } = useAuth();
  const [profile, setProfile] = useState<DeliveryProfile | null>(null);
  const [dashboard, setDashboard] = useState<DeliveryDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [form, setForm] = useState({ company_name: '', location: '', vehicle_type: '', license_number: '', availability: 'available' });
  const set = (key: keyof typeof form) => (value: string) => setForm((old) => ({ ...old, [key]: value }));

  const loadProfile = useCallback(async () => {
    if (status !== 'signedIn') { setProfile(null); setDashboard(null); setLoading(false); return; }
    setLoading(true);
    setLoadError('');
    try {
      const current = await request<DeliveryProfile>('/delivery/me');
      setProfile(current);
      if (current.status === 'approved') setDashboard(await request<DeliveryDashboard>('/delivery/dashboard'));
      else setDashboard(null);
    }
    catch (error: any) { if (error.status === 404) { setProfile(null); setDashboard(null); } else setLoadError(error.message || 'Could not load your application.'); }
    finally { setLoading(false); }
  }, [status]);
  useEffect(() => { void loadProfile(); }, [loadProfile]);
  useEffect(() => { if (status === 'signedOut') navigation.navigate('Login'); }, [navigation, status]);

  const submit = async () => {
    if (!form.location.trim() || !form.vehicle_type.trim()) return Alert.alert('Missing details', 'Enter your service location and vehicle type.');
    if (!accepted) return Alert.alert('Terms required', 'Please accept the Delivery Partner Terms & Conditions.');
    setBusy(true);
    try {
      await request<DeliveryProfile>('/delivery/register', { method: 'POST', json: { ...form, company_name: form.company_name.trim() || null, license_number: form.license_number.trim() || null, location: form.location.trim(), vehicle_type: form.vehicle_type.trim(), terms_accepted: true } });
      Alert.alert('Application submitted', 'EraVenda will review your delivery partner application.');
      await loadProfile();
    } catch (error: any) { Alert.alert('Could not submit', error.message || 'Please try again.'); }
    finally { setBusy(false); }
  };

  const updateOrder = async (order: DeliveryOrder, nextStatus: 'shipped' | 'delivered') => {
    try {
      await request<DeliveryOrder>(`/delivery/orders/${encodeURIComponent(order.id)}/status`, { method: 'PUT', json: { status: nextStatus } });
      await loadProfile();
    } catch (error: any) { Alert.alert('Could not update delivery', error.message || 'Please try again.'); }
  };
  return <Screen>
    <Header title="Delivery partner" onBack={() => navigation.goBack()} />
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {loading ? <Text style={styles.muted}>Loading your delivery profile…</Text> : loadError ? <View style={styles.profileCard}><Text style={styles.muted}>{loadError}</Text><Button title="Try again" variant="outline" onPress={() => void loadProfile()} /></View> : profile && profile.status !== 'rejected' ? <View style={styles.profileCard}>
        <Text style={styles.title}>Your application</Text>
        <Text style={styles.status}>{profile.status.toUpperCase()}</Text>
        <Text style={styles.copy}>{profile.location} · {profile.vehicle_type} · {profile.availability}</Text>
        {!!profile.rejection_reason && <Text style={styles.error}>{profile.rejection_reason}</Text>}
        {profile.status === 'approved' ? <>
          <View style={styles.stats}><Stat label="Active" value={dashboard?.active_delivery_count ?? 0} /><Stat label="Completed" value={dashboard?.total_deliveries ?? 0} /><Stat label="Fees received" value={`GH₵ ${(dashboard?.amount_received ?? 0).toFixed(2)}`} /></View>
          <Text style={styles.label}>Active deliveries</Text>
          {dashboard?.active_orders.map((order) => <View key={order.id} style={styles.orderCard}>
            <Text style={styles.orderTitle}>Order {order.order_number} · {order.status}</Text><Text style={styles.muted}>{order.store_name} · {order.buyer_name}</Text>
            {!!order.delivery_location && <Text style={styles.muted}>Deliver to: {order.delivery_location}</Text>}
            {!!order.assignment_note && <Text style={styles.muted}>Note: {order.assignment_note}</Text>}
            {!!order.buyer_phone && <Text style={styles.copy}>Buyer phone: {order.buyer_phone}</Text>}
            {order.status === 'processing' && <Button title="Mark picked up" onPress={() => void updateOrder(order, 'shipped')} />}
            {order.status === 'shipped' && <Button title="Mark delivered" onPress={() => void updateOrder(order, 'delivered')} />}
          </View>)}
          {!dashboard?.active_orders.length && <Text style={styles.muted}>No active deliveries assigned right now.</Text>}
          {!!dashboard?.completed_orders.length && <Text style={styles.muted}>Completed deliveries: {dashboard.total_deliveries}</Text>}
        </> : profile.status === 'rejected' ? <Text style={styles.muted}>Update your details below and submit again for review.</Text> : <Text style={styles.muted}>Your details are with EraVenda for review. We’ll email you when there is an update.</Text>}
      </View> : <>
        {!!profile?.rejection_reason && <View style={styles.profileCard}><Text style={styles.status}>APPLICATION NEEDS CHANGES</Text><Text style={styles.muted}>{profile.rejection_reason}</Text></View>}
        <Text style={styles.eyebrow}>ERAVENDA DELIVERY NETWORK</Text>
        <Text style={styles.title}>Become a delivery partner</Text>
        <Text style={styles.muted}>Share your service area and availability so EraVenda can match you with orders nearby.</Text>
        <TextField label="Company name (optional)" value={form.company_name} onChangeText={set('company_name')} maxLength={150} />
        <TextField label="Service location" value={form.location} onChangeText={set('location')} placeholder="City, region or delivery area" maxLength={255} />
        <TextField label="Vehicle / transport type" value={form.vehicle_type} onChangeText={set('vehicle_type')} placeholder="Motorbike, car, van, bicycle" maxLength={80} />
        <TextField label="Licence or registration number (optional)" value={form.license_number} onChangeText={set('license_number')} maxLength={100} />
        <Text style={styles.label}>Availability</Text>
        <View style={styles.availability}>{['available', 'weekdays', 'weekends', 'limited'].map((choice) => <Pressable key={choice} onPress={() => set('availability')(choice)} style={[styles.chip, form.availability === choice && styles.chipSelected]}><Text style={[styles.chipText, form.availability === choice && styles.chipSelectedText]}>{choice[0].toUpperCase() + choice.slice(1)}</Text></Pressable>)}</View>
        <Text style={styles.label}>Delivery Partner Terms & Conditions</Text>
        <View style={styles.terms}>{TERMS.map(([heading, body]) => <View key={heading} style={styles.term}><Text style={styles.termHeading}>{heading}</Text><Text style={styles.termBody}>{body}</Text></View>)}</View>
        <Pressable onPress={() => setAccepted((v) => !v)} style={styles.accept} accessibilityRole="checkbox" accessibilityState={{ checked: accepted }}>
          <Ionicons name={accepted ? 'checkbox' : 'square-outline'} size={22} color={accepted ? colors.primary : colors.textMuted} />
          <Text style={styles.copy}>I have read and agree to the EraVenda Delivery Partner Terms & Conditions.</Text>
        </Pressable>
        <Button title="Submit for review" onPress={submit} loading={busy} disabled={busy} />
      </>}
    </ScrollView>
  </Screen>;
}

const styles = StyleSheet.create({
  content: { padding: 18, paddingBottom: 32, gap: 12 }, eyebrow: { color: colors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 1.2 }, title: { color: colors.text, fontSize: 23, fontWeight: '800' }, muted: { color: colors.textMuted, lineHeight: 20 }, copy: { color: colors.text, lineHeight: 20, flex: 1 }, label: { color: colors.text, fontWeight: '700', marginTop: 4 }, availability: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8 }, chipSelected: { backgroundColor: colors.primarySoft, borderColor: colors.primary }, chipText: { color: colors.textMuted, fontSize: 12 }, chipSelectedText: { color: colors.primary, fontWeight: '700' }, terms: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 12, padding: 13, gap: 12 }, term: { gap: 4 }, termHeading: { color: colors.text, fontWeight: '700' }, termBody: { color: colors.textMuted, fontSize: 12, lineHeight: 18 }, accept: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8 }, profileCard: { gap: 12, padding: 16, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }, status: { alignSelf: 'flex-start', color: colors.primary, backgroundColor: colors.primarySoft, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, fontWeight: '800', fontSize: 12 }, error: { color: colors.danger }, stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, stat: { flexGrow: 1, minWidth: 90, padding: 10, borderRadius: 10, backgroundColor: colors.background }, statValue: { color: colors.text, fontWeight: '800', fontSize: 16 }, statLabel: { color: colors.textMuted, fontSize: 11, marginTop: 3 }, orderCard: { padding: 12, gap: 7, borderRadius: 10, borderWidth: 1, borderColor: colors.border }, orderTitle: { color: colors.text, fontWeight: '800' },
});

function Stat({ label, value }: { label: string; value: string | number }) {
  return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}
