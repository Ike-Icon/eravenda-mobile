/**
 * NAVIGATION MAP
 *   RootStack (native stack)
 *    ├─ Tabs ............ Home · Cart (badge) · Orders · [Seller] · Account
 *    ├─ ProductDetails .. pushed from Home / search suggestions / wishlist
 *    └─ Login · Register · ForgotPassword .. presented on demand
 * Browsing is public. Screens that need an account (cart, wishlist, add-to-cart) push Login
 * instead of blocking the whole app behind a login wall.
 * Phase 2 added Checkout, Orders, Addresses, Wishlist, Profile and the seller screens (Seller tab only for role 'seller').
 */
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer, DefaultTheme, DarkTheme, createNavigationContainerRef } from '@react-navigation/native';
import React, { useState } from 'react';
import { colors } from '../config/theme';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { usePreferences } from '../context/PreferencesContext';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { AccountScreen } from '../screens/buyer/AccountScreen';
import { CartScreen } from '../screens/buyer/CartScreen';
import { HomeScreen } from '../screens/buyer/HomeScreen';
import { ProductDetailsScreen } from '../screens/buyer/ProductDetailsScreen';
import { ProductsScreen } from '../screens/buyer/ProductsScreen';
import { FollowedStoresScreen } from '../screens/buyer/FollowedStoresScreen';
import { SettingsScreen } from '../screens/buyer/SettingsScreen';
import { FooterInfoScreen } from '../screens/buyer/FooterInfoScreen';
import { AddressesScreen } from '../screens/buyer/AddressesScreen';
import { AddressFormScreen } from '../screens/buyer/AddressFormScreen';
import { CheckoutScreen } from '../screens/buyer/CheckoutScreen';
import { BlockedStoresScreen } from '../screens/buyer/BlockedStoresScreen';
import { DeleteAccountScreen } from '../screens/buyer/DeleteAccountScreen';
import { EditProfileScreen } from '../screens/buyer/EditProfileScreen';
import { OrderDetailsScreen } from '../screens/buyer/OrderDetailsScreen';
import { OrdersScreen } from '../screens/buyer/OrdersScreen';
import { WishlistScreen } from '../screens/buyer/WishlistScreen';
import { NotificationsScreen } from '../screens/buyer/NotificationsScreen';
import { DeliveryPartnerScreen } from '../screens/buyer/DeliveryPartnerScreen';
import { ReportScreen } from '../screens/buyer/ReportScreen';
import { ReviewScreen } from '../screens/buyer/ReviewScreen';
import { ServiceBookingDetailScreen, HandymanDashboardScreen, HandymanHubScreen, HandymanProfileScreen, HandymanRegisterScreen, ServiceBookingsScreen, ServiceRequestScreen } from '../screens/services/HandymanScreens';
import { StorefrontScreen } from '../screens/buyer/StorefrontScreen';
import { StoreFormScreen } from '../screens/store/StoreFormScreen';
import { StoreScreen } from '../screens/store/StoreScreen';
import { SellerDashboardScreen } from '../screens/seller/SellerDashboardScreen';
import { SellerOrdersScreen } from '../screens/seller/SellerOrdersScreen';
import { SellerProductFormScreen } from '../screens/seller/SellerProductFormScreen';
import { SellerProductsScreen } from '../screens/seller/SellerProductsScreen';
import { AppHeader } from '../components/AppHeader';
import { LogoLoader } from '../components/LogoLoader';
import { usePushNotifications } from '../hooks/usePushNotifications';
import type { RootStackParamList, TabParamList } from './types';

/** Lets code outside screens (push notification taps) navigate. */
const navigationRef = createNavigationContainerRef<RootStackParamList>();

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const ICONS: Record<keyof TabParamList, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
  Home: ['home', 'home-outline'],
  Cart: ['cart', 'cart-outline'],
  Orders: ['receipt', 'receipt-outline'],
  Seller: ['storefront', 'storefront-outline'],
  Account: ['person', 'person-outline'],
};

function Tabs() {
  const { count } = useCart();
  const { user } = useAuth();
  const { isDark } = usePreferences();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        // RootStack owns the persistent top navigation across tabs and pushed pages.
        headerShown: false,
        animation: 'fade',
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        // Do not set a fixed height here: the navigator adds the bottom safe-area inset (home indicator) itself.
        tabBarStyle: { backgroundColor: isDark ? '#17221D' : colors.surface, borderTopColor: isDark ? '#2D3B34' : colors.border },
        tabBarIcon: ({ focused, color, size }) => <Ionicons name={ICONS[route.name][focused ? 0 : 1]} size={size} color={color} />,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Cart" component={CartScreen} options={{ tabBarBadge: count > 0 ? count : undefined, tabBarBadgeStyle: { backgroundColor: colors.accent } }} />
      <Tab.Screen name="Orders" component={OrdersScreen} />
      {/* The Seller tab only exists for accounts whose role is "seller" (set by an admin after store approval). */}
      {user?.role === 'seller' && <Tab.Screen name="Seller" component={SellerDashboardScreen} />}
      <Tab.Screen name="Account" component={AccountScreen} />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const { status } = useAuth();
  const { isDark } = usePreferences();
  const [navReady, setNavReady] = useState(false);
  usePushNotifications(status === 'signedIn', navigationRef, navReady);

  // Hold the UI until the stored token has been checked, so the Account tab doesn't flash "signed out".
  if (status === 'loading') {
    return (
      <LogoLoader label="Loading EraVenda…" />
    );
  }

  return (
    <NavigationContainer ref={navigationRef} onReady={() => setNavReady(true)} theme={{ ...(isDark ? DarkTheme : DefaultTheme), colors: { ...(isDark ? DarkTheme.colors : DefaultTheme.colors), background: isDark ? '#101714' : colors.background, card: isDark ? '#17221D' : colors.surface, border: isDark ? '#2D3B34' : colors.border, text: isDark ? '#F0F5F2' : colors.text, primary: colors.primary } }}>
      <Stack.Navigator screenOptions={{
        headerShown: true,
        header: () => <AppHeader />,
        animation: 'slide_from_right',
        animationDuration: 220,
      }}>
        <Stack.Screen name="Tabs" component={Tabs} />
        <Stack.Screen name="Products" component={ProductsScreen} />
        <Stack.Screen name="FollowedStores" component={FollowedStoresScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="DeliveryPartner" component={DeliveryPartnerScreen} />
        <Stack.Screen name="FooterInfo" component={FooterInfoScreen} />
        <Stack.Screen name="ProductDetails" component={ProductDetailsScreen} />
        <Stack.Screen name="Checkout" component={CheckoutScreen} />
        <Stack.Screen name="OrderDetails" component={OrderDetailsScreen} />
        <Stack.Screen name="Addresses" component={AddressesScreen} />
        <Stack.Screen name="AddressForm" component={AddressFormScreen} />
        <Stack.Screen name="Wishlist" component={WishlistScreen} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="DeleteAccount" component={DeleteAccountScreen} />
        <Stack.Screen name="Report" component={ReportScreen} />
        <Stack.Screen name="BlockedStores" component={BlockedStoresScreen} />
        <Stack.Screen name="Review" component={ReviewScreen} />
        <Stack.Screen name="HandymanHub" component={HandymanHubScreen} />
        <Stack.Screen name="HandymanProfile" component={HandymanProfileScreen} />
        <Stack.Screen name="ServiceRequest" component={ServiceRequestScreen} />
        <Stack.Screen name="ServiceBookings" component={ServiceBookingsScreen} />
        <Stack.Screen name="ServiceBookingDetail" component={ServiceBookingDetailScreen} />
        <Stack.Screen name="HandymanDashboard" component={HandymanDashboardScreen} />
        <Stack.Screen name="HandymanRegister" component={HandymanRegisterScreen} />
        <Stack.Screen name="Storefront" component={StorefrontScreen} />
        <Stack.Screen name="Store" component={StoreScreen} />
        <Stack.Screen name="StoreForm" component={StoreFormScreen} />
        <Stack.Screen name="SellerProducts" component={SellerProductsScreen} />
        <Stack.Screen name="SellerProductForm" component={SellerProductFormScreen} />
        <Stack.Screen name="SellerOrders" component={SellerOrdersScreen} />
        <Stack.Group screenOptions={{ presentation: 'modal', animation: 'slide_from_bottom' }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        </Stack.Group>
      </Stack.Navigator>
    </NavigationContainer>
  );
}
