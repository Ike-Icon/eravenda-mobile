import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export type ThemeMode = 'light' | 'dark' | 'system';
export type CurrencyCode = 'GHS' | 'USD' | 'EUR' | 'GBP';
export type LanguageCode = 'en' | 'tw' | 'ee' | 'ha';
export type DensityMode = 'comfortable' | 'compact';

export interface AppPreferences {
  theme: ThemeMode;
  density: DensityMode;
  currency: CurrencyCode;
  language: LanguageCode;
}

const DEFAULTS: AppPreferences = { theme: 'system', density: 'comfortable', currency: 'GHS', language: 'en' };
const KEY = 'eravenda.preferences.v1';

interface PreferencesValue {
  preferences: AppPreferences;
  isDark: boolean;
  ready: boolean;
  updatePreference: <K extends keyof AppPreferences>(key: K, value: AppPreferences[K]) => Promise<void>;
}

const PreferencesContext = createContext<PreferencesValue | null>(null);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [preferences, setPreferences] = useState<AppPreferences>(DEFAULTS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    SecureStore.getItemAsync(KEY).then((raw) => {
      if (!active) return;
      try { if (raw) setPreferences({ ...DEFAULTS, ...JSON.parse(raw) }); } catch { /* use safe defaults */ }
      setReady(true);
    }).catch(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!ready) return;
    Appearance.setColorScheme(preferences.theme === 'system' ? 'auto' : preferences.theme);
  }, [preferences.theme, ready]);

  const updatePreference = useCallback(async <K extends keyof AppPreferences,>(key: K, value: AppPreferences[K]) => {
    const next = { ...preferences, [key]: value };
    setPreferences(next);
    await SecureStore.setItemAsync(KEY, JSON.stringify(next));
  }, [preferences]);

  const isDark = preferences.theme === 'dark' || (preferences.theme === 'system' && systemScheme === 'dark');
  const value = useMemo(() => ({ preferences, isDark, ready, updatePreference }), [preferences, isDark, ready, updatePreference]);
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error('usePreferences must be used inside <PreferencesProvider>');
  return context;
}
