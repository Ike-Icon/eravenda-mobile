import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { Header } from '../../components/Section';
import { TextField } from '../../components/TextField';
import { colors, radius } from '../../config/theme';
import type { RootStackParamList } from '../../navigation/types';
import { accountService } from '../../services/accountService';
import { GHANA_REGIONS } from '../../utils/ghana';

type Props = NativeStackScreenProps<RootStackParamList, 'AddressForm'>;

export function AddressFormScreen({ route, navigation }: Props) {
  const existing = route.params?.address;
  const [f, setF] = useState({
    label: existing?.label ?? '',
    recipient_name: existing?.recipient_name ?? '',
    phone: existing?.phone ?? '',
    region: existing?.region ?? '',
    city: existing?.city ?? '',
    area: existing?.area ?? '',
    sub_town: existing?.sub_town ?? '',
    landmark: existing?.landmark ?? '',
    is_default: existing?.is_default ?? false,
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (v: any) => setF((p) => ({ ...p, [k]: v }));

  const save = async () => {
    if (!f.recipient_name.trim() || !f.phone.trim() || !f.region || !f.city.trim()) {
      return setError('Name, phone, region and city are required.');
    }
    setBusy(true);
    setError(null);
    // Empty optional strings become null so the API stores them as missing.
    const body = {
      label: f.label.trim() || null,
      recipient_name: f.recipient_name.trim(),
      phone: f.phone.trim(),
      region: f.region,
      city: f.city.trim(),
      area: f.area.trim() || null,
      sub_town: f.sub_town.trim() || null,
      landmark: f.landmark.trim() || null,
      is_default: f.is_default,
    };
    try {
      if (existing) await accountService.updateAddress(existing.id, body);
      else await accountService.createAddress(body);
      navigation.goBack();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Header title={existing ? 'Edit address' : 'New address'} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <TextField label="Label (e.g. Home, Office)" value={f.label} onChangeText={set('label')} />
        <TextField label="Recipient name" value={f.recipient_name} onChangeText={set('recipient_name')} />
        <TextField label="Phone" value={f.phone} onChangeText={set('phone')} keyboardType="phone-pad" />
        <Text style={styles.label}>Region</Text>
        <View style={styles.chips}>
          {GHANA_REGIONS.map((r) => (
            <Pressable key={r} onPress={() => set('region')(r)} style={[styles.chip, f.region === r && styles.chipOn]}>
              <Text style={{ color: f.region === r ? colors.white : colors.text, fontSize: 13 }}>{r}</Text>
            </Pressable>
          ))}
        </View>
        <TextField label="City / Town" value={f.city} onChangeText={set('city')} />
        <TextField label="Area (optional)" value={f.area} onChangeText={set('area')} />
        <TextField label="Sub-town (optional)" value={f.sub_town} onChangeText={set('sub_town')} />
        <TextField label="Landmark (optional)" value={f.landmark} onChangeText={set('landmark')} />
        <View style={styles.switchRow}>
          <Text style={{ color: colors.text, fontWeight: '600' }}>Make this my default address</Text>
          <Switch value={f.is_default} onValueChange={set('is_default')} trackColor={{ true: colors.primary }} />
        </View>
        {!!error && <Text style={{ color: colors.danger, marginBottom: 12 }}>{error}</Text>}
        <Button title="Save address" onPress={save} loading={busy} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: colors.surface },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
});
