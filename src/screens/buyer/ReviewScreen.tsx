/**
 * RATE A PURCHASE: POST /reviews { product_id, order_item_id, rating 1-5, comment }.
 * The server accepts this only after the order is delivered, and sending it again edits your review.
 */
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { Header } from '../../components/Section';
import { TextField } from '../../components/TextField';
import { colors, font } from '../../config/theme';
import type { RootStackParamList } from '../../navigation/types';
import { accountService } from '../../services/accountService';

type Props = NativeStackScreenProps<RootStackParamList, 'Review'>;
const LABELS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

export function ReviewScreen({ route, navigation }: Props) {
  const { productId, orderItemId, productName } = route.params;
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (rating < 1) return Alert.alert('Rating', 'Tap a star to rate this product.');
    setBusy(true);
    try {
      await accountService.review({ product_id: productId, order_item_id: orderItemId, rating, comment: comment.trim() || undefined });
      Alert.alert('Thank you!', 'Your review was saved.');
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Could not save review', e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Header title="Rate product" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.name}>{productName}</Text>
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable key={n} onPress={() => setRating(n)} hitSlop={6} accessibilityLabel={`${n} star${n > 1 ? 's' : ''}`}>
              <Ionicons name={n <= rating ? 'star' : 'star-outline'} size={40} color={colors.accent} />
            </Pressable>
          ))}
        </View>
        <Text style={styles.label}>{LABELS[rating]}</Text>
        <TextField label="Comment (optional)" value={comment} onChangeText={setComment} multiline maxLength={3000} placeholder="What did you like or dislike?" style={{ minHeight: 110, textAlignVertical: 'top', paddingTop: 12 }} />
        <Button title="Submit review" onPress={submit} loading={busy} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  name: { fontSize: font.lg, fontWeight: '700', color: colors.text },
  stars: { flexDirection: 'row', gap: 8, marginVertical: 16 },
  label: { color: colors.textMuted, marginTop: -8, marginBottom: 14, minHeight: 20, fontWeight: '600' },
});
