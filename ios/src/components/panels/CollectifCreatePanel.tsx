import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  StyleSheet, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePanel } from '../../context/PanelContext';
import { createCollectif } from '../../lib/api';
import { useColors, fonts, SPACING } from '../../theme';

type CollectifType = 'product' | 'popup';

export default function CollectifCreatePanel() {
  const { goBack, showPanel } = usePanel();
  const c = useColors();
  const insets = useSafeAreaInsets();

  const [collectifType, setCollectifType] = useState<CollectifType>('product');

  // Shared fields
  const [businessName, setBusinessName] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetStr, setTargetStr] = useState('');
  const [deadlineStr, setDeadlineStr] = useState('');

  // Product-only fields
  const [discountStr, setDiscountStr] = useState('');
  const [priceStr, setPriceStr] = useState('');

  // Popup-only fields
  const [proposedVenue, setProposedVenue] = useState('');
  const [proposedDate, setProposedDate] = useState('');
  const [depositStr, setDepositStr] = useState('');

  const [submitting, setSubmitting] = useState(false);

  const isPopup = collectifType === 'popup';

  const canSubmit = (() => {
    if (!businessName.trim() || !title.trim() || !targetStr || !deadlineStr || submitting) return false;
    if (isPopup) return !!(proposedVenue.trim() && proposedDate.trim() && depositStr);
    return !!(discountStr && priceStr);
  })();

  const handleSubmit = async () => {
    if (!canSubmit) return;
    const target = parseInt(targetStr, 10);
    const deadline = new Date(deadlineStr);

    if (isNaN(target) || target < 2) {
      Alert.alert('Invalid target', 'Target must be at least 2.'); return;
    }
    if (isNaN(deadline.getTime()) || deadline <= new Date()) {
      Alert.alert('Invalid deadline', 'Deadline must be a future date (YYYY-MM-DD).'); return;
    }

    if (isPopup) {
      const deposit = Math.round(parseFloat(depositStr) * 100);
      if (isNaN(deposit) || deposit < 100) {
        Alert.alert('Invalid deposit', 'Deposit must be at least CA$1.00.'); return;
      }
      setSubmitting(true);
      try {
        await createCollectif({
          business_name: businessName.trim(),
          collectif_type: 'popup',
          title: title.trim(),
          description: description.trim() || undefined,
          price_cents: deposit,
          proposed_venue: proposedVenue.trim(),
          proposed_date: proposedDate.trim(),
          target_quantity: target,
          deadline: deadline.toISOString(),
        });
        Alert.alert(
          'Popup proposed.',
          'Your proposal is live. If enough members commit, the business will be contacted.',
          [{ text: 'OK', onPress: () => { goBack(); showPanel('collectif-list'); } }],
        );
      } catch (e: any) {
        Alert.alert('Could not post', e.message ?? 'Please try again.');
      } finally {
        setSubmitting(false);
      }
    } else {
      const discount = parseInt(discountStr, 10);
      const price = Math.round(parseFloat(priceStr) * 100);
      if (isNaN(discount) || discount < 1 || discount > 80) {
        Alert.alert('Invalid discount', 'Discount must be between 1% and 80%.'); return;
      }
      if (isNaN(price) || price < 100) {
        Alert.alert('Invalid price', 'Price must be at least CA$1.00.'); return;
      }
      setSubmitting(true);
      try {
        await createCollectif({
          business_name: businessName.trim(),
          collectif_type: 'product',
          title: title.trim(),
          description: description.trim() || undefined,
          proposed_discount_pct: discount,
          price_cents: price,
          target_quantity: target,
          deadline: deadline.toISOString(),
        });
        Alert.alert(
          'Collectif posted.',
          'Your proposal is live. Share it with others to build momentum.',
          [{ text: 'OK', onPress: () => { goBack(); showPanel('collectif-list'); } }],
        );
      } catch (e: any) {
        Alert.alert('Could not post', e.message ?? 'Please try again.');
      } finally {
        setSubmitting(false);
      }
    }
  };

  const Field = ({
    label, value, onChange, placeholder, keyboardType = 'default', hint,
  }: {
    label: string; value: string; onChange: (v: string) => void;
    placeholder?: string; keyboardType?: any; hint?: string;
  }) => (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: c.muted }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={c.muted}
        keyboardType={keyboardType}
        style={[styles.input, { borderColor: c.border, color: c.text, backgroundColor: c.card }]}
        autoCorrect={false}
      />
      {hint && <Text style={[styles.hint, { color: c.muted }]}>{hint}</Text>}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: c.panelBg, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={[styles.backArrow, { color: c.accent }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.text }]}>
          {isPopup ? 'Propose a Popup' : 'Propose a Collectif'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: SPACING.md, gap: 4, paddingBottom: insets.bottom + 100 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Type selector */}
        <View style={[styles.typeRow, { borderColor: c.border }]}>
          <TouchableOpacity
            style={[styles.typeBtn, collectifType === 'product' && { backgroundColor: c.accent }]}
            onPress={() => setCollectifType('product')}
            activeOpacity={0.8}
          >
            <Text style={[styles.typeBtnText, { color: collectifType === 'product' ? c.panelBg : c.muted }]}>
              Product Order
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeBtn, collectifType === 'popup' && { backgroundColor: c.accent }]}
            onPress={() => setCollectifType('popup')}
            activeOpacity={0.8}
          >
            <Text style={[styles.typeBtnText, { color: collectifType === 'popup' ? c.panelBg : c.muted }]}>
              Popup Event
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.subheading, { color: c.muted }]}>
          {isPopup
            ? 'Propose a popup event. If enough members commit a deposit, the business is formally invited to host.'
            : 'Name the business, describe what you want, set a discount and target. If enough members commit, the business gets a formal request.'}
        </Text>

        <Field
          label={isPopup ? 'BUSINESS NAME' : 'BUSINESS NAME'}
          value={businessName}
          onChange={setBusinessName}
          placeholder={isPopup ? 'e.g. Valrhona, Chocolaterie Bernard' : 'e.g. Valrhona, Chocolaterie Bernard'}
          hint="Must be a business on the Maison platform."
        />
        <Field
          label="TITLE"
          value={title}
          onChange={setTitle}
          placeholder={isPopup ? 'e.g. Valentine\'s popup at Café Central' : 'e.g. Bulk order — 10 boxes Guanaja 70%'}
        />
        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: c.muted }]}>DESCRIPTION (OPTIONAL)</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder={isPopup ? 'Describe the event concept, vibe, what you'd like…' : 'What you're asking for, any specific details…'}
            placeholderTextColor={c.muted}
            multiline
            numberOfLines={3}
            style={[styles.textarea, { borderColor: c.border, color: c.text, backgroundColor: c.card }]}
          />
        </View>

        {isPopup ? (
          <>
            <Field
              label="PROPOSED VENUE"
              value={proposedVenue}
              onChange={setProposedVenue}
              placeholder="e.g. Café Central, 123 Rue Saint-Denis"
              hint="Where you'd like the popup to happen."
            />
            <Field
              label="PROPOSED DATE"
              value={proposedDate}
              onChange={setProposedDate}
              placeholder="e.g. Jun 14, 2026"
              hint="Approximate date you have in mind."
            />
            <Field
              label="DEPOSIT PER PERSON (CA$)"
              value={depositStr}
              onChange={setDepositStr}
              placeholder="e.g. 15.00"
              keyboardType="decimal-pad"
              hint="Held until the business confirms. Refunded if declined."
            />
          </>
        ) : (
          <>
            <Field
              label="PROPOSED DISCOUNT (%)"
              value={discountStr}
              onChange={setDiscountStr}
              placeholder="e.g. 15"
              keyboardType="numeric"
              hint="1–80%. This is what you're asking the business to offer."
            />
            <Field
              label="PRICE PER UNIT AT DISCOUNT (CA$)"
              value={priceStr}
              onChange={setPriceStr}
              placeholder="e.g. 42.50"
              keyboardType="decimal-pad"
              hint="What each member pays. This is held immediately."
            />
          </>
        )}

        <Field
          label={isPopup ? 'TARGET (# OF ATTENDEES)' : 'TARGET (# OF COMMITMENTS)'}
          value={targetStr}
          onChange={setTargetStr}
          placeholder="e.g. 20"
          keyboardType="numeric"
          hint={isPopup ? 'Minimum 2. The business sees the full group once this is reached.' : 'Minimum 2. The business sees the full pooled amount once this is reached.'}
        />
        <Field
          label="DEADLINE (YYYY-MM-DD)"
          value={deadlineStr}
          onChange={setDeadlineStr}
          placeholder="e.g. 2026-06-01"
          hint="If the target isn't met by this date, everyone is refunded."
        />
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: c.border, paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: c.accent }, !canSubmit && { opacity: 0.4 }]}
          onPress={handleSubmit}
          disabled={!canSubmit}
          activeOpacity={0.8}
        >
          <Text style={[styles.submitBtnText, { color: c.panelBg }]}>
            {submitting ? 'Posting…' : isPopup ? 'Propose Popup' : 'Post Collectif'}
          </Text>
        </TouchableOpacity>
      </View>
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
  backBtn: { width: 40, paddingVertical: 4 },
  backArrow: { fontSize: 28, lineHeight: 34 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontFamily: fonts.playfair },
  typeRow: {
    flexDirection: 'row', borderWidth: StyleSheet.hairlineWidth, borderRadius: 10,
    overflow: 'hidden', marginBottom: 20,
  },
  typeBtn: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  typeBtnText: { fontFamily: fonts.dmMono, fontSize: 10, letterSpacing: 1 },
  subheading: { fontFamily: fonts.dmSans, fontSize: 13, lineHeight: 20, fontStyle: 'italic', marginBottom: 20 },
  field: { gap: 6, marginBottom: 16 },
  fieldLabel: { fontFamily: fonts.dmMono, fontSize: 9, letterSpacing: 1.5 },
  input: {
    fontFamily: fonts.dmMono, fontSize: 14,
    borderWidth: StyleSheet.hairlineWidth, borderRadius: 8,
    paddingHorizontal: SPACING.md, paddingVertical: 10,
  },
  textarea: {
    fontFamily: fonts.dmMono, fontSize: 13,
    borderWidth: StyleSheet.hairlineWidth, borderRadius: 8,
    paddingHorizontal: SPACING.md, paddingVertical: 10,
    minHeight: 80, textAlignVertical: 'top',
  },
  hint: { fontFamily: fonts.dmSans, fontSize: 11, fontStyle: 'italic' },
  footer: {
    padding: SPACING.md, paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  submitBtn: { width: '100%', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  submitBtnText: { fontFamily: fonts.dmMono, fontSize: 13, letterSpacing: 1 },
});
