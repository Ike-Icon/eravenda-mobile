/**
 * ADD / EDIT PRODUCT
 * Add:  POST /products -> then, for each picked photo: upload to Cloudinary -> POST /products/{id}/images
 * Edit: PUT /products/{id} (only fields you changed matter; variants the product already has are untouched)
 * Variants (colours / sizes / priced options) are edited with <VariantsEditor>; when any exist the server
 * derives total stock from them, so the stock box becomes read-only.
 * Existing photos can be removed (DELETE /products/{id}/images/{imageId}). The first new photo
 * becomes the main image when the product has none.
 * Note: new or heavily edited products may return to "pending" review depending on admin rules.
 */
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Image } from 'expo-image';
import React, { useEffect, useState } from 'react';
import { Alert, Modal, FlatList, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { Header } from '../../components/Section';
import { TextField } from '../../components/TextField';
import { colors, radius } from '../../config/theme';
import type { RootStackParamList } from '../../navigation/types';
import { catalogService } from '../../services/catalogService';
import { sellerService, uploadToCloudinary } from '../../services/sellerService';
import type { Category, ProductImage, ProductInput } from '../../types/api';
import { VariantsEditor } from '../../components/VariantsEditor';
import { absoluteUrl } from '../../utils/format';
import { draftsFromProduct, draftsToPayload, validateDrafts, variantStockTotal } from '../../utils/variants';

type Props = NativeStackScreenProps<RootStackParamList, 'SellerProductForm'>;

/** Descriptions are sanitised HTML on the server (b, i, u, ul, ol, li, br, p). Show them as plain text with line breaks. */
function htmlToText(html?: string | null): string {
  if (!html) return '';
  return html.replace(/<li>/gi, '• ').replace(/<br\s*\/?>|<\/p>|<\/li>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\n{3,}/g, '\n\n').trim();
}

export function SellerProductFormScreen({ route, navigation }: Props) {
  const editing = route.params?.product;
  const [f, setF] = useState({
    name: editing?.name ?? '',
    brand: editing?.brand ?? '',
    description: htmlToText(editing?.description),
    price: editing ? String(editing.price) : '',
    discount: editing?.discount_price ? String(editing.discount_price) : '',
    stock: editing ? String(editing.stock_quantity) : '',
    category_id: editing?.category_id ?? '',
    cod: editing?.cod_eligible ?? true,
    sales_type: (editing?.sales_type ?? 'retail') as 'retail' | 'wholesale',
    min_qty: editing?.wholesale_min_quantity ? String(editing.wholesale_min_quantity) : '',
  });
  const [variants, setVariants] = useState(() => draftsFromProduct(editing));
  const [cats, setCats] = useState<Category[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [existing, setExisting] = useState<ProductImage[]>(editing?.images ?? []);
  const [newPhotos, setNewPhotos] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (v: any) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => { catalogService.categories().then(setCats).catch(() => undefined); }, []);
  const variantStock = variantStockTotal(variants); // null when there are no variants
  const catName = cats.find((c) => c.id === f.category_id)?.name;

  const pick = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert('Permission needed', 'Allow photo access to add product pictures.');
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: 6, quality: 0.8 });
    if (!res.canceled) setNewPhotos((p) => [...p, ...res.assets].slice(0, 6));
  };

  const removeExisting = async (img: ProductImage) => {
    try { await sellerService.removeImage(editing!.id, img.id); setExisting((l) => l.filter((x) => x.id !== img.id)); }
    catch (e: any) { Alert.alert('Could not remove photo', e.message); }
  };

  const save = async () => {
    const price = parseFloat(f.price);
    const stock = variantStock ?? parseInt(f.stock || '0', 10);
    const discount = f.discount ? parseFloat(f.discount) : null;
    if (f.name.trim().length < 2) return Alert.alert('Name', 'Enter a product name.');
    if (!f.category_id) return Alert.alert('Category', 'Choose a category.');
    if (!(price > 0)) return Alert.alert('Price', 'Enter a valid price.');
    if (discount !== null && !(discount < price)) return Alert.alert('Discount', 'Discount price must be lower than the price.');
    if (!(stock >= 0)) return Alert.alert('Stock', 'Enter a valid stock quantity.');

    // Wholesale needs a whole-number minimum of at least 2 (same rule as the server).
    const minQty = parseInt(f.min_qty, 10);
    if (f.sales_type === 'wholesale' && !(minQty >= 2 && /^\d+$/.test(f.min_qty.trim()))) return Alert.alert('Minimum quantity', 'Wholesale products need a minimum order quantity of 2 or more.');
    const variantError = validateDrafts(variants);
    if (variantError) return Alert.alert('Variants', variantError);

    setBusy(true);
    try {
      const v = draftsToPayload(variants);
      const body: ProductInput = {
        name: f.name.trim(),
        brand: f.brand.trim() || undefined,
        category_id: f.category_id,
        price,
        discount_price: discount,
        stock_quantity: stock,
        cod_eligible: f.cod,
        sales_type: f.sales_type,
        // Retail products never keep a minimum; the server clears it too.
        wholesale_min_quantity: f.sales_type === 'wholesale' ? minQty : null,
        // Editing always sends all three lists so deleting the last variant really clears it.
        // Creating only sends lists that have rows.
        ...(editing || v.colors.length ? { colors: v.colors } : {}),
        ...(editing || v.sizes.length ? { sizes: v.sizes } : {}),
        ...(editing || v.options.length ? { options: v.options } : {}),
      };
      // The app shows descriptions as plain text. Only send one if the seller changed it, so a description
      // formatted on the website (bold, bullet lists) is not flattened by an unrelated edit.
      if (!editing || f.description.trim() !== htmlToText(editing.description).trim()) body.description = f.description.trim() || undefined;
      const product = editing ? await sellerService.update(editing.id, body) : await sellerService.create(body as Parameters<typeof sellerService.create>[0]);

      // Upload photos one by one so a failure reports clearly and the product itself is already saved.
      let failed = 0;
      let hasPrimary = existing.some((i) => i.is_primary);
      for (const asset of newPhotos) {
        try {
          const url = await uploadToCloudinary(asset);
          await sellerService.addImage(product.id, url, !hasPrimary);
          hasPrimary = true;
        } catch { failed += 1; }
      }
      if (failed) Alert.alert('Saved, but…', `${failed} photo${failed > 1 ? 's' : ''} could not be uploaded. Open the product and add them again.`);
      else if (!editing) Alert.alert('Product submitted', 'It will appear in the shop once an admin approves it.');
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Could not save product', e.message);
    } finally { setBusy(false); }
  };

  return (
    <Screen>
      <Header title={editing ? 'Edit product' : 'Add product'} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Photos</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
          {existing.map((img) => (
            <View key={img.id} style={styles.photoWrap}>
              <Image source={{ uri: absoluteUrl(img.image_url) }} style={styles.photo} contentFit="cover" />
              <Pressable style={styles.x} onPress={() => removeExisting(img)}><Ionicons name="close" size={14} color={colors.white} /></Pressable>
            </View>
          ))}
          {newPhotos.map((a, i) => (
            <View key={a.uri} style={styles.photoWrap}>
              <Image source={{ uri: a.uri }} style={styles.photo} contentFit="cover" />
              <Pressable style={styles.x} onPress={() => setNewPhotos((l) => l.filter((_, j) => j !== i))}><Ionicons name="close" size={14} color={colors.white} /></Pressable>
            </View>
          ))}
          <Pressable style={[styles.photo, styles.add]} onPress={pick}><Ionicons name="camera-outline" size={26} color={colors.primary} /></Pressable>
        </ScrollView>

        <TextField label="Product name" value={f.name} onChangeText={set('name')} />
        <Text style={styles.label}>Category</Text>
        <Pressable style={styles.select} onPress={() => setPickerOpen(true)}>
          <Text style={{ color: catName ? colors.text : colors.textMuted }}>{catName ?? 'Choose a category'}</Text>
          <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
        </Pressable>
        <TextField label="Brand (optional)" value={f.brand} onChangeText={set('brand')} />
        <TextField label="Description" value={f.description} onChangeText={set('description')} multiline numberOfLines={4} style={{ minHeight: 100, textAlignVertical: 'top', paddingTop: 12 }} />
        <Text style={styles.label}>Sales type</Text>
        <View style={styles.seg}>
          {(['retail', 'wholesale'] as const).map((t) => (
            <Pressable key={t} onPress={() => set('sales_type')(t)} style={[styles.segBtn, f.sales_type === t && styles.segOn]}>
              <Text style={{ fontWeight: '700', color: f.sales_type === t ? colors.white : colors.text }}>{t === 'retail' ? 'Retail' : 'Wholesale'}</Text>
            </Pressable>
          ))}
        </View>
        {f.sales_type === 'wholesale' && (
          <TextField label="Minimum order quantity (2 or more)" value={f.min_qty} onChangeText={set('min_qty')} keyboardType="number-pad" />
        )}
        <TextField label={f.sales_type === 'wholesale' ? 'Price per unit (GH₵)' : 'Price (GH₵)'} value={f.price} onChangeText={set('price')} keyboardType="decimal-pad" />
        <TextField label="Discount price (optional)" value={f.discount} onChangeText={set('discount')} keyboardType="decimal-pad" />
        <TextField
          label={variantStock !== null ? 'Stock (calculated from variants)' : 'Stock quantity'}
          value={variantStock !== null ? String(variantStock) : f.stock}
          onChangeText={set('stock')}
          keyboardType="number-pad"
          editable={variantStock === null}
          style={variantStock !== null ? { backgroundColor: colors.background, color: colors.textMuted } : undefined}
        />
        <View style={styles.switchRow}>
          <Text style={{ fontWeight: '600', color: colors.text }}>Allow pay on delivery</Text>
          <Switch value={f.cod} onValueChange={set('cod')} trackColor={{ true: colors.primary }} />
        </View>
        <VariantsEditor value={variants} onChange={setVariants} />
        <View style={{ height: 16 }} />
        <Button title={editing ? 'Save changes' : 'Submit product'} onPress={save} loading={busy} />
      </ScrollView>

      <Modal visible={pickerOpen} animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <Screen>
          <Header title="Choose category" onBack={() => setPickerOpen(false)} />
          <FlatList
            data={cats}
            keyExtractor={(c) => c.id}
            renderItem={({ item }) => (
              <Pressable style={styles.catRow} onPress={() => { set('category_id')(item.id); setPickerOpen(false); }}>
                <Text style={{ color: colors.text, paddingLeft: item.parent_id ? 16 : 0, fontWeight: item.parent_id ? '400' : '700' }}>{item.name}</Text>
                {item.id === f.category_id && <Ionicons name="checkmark" size={18} color={colors.primary} />}
              </Pressable>
            )}
          />
        </Screen>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 },
  seg: { flexDirection: 'row', backgroundColor: colors.border, borderRadius: 999, padding: 3, marginBottom: 14 },
  segBtn: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 999 },
  segOn: { backgroundColor: colors.primary },
  photoWrap: { marginRight: 10 },
  photo: { width: 84, height: 84, borderRadius: radius.md, backgroundColor: colors.skeleton },
  add: { alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primary, backgroundColor: colors.primarySoft },
  x: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 10, padding: 3 },
  select: { minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, marginBottom: 14 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  catRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
});
