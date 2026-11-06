import { Alert } from 'react-native';
import { accountService } from '../services/accountService';

/**
 * Some actions (checkout, opening a store) are blocked by the server until the email is confirmed.
 * If `message` is that error, offers a one-tap "Resend link" and returns true; otherwise returns false
 * so the caller can show its own error.
 */
export function promptResendIfUnverified(message: string): boolean {
  if (!/verify your email/i.test(message)) return false;
  Alert.alert('Confirm your email', message, [
    { text: 'Close', style: 'cancel' },
    {
      text: 'Resend link',
      onPress: () =>
        accountService
          .resendVerification()
          .then((r) => Alert.alert('Email sent', r.message))
          .catch((err) => Alert.alert('Could not resend', err.message)),
    },
  ]);
  return true;
}
