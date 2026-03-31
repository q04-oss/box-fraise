import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { searchVerifiedUsers, generateGiftNote, createStandingOrder } from '../lib/api';
import { getUserId } from '../lib/userId';
import { COLORS, SPACING } from '../theme';

type Nav = NativeStackNavigationProp<RootStackParamList, 'StandingOrderSetup'>;
type RouteProps = RouteProp<RootStackParamList, 'StandingOrderSetup'>;

type OrderType = 'personal' | 'gift';
type Frequency = 'weekly' | 'biweekly' | 'monthly';
type Tone = 'warm' | 'funny' | 'poetic' | 'minimal';

const FREQUENCY_OPTIONS: { key: Frequency; label: string; cycles: number; desc: string }[] = [
  { key: 'weekly', label: 'Weekly', cycles: 52, desc: 'Every week, year-round' },
  { key: 'biweekly', label: 'Biweekly', cycles: 26, desc: 'Every two weeks' },
  { key: 'monthly', label: 'Monthly', cycles: 12, desc: 'Once a month' },
];

const TIME_PREFS = ['9:00 – 11:00', '11:00 – 13:00', '13:00 – 15:00', '15:00 – 17:00'];

const TONES: { key: Tone; label: string }[] = [
  { key: 'warm', label: 'Warm' },
  { key: 'funny', label: 'Funny' },
  { key: 'poetic', label: 'Poetic' },
  { key: 'minimal', label: 'Minimal' },
];

export default function StandingOrderSetupScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProps>();
  const insets = useSafeAreaInsets();
  const { variety_id, chocolate, finish, quantity, location_id, priceCents, varietyName } = route.params;

  const [orderType, setOrderType] = useState<OrderType>('personal');
  const [frequency, setFrequency] = useState<Frequency>('monthly');
  const [timePref, setTimePref] = useState<string>(TIME_PREFS[0]);
  const [recipientQuery, setRecipientQuery] = useState('');
  const [recipientResults, setRecipientResults] = useState<{ id: number; user_id: string }[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<{ id: number; user_id: string } | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [tone, setTone] = useState<Tone>('warm');
  const [notePreview, setNotePreview] = useState('');
  const [noteLoading, setNoteLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const selectedFreq = FREQUENCY_OPTIONS.find(f => f.key === frequency)!;
  const orderCents = priceCents * quantity;
  const totalCents = orderCents * selectedFreq.cycles;

  const handleRecipientSearch = useCallback(async (q: string) => {
    setRecipientQuery(q);
    setSelectedRecipient(null);
    setNotePreview('');
    if (q.length < 3) { setRecipientResults([]); return; }
    setSearchLoading(true);
    try {
      const results = await searchVerifiedUsers(q);
      setRecipientResults(results ?? []);
    } catch {
      setRecipientResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const handlePreviewNote = async () => {
    setNoteLoading(true);
    try {
      const { note } = await generateGiftNote(tone, varietyName, '');
      setNotePreview(note);
    } catch {
      Alert.alert('Could not generate note', 'Please try again.');
    } finally {
      setNoteLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (orderType === 'gift' && !selectedRecipient) {
      Alert.alert('Recipient required', 'Search for and select a verified member to send this to.');
      return;
    }

    setSubmitting(true);
    try {
      const userId = await getUserId();
      const today = new Date();
      const nextDate = new Date(today);
      if (frequency === 'weekly') nextDate.setDate(today.getDate() + 7);
      else if (frequency === 'biweekly') nextDate.setDate(today.getDate() + 14);
      else nextDate.setMonth(today.getMonth() + 1);
      const next_order_date = nextDate.toISOString().split('T')[0];

      await createStandingOrder({
        sender_id: 0, // resolved server-side from X-User-ID
        recipient_id: orderType === 'gift' ? selectedRecipient!.id : undefined,
        variety_id,
        chocolate,
        finish,
        quantity,
        location_id,
        time_slot_preference: timePref,
        frequency,
        next_order_date,
        gift_tone: orderType === 'gift' ? tone : undefined,
      });

      Alert.alert(
        'Standing order set.',
        `Your ${frequency} ${varietyName} order is confirmed.`,
        [{ text: 'Done', onPress: () => navigation.popToTop() }]
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.';
      Alert.alert('Could not set up standing order', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.cream }}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← BACK</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Standing Order</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: SPACING.md, gap: SPACING.md, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Order summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryVariety}>{varietyName}</Text>
          <Text style={styles.summaryDetail}>
            {quantity} × CA${(priceCents / 100).toFixed(2)} · {chocolate} · {finish}
          </Text>
        </View>

        {/* Personal / Gift toggle */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>FOR</Text>
          <View style={styles.toggleGroup}>
            {(['personal', 'gift'] as OrderType[]).map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.toggleOption, orderType === t && styles.toggleOptionActive]}
                onPress={() => setOrderType(t)}
                activeOpacity={0.8}
              >
                <Text style={[styles.toggleOptionText, orderType === t && styles.toggleOptionTextActive]}>
                  {t === 'personal' ? 'Myself' : 'A gift'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Gift recipient search */}
        {orderType === 'gift' && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>RECIPIENT</Text>
            <View style={styles.searchCard}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search by member ID (MF-...)"
                placeholderTextColor={COLORS.textMuted}
                value={recipientQuery}
                onChangeText={handleRecipientSearch}
                autoCapitalize="characters"
              />
              {searchLoading && <ActivityIndicator size="small" color={COLORS.forestGreen} style={{ marginTop: 8 }} />}
              {recipientResults.length > 0 && !selectedRecipient && (
                <View style={styles.searchResults}>
                  {recipientResults.map(r => (
                    <TouchableOpacity
                      key={r.id}
                      style={styles.searchResultRow}
                      onPress={() => {
                        setSelectedRecipient(r);
                        setRecipientQuery(r.user_id);
                        setRecipientResults([]);
                      }}
                    >
                      <Text style={styles.searchResultText}>{r.user_id}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {selectedRecipient && (
                <View style={styles.selectedRecipient}>
                  <Text style={styles.selectedRecipientText}>{selectedRecipient.user_id}</Text>
                  <TouchableOpacity onPress={() => { setSelectedRecipient(null); setRecipientQuery(''); }}>
                    <Text style={styles.clearText}>✕</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Frequency */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>FREQUENCY</Text>
          <View style={styles.freqGrid}>
            {FREQUENCY_OPTIONS.map(f => (
              <TouchableOpacity
                key={f.key}
                style={[styles.freqCard, frequency === f.key && styles.freqCardActive]}
                onPress={() => setFrequency(f.key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.freqLabel, frequency === f.key && styles.freqLabelActive]}>{f.label}</Text>
                <Text style={[styles.freqDesc, frequency === f.key && styles.freqDescActive]}>{f.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Time preference */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>PREFERRED TIME</Text>
          <View style={styles.timeGrid}>
            {TIME_PREFS.map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.timeChip, timePref === t && styles.timeChipActive]}
                onPress={() => setTimePref(t)}
                activeOpacity={0.8}
              >
                <Text style={[styles.timeChipText, timePref === t && styles.timeChipTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Gift tone + note preview */}
        {orderType === 'gift' && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>NOTE TONE</Text>
              <View style={styles.toneRow}>
                {TONES.map(t => (
                  <TouchableOpacity
                    key={t.key}
                    style={[styles.toneChip, tone === t.key && styles.toneChipActive]}
                    onPress={() => { setTone(t.key); setNotePreview(''); }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.toneChipText, tone === t.key && styles.toneChipTextActive]}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity style={styles.previewBtn} onPress={handlePreviewNote} activeOpacity={0.8} disabled={noteLoading}>
              {noteLoading ? (
                <ActivityIndicator size="small" color={COLORS.forestGreen} />
              ) : (
                <Text style={styles.previewBtnText}>Preview note</Text>
              )}
            </TouchableOpacity>

            {notePreview !== '' && (
              <View style={styles.noteCard}>
                <Text style={styles.noteLabel}>SAMPLE NOTE</Text>
                <Text style={styles.noteText}>{notePreview}</Text>
              </View>
            )}
          </>
        )}

        {/* Total */}
        <View style={styles.totalCard}>
          <View>
            <Text style={styles.totalLabel}>TOTAL PREPAYMENT</Text>
            <Text style={styles.totalSubLabel}>
              {selectedFreq.cycles} orders × CA${(orderCents / 100).toFixed(2)}
            </Text>
          </View>
          <Text style={styles.totalAmount}>CA${(totalCents / 100).toFixed(2)}</Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
        <TouchableOpacity
          style={[styles.confirmBtn, submitting && styles.confirmBtnDisabled]}
          onPress={handleConfirm}
          activeOpacity={0.85}
          disabled={submitting}
        >
          <Text style={styles.confirmBtnText}>{submitting ? 'Setting up...' : 'Confirm & Pay  →'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: COLORS.forestGreen,
    paddingHorizontal: SPACING.md,
    paddingBottom: 24,
  },
  backBtn: { paddingVertical: 6, marginBottom: 8 },
  backText: { color: 'rgba(255,255,255,0.5)', fontSize: 13, letterSpacing: 0.5 },
  headerTitle: {
    color: COLORS.cream,
    fontSize: 34,
    fontFamily: 'PlayfairDisplay_700Bold',
  },
  summaryCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    padding: SPACING.md,
    gap: 4,
  },
  summaryVariety: {
    fontSize: 18,
    fontFamily: 'PlayfairDisplay_700Bold',
    color: COLORS.textDark,
  },
  summaryDetail: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  section: { gap: SPACING.sm },
  sectionLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    letterSpacing: 1.8,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  toggleGroup: {
    flexDirection: 'row',
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  toggleOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9,
    alignItems: 'center',
  },
  toggleOptionActive: { backgroundColor: COLORS.forestGreen },
  toggleOptionText: { fontSize: 14, color: COLORS.textMuted, fontWeight: '600' },
  toggleOptionTextActive: { color: COLORS.cream },
  searchCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    padding: SPACING.md,
  },
  searchInput: {
    fontSize: 15,
    color: COLORS.textDark,
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  searchResults: {
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  searchResultRow: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  searchResultText: { fontSize: 14, color: COLORS.textDark, letterSpacing: 1 },
  selectedRecipient: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: '#D4EDD4',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  selectedRecipientText: { fontSize: 14, color: '#2D5A2D', fontWeight: '600', letterSpacing: 1 },
  clearText: { fontSize: 14, color: COLORS.textMuted },
  freqGrid: { gap: SPACING.sm },
  freqCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    padding: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  freqCardActive: {
    borderColor: COLORS.forestGreen,
    backgroundColor: 'rgba(28,58,42,0.06)',
  },
  freqLabel: {
    fontSize: 16,
    fontFamily: 'PlayfairDisplay_700Bold',
    color: COLORS.textDark,
  },
  freqLabelActive: { color: COLORS.forestGreen },
  freqDesc: { fontSize: 13, color: COLORS.textMuted },
  freqDescActive: { color: COLORS.forestGreen },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  timeChip: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  timeChipActive: {
    borderColor: COLORS.forestGreen,
    backgroundColor: 'rgba(28,58,42,0.06)',
  },
  timeChipText: { fontSize: 14, color: COLORS.textDark },
  timeChipTextActive: { color: COLORS.forestGreen, fontWeight: '600' },
  toneRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    flexWrap: 'wrap',
  },
  toneChip: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  toneChipActive: {
    borderColor: COLORS.forestGreen,
    backgroundColor: 'rgba(28,58,42,0.06)',
  },
  toneChipText: { fontSize: 14, color: COLORS.textDark },
  toneChipTextActive: { color: COLORS.forestGreen, fontWeight: '600' },
  previewBtn: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  previewBtnText: {
    fontSize: 14,
    color: COLORS.forestGreen,
    fontFamily: 'PlayfairDisplay_700Bold',
  },
  noteCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    padding: SPACING.md,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(196,151,58,0.3)',
  },
  noteLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    letterSpacing: 2,
    fontWeight: '600',
  },
  noteText: {
    fontSize: 14,
    color: COLORS.textDark,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  totalCard: {
    backgroundColor: COLORS.forestGreen,
    borderRadius: 14,
    paddingHorizontal: SPACING.md,
    paddingVertical: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    color: 'rgba(232,224,208,0.6)',
    fontSize: 11,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 3,
  },
  totalSubLabel: {
    color: 'rgba(232,224,208,0.45)',
    fontSize: 12,
  },
  totalAmount: {
    color: COLORS.cream,
    fontSize: 24,
    fontFamily: 'PlayfairDisplay_700Bold',
  },
  footer: {
    paddingHorizontal: SPACING.md,
    paddingTop: 12,
    backgroundColor: COLORS.cream,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  confirmBtn: {
    backgroundColor: COLORS.forestGreen,
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmBtnDisabled: { opacity: 0.5 },
  confirmBtnText: {
    color: COLORS.cream,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
});
