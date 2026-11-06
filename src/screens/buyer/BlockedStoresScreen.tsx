import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { Header } from '../../components/Section';
import { colors, radius } from '../../config/theme';
import { useBlocks } from '../../context/BlockContext';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'BlockedStores'>;

/** Stores the buyer has hidden. Unblocking brings their products back into Home and search. */
export function BlockedStoresScreen({ navigation }: Props) {
  const { blocked, unblock, refresh } = useBlocks();
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => { void refresh().catch(() => undefined); }, [refresh]);

  const undo = async (id: string) => {
    setBusy(id);
    try { await unblock(id); } catch (e: any) { Alert.alert('Could not unblock', e.message); } finally { setBusy(null); }
  };

  return (
    <Screen>
      <Header title="Blocked stores" onBack={() => navigation.goBack()} />
      <FlatList
        data={blocked}
        keyExtractor={(b) => b.store_id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        ListEmptyComponent={<Text style={styles.empty}>You haven't blocked any stores. You can hide a store from its page.</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.name} numberOfLines={1}>{item.store_name}</Text>
            <Pressable onPress={() => undo(item.store_id)} disabled={busy === item.store_id} hitSlop={8}>
              <Text style={[styles.link, busy === item.store_id && { opacity: 0.5 }]}>Unblock</Text>
            </Pressable>
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 40, lineHeight: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, padding: 14 },
  name: { flex: 1, fontWeight: '700', color: colors.text, marginRight: 12 },
  link: { color: colors.primary, fontWeight: '800' },
});
