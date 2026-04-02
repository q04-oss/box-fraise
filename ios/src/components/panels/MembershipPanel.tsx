import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useStripe } from '@stripe/stripe-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePanel } from '../../context/PanelContext';
import { fetchMyMembership, createMembershipIntent } from '../../lib/api';
import { useColors, fonts, SPACING } from '../../theme';

const TIERS = [
  { key: 'maison', label: 'Maison', price: '$3,000', desc: 'Annual membership', contactUs: false },
  { key: 'reserve', label: 'Réserve', price: '$30,000', desc: 'Annual membership', contactUs: false },
  { key: 'atelier', label: 'Atelier', price: '$300,000', desc: 'Annual membership', contactUs: false },
  { key: 'fondateur', label: 'Fondateur', price: '$3,000,000', desc: 'Contact us', contactUs: true },
  { key: 'patrimoine', label: 'Patrimoine', price: '$30,000,000', desc: 'Contact us', contactUs: true },
  { key: 'souverain', label: 'Souverain', price: '$300,000,000', desc: 'Contact us', contactUs: true },
  { key: 'unnamed', label: '—', price: '$3,000,000,000', desc: 'Contact us', contactUs: true },
];

const TIER_ANNUAL_CENTS: Record<string, number> = {
  maison: 300000,
  reserve: 3000000,
  atelier: 30000000,
};

export default function MembershipPanel() {
  const { goBack } = usePanel();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const c = useColors();
  const insets = useSafeAreaInsets();

  const [membership, setMembership] = useState<any | null>(null);
  const [fund, setFund] = useState<{ balance_cents: number; cycle_start: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchMyMembership()
      .then(data => {
        setMembership(data.membership);
        setFund(data.fund);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleJoin = async (tierKey: string) => {
    if (paying) return;
    setPaying(tierKey);
    try {
      const { client_secret, amount_cents } = await createMembershipIntent(tierKey);
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
      setSuccess(true);
      // Refresh membership data
      fetchMyMembership().then(data => {
        setMembership(data.membership);
        setFund(data.fund);
      }).catch(() => {});
    } catch (e: any) {
      Alert.alert('Could not start payment', e.message ?? 'Please try again.');
    } finally {
      setPaying(null);
    }
  };

  const formatCurrency = (cents: number) => {
    return `CA$${(cents / 100).toFixed(2)}`;
  };

  const tierAnnualCents = membership ? (TIER_ANNUAL_CENTS[membership.tier] ?? 1) : 1;
  const fundRatio = fund ? Math.min(fund.balance_cents / tierAnnualCents, 1) : 0;

  return (
    <View style={[styles.container, { backgroundColor: c.panelBg, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={[styles.backBtnText, { color: c.accent }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: c.text }]}>Membership</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator color={c.accent} style={{ marginTop: 40 }} />
        ) : success ? (
          <View style={styles.successContainer}>
            <Text style={styles.checkmark}>✓</Text>
            <Text style={[styles.successText, { color: c.text, fontFamily: fonts.playfair }]}>
              Welcome to Maison Fraise
            </Text>
          </View>
        ) : membership ? (
          <>
            <View style={[styles.activeMembershipCard, { backgroundColor: c.card, borderColor: c.border }]}>
              <Text style={[styles.tierName, { color: c.text, fontFamily: fonts.playfair }]}>
                {TIERS.find(t => t.key === membership.tier)?.label ?? membership.tier}
              </Text>
              {membership.renews_at && (
                <Text style={[styles.renewsAt, { color: c.muted, fontFamily: fonts.dmMono }]}>
                  Renews {new Date(membership.renews_at).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })}
                </Text>
              )}
              {fund && (
                <>
                  <Text style={[styles.fundBalance, { color: c.text, fontFamily: fonts.dmMono }]}>
                    {formatCurrency(fund.balance_cents)} in your fund
                  </Text>
                  <View style={[styles.fundBarBg, { backgroundColor: c.border }]}>
                    <View style={[styles.fundBarFill, { backgroundColor: c.accent, width: `${fundRatio * 100}%` }]} />
                  </View>
                </>
              )}
            </View>
          </>
        ) : (
          <>
            <Text style={[styles.sectionLabel, { color: c.muted, fontFamily: fonts.dmMono }]}>
              Choose your tier
            </Text>
            {TIERS.map((tier, idx) => (
              <View
                key={tier.key}
                style={[
                  styles.tierCard,
                  { backgroundColor: c.card, borderColor: c.border },
                  idx < TIERS.length - 1 && { marginBottom: SPACING.sm },
                ]}
              >
                <View style={styles.tierCardContent}>
                  <Text style={[styles.tierCardLabel, { color: c.text, fontFamily: fonts.playfair }]}>
                    {tier.label}
                  </Text>
                  <Text style={[styles.tierCardPrice, { color: c.muted, fontFamily: fonts.dmMono }]}>
                    {tier.price}
                  </Text>
                  <Text style={[styles.tierCardDesc, { color: c.muted, fontFamily: fonts.dmSans }]}>
                    {tier.desc}
                  </Text>
                </View>
                {tier.contactUs ? (
                  <Text style={[styles.contactUsText, { color: c.muted, fontFamily: fonts.dmMono }]}>
                    Contact us
                  </Text>
                ) : (
                  <TouchableOpacity
                    style={[styles.joinBtn, { backgroundColor: c.accent }]}
                    onPress={() => handleJoin(tier.key)}
                    activeOpacity={0.8}
                    disabled={paying !== null}
                  >
                    {paying === tier.key ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={[styles.joinBtnText, { fontFamily: fonts.dmSans }]}>Join</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </>
        )}
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
  body: { padding: SPACING.md, paddingBottom: 40 },
  activeMembershipCard: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  tierName: { fontSize: 28, marginBottom: SPACING.xs },
  renewsAt: { fontSize: 13, marginBottom: SPACING.sm },
  fundBalance: { fontSize: 15, marginBottom: SPACING.sm },
  fundBarBg: { height: 4, borderRadius: 2, overflow: 'hidden' },
  fundBarFill: { height: 4, borderRadius: 2 },
  sectionLabel: { fontSize: 12, letterSpacing: 1, marginBottom: SPACING.md, textTransform: 'uppercase' },
  tierCard: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  tierCardContent: { flex: 1 },
  tierCardLabel: { fontSize: 18, marginBottom: 2 },
  tierCardPrice: { fontSize: 14, marginBottom: 2 },
  tierCardDesc: { fontSize: 12 },
  contactUsText: { fontSize: 13 },
  joinBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    minWidth: 64,
    alignItems: 'center',
  },
  joinBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  successContainer: { alignItems: 'center', paddingTop: 60 },
  checkmark: { fontSize: 48, marginBottom: SPACING.md },
  successText: { fontSize: 22, textAlign: 'center' },
});
