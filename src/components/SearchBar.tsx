import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, font, radius, shadow } from '../config/theme';
import { useBlocks } from '../context/BlockContext';
import { usePreferences } from '../context/PreferencesContext';
import { catalogService } from '../services/catalogService';
import type { Product } from '../types/api';
import { useDebounce } from '../hooks/useDebounce';
import { effectivePrice, formatPrice } from '../utils/format';

interface Props {
  /** Called when the user presses the keyboard "search" key or clears the box. */
  onSubmit: (query: string) => void;
  onPickSuggestion: (product: Product) => void;
}

/**
 * Search box with autocomplete.
 * Flow: typing -> debounced 300ms -> GET /products?q=...&page_size=5 -> dropdown.
 * Older in-flight requests are aborted so a slow response can't overwrite a newer one.
 */
export function SearchBar({ onSubmit, onPickSuggestion }: Props) {
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const debounced = useDebounce(text.trim(), 300);
  const { blockedIds } = useBlocks();
  const { isDark } = usePreferences();

  useEffect(() => {
    if (debounced.length < 2) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    catalogService
      .products({ q: debounced, page_size: 5 }, controller.signal)
      .then((res) => setSuggestions(res.items.filter((p) => !blockedIds.has(p.store_id))))
      .catch(() => undefined); // autocomplete is best-effort; ignore failures and aborts
    return () => controller.abort();
  }, [debounced, blockedIds]);

  const submit = () => {
    setOpen(false);
    onSubmit(text.trim());
  };

  return (
    <View style={{ zIndex: 10 }}>
      <View style={[styles.box, isDark && styles.boxDark]}>
        <Ionicons name="search" size={20} color={isDark ? '#A4B3AA' : colors.textMuted} />
        <TextInput
          value={text}
          onChangeText={(t) => {
            setText(t);
            setOpen(true);
            if (!t) onSubmit(''); // clearing the box restores the normal feed
          }}
          onSubmitEditing={submit}
          returnKeyType="search"
          placeholder="Search products, brands…"
          placeholderTextColor={isDark ? '#A4B3AA' : colors.textMuted}
          style={[styles.input, isDark && styles.inputDark]}
          accessibilityLabel="Search products"
        />
        {!!text && (
          <Pressable
            onPress={() => {
              setText('');
              setOpen(false);
              onSubmit('');
            }}
            hitSlop={10}
            accessibilityLabel="Clear search"
          >
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      {open && suggestions.length > 0 && (
        <View style={[styles.dropdown, isDark && styles.dropdownDark]}>
          {suggestions.map((p) => (
            <Pressable
              key={p.id}
              style={[styles.row, isDark && styles.rowDark]}
              onPress={() => {
                setOpen(false);
                onPickSuggestion(p);
              }}
            >
              <Text numberOfLines={1} style={[styles.rowName, isDark && styles.rowNameDark]}>
                {p.name}
              </Text>
              <Text style={styles.rowPrice}>{formatPrice(effectivePrice(p))}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface, borderRadius: radius.pill, paddingHorizontal: 14, minHeight: 46, borderWidth: 1, borderColor: colors.border },
  boxDark: { backgroundColor: '#17221D', borderColor: '#34463B' },
  input: { flex: 1, fontSize: font.md, color: colors.text, paddingVertical: 8 },
  inputDark: { color: '#F0F5F2' },
  dropdown: { position: 'absolute', top: 52, left: 0, right: 0, backgroundColor: colors.surface, borderRadius: radius.md, ...shadow.card, shadowOpacity: 0.15, elevation: 6, overflow: 'hidden' },
  dropdownDark: { backgroundColor: '#17221D' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, gap: 12 },
  rowDark: { borderBottomColor: '#2D3B34' },
  rowName: { flex: 1, color: colors.text, fontSize: font.sm },
  rowNameDark: { color: '#F0F5F2' },
  rowPrice: { color: colors.primary, fontWeight: '700', fontSize: font.sm },
});
