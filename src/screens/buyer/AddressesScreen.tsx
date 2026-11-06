import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { Header } from '../../components/Section';
import { colors, radius } from '../../config/theme';
import type { RootStackParamList } from '../../navigation/types';
import { accountService } from '../../services/accountService';
import type { Address } from '../../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'Addresses'>;

export function AddressesScreen({ navigation }: Props) {
  const [list, setList] = useState<Address[] | null>(null);

  // Reload every time the screen regains focus (e.g. returning from the form).
  useFocusEffect(
    useCallback(() => {
      accountService.addresses().then(setList).catch((e) => Alert.alert('Addresses', e.message));
    }, []),
  );

  const remove = (a: Address) =>
    Alert.alert('Delete address', `Delete "${a.label || a.recipient_name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await accountService.deleteAddress(a.id);
            setList((l) => l?.filter((x) => x.id !== a.id) ?? null);
          } catch (e: any) {
            Alert.alert('Could not delete', e.message);
          }
        },
      },
    ]);

  return (
    <Screen>
      <Header title="Saved addresses" onBack={() => navigation.goBack()} />
      {!list ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <FlatList
          data={list}
          keyExtractor={(a) => a.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          ListEmptyComponent={<Text style={styles.empty}>No saved addresses yet.</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.name}>
                {item.label || item.recipient_name} {item.is_default && <Text style={styles.def}>  Default</Text>}
              </Text>
              <Text style={styles.line}>{item.recipient_name} · {item.phone}</Text>
              <Text style={styles.line}>{[item.landmark, item.sub_town, item.area, item.city, item.region].filter(Boolean).join(', ')}</Text>
              <View style={styles.actions}>
                <Pressable onPress={() => navigation.navigate('AddressForm', { address: item })}><Text style={styles.link}>Edit</Text></Pressable>
                <Pressable onPress={() => remove(item)}><Text style={[styles.link, { color: colors.danger }]}>Delete</Text></Pressable>
              </View>
            </View>
          )}
        />
      )}
      <View style={{ padding: 16 }}>
        <Button title="Add new address" onPress={() => navigation.navigate('AddressForm')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14, gap: 3 },
  name: { fontWeight: '800', color: colors.text },
  def: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  line: { color: colors.textMuted },
  actions: { flexDirection: 'row', gap: 20, marginTop: 8 },
  link: { color: colors.primary, fontWeight: '700' },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 40 },
});
