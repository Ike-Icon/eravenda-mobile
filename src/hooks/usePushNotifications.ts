import type { NavigationContainerRefWithCurrent } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import type { RootStackParamList } from '../navigation/types';
import { registerForPush } from '../services/pushService';

/**
 * Registers this phone while signed in, and opens the order a notification is about when it is tapped
 * (including when the tap is what launched the app).
 * Notification data from the server: { type: 'order', audience: 'buyer' | 'seller', order_id }.
 */
export function usePushNotifications(
  signedIn: boolean,
  navRef: NavigationContainerRefWithCurrent<RootStackParamList>,
  navReady: boolean,
) {
  useEffect(() => {
    if (signedIn) void registerForPush();
  }, [signedIn]);

  const last = Notifications.useLastNotificationResponse();
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (!signedIn || !navReady || !last) return;
    const id = last.notification.request.identifier;
    if (handled.current === id) return; // each tap is handled once
    handled.current = id;

    const data = last.notification.request.content.data as { type?: string; audience?: string; order_id?: string } | undefined;
    if (data?.type !== 'order') return;
    if (data.audience === 'seller') navRef.navigate('SellerOrders');
    else if (data.order_id) navRef.navigate('OrderDetails', { orderId: data.order_id });
  }, [last, signedIn, navReady, navRef]);
}
