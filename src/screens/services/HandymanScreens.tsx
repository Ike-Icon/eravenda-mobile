import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '../../components/Button';
import { Header } from '../../components/Section';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { colors, font, radius, shadow } from '../../config/theme';
import { SITE_ORIGIN } from '../../config/env';
import { useAuth } from '../../context/AuthContext';
import type { RootStackScreenProps } from '../../navigation/types';
import { handymanService } from '../../services/handymanService';
import { uploadToCloudinary } from '../../services/sellerService';
import type { Handyman, ProfessionalBooking, ServiceBooking, ServiceReview } from '../../types/api';
import { absoluteUrl, formatPrice } from '../../utils/format';

const jobs = ['Electrician', 'Plumber', 'Carpenter', 'Painter', 'AC Technician', 'Auto Mechanic', 'Mason', 'Appliance Repair', 'Other'];
const professionalTerms = [
  ['1. Platform commission', 'EraVenda charges a 4% service commission to the professional on every completed job secured through the platform. The client pays the agreed job amount plus this commission, and the professional receives the agreed job amount after payment and verification. Commission rates may be adjusted with 30 days’ notice.'],
  ['2. On-platform payments only', 'All job payouts are handled exclusively through EraVenda. When you mark a job complete, the client reviews and pays the agreed job amount plus the service commission through the app. EraVenda holds the payment and releases the agreed job amount after the work is verified. Off-platform payment for an EraVenda-booked job is prohibited and may result in suspension or removal. Contact support@eravenda.com if a client is unresponsive or a payout is delayed.'],
  ['3. Professional obligations', 'You confirm that your identity, qualifications, certifications and experience are accurate. You are responsible for maintaining any licences required for your trade in Ghana. Misrepresented credentials can result in immediate suspension or removal.'],
  ['4. Quality and conduct', 'Deliver work professionally, honour agreed timelines, treat clients and their property with respect, and communicate promptly. Repeated complaints, low ratings or conduct violations may result in profile suspension or removal.'],
  ['5. Insurance and liability', 'As an independent contractor, you are responsible for your own tools, materials, personal insurance and tax obligations. EraVenda does not employ service professionals and is not liable for property damage, personal injury or workmanship issues.'],
  ['6. Profile and data use', 'EraVenda may display your professional name, company, trade, qualifications, portfolio images and ratings publicly. You grant EraVenda a non-exclusive licence to use this information for platform operations and marketing. Contact support to request profile deletion.'],
  ['7. Termination', 'EraVenda may suspend or terminate a professional profile for violations, fraud or prolonged inactivity. You may withdraw at any time, subject to completing or cancelling ongoing bookings.'],
  ['8. Dispute resolution', 'Disputes will first go through EraVenda’s internal resolution process. Unresolved disputes are governed by the laws of the Republic of Ghana and the jurisdiction of the courts of Accra.'],
];
const statusLabel: Record<string, string> = {
  requested: 'Request sent', assigned: 'Professional assigned', in_progress: 'Work in progress', escrow_funded: 'Payment secured',
  completion_requested: 'Ready for your review', completed: 'Completed', released: 'Payment released', cancelled: 'Cancelled',
};

type HubProps = RootStackScreenProps<'HandymanHub'>;
export function HandymanHubScreen({ route, navigation }: HubProps) {
  const [workers, setWorkers] = useState<Handyman[]>([]);
  const [query, setQuery] = useState('');
  const [profession, setProfession] = useState(route.params?.profession || '');
  const [minRating, setMinRating] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try { setWorkers(await handymanService.workers()); setError(''); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (route.params?.profession) setProfession(route.params.profession); }, [route.params?.profession]);
  const shown = useMemo(() => workers.filter((w) => {
    const professionName = (w.custom_job_title || w.job_title).toLowerCase();
    const haystack = `${w.professional_name ?? ''} ${professionName} ${w.company_name ?? ''}`.toLowerCase();
    return (!query || haystack.includes(query.toLowerCase().trim())) && (!profession || professionName === profession.toLowerCase()) && w.average_rating >= minRating;
  }), [workers, query, profession, minRating]);
  return <Screen edges={['left', 'right']}>
    <Header title="Handyman Hub" onBack={() => navigation.goBack()} />
    <FlatList data={shown} keyExtractor={(w) => w.id} contentContainerStyle={{ padding: 16, paddingBottom: 28 }} keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
      ListHeaderComponent={<>
        <View style={styles.hero}><Text style={styles.kicker}>ERAVENDA SERVICES</Text><Text style={styles.heroTitle}>Find a professional you can trust</Text><Text style={styles.heroCopy}>Browse approved service professionals, check their experience and request a job. EraVenda coordinates the booking and keeps your payment protected.</Text>
          <Pressable onPress={() => navigation.navigate('HandymanRegister')} style={styles.heroLink}><Text style={styles.heroLinkText}>Join as a professional</Text><Ionicons name="arrow-forward" size={16} color={colors.white} /></Pressable>
        </View>
        <TextField label="Search professionals" value={query} onChangeText={setQuery} placeholder="Name, profession or company" returnKeyType="search" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 10 }}>
          {['', ...jobs.filter((j) => j !== 'Other')].map((j) => <Pressable key={j || 'all'} onPress={() => setProfession(j)} style={[styles.filter, profession === j && styles.filterOn]}><Text style={[styles.filterText, profession === j && { color: colors.white }]}>{j || 'All trades'}</Text></Pressable>)}
        </ScrollView>
        <View style={styles.ratingsRow}><Text style={styles.meta}>Minimum rating:</Text>{[0, 3, 4, 4.5].map((r) => <Pressable key={r} onPress={() => setMinRating(r)} style={[styles.ratingFilter, minRating === r && styles.ratingFilterOn]}><Text style={[styles.ratingFilterText, minRating === r && { color: colors.primary }]}>{r ? `${r}+ ★` : 'Any'}</Text></Pressable>)}</View>
        <Text style={styles.sectionTitle}>{loading ? 'Professionals' : `${shown.length} approved professional${shown.length === 1 ? '' : 's'}`}</Text>
      </>}
      renderItem={({ item }) => <Pressable style={styles.workerCard} onPress={() => navigation.navigate('HandymanProfile', { handymanId: item.id })}>
        {item.portfolio?.[0]?.image_url ? <Image source={{ uri: absoluteUrl(item.portfolio[0].image_url) }} style={styles.workerImage} /> : <View style={[styles.workerImage, styles.workerPlaceholder]}><Ionicons name="construct-outline" size={36} color={colors.primary} /></View>}
        <View style={styles.workerBody}><View style={styles.badges}>{item.verified_pro && <Badge label="Verified Pro" tone="green" />}{item.background_checked && <Badge label="Background checked" tone="blue" />}</View>
          <Text style={styles.workerName}>{item.professional_name || item.custom_job_title || item.job_title}</Text><Text style={styles.trade}>{item.custom_job_title || item.job_title}{item.company_name ? ` · ${item.company_name}` : ''}</Text>
          <Text style={styles.stars}>★ {Number(item.average_rating).toFixed(1)} <Text style={styles.meta}>({item.review_count} reviews)</Text></Text><Text numberOfLines={2} style={styles.copy}>{item.qualifications || 'Qualifications available on profile'}</Text>
          <Text style={styles.viewLink}>View profile and request <Ionicons name="arrow-forward" size={14} color={colors.primary} /></Text>
        </View>
      </Pressable>}
      ListEmptyComponent={loading ? <ActivityIndicator color={colors.primary} style={{ margin: 32 }} /> : <EmptyState text={error || 'No professionals match those filters. Try another trade or clear your search.'} action="Refresh" onPress={() => { setLoading(true); void load(); }} />}
    />
  </Screen>;
}

type ProfileProps = RootStackScreenProps<'HandymanProfile'>;
export function HandymanProfileScreen({ route, navigation }: ProfileProps) {
  const [worker, setWorker] = useState<Handyman | null>(null);
  const [reviews, setReviews] = useState<ServiceReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => { let live = true; Promise.all([handymanService.worker(route.params.handymanId), handymanService.ratings(route.params.handymanId)]).then(([w, r]) => { if (live) { setWorker(w); setReviews(r); } }).catch((e: any) => { if (live) setError(e.message); }).finally(() => { if (live) setLoading(false); }); return () => { live = false; }; }, [route.params.handymanId]);
  if (loading) return <Screen><ActivityIndicator style={{ flex: 1 }} color={colors.primary} /></Screen>;
  if (!worker) return <Screen><Header title="Professional" onBack={() => navigation.goBack()} /><EmptyState text={error || 'This professional is unavailable.'} /></Screen>;
  const name = worker.professional_name || worker.custom_job_title || worker.job_title;
  return <Screen edges={['left', 'right']}>
    <Header title="Professional profile" onBack={() => navigation.goBack()} />
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30 }}>
      {worker.portfolio?.length ? <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>{worker.portfolio.map((p) => <Image key={p.id} source={{ uri: absoluteUrl(p.image_url) }} style={styles.portfolioImage} />)}</ScrollView> : <View style={[styles.profileHero, styles.workerPlaceholder]}><Ionicons name="construct-outline" size={52} color={colors.primary} /></View>}
      <View style={styles.badges}>{worker.verified_pro && <Badge label="Verified Pro" tone="green" />}{worker.background_checked && <Badge label="Background checked" tone="blue" />}</View>
      <Text style={styles.profileName}>{name}</Text><Text style={styles.trade}>{worker.custom_job_title || worker.job_title}{worker.company_name ? ` · ${worker.company_name}` : ''}</Text>
      <Text style={styles.stars}>★ {Number(worker.average_rating).toFixed(1)} <Text style={styles.meta}>({worker.review_count} client reviews)</Text></Text>
      <InfoBlock title="Qualifications" body={worker.qualifications || 'Details to be completed during verification.'} />
      <InfoBlock title="Experience" body={worker.work_experience || 'Experience details not provided.'} />
      {!!worker.education && <InfoBlock title="Education" body={worker.education} />}
      {worker.safety_rating > 0 && <InfoBlock title="Safety rating" body={`${Number(worker.safety_rating).toFixed(1)} / 5`} />}
      <View style={styles.infoBlock}><Text style={styles.label}>Client reviews</Text>{reviews.length ? reviews.map((r) => <View key={r.id} style={styles.reviewCard}><Text style={styles.stars}>{'★'.repeat(r.rating)}<Text style={styles.meta}>  {new Date(r.created_at).toLocaleDateString()}</Text></Text><Text style={styles.copy}>{r.comment || 'Rated service'}</Text></View>) : <Text style={styles.meta}>No written reviews yet.</Text>}</View>
      <View style={styles.notice}><Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} /><Text style={[styles.copy, { flex: 1 }]}>Your request goes to EraVenda for coordination. Keep all job payments inside EraVenda for payment protection.</Text></View>
      <Button title="Request this professional" onPress={() => navigation.navigate('ServiceRequest', { handymanId: worker.id, professionalName: name })} style={{ marginTop: 14 }} />
    </ScrollView>
  </Screen>;
}

type RequestProps = RootStackScreenProps<'ServiceRequest'>;
export function ServiceRequestScreen({ route, navigation }: RequestProps) {
  const { status } = useAuth();
  const [details, setDetails] = useState(''); const [location, setLocation] = useState(''); const [method, setMethod] = useState('WhatsApp'); const [contact, setContact] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (status !== 'signedIn') { navigation.navigate('Login'); return; }
    if (details.trim().length < 10 || !location.trim() || !contact.trim()) { Alert.alert('Complete your request', 'Add at least 10 characters describing the work, your location and a contact detail.'); return; }
    setBusy(true);
    try { const booking = await handymanService.createBooking({ handyman_id: route.params.handymanId, details: details.trim(), location: location.trim(), preferred_contact: method, contact_details: contact.trim() }); navigation.replace('ServiceBookingDetail', { bookingId: booking.id }); }
    catch (e: any) { Alert.alert('Could not send request', e.message); }
    finally { setBusy(false); }
  };
  return <Screen edges={['left', 'right']}><Header title="Request a service" onBack={() => navigation.goBack()} /><ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30 }} keyboardShouldPersistTaps="handled">
    <Text style={styles.profileName}>{route.params.professionalName}</Text><Text style={styles.copy}>Describe the work and where it is needed. EraVenda will coordinate your request with the professional.</Text>
    <TextField label="What work do you need?" value={details} onChangeText={setDetails} placeholder="Describe the issue and preferred date or time" multiline numberOfLines={5} style={{ minHeight: 118, textAlignVertical: 'top', paddingTop: 12 }} maxLength={5000} />
    <TextField label="Location (address, town and region)" value={location} onChangeText={setLocation} placeholder="e.g. East Legon, Accra" maxLength={255} />
    <Text style={styles.label}>Preferred contact</Text><View style={styles.optionRow}>{['WhatsApp', 'Phone call', 'Email'].map((v) => <Pressable key={v} onPress={() => setMethod(v)} style={[styles.filter, method === v && styles.filterOn]}><Text style={[styles.filterText, method === v && { color: colors.white }]}>{v}</Text></Pressable>)}</View>
    <TextField label="Phone, WhatsApp number or email" value={contact} onChangeText={setContact} placeholder="How should we reach you?" maxLength={150} autoCapitalize="none" />
    <View style={styles.notice}><Ionicons name="lock-closed-outline" size={18} color={colors.primary} /><Text style={[styles.copy, { flex: 1 }]}>Your contact information is shared only to coordinate this request.</Text></View>
    <Button title="Send service request" onPress={() => void submit()} loading={busy} style={{ marginTop: 16 }} />
  </ScrollView></Screen>;
}

type MyBookingsProps = RootStackScreenProps<'ServiceBookings'>;
export function ServiceBookingsScreen({ navigation }: MyBookingsProps) {
  const [items, setItems] = useState<ServiceBooking[]>([]); const [loading, setLoading] = useState(true); const [refreshing, setRefreshing] = useState(false); const [error, setError] = useState('');
  const load = useCallback(async () => { try { setItems(await handymanService.myBookings()); setError(''); } catch (e: any) { setError(e.message); } finally { setLoading(false); setRefreshing(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  return <Screen edges={['left', 'right']}><Header title="My service requests" onBack={() => navigation.goBack()} /><FlatList data={items} keyExtractor={(x) => x.id} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />} renderItem={({ item }) => <Pressable style={styles.bookingCard} onPress={() => navigation.navigate('ServiceBookingDetail', { bookingId: item.id })}><View style={styles.bookingTop}><Text style={styles.sectionTitle}>{statusLabel[item.status] || item.status}</Text><Ionicons name="chevron-forward" size={18} color={colors.textMuted} /></View><Text style={styles.copy} numberOfLines={2}>{item.details}</Text><Text style={styles.meta}>{item.location || 'Location not provided'} · {new Date(item.created_at).toLocaleDateString()}</Text>{item.escrow_amount > 0 && <Text style={styles.amount}>{formatPrice(item.escrow_amount)} including service charge</Text>}</Pressable>} ListEmptyComponent={loading ? <ActivityIndicator style={{ margin: 32 }} color={colors.primary} /> : <EmptyState text={error || 'No service requests yet.'} action="Find a professional" onPress={() => navigation.navigate('HandymanHub')} />} /></Screen>;
}

type BookingDetailProps = RootStackScreenProps<'ServiceBookingDetail'>;
export function ServiceBookingDetailScreen({ route, navigation }: BookingDetailProps) {
  const professionalView = route.params.professional === true;
  const [booking, setBooking] = useState<ServiceBooking | null>(null); const [worker, setWorker] = useState<Handyman | null>(null); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [rating, setRating] = useState(5); const [comment, setComment] = useState(''); const [reference, setReference] = useState('');
  const load = useCallback(async () => { try { const next = await handymanService.booking(route.params.bookingId); setBooking(next); handymanService.worker(next.handyman_id).then(setWorker).catch(() => setWorker(null)); } catch (e: any) { Alert.alert('Booking', e.message); } finally { setLoading(false); } }, [route.params.bookingId]);
  useEffect(() => { void load(); }, [load]);
  const pay = async () => {
    if (!booking) return; setBusy(true);
    try { const init = await handymanService.initializePayment(booking.id); const url = new URL(init.authorization_url); if (url.protocol !== 'https:' || (url.hostname !== 'paystack.com' && !url.hostname.endsWith('.paystack.com'))) throw new Error('Payment link is not a trusted secure checkout.'); setReference(init.reference); await WebBrowser.openBrowserAsync(url.toString()); const result = await handymanService.verifyPayment(init.reference); if (result.status === 'success') Alert.alert('Payment confirmed', 'Your payment is secured and the booking has been updated.'); else Alert.alert('Payment pending', 'We could not confirm this payment yet. Pull down to refresh and try again.'); await load(); }
    catch (e: any) { Alert.alert('Payment', e.message); }
    finally { setBusy(false); }
  };
  const verify = async () => { if (!reference) return; setBusy(true); try { const result = await handymanService.verifyPayment(reference); if (result.status === 'success') Alert.alert('Payment confirmed', 'Your service payment was confirmed.'); else Alert.alert('Not confirmed yet', 'Payment is still pending or was not completed.'); await load(); } catch (e: any) { Alert.alert('Payment', e.message); } finally { setBusy(false); } };
  const rate = async () => { if (!booking) return; setBusy(true); try { await handymanService.rate(booking.id, rating, comment.trim()); await load(); Alert.alert('Thank you', 'Your review helps other customers choose a professional.'); } catch (e: any) { Alert.alert('Review', e.message); } finally { setBusy(false); } };
  const addPhoto = async () => { if (!booking) return; const permission = await ImagePicker.requestMediaLibraryPermissionsAsync(); if (!permission.granted) { Alert.alert('Permission needed', 'Allow photo access to add a booking photo.'); return; } const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.82 }); if (result.canceled) return; setBusy(true); try { const url = await uploadToCloudinary(result.assets[0]); await handymanService.addPhoto(booking.id, url, 'Booking update'); await load(); } catch (e: any) { Alert.alert('Photo upload', e.message); } finally { setBusy(false); } };
  if (loading || !booking) return <Screen><Header title="Service booking" onBack={() => navigation.goBack()} /><ActivityIndicator style={{ flex: 1 }} color={colors.primary} /></Screen>;
  return <Screen edges={['left', 'right']}><Header title="Service booking" onBack={() => navigation.goBack()} /><ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30 }}>
    <View style={styles.statusCard}><Text style={styles.kicker}>BOOKING STATUS</Text><Text style={styles.profileName}>{statusLabel[booking.status] || booking.status}</Text><Text style={styles.copy}>Request ID: {booking.id.slice(0, 8).toUpperCase()}</Text></View>
    {worker && <Pressable onPress={() => navigation.navigate('HandymanProfile', { handymanId: worker.id })} style={styles.workerInline}><View style={{ flex: 1 }}><Text style={styles.meta}>YOUR PROFESSIONAL</Text><Text style={styles.label}>{worker.professional_name || worker.job_title}</Text><Text style={styles.trade}>{worker.custom_job_title || worker.job_title} · ★ {Number(worker.average_rating).toFixed(1)}</Text></View><Ionicons name="chevron-forward" size={18} color={colors.primary} /></Pressable>}
    <InfoBlock title="Work requested" body={booking.details} /><InfoBlock title="Location" body={booking.location || 'Not provided'} />
    {(booking.escrow_amount > 0 || booking.quoted_amount) && <View style={styles.bookingCard}><Text style={styles.sectionTitle}>Payment summary</Text><Text style={styles.copy}>Total payable: {formatPrice(booking.escrow_amount)}</Text>{booking.quoted_amount ? <Text style={styles.meta}>Professional quote: {formatPrice(booking.quoted_amount)}</Text> : null}<Text style={styles.meta}>Payment stays in EraVenda until the job is completed.</Text></View>}
    {booking.status === 'completion_requested' && !professionalView && <><Button title={`Review and pay ${formatPrice(booking.escrow_amount)}`} onPress={() => void pay()} loading={busy} /><Button title="Add a progress or completion photo" variant="outline" onPress={() => void addPhoto()} style={{ marginTop: 10 }} /></>}
    {reference ? <Button title="Check payment status" variant="outline" onPress={() => void verify()} loading={busy} style={{ marginTop: 10 }} /> : null}
    {(professionalView || booking.status !== 'completion_requested') && <Button title="Add a booking photo" variant="outline" onPress={() => void addPhoto()} loading={busy} style={{ marginTop: 10 }} />}
    <Text style={styles.sectionTitle}>Work photos</Text>{booking.photos.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false}>{booking.photos.map((p) => <Image key={p.id} source={{ uri: absoluteUrl(p.image_url) }} style={styles.photoThumb} />)}</ScrollView> : <Text style={styles.meta}>Photos shared for this job will appear here.</Text>}
    {!professionalView && ['completion_requested', 'completed', 'released'].includes(booking.status) && !booking.review && <View style={[styles.bookingCard, { marginTop: 18 }]}><Text style={styles.sectionTitle}>Rate this service</Text><View style={styles.optionRow}>{[1, 2, 3, 4, 5].map((n) => <Pressable key={n} onPress={() => setRating(n)}><Ionicons name={n <= rating ? 'star' : 'star-outline'} size={30} color={colors.accent} /></Pressable>)}</View><TextField label="Your review (optional)" value={comment} onChangeText={setComment} placeholder="Share your experience" multiline maxLength={1000} /><Button title="Submit review" onPress={() => void rate()} loading={busy} /></View>}
    {booking.review && <InfoBlock title="Your review" body={`${'★'.repeat(booking.review.rating)}${booking.review.comment ? `\n${booking.review.comment}` : ''}`} />}
    {booking.paid_at && <Text style={styles.meta}>Paid {new Date(booking.paid_at).toLocaleDateString()}</Text>}
  </ScrollView></Screen>;
}

type ProProps = RootStackScreenProps<'HandymanDashboard'>;
export function HandymanDashboardScreen({ navigation }: ProProps) {
  const [profile, setProfile] = useState<Handyman | null>(null); const [bookings, setBookings] = useState<ProfessionalBooking[]>([]); const [loading, setLoading] = useState(true); const [busyId, setBusyId] = useState(''); const [quote, setQuote] = useState('');
  const load = useCallback(async () => { try { const [p, b] = await Promise.all([handymanService.myProfile(), handymanService.professionalBookings()]); setProfile(p); setBookings(b); } catch (e: any) { if (e.status === 404) setProfile(null); else Alert.alert('Professional dashboard', e.message); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  const accept = async (item: ProfessionalBooking) => { setBusyId(item.id); try { const amount = Number(quote); await handymanService.accept(item.id, amount > 0 ? amount : undefined); setQuote(''); await load(); } catch (e: any) { Alert.alert('Could not accept job', e.message); } finally { setBusyId(''); } };
  const complete = async (item: ProfessionalBooking) => { const amount = Number(quote) || Number(item.quoted_amount); if (!amount || amount <= 0) { Alert.alert('Add your quote', 'Enter the agreed job amount before requesting completion.'); return; } setBusyId(item.id); try { await handymanService.requestCompletion(item.id, amount); setQuote(''); await load(); Alert.alert('Completion requested', 'The customer can now review the work and pay securely.'); } catch (e: any) { Alert.alert('Could not update job', e.message); } finally { setBusyId(''); } };
  const addPortfolio = async () => { const permission = await ImagePicker.requestMediaLibraryPermissionsAsync(); if (!permission.granted) { Alert.alert('Permission needed', 'Allow photo access to add portfolio work.'); return; } const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.82 }); if (result.canceled) return; setLoading(true); try { const url = await uploadToCloudinary(result.assets[0]); await handymanService.addPortfolio(url); await load(); } catch (e: any) { Alert.alert('Portfolio', e.message); setLoading(false); } };
  const addJobPhoto = async (bookingId: string) => { const permission = await ImagePicker.requestMediaLibraryPermissionsAsync(); if (!permission.granted) { Alert.alert('Permission needed', 'Allow photo access to add a progress photo.'); return; } const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.82 }); if (result.canceled) return; setBusyId(bookingId); try { const url = await uploadToCloudinary(result.assets[0]); await handymanService.addPhoto(bookingId, url, 'Work progress'); await load(); } catch (e: any) { Alert.alert('Photo upload', e.message); } finally { setBusyId(''); } };
  const removePortfolio = (imageId: string) => Alert.alert('Remove photo?', 'This image will be removed from your professional profile.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: async () => { try { await handymanService.deletePortfolio(imageId); await load(); } catch (e: any) { Alert.alert('Portfolio', e.message); } } }]);
  if (loading) return <Screen><ActivityIndicator style={{ flex: 1 }} color={colors.primary} /></Screen>;
  if (!profile) return <Screen edges={['left', 'right']}><Header title="Professional dashboard" onBack={() => navigation.goBack()} /><EmptyState text="Create a professional profile to apply to the Handyman Hub and manage your service jobs." action="Apply as a professional" onPress={() => navigation.navigate('HandymanRegister')} /></Screen>;
  return <Screen edges={['left', 'right']}><Header title="Professional dashboard" onBack={() => navigation.goBack()} /><FlatList data={bookings} keyExtractor={(b) => b.id} contentContainerStyle={{ padding: 16 }} ListHeaderComponent={<>
    <View style={styles.statusCard}><Text style={styles.kicker}>YOUR PROFILE</Text><Text style={styles.profileName}>{profile.professional_name || profile.job_title}</Text><Text style={styles.copy}>{profile.custom_job_title || profile.job_title} · {profile.status.toUpperCase()}</Text><Text style={styles.stars}>★ {Number(profile.average_rating).toFixed(1)} <Text style={styles.meta}>({profile.review_count} reviews)</Text></Text></View>
    <Button title="Edit professional profile" variant="outline" onPress={() => navigation.navigate('HandymanRegister', { edit: true })} style={{ marginBottom: 14 }} />
    {profile.status === 'approved' ? <><Text style={styles.sectionTitle}>Portfolio</Text><ScrollView horizontal contentContainerStyle={{ gap: 8, marginBottom: 14 }}>{profile.portfolio.map((p) => <Pressable key={p.id} onLongPress={() => removePortfolio(p.id)}><Image source={{ uri: absoluteUrl(p.image_url) }} style={styles.portfolioThumb} /></Pressable>)}<Pressable style={styles.addPortfolio} onPress={() => void addPortfolio()}><Ionicons name="add" size={28} color={colors.primary} /><Text style={styles.meta}>Add photo</Text></Pressable></ScrollView></> : <Text style={styles.noticeText}>Your profile is {profile.status}. EraVenda will let you know when it is approved.</Text>}
    <View style={styles.statsRow}><Stat label="Jobs" value={bookings.length} /><Stat label="Paid out" value={formatPrice(bookings.filter((b) => b.payout_status === 'paid').reduce((sum, b) => sum + Number(b.payout_amount || 0), 0))} /></View>
    <Text style={styles.sectionTitle}>Service jobs</Text>
  </>} renderItem={({ item }) => <View style={styles.bookingCard}><View style={styles.bookingTop}><Text style={styles.sectionTitle}>{statusLabel[item.status] || item.status}</Text><Text style={styles.stars}>GH₵ {item.quoted_amount || '—'}</Text></View><Text style={styles.copy}>{item.client_name}{item.client_phone ? ` · ${item.client_phone}` : ''}</Text><Text style={styles.copy}>{item.details}</Text><Text style={styles.meta}>{item.location || 'Location not provided'} · {new Date(item.created_at).toLocaleDateString()}</Text>
    {['requested', 'assigned'].includes(item.status) && <><TextInput value={quote} onChangeText={setQuote} placeholder="Quote amount (GH₵), optional" keyboardType="decimal-pad" style={styles.inlineInput} /><Button title="Accept job" onPress={() => void accept(item)} loading={busyId === item.id} /></>}
    {['requested', 'assigned', 'in_progress', 'escrow_funded'].includes(item.status) && <><TextInput value={quote} onChangeText={setQuote} placeholder={`Agreed job amount (GH₵)${item.quoted_amount ? ` · ${item.quoted_amount}` : ''}`} keyboardType="decimal-pad" style={styles.inlineInput} /><Button title="Request completion and payment" variant="outline" onPress={() => void complete(item)} loading={busyId === item.id} style={{ marginTop: 8 }} /></>}
    {!!item.photos.length && <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>{item.photos.map((photo) => <Image key={photo.id} source={{ uri: absoluteUrl(photo.image_url) }} style={styles.photoThumb} />)}</ScrollView>}
    <Button title="Open job tracker" variant="ghost" onPress={() => navigation.navigate('ServiceBookingDetail', { bookingId: item.id, professional: true })} />
    <Button title="Add progress photo" variant="outline" onPress={() => void addJobPhoto(item.id)} loading={busyId === item.id} style={{ marginTop: 8 }} />
    {item.review && <Text style={styles.meta}>Client review: {'★'.repeat(item.review.rating)} {item.review.comment || ''}</Text>}
    <Text style={styles.meta}>Professional payout: {formatPrice(Number(item.payout_amount || 0))} · {item.payout_status}</Text>
    {item.payout_held && <Text style={styles.noticeText}>Payout is held for review. Contact EraVenda support for help.</Text>}
  </View>} ListEmptyComponent={<Text style={styles.meta}>No service jobs have been assigned yet.</Text>} /></Screen>;
}

type RegisterProps = RootStackScreenProps<'HandymanRegister'>;
export function HandymanRegisterScreen({ route, navigation }: RegisterProps) {
  const editing = route.params?.edit === true;
  const { user } = useAuth(); const [job, setJob] = useState(jobs[0]); const [name, setName] = useState(user?.full_name ?? ''); const [company, setCompany] = useState(''); const [experience, setExperience] = useState(''); const [education, setEducation] = useState(''); const [qualifications, setQualifications] = useState(''); const [customJob, setCustomJob] = useState(''); const [termsAccepted, setTermsAccepted] = useState(false); const [paymentsAccepted, setPaymentsAccepted] = useState(false); const [busy, setBusy] = useState(false);
  useEffect(() => { if (!editing) return; handymanService.myProfile().then((p) => { setJob(jobs.includes(p.job_title) ? p.job_title : 'Other'); setCustomJob(p.custom_job_title || ''); setName(p.professional_name || ''); setCompany(p.company_name || ''); setExperience(p.work_experience || ''); setEducation(p.education || ''); setQualifications(p.qualifications || ''); }).catch((e: any) => Alert.alert('Profile', e.message)); }, [editing]);
  const submit = async () => { if (!user?.is_verified) { Alert.alert('Verify your email', 'Verify your EraVenda email before submitting a professional application.'); return; } if (!name.trim() || !experience.trim() || (job === 'Other' && !customJob.trim())) { Alert.alert('Required details', 'Add your professional name, work experience, and profession.'); return; } if (!editing && (!termsAccepted || !paymentsAccepted)) { Alert.alert('Please review the terms', 'Accept both service terms and the EraVenda payment process to continue.'); return; } setBusy(true); try { const input = { job_title: job, custom_job_title: job === 'Other' ? customJob.trim() : undefined, professional_name: name.trim(), company_name: company.trim() || undefined, work_experience: experience.trim(), education: education.trim() || undefined, qualifications: qualifications.trim() || undefined }; const profile = editing ? await handymanService.updateProfile(input) : await handymanService.register(input); Alert.alert(editing ? 'Profile submitted for review' : 'Application received', editing ? 'Your updated profile will be reviewed before it appears in search.' : `Your ${profile.job_title} profile is pending review. We will notify you when it is approved.`); navigation.replace('HandymanDashboard'); } catch (e: any) { Alert.alert(editing ? 'Profile update' : 'Application', e.message); } finally { setBusy(false); } };
  return <Screen edges={['left', 'right']}><Header title={editing ? 'Edit professional profile' : 'Join the Handyman Hub'} onBack={() => navigation.goBack()} /><ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30 }} keyboardShouldPersistTaps="handled">
    <View style={styles.notice}><Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} /><Text style={[styles.copy, { flex: 1 }]}>EraVenda reviews service profiles before they appear to customers. Job payouts happen through EraVenda after customer sign-off.</Text></View>
    <Text style={styles.label}>Profession</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 14 }}>{jobs.map((j) => <Pressable key={j} onPress={() => setJob(j)} style={[styles.filter, job === j && styles.filterOn]}><Text style={[styles.filterText, job === j && { color: colors.white }]}>{j}</Text></Pressable>)}</ScrollView>
    {job === 'Other' && <TextField label="Your profession" value={customJob} onChangeText={setCustomJob} placeholder="Enter your trade or service" maxLength={100} />}
    <TextField label="Professional name" value={name} onChangeText={setName} placeholder="Name customers will see" maxLength={150} />
    <TextField label="Company (optional)" value={company} onChangeText={setCompany} placeholder="Business name" maxLength={150} />
    <TextField label="Work experience" value={experience} onChangeText={setExperience} placeholder="Describe your experience and the work you do" multiline numberOfLines={4} style={{ minHeight: 90, textAlignVertical: 'top', paddingTop: 12 }} maxLength={5000} />
    <TextField label="Qualifications (optional)" value={qualifications} onChangeText={setQualifications} placeholder="Licenses, training and relevant skills" multiline numberOfLines={3} style={{ minHeight: 80, textAlignVertical: 'top', paddingTop: 12 }} maxLength={5000} />
    <TextField label="Education (optional)" value={education} onChangeText={setEducation} placeholder="Education or training" maxLength={5000} />
    {!user?.is_verified && <Text style={styles.noticeText}>Verify your email address before applying or updating your professional profile.</Text>}
    {!editing && <>
      <View style={styles.termsPanel}>
        <Text style={styles.termsTitle}>Handyman Hub Terms &amp; Conditions</Text>
        <Text style={styles.termsIntro}>Review these terms before submitting your professional profile.</Text>
        {professionalTerms.map(([title, body]) => <View key={title} style={styles.termsSection}><Text style={styles.termsHeading}>{title}</Text><Text style={styles.termsText}>{body}</Text></View>)}
      </View>
      <Pressable onPress={() => setTermsAccepted(!termsAccepted)} style={styles.consentRow} accessibilityRole="checkbox" accessibilityState={{ checked: termsAccepted }}><Ionicons name={termsAccepted ? 'checkbox' : 'square-outline'} size={22} color={colors.primary} /><Text style={styles.copy}>I have read and agree to these terms, including the 4% professional commission and my independent-contractor responsibilities.</Text></Pressable>
      <Pressable onPress={() => setPaymentsAccepted(!paymentsAccepted)} style={styles.consentRow} accessibilityRole="checkbox" accessibilityState={{ checked: paymentsAccepted }}><Ionicons name={paymentsAccepted ? 'checkbox' : 'square-outline'} size={22} color={colors.primary} /><Text style={styles.copy}>I agree that EraVenda-booked job payouts must stay within EraVenda and that off-platform payments are prohibited.</Text></Pressable>
      <Pressable onPress={() => void Linking.openURL(`${SITE_ORIGIN}/privacy`)}><Text style={styles.termsLink}>Read the EraVenda Privacy Policy</Text></Pressable>
    </>}
    <Button title={editing ? 'Save and submit for review' : 'Submit for review'} onPress={() => void submit()} loading={busy} disabled={!user?.is_verified || (!editing && (!termsAccepted || !paymentsAccepted))} style={{ marginTop: 16 }} />
  </ScrollView></Screen>;
}

function Badge({ label, tone }: { label: string; tone: 'green' | 'blue' }) { return <View style={[styles.badge, tone === 'green' ? styles.badgeGreen : styles.badgeBlue]}><Text style={[styles.badgeText, { color: tone === 'green' ? colors.primary : colors.infoText }]}>{label}</Text></View>; }
function InfoBlock({ title, body }: { title: string; body: string }) { return <View style={styles.infoBlock}><Text style={styles.label}>{title}</Text><Text style={styles.copy}>{body}</Text></View>; }
function EmptyState({ text, action, onPress }: { text: string; action?: string; onPress?: () => void }) { return <View style={styles.empty}><Ionicons name="construct-outline" size={42} color={colors.textMuted} /><Text style={styles.copy}>{text}</Text>{action && onPress ? <Button title={action} onPress={onPress} variant="outline" style={{ marginTop: 12, alignSelf: 'stretch' }} /> : null}</View>; }
function Stat({ label, value }: { label: string; value: string | number }) { return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.meta}>{label}</Text></View>; }

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.primaryButton, borderRadius: radius.lg, padding: 18, marginBottom: 16, ...shadow.card }, kicker: { color: '#C3E5D3', fontSize: 11, fontWeight: '800', letterSpacing: 1 }, heroTitle: { color: colors.white, fontSize: 24, fontWeight: '900', marginTop: 5 }, heroCopy: { color: '#E1F1E9', lineHeight: 19, marginTop: 8 }, heroLink: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }, heroLinkText: { color: colors.white, fontWeight: '800' },
  filter: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, filterOn: { backgroundColor: colors.primaryButton, borderColor: colors.primary }, filterText: { color: colors.text, fontSize: 12, fontWeight: '700' }, ratingsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }, ratingFilter: { borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 5, backgroundColor: colors.surface }, ratingFilterOn: { backgroundColor: colors.primarySoft }, ratingFilterText: { fontSize: 11, color: colors.textMuted, fontWeight: '700' },
  sectionTitle: { color: colors.text, fontSize: font.lg, fontWeight: '800', marginBottom: 8 }, workerCard: { borderRadius: radius.lg, backgroundColor: colors.surface, overflow: 'hidden', marginBottom: 14, ...shadow.card }, workerImage: { width: '100%', height: 178, backgroundColor: colors.primarySoft }, workerPlaceholder: { alignItems: 'center', justifyContent: 'center' }, workerBody: { padding: 14 }, badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, badge: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 4 }, badgeGreen: { backgroundColor: colors.primarySoft }, badgeBlue: { backgroundColor: colors.infoSurface }, badgeText: { fontSize: 10, fontWeight: '800' }, workerName: { fontSize: 19, fontWeight: '800', color: colors.text, marginTop: 9 }, trade: { color: colors.primary, fontWeight: '700', marginTop: 2 }, stars: { color: '#A86600', fontSize: 13, fontWeight: '800', marginTop: 7 }, meta: { color: colors.textMuted, fontSize: 12, marginTop: 4 }, copy: { color: colors.textMuted, lineHeight: 19, fontSize: 14, marginTop: 6 }, viewLink: { color: colors.primary, fontWeight: '800', marginTop: 10 },
  portfolioImage: { width: 320, height: 210, borderRadius: radius.lg, marginRight: 8, backgroundColor: colors.skeleton }, profileHero: { height: 210, borderRadius: radius.lg, marginBottom: 14 }, profileName: { fontSize: 24, fontWeight: '900', color: colors.text, marginTop: 8 }, infoBlock: { marginTop: 18, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border }, label: { color: colors.text, fontWeight: '800', marginBottom: 7 }, notice: { flexDirection: 'row', gap: 9, alignItems: 'flex-start', padding: 12, backgroundColor: colors.primarySoft, borderRadius: radius.md, marginTop: 12 }, noticeText: { color: colors.primary, fontSize: 13, fontWeight: '700', marginVertical: 8 }, optionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12 },
  bookingCard: { backgroundColor: colors.surface, borderRadius: radius.md, padding: 14, marginBottom: 12, ...shadow.card }, bookingTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, amount: { color: colors.primary, fontWeight: '800', marginTop: 8 }, statusCard: { backgroundColor: colors.primarySoft, borderRadius: radius.lg, padding: 16, marginBottom: 14 }, photoThumb: { width: 118, height: 118, borderRadius: radius.md, marginRight: 8, backgroundColor: colors.skeleton }, portfolioThumb: { width: 100, height: 100, borderRadius: radius.md, backgroundColor: colors.skeleton }, addPortfolio: { width: 100, height: 100, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }, inlineInput: { minHeight: 46, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: 12, marginVertical: 8, color: colors.text }, empty: { alignItems: 'center', padding: 28, gap: 8 }, consentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, paddingVertical: 8 }, termsPanel: { marginTop: 12, padding: 14, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }, termsTitle: { fontSize: 17, fontWeight: '900', color: colors.text }, termsIntro: { color: colors.textMuted, fontSize: 12, marginTop: 4, marginBottom: 8 }, termsSection: { marginTop: 10 }, termsHeading: { fontSize: 13, fontWeight: '800', color: colors.text }, termsText: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 3 }, termsLink: { color: colors.primary, fontSize: 12, fontWeight: '800', textDecorationLine: 'underline', marginTop: 6 }, reviewCard: { paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border }, statsRow: { flexDirection: 'row', gap: 10, marginBottom: 18 }, stat: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, padding: 14 }, statValue: { color: colors.primary, fontWeight: '900', fontSize: 18 }, workerInline: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: 14, borderRadius: radius.md, ...shadow.card },
});
