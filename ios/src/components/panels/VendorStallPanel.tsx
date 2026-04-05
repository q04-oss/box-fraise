import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { usePanel } from '../../context/PanelContext';
import {
  addStallProduct,
  createVendorStall,
  deleteStallProduct,
  fetchMyVendorStalls,
  fetchUpcomingMarkets,
} from '../../lib/api';
import { fonts, SPACING, useColors } from '../../theme';

function fmtCAD(cents: number) {
  return `CA$${(cents / 100).toLocaleString('en-CA', { minimumFractionDigits: 2 })}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' });
}

type Screen = 'list' | 'create-stall' | 'add-product';

export default function VendorStallPanel() {
  const { goBack } = usePanel();
  const c = useColors();

  const [stalls, setStalls] = useState<any[]>([]);
  const [upcomingMarkets, setUpcomingMarkets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState<Screen>('list');
  const [submitting, setSubmitting] = useState(false);

  // Create stall form
  const [selectedMarketId, setSelectedMarketId] = useState<number | null>(null);
  const [vendorName, setVendorName] = useState('');
  const [stallDescription, setStallDescription] = useState('');

  // Add product form
  const [activeStallId, setActiveStallId] = useState<number | null>(null);
  const [productName, setProductName] = useState('');
  const [productDesc, setProductDesc] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productUnit, setProductUnit] = useState('unit');
  const [productStock, setProductStock] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([fetchMyVendorStalls(), fetchUpcomingMarkets()])
      .then(([s, m]) => { setStalls(s); setUpcomingMarkets(m); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreateStall = async () => {
    if (!selectedMarketId || !vendorName.trim()) {
      Alert.alert('Missing fields', 'Select a market and enter your vendor name.');
      return;
    }
    setSubmitting(true);
    try {
      await createVendorStall({
        market_date_id: selectedMarketId,
        vendor_name: vendorName.trim(),
        description: stallDescription.trim() || undefined,
      });
      setVendorName('');
      setStallDescription('');
      setSelectedMarketId(null);
      setScreen('list');
      load();
    } catch (e: any) {
      Alert.alert('Error', e.message === 'stall_already_exists' ? 'You already have a stall for this market.' : 'Could not create stall.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddProduct = async () => {
    if (!activeStallId || !productName.trim() || !productPrice || !productUnit.trim()) {
      Alert.alert('Missing fields', 'Name, price, and unit are required.');
      return;
    }
    const priceCents = Math.round(parseFloat(productPrice) * 100);
    if (isNaN(priceCents) || priceCents <= 0) {
      Alert.alert('Invalid price', 'Enter a valid price.');
      return;
    }
    setSubmitting(true);
    try {
      await addStallProduct(activeStallId, {
        name: productName.trim(),
        description: productDesc.trim() || undefined,
        price_cents: priceCents,
        unit: productUnit.trim(),
        stock_quantity: productStock ? parseInt(productStock, 10) : null,
      });
      setProductName('');
      setProductDesc('');
      setProductPrice('');
      setProductUnit('unit');
      setProductStock('');
      setScreen('list');
      load();
    } catch (e: any) {
      Alert.alert('Error', 'Could not add product.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = (productId: number, productName: string) => {
    Alert.alert('Remove product?', productName, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          try {
            await deleteStallProduct(productId);
            load();
          } catch (e: any) {
            Alert.alert('Error', e.message === 'has_active_orders' ? 'This product has active pre-buys and cannot be removed.' : 'Could not remove product.');
          }
        },
      },
    ]);
  };

  if (screen === 'create-stall') {
    return (
      <View style={[styles.container, { backgroundColor: c.panelBg }]}>
        <View style={[styles.header, { borderBottomColor: c.border }]}>
          <TouchableOpacity onPress={() => setScreen('list')} style={styles.backBtn} activeOpacity={0.7}>
            <Text style={[styles.backArrow, { color: c.accent }]}>←</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: c.text }]}>new stall</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: SPACING.md, gap: 16 }} showsVerticalScrollIndicator={false}>
          <Text style={[styles.fieldLabel, { color: c.muted }]}>SELECT MARKET</Text>
          {upcomingMarkets.map(m => (
            <TouchableOpacity
              key={m.id}
              style={[styles.marketOption, { borderColor: selectedMarketId === m.id ? c.accent : c.border }]}
              onPress={() => setSelectedMarketId(m.id)}
              activeOpacity={0.7}
            >
              <Text style={[styles.marketOptionName, { color: c.text }]}>{m.name}</Text>
              <Text style={[styles.marketOptionDate, { color: c.muted }]}>{fmtDate(m.starts_at)}</Text>
            </TouchableOpacity>
          ))}
          {upcomingMarkets.length === 0 && (
            <Text style={[styles.empty, { color: c.muted }]}>no upcoming markets</Text>
          )}
          <Text style={[styles.fieldLabel, { color: c.muted }]}>VENDOR NAME</Text>
          <TextInput
            style={[styles.input, { borderColor: c.border, color: c.text }]}
            value={vendorName}
            onChangeText={setVendorName}
            placeholder="your stall name"
            placeholderTextColor={c.muted}
          />
          <Text style={[styles.fieldLabel, { color: c.muted }]}>DESCRIPTION (optional)</Text>
          <TextInput
            style={[styles.input, styles.inputMulti, { borderColor: c.border, color: c.text }]}
            value={stallDescription}
            onChangeText={setStallDescription}
            placeholder="what you sell, your story..."
            placeholderTextColor={c.muted}
            multiline
          />
          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: c.text }, submitting && { opacity: 0.5 }]}
            onPress={handleCreateStall}
            disabled={submitting}
            activeOpacity={0.8}
          >
            <Text style={[styles.submitBtnText, { color: c.ctaText }]}>
              {submitting ? '...' : 'request stall'}
            </Text>
          </TouchableOpacity>
          <Text style={[styles.hint, { color: c.muted }]}>
            stall requests are reviewed by the market operator before confirmation.
          </Text>
        </ScrollView>
      </View>
    );
  }

  if (screen === 'add-product') {
    return (
      <View style={[styles.container, { backgroundColor: c.panelBg }]}>
        <View style={[styles.header, { borderBottomColor: c.border }]}>
          <TouchableOpacity onPress={() => setScreen('list')} style={styles.backBtn} activeOpacity={0.7}>
            <Text style={[styles.backArrow, { color: c.accent }]}>←</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: c.text }]}>add product</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: SPACING.md, gap: 14 }} showsVerticalScrollIndicator={false}>
          <Text style={[styles.fieldLabel, { color: c.muted }]}>PRODUCT NAME</Text>
          <TextInput
            style={[styles.input, { borderColor: c.border, color: c.text }]}
            value={productName}
            onChangeText={setProductName}
            placeholder="e.g. Heirloom Tomatoes"
            placeholderTextColor={c.muted}
          />
          <Text style={[styles.fieldLabel, { color: c.muted }]}>DESCRIPTION (optional)</Text>
          <TextInput
            style={[styles.input, styles.inputMulti, { borderColor: c.border, color: c.text }]}
            value={productDesc}
            onChangeText={setProductDesc}
            placeholder="variety, growing notes..."
            placeholderTextColor={c.muted}
            multiline
          />
          <Text style={[styles.fieldLabel, { color: c.muted }]}>PRICE (CA$)</Text>
          <TextInput
            style={[styles.input, { borderColor: c.border, color: c.text }]}
            value={productPrice}
            onChangeText={setProductPrice}
            placeholder="5.00"
            placeholderTextColor={c.muted}
            keyboardType="decimal-pad"
          />
          <Text style={[styles.fieldLabel, { color: c.muted }]}>UNIT</Text>
          <TextInput
            style={[styles.input, { borderColor: c.border, color: c.text }]}
            value={productUnit}
            onChangeText={setProductUnit}
            placeholder="bunch / lb / jar / unit"
            placeholderTextColor={c.muted}
          />
          <Text style={[styles.fieldLabel, { color: c.muted }]}>QUANTITY AVAILABLE (optional)</Text>
          <TextInput
            style={[styles.input, { borderColor: c.border, color: c.text }]}
            value={productStock}
            onChangeText={setProductStock}
            placeholder="leave blank for unlimited"
            placeholderTextColor={c.muted}
            keyboardType="number-pad"
          />
          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: c.text }, submitting && { opacity: 0.5 }]}
            onPress={handleAddProduct}
            disabled={submitting}
            activeOpacity={0.8}
          >
            <Text style={[styles.submitBtnText, { color: c.ctaText }]}>
              {submitting ? '...' : 'add product'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.panelBg }]}>
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={[styles.backArrow, { color: c.accent }]}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.title, { color: c.text }]}>my stall</Text>
        </View>
        <TouchableOpacity
          onPress={() => setScreen('create-stall')}
          style={styles.newBtn}
          activeOpacity={0.7}
        >
          <Text style={[styles.newBtnText, { color: c.accent }]}>new +</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={c.accent} style={{ marginTop: 40 }} />
      ) : stalls.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.empty, { color: c.muted }]}>no stalls yet</Text>
          <TouchableOpacity onPress={() => setScreen('create-stall')} activeOpacity={0.7}>
            <Text style={[styles.createLink, { color: c.accent }]}>request a stall →</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          {stalls.map(stall => (
            <View key={stall.id}>
              <View style={[styles.stallHeader, { borderBottomColor: c.border }]}>
                <View style={styles.stallHeaderLeft}>
                  <Text style={[styles.stallName, { color: c.text }]}>{stall.vendor_name}</Text>
                  <Text style={[styles.stallMeta, { color: c.muted }]}>
                    {stall.market_name}  ·  {fmtDate(stall.starts_at)}
                  </Text>
                </View>
                <View style={styles.stallHeaderRight}>
                  <Text style={[styles.stallStatus, {
                    color: stall.confirmed ? c.accent : c.muted,
                    borderColor: stall.confirmed ? c.accent : c.border,
                  }]}>
                    {stall.confirmed ? 'confirmed' : 'pending'}
                  </Text>
                </View>
              </View>

              {(stall.products ?? []).map((p: any) => (
                <View key={p.id} style={[styles.productRow, { borderBottomColor: c.border }]}>
                  <View style={styles.productInfo}>
                    <Text style={[styles.productName, { color: c.text }]}>{p.name}</Text>
                    <Text style={[styles.productMeta, { color: c.muted }]}>
                      {fmtCAD(p.price_cents)} / {p.unit}
                      {p.prebuy_count > 0 ? `  ·  ${p.prebuy_count} pre-bought` : ''}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDeleteProduct(p.id, p.name)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.deleteBtn, { color: c.muted }]}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity
                style={[styles.addProductBtn, { borderColor: c.border }]}
                onPress={() => { setActiveStallId(stall.id); setScreen('add-product'); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.addProductText, { color: c.accent }]}>+ add product</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.md, paddingTop: 18, paddingBottom: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { paddingVertical: 4 },
  backArrow: { fontSize: 28, lineHeight: 34 },
  headerCenter: { flex: 1, alignItems: 'center' },
  title: { fontSize: 17, fontFamily: fonts.playfair, textAlign: 'center' },
  newBtn: { paddingVertical: 4 },
  newBtnText: { fontSize: 11, fontFamily: fonts.dmMono, letterSpacing: 0.5 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  empty: { fontSize: 13, fontFamily: fonts.dmSans, fontStyle: 'italic' },
  createLink: { fontSize: 11, fontFamily: fonts.dmMono, letterSpacing: 0.5 },
  stallHeader: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  stallHeaderLeft: { flex: 1, gap: 3 },
  stallHeaderRight: { alignItems: 'flex-end' },
  stallName: { fontSize: 18, fontFamily: fonts.playfair },
  stallMeta: { fontSize: 10, fontFamily: fonts.dmMono, letterSpacing: 0.5 },
  stallStatus: { fontSize: 9, fontFamily: fonts.dmMono, letterSpacing: 1, borderWidth: 1, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  productRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.md, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  productInfo: { flex: 1, gap: 3 },
  productName: { fontSize: 14, fontFamily: fonts.dmSans },
  productMeta: { fontSize: 10, fontFamily: fonts.dmMono, letterSpacing: 0.3 },
  deleteBtn: { fontSize: 20, lineHeight: 24, paddingHorizontal: 4 },
  addProductBtn: {
    marginHorizontal: SPACING.md, marginVertical: 10,
    paddingVertical: 10, paddingHorizontal: 14,
    borderWidth: StyleSheet.hairlineWidth, borderRadius: 8,
    alignItems: 'center',
  },
  addProductText: { fontSize: 11, fontFamily: fonts.dmMono, letterSpacing: 0.5 },
  fieldLabel: { fontSize: 9, fontFamily: fonts.dmMono, letterSpacing: 1.5 },
  input: {
    borderWidth: StyleSheet.hairlineWidth, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, fontFamily: fonts.dmSans,
  },
  inputMulti: { minHeight: 80, textAlignVertical: 'top' },
  marketOption: {
    borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, gap: 3,
  },
  marketOptionName: { fontSize: 15, fontFamily: fonts.dmSans },
  marketOptionDate: { fontSize: 10, fontFamily: fonts.dmMono, letterSpacing: 0.5 },
  submitBtn: {
    paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 4,
  },
  submitBtnText: { fontFamily: fonts.dmSans, fontSize: 15, fontWeight: '700' },
  hint: { fontSize: 12, fontFamily: fonts.dmSans, fontStyle: 'italic', textAlign: 'center' },
});
