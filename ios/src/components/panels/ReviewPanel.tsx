import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, StyleSheet, Alert } from 'react-native';
import { usePanel } from '../../context/PanelContext';
import { useApp } from '../../../App';
import { createOrder, confirmOrder } from '../../lib/api';
import { useStripe } from '@stripe/stripe-react-native';
import { useColors, colors, fonts } from '../../theme';
import { SPACING } from '../../theme';
import SwipeBar from '../SwipeBar';

function Row({ label, value, sub, c }: { label: string; value: string; sub?: string; c: any }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: c.muted }]}>{label}</Text>
      <View style={styles.rowRight}>
        <Text style={[styles.rowValue, { color: c.text }]}>{value}</Text>
        {sub && <Text style={[styles.rowSub, { color: c.muted }]}>{sub}</Text>}
      </View>
    </View>
  );
}

export default function ReviewPanel() {
  const { goBack, showPanel, order, setOrder } = usePanel();
  const { reviewMode, pushToken } = useApp();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const c = useColors();
  const [email, setEmail] = useState(order.customer_email);
  const [loading, setLoading] = useState(false);

  const totalCents = (order.price_cents ?? 0) * order.quantity;

  const handlePay = async () => {
    if (!email || !email.includes('@')) {
      Alert.alert('Email required', 'Enter a valid email for your receipt.');
      return;
    }
    if (!order.variety_id || !order.location_id || !order.time_slot_id) {
      Alert.alert('Incomplete', 'Something is missing from your order.');
      return;
    }

    setLoading(true);
    try {
      setOrder({ customer_email: email });
      const { order: created, client_secret } = await createOrder({
        variety_id: order.variety_id!,
        location_id: order.location_id!,
        time_slot_id: order.time_slot_id!,
        chocolate: order.chocolate!,
        finish: order.finish!,
        quantity: order.quantity,
        is_gift: order.is_gift,
        customer_email: email,
        push_token: pushToken,
      });

      let confirmed;
      if (reviewMode) {
        confirmed = await confirmOrder(created.id);
      } else {
        const { error: initErr } = await initPaymentSheet({
          merchantDisplayName: 'Maison Fraise',
          paymentIntentClientSecret: client_secret,
          defaultBillingDetails: { email },
          appearance: { colors: { primary: c.green, background: c.cream } },
        });
        if (initErr) throw new Error(initErr.message);
        const { error: presentErr } = await presentPaymentSheet();
        if (presentErr) {
          if (presentErr.code === 'Canceled') { setLoading(false); return; }
          throw new Error(presentErr.message);
        }
        confirmed = await confirmOrder(created.id);
      }

      setOrder({
        order_id: confirmed.id,
        nfc_token: confirmed.nfc_token ?? null,
        total_cents: confirmed.total_cents ?? totalCents,
      });
      showPanel('confirmation');
    } catch (err: unknown) {
      Alert.alert('Something went wrong.', err instanceof Error ? err.message : 'Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: c.panelBg }]}>
      <View style={styles.header}>
        <View style={styles.progress}>
          {Array.from({ length: 7 }).map((_, i) => (
            <View key={i} style={[styles.seg, i < 6 && styles.segActive]} />
          ))}
        </View>
        <Text style={styles.stepLabel}>STEP 6 OF 7</Text>
        <Text style={styles.stepTitle}>Review</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: c.card }]}>
          <Row label="STRAWBERRY" value={order.variety_name ?? '—'} c={c} />
          <View style={[styles.divider, { backgroundColor: c.border }]} />
          <Row label="CHOCOLATE" value={order.chocolate_name ?? '—'} c={c} />
          <View style={[styles.divider, { backgroundColor: c.border }]} />
          <Row label="FINISH" value={order.finish_name ?? '—'} c={c} />
          <View style={[styles.divider, { backgroundColor: c.border }]} />
          <Row label="QUANTITY" value={String(order.quantity)} c={c} />
          <View style={[styles.divider, { backgroundColor: c.border }]} />
          <Row label="COLLECTION" value={order.location_name ?? '—'} c={c} />
          <View style={[styles.divider, { backgroundColor: c.border }]} />
          <Row label="WHEN" value={order.time_slot_time ?? '—'} sub={order.date ?? ''} c={c} />
        </View>

        <View style={[styles.totalCard, { backgroundColor: c.green }]}>
          <Text style={styles.totalLabel}>TOTAL</Text>
          <Text style={styles.totalAmount}>CA${(totalCents / 100).toFixed(2)}</Text>
        </View>

        <View style={[styles.emailCard, { backgroundColor: c.card }]}>
          <Text style={[styles.emailLabel, { color: c.muted }]}>EMAIL FOR RECEIPT</Text>
          <TextInput
            style={[styles.emailInput, { color: c.text, borderBottomColor: c.border }]}
            value={email}
            onChangeText={setEmail}
            placeholder="your@email.com"
            placeholderTextColor={c.muted}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
        <View style={{ height: 20 }} />
      </ScrollView>

      <SwipeBar
        label={loading ? 'Processing…' : 'Place Order'}
        onNext={handlePay}
        onBack={goBack}
        disabled={loading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { backgroundColor: colors.green, paddingHorizontal: SPACING.md, paddingTop: 16, paddingBottom: 20 },
  progress: { flexDirection: 'row', gap: 3, marginBottom: 8 },
  seg: { flex: 1, height: 2, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 1 },
  segActive: { backgroundColor: colors.cream },
  stepLabel: { color: 'rgba(255,255,255,0.45)', fontSize: 10, fontFamily: fonts.dmMono, letterSpacing: 1.5, marginBottom: 2 },
  stepTitle: { color: colors.cream, fontSize: 28, fontFamily: fonts.playfair },
  body: { padding: SPACING.md, gap: SPACING.md },
  card: { borderRadius: 14, overflow: 'hidden' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: SPACING.md, paddingVertical: 12, gap: 12 },
  rowLabel: { fontSize: 9, fontFamily: fonts.dmMono, letterSpacing: 1.8, marginTop: 2 },
  rowRight: { flex: 1, alignItems: 'flex-end', gap: 2 },
  rowValue: { fontSize: 14, fontFamily: fonts.playfair, textAlign: 'right' },
  rowSub: { fontSize: 11, fontFamily: fonts.dmSans },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: SPACING.md },
  totalCard: { borderRadius: 14, paddingHorizontal: SPACING.md, paddingVertical: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { color: 'rgba(232,224,208,0.55)', fontSize: 11, fontFamily: fonts.dmMono, letterSpacing: 1.8 },
  totalAmount: { color: colors.cream, fontSize: 22, fontFamily: fonts.playfair },
  emailCard: { borderRadius: 14, padding: SPACING.md, gap: 8 },
  emailLabel: { fontSize: 10, fontFamily: fonts.dmMono, letterSpacing: 1.5 },
  emailInput: { fontSize: 15, fontFamily: fonts.dmSans, paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth },
});
