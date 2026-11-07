/**
 * OPEN / EDIT STORE
 * Create: POST /stores (pending until an admin approves; the server limits this to 5 attempts an hour).
 * Edit:   PUT /stores/me, with optional logo and banner photos uploaded to Cloudinary first.
 */
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { Header } from '../../components/Section';
import { TextField } from '../../components/TextField';
import { colors, radius } from '../../config/theme';
import type { RootStackParamList } from '../../navigation/types';
import { sellerService, uploadToCloudinary } from '../../services/sellerService';
import type { StoreInput } from '../../types/api';
import { absoluteUrl } from '../../utils/format';
import { GHANA_REGIONS } from '../../utils/ghana';
import { promptResendIfUnverified } from '../../utils/verifyPrompt';

type Props = NativeStackScreenProps<RootStackParamList, 'StoreForm'>;

export function StoreFormScreen({ route, navigation }: Props) {
  const editing = route.params?.store;
  const [f, setF] = useState({
    store_name: editing?.store_name ?? '',
    description: editing?.description ?? '',
    region: editing?.region ?? '',
    city: editing?.city ?? '',
    sub_town: editing?.sub_town ?? '',
    reg: '',
  });
  const [logo, setLogo] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [banner, setBanner] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  const pick = async (which: 'logo' | 'banner') => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert('Permission needed', 'Allow photo access to choose a picture.');
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: which === 'logo' ? [1, 1] : [16, 5], quality: 0.8 });
    if (res.canceled) return;
    (which === 'logo' ? setLogo : setBanner)(res.assets[0]);
  };

  const save = async () => {
    if (f.store_name.trim().length < 2) return Alert.alert('Store name', 'Enter a store name (at least 2 characters).');
    if (!f.region || !f.city.trim()) return Alert.alert('Location', 'Choose your region and enter your city or town.');
    setBusy(true);
    try {
      const body: StoreInput = {
        store_name: f.store_name.trim(),
        description: f.description.trim() || null,
        region: f.region,
        city: f.city.trim(),
        sub_town: f.sub_town.trim() || null,
      };
      if (f.reg.trim()) body.business_registration_number = f.reg.trim();
      // Upload images first so a failed upload doesn't leave a half-updated store.
      if (logo) body.logo_url = await uploadToCloudinary(logo);
      if (banner) body.banner_url = await uploadToCloudinary(banner);

      if (editing) await sellerService.updateStore(body);
      else await sellerService.createStore(body as StoreInput & { store_name: string });
      Alert.alert(editing ? 'Store updated' : 'Application sent', editing ? 'Your changes were saved.' : 'We will review your store and email you when it is approved.');
      navigation.goBack();
    } catch (e: any) {
      if (!promptResendIfUnverified(e.message)) Alert.alert('Could not save store', e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Header title={editing ? 'Edit store' : 'Open a store'} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        {editing && (
          <>
            <Text style={styles.label}>Banner</Text>
            <Pressable onPress={() => pick('banner')} style={[styles.banner, styles.pick]}>
              {banner || editing.banner_url ? <Image source={{ uri: banner?.uri ?? absoluteUrl(editing.banner_url) }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Ionicons name="image-outline" size={26} color={colors.primary} />}
            </Pressable>
            <Text style={styles.label}>Logo</Text>
            <Pressable onPress={() => pick('logo')} style={[styles.logo, styles.pick]}>
              {logo || editing.logo_url ? <Image source={{ uri: logo?.uri ?? absoluteUrl(editing.logo_url) }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Ionicons name="camera-outline" size={26} color={colors.primary} />}
            </Pressable>
          </>
        )}
        <TextField label="Store name" value={f.store_name} onChangeText={set('store_name')} />
        <TextField label="About your store (optional)" value={f.description} onChangeText={set('description')} multiline style={{ minHeight: 90, textAlignVertical: 'top', paddingTop: 12 }} />
        <Text style={styles.label}>Region</Text>
        <View style={styles.chips}>
          {GHANA_REGIONS.map((r) => (
            <Pressable key={r} onPress={() => set('region')(r)} style={[styles.chip, f.region === r && styles.chipOn]}>
              <Text style={{ color: f.region === r ? colors.white : colors.text, fontSize: 13 }}>{r}</Text>
            </Pressable>
          ))}
        </View>
        <TextField label="City / Town" value={f.city} onChangeText={set('city')} />
        <TextField label="Sub-town (optional)" value={f.sub_town} onChangeText={set('sub_town')} />
        <TextField label="Business registration number (optional)" value={f.reg} onChangeText={set('reg')} autoCapitalize="characters" />
        <Button title={editing ? 'Save changes' : 'Submit application'} onPress={save} loading={busy} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 },
  pick: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primary, backgroundColor: colors.primarySoft, marginBottom: 14 },
  banner: { width: '100%', height: 100, borderRadius: radius.md },
  logo: { width: 84, height: 84, borderRadius: 42 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: colors.surface },
  chipOn: { backgroundColor: colors.primaryButton, borderColor: colors.primary },
});
