import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, font, radius } from '../config/theme';
import { usePreferences } from '../context/PreferencesContext';

interface Props {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  icon?: keyof typeof Ionicons.glyphMap;
}

/** Reusable button. 48pt minimum height keeps it comfortably tappable. */
export function Button({ title, onPress, variant = 'primary', loading, disabled, style, icon }: Props) {
  const { isDark } = usePreferences();
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive }}
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'outline' && styles.outline,
        variant === 'ghost' && styles.ghost,
        isDark && variant === 'outline' && styles.outlineDark,
        isDark && variant === 'ghost' && styles.ghostDark,
        inactive && styles.inactive,
        pressed && { opacity: 0.85 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.white : colors.primary} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={18} color={variant === 'primary' ? colors.white : colors.primary} />}
          <Text style={[styles.label, variant !== 'primary' && { color: colors.primary }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, flexDirection: 'row', gap: 7 },
  primary: { backgroundColor: colors.primaryButton },
  outline: { borderWidth: 1.5, borderColor: colors.primary, backgroundColor: colors.surface },
  outlineDark: { backgroundColor: '#17221D' },
  ghost: { backgroundColor: 'transparent' },
  ghostDark: { backgroundColor: '#17221D' },
  inactive: { opacity: 0.5 },
  label: { color: colors.white, fontSize: font.md, fontWeight: '700' },
});
