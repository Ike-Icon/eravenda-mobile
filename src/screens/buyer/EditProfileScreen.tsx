import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Alert, ScrollView, Text } from 'react-native';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { Header } from '../../components/Section';
import { TextField } from '../../components/TextField';
import { colors } from '../../config/theme';
import { useAuth } from '../../context/AuthContext';
import type { RootStackParamList } from '../../navigation/types';
import { accountService } from '../../services/accountService';

type Props = NativeStackScreenProps<RootStackParamList, 'EditProfile'>;

export function EditProfileScreen({ navigation }: Props) {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState(user?.full_name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState(false);

  const saveProfile = async () => {
    setBusy(true);
    try {
      await accountService.updateProfile({ full_name: name.trim(), phone: phone.trim() });
      await refreshUser();
      Alert.alert('Saved', 'Your profile was updated.');
    } catch (e: any) { Alert.alert('Could not save', e.message); } finally { setBusy(false); }
  };

  const changePassword = async () => {
    if (next.length < 8) return Alert.alert('Password', 'New password must be at least 8 characters.');
    setBusy(true);
    try {
      await accountService.changePassword(current, next);
      setCurrent(''); setNext('');
      Alert.alert('Password changed');
    } catch (e: any) { Alert.alert('Could not change password', e.message); } finally { setBusy(false); }
  };

  return (
    <Screen>
      <Header title="Account settings" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <TextField label="Full name" value={name} onChangeText={setName} />
        <TextField label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Button title="Save profile" onPress={saveProfile} loading={busy} />
        <Text style={{ fontWeight: '800', color: colors.text, marginTop: 28, marginBottom: 12 }}>Change password</Text>
        <TextField label="Current password" value={current} onChangeText={setCurrent} secureTextEntry />
        <TextField label="New password" value={next} onChangeText={setNext} secureTextEntry />
        <Button title="Update password" variant="outline" onPress={changePassword} disabled={busy || !current || !next} />
      </ScrollView>
    </Screen>
  );
}
