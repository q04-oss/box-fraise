import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useStripe } from '@stripe/stripe-react-native';
import { useColors, fonts, SPACING } from '../../theme';
import { usePanel } from '../../context/PanelContext';
import {
  FraisePopup, fetchFraisePopups,
  joinFraisePopup, confirmFraisePopupJoin, cancelFraisePopup,
} from '../../lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function FraisePopupsPanel() {
  const c = useColors();
  const { goBack } = usePanel();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const [popups, setPopups] = useState<FraisePopup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [joining, setJoining] = useState<number | null>(null);
  const [userId, setUserId] = useState<number | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('user_db_id').then(id => { if (id) setUserId(parseInt(id)); });
  }, []);

  const load = useCallback(async (pull = false) => {
    if (pull) setRefreshing(true); else setLoading(true);
    try {
      const data = await fetchFraisePopups();
      setPopups(data);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleJoin = async (popup: FraisePopup) => {
    if (!userId) { Alert.alert('Sign in required', 'Sign in to your account to join a popup.'); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setJoining(popup.id);
    try {
      const { client_secret } = await joinFraisePopup(popup.id);
      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: client_secret,
        merchantDisplayName: 'Box Fraise',
        applePay: { merchantCountryCode: 'CA', merchantIdentifier: 'merchant.com.boxfraise.app' },
      });
      if (initError) throw new Error(initError.message);
      const { error: payError } = await presentPaymentSheet();
      if (payError) { if (payError.code !== 'Canceled') throw new Error(payError.message); return; }
      await confirmFraisePopupJoin(popup.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("you're in", `You've joined ${popup.title}. We'll notify you when the date is set.`);
      load();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Something went wrong.');
    } finally {
      setJoining(null);
    }
  };

  const handleCancel = (popup: FraisePopup) => {
    Alert.alert('Cancel your spot?', "You'll get a full refund.", [
      { text: 'Keep my spot', style: 'cancel' },
      { text: 'Cancel & refund', style: 'destructive', onPress: async () => {
        try {
          await cancelFraisePopup(popup.id);
          Alert.alert('Refunded', 'Your payment will be returned within a few days.');
          load();
        } catch (e: any) {
          Alert.alert('Error', e.message ?? 'Could not cancel.');
        }
      }},
    ]);
  };

  if (loading) return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <ActivityIndicator color={c.muted} style={{ marginTop: 60 }} />
    </View>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.bg }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={c.muted} />}
    >
      <TouchableOpacity onPress={goBack} style={styles.back}>
        <Text style={[styles.backText, { color: c.muted }]}>← back</Text>
      </TouchableOpacity>

      <Text style={[styles.heading, { color: c.text }]}>popups</Text>
      <Text style={[styles.sub, { color: c.muted }]}>pay to join — date set once threshold is met</Text>

      {popups.length === 0 && (
        <Text style={[styles.empty, { color: c.muted }]}>no popups open right now</Text>
      )}

      {popups.map(popup => {
        const pct = popup.min_seats > 0 ? Math.min(1, popup.seats_claimed / popup.min_seats) : 0;
        const price = `CA$${(popup.price_cents / 100).toFixed(0)}`;
        const isConfirmed = popup.status === 'confirmed';
        const isThreshold = popup.status === 'threshold_met';

        return (
          <View key={popup.id} style={[styles.card, { borderColor: c.border, backgroundColor: c.card }]}>
            <View style={styles.cardTop}>
              <View style={styles.cardTopLeft}>
                <Text style={[styles.bizName, { color: c.muted }]}>{popup.business_name}</Text>
                <Text style={[styles.title, { color: c.text }]}>{popup.title}</Text>
              </View>
              <View style={[styles.badge, {
                backgroundColor: isConfirmed ? '#E8F5E9' : isThreshold ? '#FFF8E1' : c.cardDark,
              }]}>
                <Text style={[styles.badgeText, {
                  color: isConfirmed ? '#388E3C' : isThreshold ? '#F57F17' : c.muted,
                }]}>
                  {isConfirmed ? 'scheduled' : isThreshold ? 'going ahead' : 'open'}
                </Text>
              </View>
            </View>

            {!!popup.description && (
              <Text style={[styles.desc, { color: c.muted }]}>{popup.description}</Text>
            )}

            {isConfirmed && popup.event_date && (
              <Text style={[styles.dateText, { color: c.text }]}>{popup.event_date}</Text>
            )}

            <View style={[styles.progressBar, { backgroundColor: c.cardDark }]}>
              <View style={[styles.progressFill, {
                width: `${Math.round(pct * 100)}%`,
                backgroundColor: isThreshold || isConfirmed ? '#4CAF50' : c.text,
              }]} />
            </View>
            <Text style={[styles.progressLabel, { color: c.muted }]}>
              {popup.seats_claimed} of {popup.min_seats} needed · {popup.seats_claimed}/{popup.max_seats} joined
            </Text>

            <View style={styles.footer}>
              <Text style={[styles.price, { color: c.text }]}>{price} per person</Text>
              {!isConfirmed && popup.seats_claimed < popup.max_seats && (
                <TouchableOpacity
                  style={[styles.joinBtn, { backgroundColor: c.text }]}
                  onPress={() => handleJoin(popup)}
                  disabled={joining === popup.id}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.joinBtnText, { color: c.bg }]}>
                    {joining === popup.id ? '—' : `join · ${price}`}
                  </Text>
                </TouchableOpacity>
              )}
              {isConfirmed && (
                <TouchableOpacity
                  style={[styles.cancelBtn, { borderColor: c.border }]}
                  onPress={() => handleCancel(popup)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.cancelBtnText, { color: c.muted }]}>can't make it</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: SPACING.md, paddingBottom: 60 },
  back: { marginBottom: SPACING.md },
  backText: { fontSize: 13, fontFamily: fonts.dmMono },
  heading: { fontSize: 22, fontFamily: fonts.playfair, marginBottom: 4 },
  sub: { fontSize: 12, fontFamily: fonts.dmMono, marginBottom: SPACING.lg },
  empty: { fontSize: 13, fontFamily: fonts.dmMono, textAlign: 'center', marginTop: 40 },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: SPACING.md, marginBottom: SPACING.md },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  cardTopLeft: { flex: 1, marginRight: 8 },
  bizName: { fontSize: 10, fontFamily: fonts.dmMono, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 },
  title: { fontSize: 16, fontFamily: fonts.playfair },
  badge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 9, fontFamily: fonts.dmMono, letterSpacing: 0.5 },
  desc: { fontSize: 13, fontFamily: fonts.dmSans, lineHeight: 19, marginBottom: SPACING.sm },
  dateText: { fontSize: 13, fontFamily: fonts.dmMono, marginBottom: SPACING.sm },
  progressBar: { height: 3, borderRadius: 2, marginBottom: 6, overflow: 'hidden' },
  progressFill: { height: 3, borderRadius: 2 },
  progressLabel: { fontSize: 10, fontFamily: fonts.dmMono, marginBottom: SPACING.md },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  price: { fontSize: 14, fontFamily: fonts.dmMono },
  joinBtn: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  joinBtnText: { fontSize: 12, fontFamily: fonts.dmMono },
  cancelBtn: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  cancelBtnText: { fontSize: 12, fontFamily: fonts.dmMono },
});
