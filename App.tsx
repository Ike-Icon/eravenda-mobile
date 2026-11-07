import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { BlockProvider } from './src/context/BlockContext';
import { CartProvider } from './src/context/CartContext';
import { PreferencesProvider } from './src/context/PreferencesContext';
import { RootNavigator } from './src/navigation/RootNavigator';

/** Provider order matters: CartProvider and BlockProvider read auth status, so they sit inside AuthProvider. */
export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <PreferencesProvider>
          <CartProvider>
            <BlockProvider>
              <StatusBar style="auto" />
              <RootNavigator />
            </BlockProvider>
          </CartProvider>
        </PreferencesProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
