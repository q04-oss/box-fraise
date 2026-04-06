import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useStripe } from '@stripe/stripe-react-native';
import { usePanel } from '../../context/PanelContext';
import { useColors, fonts, SPACING } from '../../theme';
import { fetchGreenhouseDetail, fundGreenhouse } from '../../lib/api';

const YEAR_OPTIONS = [3, 5, 10] as const;

export default function GreenhouseDetailPanel() {
  const { goBack, panelData } = usePanel();
  const c = useColors();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const [greenhouse, setGreenhouse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYears, setSelectedYears] = useState<number>(3);
  const [funding, setFunding] = useState(false);
  const [funded, setFunded] = useState(false);

  const id: number | undefined = panelData?.id;

  useEffect(() => {
    if (!id) { setLoading(false); setError('No greenhouse selected.'); return; }
    fetchGreenhouseDetail(id)
      .then(setGreenhouse)
      .catch(() => setError('Could not load greenhouse.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleFund = async () => {
    if (!id || funding) return;
    setFunding(true);
    try {
      const { client_secret } = await fundGreenhouse(id, selectedYears);
      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: client_secret,
        merchantDisplayName: 'Maison Fraise',
        applePay: { merchantCountryCode: 'CA' },
        style: 'alwaysLight',
      });
      if (initError) throw new Error(initError.message);
      const { error: presentError } = await presentPaymentSheet();
      if (presentError) {
        if (presentError.code !== 'Canceled') Alert.alert('Payment failed', presentError.message);
        return;
      }
      setFunded(true);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Something went wrong');
    } finally {
      setFunding(false);
    }
  };

  if (!id) {
    return (
      <View style={[styles.container, { backgroundColor: c.panelBg }]}>
        <View style={[styles.header, { borderBottomColor: c.border }]}>
          <TouchableOpacity onPress={goBack} activeOpacity={0.7} style={styles.backBtn}>
            <Text style={[styles.backText, { color: c.accent }]}>←</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: c.text }]}>GREENHOUSE</Text>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: c.muted }]}>No greenhouse selected.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.panelBg }]}>
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <TouchableOpacity onPress={goBack} activeOpacity={0.7} style={styles.backBtn}>
          <Text style={[styles.backText, { color: c.accent }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: c.text }]}>GREENHOUSE</Text>
        <View style={styles.backBtn} />
      </View>

      {loading ? (
        <ActivityIndicator color={c.accent} style={{ marginTop: 40 }} />
      ) : error ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: c.muted }]}>{error}</Text>
        </View>
      ) : funded ? (
        <View style={styles.success}>
          <Text style={[styles.successTitle, { color: c.text }]}>Thank you</Text>
          <Text style={[styles.successBody, { color: c.muted }]}>
            You are now the founding patron of {greenhouse?.name}. Your {selectedYears}-year stewardship begins today.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={[styles.section, { borderBottomColor: c.border }]}>
            <Text style={[styles.name, { color: c.text }]}>{greenhouse?.name}</Text>
            {greenhouse?.location && (
              <Text style={[styles.location, { color: c.muted }]}>{greenhouse.location}</Text>
            )}
            <View style={[styles.statusPill, { borderColor: c.border }]}>
              <Text style={[styles.statusText, { color: c.accent }]}>{greenhouse?.status}</Text>
            </View>
          </View>

          {greenhouse?.description && (
            <View style={[styles.section, { borderBottomColor: c.border }]}>
              <Text style={[styles.description, { color: c.text }]}>{greenhouse.description}</Text>
            </View>
          )}

          {/* Funding progress */}
          <View style={[styles.section, { borderBottomColor: c.border }]}>
            <Text style={[styles.sectionLabel, { color: c.muted }]}>FUNDING</Text>
            <View style={[styles.progressTrack, { backgroundColor: c.border }]}>
              <View style={[
                styles.progressFill,
                {
                  width: `${Math.min(100, (greenhouse?.funding_progress ?? 0) * 100)}%`,
                  backgroundColor: c.accent,
                },
              ]} />
            </View>
            <Text style={[styles.progressLabel, { color: c.muted }]}>
              CA${((greenhouse?.funded_cents ?? 0) / 100).toFixed(0)} of CA${((greenhouse?.funding_goal_cents ?? 0) / 100).toFixed(0)}
            </Text>
            {greenhouse?.founding_patron_display_name && (
              <Text style={[styles.patronName, { color: c.muted }]}>
                Patron: {greenhouse.founding_patron_display_name}
              </Text>
            )}
          </View>

          {/* Year selector */}
          {greenhouse?.status === 'funding' && !greenhouse?.founding_patron_id && (
            <View style={[styles.section, { borderBottomColor: c.border }]}>
              <Text style={[styles.sectionLabel, { color: c.muted }]}>FOUNDING YEARS</Text>
              <View style={styles.yearRow}>
                {YEAR_OPTIONS.map(y => (
                  <TouchableOpacity
                    key={y}
                    style={[
                      styles.yearBtn,
                      { borderColor: selectedYears === y ? c.accent : c.border },
                    ]}
                    onPress={() => setSelectedYears(y)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.yearText, { color: selectedYears === y ? c.accent : c.muted }]}>
                      {y}yr
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.fundBtn, { borderColor: c.accent }]}
                onPress={handleFund}
                disabled={funding}
                activeOpacity={0.7}
              >
                {funding
                  ? <ActivityIndicator size="small" color={c.accent} />
                  : <Text style={[styles.fundBtnText, { color: c.accent }]}>
                      Become Founding Patron · {selectedYears} years →
                    </Text>
                }
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 60 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 40 },
  backText: { fontSize: 22 },
  title: { fontFamily: fonts.dmMono, fontSize: 11, letterSpacing: 1.5 },
  scroll: { paddingBottom: 60 },
  empty: { marginTop: 60, alignItems: 'center', paddingHorizontal: SPACING.lg },
  emptyText: { fontFamily: fonts.dmSans, fontSize: 14, textAlign: 'center' },
  success: { marginTop: 60, alignItems: 'center', paddingHorizontal: SPACING.lg, gap: SPACING.md },
  successTitle: { fontFamily: fonts.playfair, fontSize: 28, textAlign: 'center' },
  successBody: { fontFamily: fonts.dmSans, fontSize: 15, textAlign: 'center', lineHeight: 24 },
  section: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth, gap: 8,
  },
  name: { fontFamily: fonts.playfair, fontSize: 28 },
  location: { fontFamily: fonts.dmMono, fontSize: 10, letterSpacing: 1 },
  statusPill: {
    borderWidth: StyleSheet.hairlineWidth, borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start',
  },
  statusText: { fontFamily: fonts.dmMono, fontSize: 9, letterSpacing: 1 },
  description: { fontFamily: fonts.dmSans, fontSize: 15, lineHeight: 24 },
  sectionLabel: { fontFamily: fonts.dmMono, fontSize: 9, letterSpacing: 1.5 },
  progressTrack: { height: 3, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 3, borderRadius: 2 },
  progressLabel: { fontFamily: fonts.dmMono, fontSize: 9, letterSpacing: 0.5 },
  patronName: { fontFamily: fonts.dmMono, fontSize: 9, letterSpacing: 0.5 },
  yearRow: { flexDirection: 'row', gap: SPACING.sm },
  yearBtn: {
    borderWidth: StyleSheet.hairlineWidth, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  yearText: { fontFamily: fonts.dmMono, fontSize: 12 },
  fundBtn: {
    borderWidth: StyleSheet.hairlineWidth, borderRadius: 24,
    paddingHorizontal: SPACING.md, paddingVertical: 12,
    alignItems: 'center', marginTop: 4,
  },
  fundBtnText: { fontFamily: fonts.dmMono, fontSize: 12, letterSpacing: 0.5 },
});
