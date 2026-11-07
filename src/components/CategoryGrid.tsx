import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../config/theme';
import { usePreferences } from '../context/PreferencesContext';
import type { Category } from '../types/api';
import { absoluteUrl } from '../utils/format';
import { CategoryIcon } from './CategoryRail';

export function CategoryGrid({ categories, selectedId, onSelect }: { categories: Category[] | null; selectedId: string | null; onSelect: (id: string | null) => void }) {
  const { isDark } = usePreferences();
  const [expanded, setExpanded] = useState(false);
  const items = useMemo(() => {
    if (!categories) return [];
    const roots = categories.filter((c) => !c.parent_id);
    const byParent = new Map<string, Category[]>();
    categories.filter((c) => c.parent_id).forEach((c) => byParent.set(c.parent_id!, [...(byParent.get(c.parent_id!) ?? []), c]));
    return roots.flatMap((c) => [c, ...(byParent.get(c.id) ?? [])]);
  }, [categories]);
  const shown = expanded ? items : items.slice(0, 12);
  return <View style={[styles.panel, isDark && styles.panelDark]}>
    <View style={styles.grid}>
      {shown.map((item) => <Pressable key={item.id} onPress={() => onSelect(selectedId === item.id ? null : item.id)} style={styles.tile} accessibilityRole="button" accessibilityLabel={`Shop ${item.name}`} accessibilityState={{ selected: selectedId === item.id }}>
        <View style={[styles.circle, isDark && styles.circleDark, selectedId === item.id && styles.circleSelected]}><CategoryIcon uri={absoluteUrl(item.icon_url)} slug={item.slug} /></View>
        <Text numberOfLines={2} style={[styles.name, isDark && styles.nameDark, selectedId === item.id && styles.nameSelected]}>{item.name}</Text>
      </Pressable>)}
    </View>
    {items.length > 12 && <Pressable style={styles.expand} onPress={() => setExpanded((v) => !v)} accessibilityRole="button" accessibilityState={{ expanded }}>
      <Text style={styles.expandLabel}>{expanded ? 'Show fewer categories' : `Show all ${items.length} categories`}</Text>
      <Text style={styles.chevron}>{expanded ? '⌃' : '⌄'}</Text>
    </Pressable>}
  </View>;
}

const styles = StyleSheet.create({
  panel: { marginHorizontal: 14, marginTop: 8, marginBottom: 12, padding: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg },
  panelDark: { backgroundColor: '#17221D', borderColor: '#2D3B34' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  tile: { width: '25%', alignItems: 'center', paddingHorizontal: 2, paddingVertical: 8 },
  circle: { width: 62, height: 62, borderRadius: 31, backgroundColor: colors.primarySoft, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent' },
  circleDark: { backgroundColor: '#26352E' },
  circleSelected: { borderColor: colors.primary },
  name: { color: colors.text, fontSize: 11, fontWeight: '600', textAlign: 'center', lineHeight: 14, marginTop: 6, minHeight: 28 },
  nameDark: { color: '#E7F0EA' },
  nameSelected: { color: colors.primary, fontWeight: '800' },
  expand: { minHeight: 38, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, marginTop: 4 },
  expandLabel: { color: colors.primary, fontSize: 12, fontWeight: '800' }, chevron: { color: colors.primary, fontSize: 18, fontWeight: '800' },
});
