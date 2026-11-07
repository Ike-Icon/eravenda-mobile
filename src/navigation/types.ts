import type { Address, Product, Store } from '../types/api';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Tabs: undefined;
  Products: { categoryId?: string | null; salesType?: 'retail' | 'wholesale' } | undefined;
  FollowedStores: undefined;
  Settings: undefined;
  DeliveryPartner: undefined;
  FooterInfo: undefined;
  ProductDetails: { productId: string };
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  // Buyer
  Checkout: undefined;
  OrderDetails: { orderId: string };
  Addresses: undefined;
  AddressForm: { address?: Address } | undefined;
  Wishlist: undefined;
  EditProfile: undefined;
  Notifications: undefined;
  DeleteAccount: undefined;
  Report: { targetType: 'product' | 'store'; targetId: string; title: string; storeId?: string };
  BlockedStores: undefined;
  Review: { productId: string; orderItemId: string; productName: string };
  Storefront: { storeId: string };
  Store: undefined;
  StoreForm: { store?: Store } | undefined;
  // Seller
  SellerProducts: undefined;
  SellerProductForm: { product?: Product } | undefined;
  SellerOrders: undefined;
  HandymanHub: { profession?: string } | undefined;
  HandymanProfile: { handymanId: string };
  ServiceRequest: { handymanId: string; professionalName: string };
  ServiceBookings: undefined;
  ServiceBookingDetail: { bookingId: string; professional?: boolean };
  HandymanDashboard: undefined;
  HandymanRegister: { edit?: boolean } | undefined;
};

export type TabParamList = {
  Home: { categoryId?: string | null; salesType?: 'retail' | 'wholesale' } | undefined;
  Cart: undefined;
  Orders: undefined;
  Account: undefined;
  Seller: undefined;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>;
