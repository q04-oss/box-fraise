import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useStripe } from '@stripe/stripe-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePanel } from '../../context/PanelContext';
import { useColors, fonts, SPACING } from '../../theme';
import { creditsCheckout, creditsConfirm, getMemberToken } from '../../lib/api';

const CREDIT_PRICE_CENTS = 12000; // CA$120

export default function CreditsPanel() {
  const { member, setMember, goBack } = usePanel();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const [qty, setQty]         = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [done, setDone]       = useState(false);
  const [newBalance, setNewBalance] = useState<number | null>(null);

  const totalCents = qty * CREDIT_PRICE_CENTS;
  const totalDisplay = `CA$${(totalCents / 100).toFixed(0)}`;

  const handleBuy = async () => {
    const token = await getMemberToken();
    if (!token || !member) {
      setError('sign in first.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    setError(null);
    try {
      // 1. Create payment intent
      const { client_secret, amount_cents } = await creditsCheckout(qty);

      // 2. Init payment sheet
      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: client_secret,
        merchantDisplayName: 'fraise',
        applePay: {
          merchantCountryCode: 'CA',
        },
        style: 'alwaysLight',
        primaryButtonLabel: `Pay ${totalDisplay}`,
      });
      if (initError) throw new Error(initError.message);

      // 3. Present payment sheet
      const { error: presentError } = await presentPaymentSheet();
      if (presentError) {
        if (presentError.code === 'Canceled') { setLoading(false); return; }
        throw new Error(presentError.message);
      }

      // 4. Extract payment intent ID from client_secret
      const paymentIntentId = client_secret.split('_secret_')[0];

      // 5. Confirm on server
      const result = await creditsConfirm(paymentIntentId);
      setMember({ ...member, credit_balance: result.credit_balance });
      setNewBalance(result.credit_balance);
      setDone(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      setError(err.message || 'payment failed.');
    }
    setLoading(false);
  };

  if (!member) {
    return (
      <View style={[styles.center, { backgroundColor: c.panelBg }]}>
        <Text style={[styles.muted, { color: c.muted }]}>sign in to buy credits.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.panelBg }}
      contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 24 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} activeOpacity={0.6} style={styles.back}>
          <Text style={[styles.backText, { color: c.muted }]}>← back</Text>
        </TouchableOpacity>
        <Text style={[styles.eyebrow, { color: c.muted }]}>fraise</Text>
        <Text style={[styles.title, { color: c.text }]}>buy credits</Text>
        <Text style={[styles.subtitle, { color: c.muted }]}>
          CA$120 per credit · no expiry
        </Text>
      </View>

      {done ? (
        <View style={[styles.doneCard, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.doneTitle, { color: c.text }]}>credits added.</Text>
          {newBalance !== null ? (
            <Text style={[styles.doneSub, { color: c.muted }]}>
              balance: {newBalance} credit{newBalance !== 1 ? 's' : ''}
            </Text>
          ) : null}
        </View>
      ) : (
        <View style={styles.body}>
          {/* Current balance */}
          <View style={[styles.balanceCard, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[styles.balanceLabel, { color: c.muted }]}>current balance</Text>
            <Text style={[styles.balanceValue, { color: c.text }]}>
              {member.credit_balance} credit{member.credit_balance !== 1 ? 's' : ''}
            </Text>
          </View>

          {/* Quantity */}
          <View style={styles.qtyRow}>
            <TouchableOpacity
              style={[styles.qtyBtn, { borderColor: c.border }]}
              onPress={() => setQty(q => Math.max(1, q - 1))}
              activeOpacity={0.7}
            >
              <Text style={[styles.qtyBtnText, { color: c.text }]}>−</Text>
            </TouchableOpacity>
            <View style={styles.qtyCenter}>
              <Text style={[styles.qtyVal, { color: c.text }]}>{qty}</Text>
              <Text style={[styles.qtyLabel, { color: c.muted }]}>
                credit{qty !== 1 ? 's' : ''}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.qtyBtn, { borderColor: c.border }]}
              onPress={() => setQty(q => Math.min(10, q + 1))}
              activeOpacity={0.7}
            >
              <Text style={[styles.qtyBtnText, { color: c.text }]}>+</Text>
            </TouchableOpacity>
          </View>

          {/* Total */}
          <View style={[styles.totalRow, { borderTopColor: c.border }]}>
            <Text style={[styles.totalLabel, { color: c.muted }]}>total</Text>
            <Text style={[styles.totalValue, { color: c.text }]}>{totalDisplay}</Text>
          </View>

          {error ? (
            <Text style={[styles.errText, { color: '#C0392B' }]}>{error}</Text>
          ) : null}

          <TouchableOpacity
            style={[styles.payBtn, { backgroundColor: c.text }]}
            onPress={handleBuy}
            activeOpacity={0.8}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color={c.ctaText} />
              : <Text style={[styles.payBtnText, { color: c.ctaText }]}>
                  pay {totalDisplay} →
                </Text>
            }
          </TouchableOpacity>

          <Text style={[styles.note, { color: c.muted }]}>
            credits never expire. if an event doesn't go ahead, your credit is returned automatically.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: SPACING.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  back: { marginBottom: SPACING.md },
  backText: { fontSize: 12, fontFamily: fonts.dmMono },
  header: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xl },
  eyebrow: {
    fontSize: 10,
    fontFamily: fonts.dmMono,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: { fontSize: 20, fontFamily: fonts.dmMono, fontWeight: '500' },
  subtitle: { fontSize: 12, fontFamily: fonts.dmMono, marginTop: 4 },
  body: { paddingHorizontal: SPACING.lg, gap: SPACING.md },
  balanceCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: { fontSize: 12, fontFamily: fonts.dmMono },
  balanceValue: { fontSize: 14, fontFamily: fonts.dmMono, fontWeight: '500' },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xl,
    paddingVertical: SPACING.md,
  },
  qtyBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: { fontSize: 22, fontFamily: fonts.dmMono, lineHeight: 28 },
  qtyCenter: { alignItems: 'center', gap: 2 },
  qtyVal: { fontSize: 32, fontFamily: fonts.dmMono, fontWeight: '500' },
  qtyLabel: { fontSize: 11, fontFamily: fonts.dmMono },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: SPACING.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  totalLabel: { fontSize: 13, fontFamily: fonts.dmMono },
  totalValue: { fontSize: 13, fontFamily: fonts.dmMono, fontWeight: '500' },
  errText: { fontSize: 12, fontFamily: fonts.dmMono },
  payBtn: {
    borderRadius: 9999,
    paddingVertical: 14,
    alignItems: 'center',
  },
  payBtnText: { fontSize: 12, fontFamily: fonts.dmMono, letterSpacing: 2, textTransform: 'uppercase' },
  note: { fontSize: 11, fontFamily: fonts.dmMono, lineHeight: 17 },
  doneCard: {
    marginHorizontal: SPACING.lg,
    borderRadius: 12,
    borderWidth: 1,
    padding: SPACING.lg,
    gap: 6,
  },
  doneTitle: { fontSize: 16, fontFamily: fonts.dmMono, fontWeight: '500' },
  doneSub: { fontSize: 12, fontFamily: fonts.dmMono },
  muted: { fontSize: 13, fontFamily: fonts.dmMono },
});
