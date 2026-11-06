/**
 * REPORT A LISTING OR STORE: POST /reports { target_type, target_id, reason, details }.
 * Required by the app stores for apps with user-generated content. Admins get an email and review it at
 * /admin/reports.html. After reporting a product or store we offer to hide that store too.
 */
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { Header } from '../../components/Section';
import { TextField } from '../../components/TextField';
import { colors, font, radius } from '../../config/theme';
import { useBlocks } from '../../context/BlockContext';
import type { RootStackParamList } from '../../navigation/types';
import { moderationService } from '../../services/moderationService';
import type { ReportReason } from '../../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'Report'>;

const REASONS: { key: ReportReason; label: string; hint: string }[] = [
  { key: 'inappropriate', label: 'Offensive or inappropriate', hint: 'Abusive, hateful or sexually explicit content' },
  { key: 'prohibited_item', label: 'Illegal or prohibited item', hint: 'Something that should not be sold' },
  { key: 'counterfeit', label: 'Counterfeit or fake', hint: 'Pretends to be a genuine brand' },
  { key: 'scam', label: 'Scam or fraud', hint: 'Seems designed to cheat buyers' },
  { key: 'spam', label: 'Spam or misleading', hint: 'False description, duplicate or irrelevant listing' },
  { key: 'other', label: 'Something else', hint: 'Tell us more below' },
];

export function ReportScreen({ route, navigation }: Props) {
  const { targetType, targetId, title, storeId } = route.params;
  const { block, blockedIds } = useBlocks();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!reason) return Alert.alert('Choose a reason', 'Pick the option that fits best.');
    setBusy(true);
    try {
      const res = await moderationService.report({ target_type: targetType, target_id: targetId, reason, details: details.trim() || undefined });
      const thanks = res.already_reported ? 'You already reported this. Our team has it.' : 'Thank you. Our team will review your report.';
      const canBlock = !!storeId && !blockedIds.has(storeId);
      Alert.alert('Report sent', thanks, [
        { text: 'Done', style: 'cancel', onPress: () => navigation.goBack() },
        ...(canBlock
          ? [{
              text: 'Also hide this store',
              onPress: async () => {
                try { await block(storeId!, title); } catch { /* the report itself already went through */ }
                navigation.goBack();
              },
            }]
          : []),
      ]);
    } catch (e: any) {
      Alert.alert('Could not send report', e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Header title={targetType === 'store' ? 'Report store' : 'Report listing'} onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }} keyboardShouldPersistTaps="handled">
          <Text style={styles.about} numberOfLines={2}>{title}</Text>
          <Text style={styles.q}>What's wrong?</Text>
          {REASONS.map((r) => {
            const on = reason === r.key;
            return (
              <Pressable key={r.key} onPress={() => setReason(r.key)} style={[styles.option, on && styles.optionOn]} accessibilityRole="radio" accessibilityState={{ selected: on }}>
                <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={20} color={on ? colors.primary : colors.textMuted} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.optTitle}>{r.label}</Text>
                  <Text style={styles.optHint}>{r.hint}</Text>
                </View>
              </Pressable>
            );
          })}
          <TextField label="More details (optional)" value={details} onChangeText={setDetails} multiline maxLength={1000} style={{ minHeight: 90, textAlignVertical: 'top', paddingTop: 12 }} />
          <Button title="Send report" onPress={submit} loading={busy} disabled={!reason} />
          <Text style={styles.foot}>Reports are reviewed by the EraVenda team. We may contact the seller, remove the content or suspend the store.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  about: { color: colors.textMuted },
  q: { fontSize: font.lg, fontWeight: '800', color: colors.text },
  option: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  optionOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  optTitle: { fontWeight: '700', color: colors.text },
  optHint: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  foot: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
});
