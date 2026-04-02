import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useStripe } from '@stripe/stripe-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePanel } from '../../context/PanelContext';
import { createFundContributionIntent } from '../../lib/api';
import { useColors, fonts, SPACING } from '../../theme';

export default function FundContributePanel() {
  const { goBack, panelData } = usePanel();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const c = useColors();
  const insets = useSafeAreaInsets();

  const toUserId: number | undefined = panelData?.toUserId;
  const toName: string | undefined = panelData?.toName;

  const [amountStr, setAmountStr] = useState('');
  const [note, setNote] = useState('');
  const [contributing, setContributing] = useState(false);

  const amountCents = Math.round(parseFloat(amountStr || '0') * 100);
  const canContribute = amountCents >= 100 && !!toUserId && !contributing;

  const handleContribute = async () => {
    if (!canContribute || !toUserId) return;
    setContributing(true);
    try {
      const { client_secret } = await createFundContributionIntent(toUserId, amountCents, note.trim() || undefined);
      const { error: initErr } = await initPaymentSheet({
        paymentIntentClientSecret: client_secret,
        merchantDisplayName: 'Maison Fraise',
      });
      if (initErr) throw new Error(initErr.message);
      const { error: presentErr } = await presentPaymentSheet();
      if (presentErr) {
        if (presentErr.code !== 'Canceled') {
          Alert.alert('Payment failed', 'Please try again.');
        }
        return;
      }
      Alert.alert('Contribution sent.', undefined, [
        { text: 'OK', onPress: goBack },
      ]);
    } catch (e: any) {
      Alert.alert('Could not contribute', e.message ?? 'Please try again.');
    } finally {
      setContributing(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: c.panelBg, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={[styles.backBtnText, { color: c.accent }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: c.text }]}>Contribute</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.recipientLabel, { color: c.text, fontFamily: fonts.playfair }]}>
          Contributing to {toName ? `${toName}'s` : 'their'} membership fund
        </Text>

        <View style={[styles.amountRow, { borderColor: c.border }]}>
          <Text style={[styles.currencyPrefix, { color: c.muted, fontFamily: fonts.dmMono }]}>CA$</Text>
          <TextInput
            style={[styles.amountInput, { color: c.text, fontFamily: fonts.dmMono }]}
            placeholder="0.00"
            placeholderTextColor={c.muted}
            value={amountStr}
            onChangeText={text => setAmountStr(text.replace(/[^0-9.]/g, ''))}
            keyboardType="decimal-pad"
            returnKeyType="done"
          />
        </View>

        {amountCents > 0 && amountCents < 100 && (
          <Text style={[styles.minNote, { color: c.muted, fontFamily: fonts.dmMono }]}>
            Minimum contribution: CA$1.00
          </Text>
        )}

        <TextInput
          style={[styles.noteInput, { color: c.text, borderColor: c.border, fontFamily: fonts.dmSans }]}
          placeholder="Add a note (optional)"
          placeholderTextColor={c.muted}
          value={note}
          onChangeText={setNote}
          multiline
          textAlignVertical="top"
          maxLength={500}
        />

        <TouchableOpacity
          style={[styles.contributeBtn, { backgroundColor: canContribute ? c.accent : c.border }]}
          onPress={handleContribute}
          activeOpacity={0.8}
          disabled={!canContribute}
        >
          {contributing ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={[styles.contributeBtnText, { fontFamily: fonts.dmSans }]}>Contribute</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: SPACING.sm },
  backBtnText: { fontSize: 22 },
  title: { flex: 1, textAlign: 'center', fontSize: 18, fontFamily: 'PlayfairDisplay_700Bold' },
  headerSpacer: { width: 44 },
  body: { padding: SPACING.lg, paddingBottom: 60 },
  recipientLabel: { fontSize: 20, marginBottom: SPACING.lg, lineHeight: 28 },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: SPACING.xs,
  },
  currencyPrefix: { fontSize: 22, marginRight: 4 },
  amountInput: { flex: 1, fontSize: 32, paddingVertical: SPACING.sm },
  minNote: { fontSize: 12, marginBottom: SPACING.md },
  noteInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    padding: SPACING.sm,
    fontSize: 15,
    minHeight: 80,
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
    fontFamily: 'DMSans_400Regular',
  },
  contributeBtn: {
    paddingVertical: SPACING.md,
    borderRadius: 10,
    alignItems: 'center',
  },
  contributeBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
