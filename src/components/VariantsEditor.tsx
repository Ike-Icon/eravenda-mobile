import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { colors, radius } from '../config/theme';
import type { ColorDraft, OptionDraft, SizeDraft, VariantDrafts } from '../utils/variants';
import { variantStockTotal } from '../utils/variants';

interface Props {
  value: VariantDrafts;
  onChange: (next: VariantDrafts) => void;
}

/**
 * Seller variant editor: colours (stock), sizes (stock) and priced options (price + stock).
 * Every row has an "available" switch; the server also treats stock 0 as unavailable.
 * State flow: this component is controlled. It edits copies of the drafts and calls onChange;
 * the parent form validates (validateDrafts) and converts to API shape (draftsToPayload) on save.
 */
export function VariantsEditor({ value, onChange }: Props) {
  const total = variantStockTotal(value);

  // Rows are plain objects of strings/booleans; a loose type keeps these three helpers simple.
  const patch = (kind: keyof VariantDrafts, i: number, change: Record<string, string | boolean>) =>
    onChange({ ...value, [kind]: (value[kind] as object[]).map((row, j) => (j === i ? { ...row, ...change } : row)) } as VariantDrafts);
  const add = (kind: keyof VariantDrafts, row: Record<string, string | boolean>) =>
    onChange({ ...value, [kind]: [...(value[kind] as object[]), row] } as VariantDrafts);
  const remove = (kind: keyof VariantDrafts, i: number) => onChange({ ...value, [kind]: (value[kind] as object[]).filter((_, j) => j !== i) } as VariantDrafts);

  const Field = ({ label, v, set, kb, flex = 1, placeholder }: { label: string; v: string; set: (t: string) => void; kb?: 'default' | 'number-pad' | 'decimal-pad'; flex?: number; placeholder?: string }) => (
    <View style={{ flex }}>
      <Text style={styles.mini}>{label}</Text>
      <TextInput value={v} onChangeText={set} keyboardType={kb ?? 'default'} placeholder={placeholder} placeholderTextColor={colors.textMuted} style={styles.input} autoCapitalize="none" accessibilityLabel={label} />
    </View>
  );

  const Avail = ({ on, set }: { on: boolean; set: (b: boolean) => void }) => (
    <View style={styles.avail}>
      <Text style={styles.mini}>Available</Text>
      <Switch value={on} onValueChange={set} trackColor={{ true: colors.primary }} />
    </View>
  );

  const Del = ({ onPress }: { onPress: () => void }) => (
    <Pressable onPress={onPress} hitSlop={10} style={styles.del} accessibilityLabel="Remove row">
      <Ionicons name="trash-outline" size={20} color={colors.danger} />
    </Pressable>
  );

  return (
    <View>
      <Text style={styles.title}>Variants</Text>
      <Text style={styles.help}>Optional. When you add sizes, colours or options, total stock is calculated from them.</Text>

      <Text style={styles.group}>Colours</Text>
      {value.colors.map((c: ColorDraft, i) => (
        <View key={`c${i}`} style={styles.row}>
          <View style={styles.line}>
            <Field label="Name" v={c.name} set={(t) => patch('colors', i, { name: t })} flex={2} placeholder="Black" />
            <Field label="Colour code" v={c.hex} set={(t) => patch('colors', i, { hex: t })} placeholder="#000000" />
          </View>
          <View style={styles.line}>
            <Field label="Stock" v={c.stock} set={(t) => patch('colors', i, { stock: t })} kb="number-pad" />
            <Avail on={c.available} set={(b) => patch('colors', i, { available: b })} />
            <Del onPress={() => remove('colors', i)} />
          </View>
        </View>
      ))}
      <Pressable style={styles.addBtn} onPress={() => add('colors', { name: '', hex: '', stock: '', available: true })}>
        <Ionicons name="add" size={18} color={colors.primary} /><Text style={styles.addText}>Add colour</Text>
      </Pressable>

      <Text style={styles.group}>Sizes</Text>
      {value.sizes.map((s: SizeDraft, i) => (
        <View key={`s${i}`} style={[styles.row, styles.line]}>
          <Field label="Size" v={s.label} set={(t) => patch('sizes', i, { label: t })} flex={2} placeholder="M, 42, XL…" />
          <Field label="Stock" v={s.stock} set={(t) => patch('sizes', i, { stock: t })} kb="number-pad" />
          <Avail on={s.available} set={(b) => patch('sizes', i, { available: b })} />
          <Del onPress={() => remove('sizes', i)} />
        </View>
      ))}
      <Pressable style={styles.addBtn} onPress={() => add('sizes', { label: '', stock: '', available: true })}>
        <Ionicons name="add" size={18} color={colors.primary} /><Text style={styles.addText}>Add size</Text>
      </Pressable>

      <Text style={styles.group}>Priced options (e.g. 250ml / 500ml)</Text>
      {value.options.map((o: OptionDraft, i) => (
        <View key={`o${i}`} style={styles.row}>
          <View style={styles.line}>
            <Field label="Label" v={o.label} set={(t) => patch('options', i, { label: t })} flex={2} placeholder="250ml" />
            <Field label="Stock" v={o.stock} set={(t) => patch('options', i, { stock: t })} kb="number-pad" />
          </View>
          <View style={styles.line}>
            <Field label="Price (GH₵)" v={o.price} set={(t) => patch('options', i, { price: t })} kb="decimal-pad" />
            <Field label="Discount (optional)" v={o.discount} set={(t) => patch('options', i, { discount: t })} kb="decimal-pad" />
          </View>
          <View style={styles.line}>
            <Avail on={o.available} set={(b) => patch('options', i, { available: b })} />
            <View style={{ flex: 1 }} />
            <Del onPress={() => remove('options', i)} />
          </View>
        </View>
      ))}
      <Pressable style={styles.addBtn} onPress={() => add('options', { label: '', price: '', discount: '', stock: '', available: true })}>
        <Ionicons name="add" size={18} color={colors.primary} /><Text style={styles.addText}>Add option</Text>
      </Pressable>

      {total !== null && <Text style={styles.total}>Total stock from variants: {total}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 17, fontWeight: '800', color: colors.text, marginTop: 8 },
  help: { color: colors.textMuted, fontSize: 13, marginTop: 2, marginBottom: 6 },
  group: { fontWeight: '700', color: colors.text, marginTop: 14, marginBottom: 6 },
  row: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 10, marginBottom: 8, gap: 8 },
  line: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  mini: { fontSize: 11, color: colors.textMuted, marginBottom: 3 },
  input: { minHeight: 40, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 10, color: colors.text, backgroundColor: colors.background },
  avail: { alignItems: 'center' },
  del: { padding: 8 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingVertical: 8 },
  addText: { color: colors.primary, fontWeight: '700' },
  total: { marginTop: 10, color: colors.primary, fontWeight: '700' },
});
