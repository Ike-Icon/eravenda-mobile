/**
 * PUSH NOTIFICATIONS (client side)
 *  sign in  -> ask permission -> get an Expo push token -> POST /devices      (registerForPush)
 *  server   -> sends a push through Expo when an order is placed / paid / changes status
 *  tap      -> usePushNotifications opens the right order screen
 *  sign out -> POST /devices/unregister so a shared phone stops getting the old user's pushes
 *
 * Requirements: a real device, and an EAS project id in app.json (extra.eas.projectId; run `eas init`).
 * Android remote push does not work inside Expo Go from SDK 53: use a development build (`eas build --profile development`).
 */
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { request } from './http';

// Show notifications that arrive while the app is open.
// Newer expo-notifications versions split "alert" into banner + list; sending both keeps every version happy.
Notifications.setNotificationHandler({
  handleNotification: async () =>
    ({ shouldShowAlert: true, shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }) as Notifications.NotificationBehavior,
});

let currentToken: string | null = null;

export async function registerForPush(): Promise<string | null> {
  try {
    if (!Device.isDevice) return null; // simulators cannot receive push tokens

    if (Platform.OS === 'android') {
      // The server sends with channelId "orders".
      await Notifications.setNotificationChannelAsync('orders', {
        name: 'Orders',
        importance: Notifications.AndroidImportance.HIGH,
        lightColor: '#0F5C3F',
      });
    }

    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== 'granted') return null;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) {
      console.warn('Push disabled: set extra.eas.projectId in app.json (run `eas init`).');
      return null;
    }

    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    await request('/devices', { method: 'POST', json: { token, platform: Platform.OS } });
    currentToken = token;
    return token;
  } catch (e) {
    // Push is a convenience: never block sign-in or crash the app because it failed.
    console.warn('Push registration failed', e);
    return null;
  }
}

/** Safe to call twice (a 401 during sign-out can re-enter): the token is cleared before the request. */
export async function unregisterFromPush(): Promise<void> {
  const token = currentToken;
  currentToken = null;
  if (!token) return;
  try {
    await request('/devices/unregister', { method: 'POST', json: { token } });
  } catch {
    /* already signed out or offline: the server also drops dead tokens by itself */
  }
}
