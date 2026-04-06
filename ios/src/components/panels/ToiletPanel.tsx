import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput,
} from 'react-native';
import { useStripe } from '@stripe/stripe-react-native';
import { usePanel } from '../../context/PanelContext';
import { useColors, fonts, SPACING } from '../../theme';
import { initiateToiletVisit, confirmToiletVisit, submitToiletReview, fetchAdBalance } from '../../lib/api';

type Step = 'pay' | 'code' | 'review' | 'done';

export default function ToiletPanel() {
  const { goBack, activeLocation } = usePanel();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const c = useColors();

  const biz = activeLocation;
  const feeCents = biz?.toilet_fee_cents ?? 150;

  const [step, setStep] = useState<Step>('pay');
  const [adBalance, setAdBalance] = useState(0);

  useEffect(() => {
    fetchAdBalance().then(r => setAdBalance(r.ad_balance_cents)).catch(() => {});
  }, []);
  const [loading, setLoading] = useState(false);
  const [visitId, setVisitId] = useState<number | null>(null);
  const [accessCode, setAccessCode] = useState<string | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  if (!biz) return null;

  const canUseBalance = adBalance >= feeCents;

  const handlePayStripe = async () => {
    setLoading(true);
    try {
      const { visit_id, client_secret } = await initiateToiletVisit(biz.id, 'stripe');
      setVisitId(visit_id);
      const { error: initErr } = await initPaymentSheet({
        paymentIntentClientSecret: client_secret!,
        merchantDisplayName: 'Maison Fraise',
      });
      if (initErr) throw new Error(initErr.message);
      const { error: presentErr } = await presentPaymentSheet();
      if (presentErr) {
        if (presentErr.code !== 'Canceled') throw new Error(presentErr.message);
        return;
      }
      // Confirm and get code
      const { access_code } = await confirmToiletVisit(visit_id);
      setAccessCode(access_code);
      setStep('code');
    } catch (e: any) {
      // silent — user can retry
    } finally {
      setLoading(false);
    }
  };

  const handlePayBalance = async () => {
    setLoading(true);
    try {
      const { visit_id, access_code } = await initiateToiletVisit(biz.id, 'ad_balance');
      setVisitId(visit_id);
      setAccessCode(access_code!);
      setStep('code');
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!visitId || !rating) return;
    setSubmittingReview(true);
    try {
      await submitToiletReview(visitId, rating, note || undefined);
      setStep('done');
    } catch {
      setStep('done');
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: c.panelBg }]}>
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={[styles.backBtnText, { color: c.accent }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: c.text }]}>
          {step === 'pay' ? 'Toilet' : step === 'code' ? 'Access' : step === 'review' ? 'Review' : 'Thank you'}
        </Text>
        <View style={styles.spacer} />
      </View>

      <View style={styles.body}>
        {step === 'pay' && (
          <>
            <Text style={[styles.bizName, { color: c.text }]}>{biz.name}</Text>
            <Text style={[styles.fee, { color: c.accent }]}>CA${(feeCents / 100).toFixed(2)}</Text>
            <Text style={[styles.feeLabel, { color: c.muted }]}>per visit</Text>

            <View style={styles.payButtons}>
              {loading ? (
                <ActivityIndicator color={c.accent} style={{ marginTop: SPACING.lg }} />
              ) : (
                <>
                  {canUseBalance && (
                    <TouchableOpacity
                      style={[styles.payBtn, { backgroundColor: c.accent }]}
                      onPress={handlePayBalance}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.payBtnText, { color: c.ctaText ?? '#fff' }]}>
                        use ad balance  ·  CA${(adBalance / 100).toFixed(2)} available
                      </Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.payBtn, styles.payBtnOutline, { borderColor: c.border }]}
                    onPress={handlePayStripe}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.payBtnText, { color: c.text }]}>pay with card</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </>
        )}

        {step === 'code' && (
          <>
            <Text style={[styles.codeLabel, { color: c.muted }]}>SHOW TO STAFF</Text>
            <Text style={[styles.code, { color: c.text }]}>{accessCode}</Text>
            <Text style={[styles.codeHint, { color: c.muted }]}>{biz.name}</Text>
            <TouchableOpacity
              style={[styles.reviewPromptBtn, { borderColor: c.accent }]}
              onPress={() => setStep('review')}
              activeOpacity={0.8}
            >
              <Text style={[styles.reviewPromptText, { color: c.accent }]}>leave a review →</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={goBack} activeOpacity={0.7} style={{ marginTop: SPACING.md }}>
              <Text style={[styles.skipText, { color: c.muted }]}>skip for now</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 'review' && (
          <>
            <Text style={[styles.reviewTitle, { color: c.text }]}>{biz.name}</Text>
            <Text style={[styles.reviewSubtitle, { color: c.muted }]}>How was the toilet?</Text>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map(n => (
                <TouchableOpacity key={n} onPress={() => setRating(n)} activeOpacity={0.7}>
                  <Text style={[styles.star, { color: n <= (rating ?? 0) ? c.accent : c.border }]}>★</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={[styles.noteInput, { color: c.text, borderColor: c.border }]}
              value={note}
              onChangeText={setNote}
              placeholder="optional note"
              placeholderTextColor={c.muted}
              multiline
              maxLength={200}
            />
            <TouchableOpacity
              style={[styles.payBtn, { backgroundColor: c.accent, opacity: !rating ? 0.4 : 1 }]}
              onPress={handleSubmitReview}
              disabled={!rating || submittingReview}
              activeOpacity={0.8}
            >
              {submittingReview
                ? <ActivityIndicator color={c.ctaText ?? '#fff'} />
                : <Text style={[styles.payBtnText, { color: c.ctaText ?? '#fff' }]}>submit review</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity onPress={goBack} activeOpacity={0.7} style={{ marginTop: SPACING.md }}>
              <Text style={[styles.skipText, { color: c.muted }]}>skip</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 'done' && (
          <>
            <Text style={[styles.doneTitle, { color: c.text }]}>reviewed</Text>
            <Text style={[styles.doneHint, { color: c.muted }]}>your review is the only public signal for this business</Text>
            <TouchableOpacity
              style={[styles.payBtn, { backgroundColor: c.accent, marginTop: SPACING.xl }]}
              onPress={goBack}
              activeOpacity={0.8}
            >
              <Text style={[styles.payBtnText, { color: c.ctaText ?? '#fff' }]}>done</Text>
            </TouchableOpacity>
          </>
        )}
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
  backBtnText: { fontSize: 28, lineHeight: 34 },
  title: { flex: 1, fontSize: 20, fontFamily: fonts.playfair, textAlign: 'center' },
  spacer: { width: 40 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.lg, paddingBottom: 60 },
  bizName: { fontSize: 14, fontFamily: fonts.dmMono, letterSpacing: 1, textAlign: 'center', marginBottom: 16 },
  fee: { fontSize: 52, fontFamily: fonts.playfair, textAlign: 'center' },
  feeLabel: { fontSize: 11, fontFamily: fonts.dmMono, letterSpacing: 1, textAlign: 'center', marginTop: 4, marginBottom: SPACING.xl },
  payButtons: { width: '100%', gap: 12 },
  payBtn: { width: '100%', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  payBtnOutline: { borderWidth: StyleSheet.hairlineWidth },
  payBtnText: { fontSize: 13, fontFamily: fonts.dmMono, letterSpacing: 0.5 },
  codeLabel: { fontSize: 9, fontFamily: fonts.dmMono, letterSpacing: 2, marginBottom: 16 },
  code: { fontSize: 72, fontFamily: fonts.playfair, letterSpacing: 8, textAlign: 'center' },
  codeHint: { fontSize: 11, fontFamily: fonts.dmSans, marginTop: 8, marginBottom: SPACING.xl },
  reviewPromptBtn: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 8 },
  reviewPromptText: { fontSize: 12, fontFamily: fonts.dmMono, letterSpacing: 0.5 },
  skipText: { fontSize: 11, fontFamily: fonts.dmSans },
  reviewTitle: { fontSize: 22, fontFamily: fonts.playfair, textAlign: 'center', marginBottom: 6 },
  reviewSubtitle: { fontSize: 12, fontFamily: fonts.dmSans, marginBottom: SPACING.lg },
  stars: { flexDirection: 'row', gap: 12, marginBottom: SPACING.md },
  star: { fontSize: 40 },
  noteInput: { width: '100%', borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, padding: 12, fontSize: 14, fontFamily: fonts.dmSans, minHeight: 80, textAlignVertical: 'top', marginBottom: SPACING.md },
  doneTitle: { fontSize: 28, fontFamily: fonts.playfair, textAlign: 'center', marginBottom: 12 },
  doneHint: { fontSize: 12, fontFamily: fonts.dmSans, textAlign: 'center', lineHeight: 18 },
});
