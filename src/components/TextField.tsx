import React from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { colors, font, radius } from '../config/theme';
import { usePreferences } from '../context/PreferencesContext';

interface Props extends TextInputProps {
  label: string;
  error?: string | null;
}

export function TextField({ label, error, style, ...input }: Props) {
  const { isDark } = usePreferences();
  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, isDark && styles.labelDark]}>{label}</Text>
      <TextInput
        placeholderTextColor={isDark ? '#A4B3AA' : colors.textMuted}
        style={[styles.input, isDark && styles.inputDark, !!error && { borderColor: colors.danger }, style]}
        accessibilityLabel={label}
        {...input}
      />
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: { fontSize: font.sm, fontWeight: '600', color: colors.text, marginBottom: 6 },
  labelDark: { color: '#E7F0EA' },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    fontSize: font.md,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  inputDark: { borderColor: '#34463B', color: '#F0F5F2', backgroundColor: '#17221D' },
  error: { color: colors.danger, fontSize: font.sm, marginTop: 4 },
});
