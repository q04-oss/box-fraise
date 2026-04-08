import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TrueSheet } from '@lodev09/react-native-true-sheet';
import { usePanel } from '../../context/PanelContext';
import { useColors, fonts, SPACING } from '../../theme';
import { readNfcToken, cancelNfc } from '../../lib/nfc';
import { verifyNfc, verifyNfcReorder, fetchStaffOrderByNfc, staffMarkPrepare, staffMarkReady, staffFlagOrder, fetchVarietyProfile, fetchActiveDropForVariety, bulkPrepareOrders, fetchMyScannedVarieties, fetchCollectifRank, fetchPickupGrid, saveTastingRating, fetchNearbyArNotes, postArNote, computeUnlockedAchievements, fetchPersonalBestFlavor, fetchTastingWordCloud, fetchBatchMembers, fetchVarietyStreakLeaders, fetchCurrentChallenge, fetchBundleSuggestion, fetchUpcomingDrop, addToGiftRegistry, fetchStaffExpiryGrid, fetchStaffSessionToday, fetchPostalHeatMap, fetchArPoem, fetchSolarIrradiance, fetchLotCompanions, fetchWalkInToken } from '../../lib/api';
import ARBoxModule, { ARVarietyData } from '../../lib/NativeARBoxModule';
import { logStrawberries, requestHealthKitPermissions, getTodayHealthContext } from '../../lib/HealthKitService';

type State = 'scanning' | 'success' | 'error' | 'revealed';
type FirstTapResult = { streak_weeks?: number; streak_milestone?: boolean; bank_days?: number; tier?: string | null } | null;

export default function VerifyNFCPanel() {
  const { goHome, showPanel } = usePanel();
  const c = useColors();
  const [state, setState] = useState<State>('scanning');
  const [errorMsg, setErrorMsg] = useState('');
  const [revealData, setRevealData] = useState<{ variety_name: string; tasting_notes: string | null; location_id: number | null } | null>(null);
  const [firstTapResult, setFirstTapResult] = useState<FirstTapResult>(null);

  const scan = async () => {
    setState('scanning');
    setErrorMsg('');
    try {
      const token = await readNfcToken();

      // Walk-in purchase tag
      if (token.startsWith('fraise-walkin-')) {
        const data = await fetchWalkInToken(token).catch(() => null);
        if (!data) { setErrorMsg('Tag not recognised.'); setState('error'); return; }

        // Location is a pre-order pickup node — redirect to ordering flow
        if (data.allows_walkin === false) {
          showPanel('location', { preselect_location_id: data.location_id, preselect_location_name: data.location_name });
          return;
        }

        if (data.claimed) {
          const myEmail = await AsyncStorage.getItem('user_email');
          if (myEmail && myEmail === data.owner_email) {
            // Owner scanning their own box — run the full reorder AR flow
            const reorderData = await verifyNfcReorder(token);
            setState('success');
            const arPayload: ARVarietyData = {
              variety_id: reorderData.variety_id,
              variety_name: reorderData.variety_name ?? null,
              farm: reorderData.farm ?? null,
              harvest_date: reorderData.harvest_date ?? null,
              quantity: reorderData.quantity,
              chocolate: reorderData.chocolate,
              finish: reorderData.finish,
              card_type: 'variety',
              order_count: reorderData.order_count ?? 0,
              tasting_word_cloud: [], batch_members: [], lot_companions: [],
            } as any;
            await ARBoxModule.presentAR(arPayload);
            goHome();
          } else {
            // Someone else's box at a walkin location — show remaining inventory
            setState('success');
            showPanel('walk-in-inventory', { location_id: data.location_id, location_name: data.location_name });
          }
        } else {
          setState('success');
          showPanel('walk-in', { walk_in_token: token });
        }
        return;
      }

      // Generic thank-you tag: any user scans → AR overlay
      if (token === 'fraise-thankyou') {
        setState('success');
        await ARBoxModule.presentAR({
          variety_id: 0, variety_name: null, farm: null, harvest_date: null,
          quantity: 0, chocolate: '', finish: '', card_type: 'thankyou',
        } as any);
        goHome();
        return;
      }

      // Feature E: staff AR — check if user is staff before normal flow
      const isStaff = await AsyncStorage.getItem('is_staff') === 'true';
      if (isStaff) {
        // Batch scan token: staff taps "batch scan" button which writes fraise-batch to NFC trigger
        if (token === 'fraise-batch') {
          setState('success');
          const pin = await AsyncStorage.getItem('staff_pin') ?? '';
          const batchResult = await ARBoxModule.presentBatchScanAR();
          if (batchResult?.order_ids?.length) {
            await bulkPrepareOrders(batchResult.order_ids, pin).catch(() => {});
          }
          return;
        }
        const [staffOrderData, pickupSlots] = await Promise.all([
          fetchStaffOrderByNfc(token),
          fetchPickupGrid().catch(() => [] as any[]),
        ]);
        setState('success');
        const [staffExpiryOrders, staffSession, postalHeatMap] = await Promise.all([
          fetchStaffExpiryGrid().catch(() => [] as any[]),
          fetchStaffSessionToday().catch(() => ({ orders_processed: 0, avg_prep_seconds: null, accuracy_pct: null })),
          fetchPostalHeatMap().catch(() => [] as any[]),
        ]);
        const staffPayload = {
          ...staffOrderData,
          pickup_slots: pickupSlots,
          staff_expiry_orders: staffExpiryOrders,
          staff_orders_today: (staffSession as any).orders_processed ?? 0,
          staff_avg_prep_seconds: (staffSession as any).avg_prep_seconds ?? null,
          staff_accuracy_pct: (staffSession as any).accuracy_pct ?? null,
          postal_heat_map: postalHeatMap,
        };
        const actionResult = await ARBoxModule.presentStaffAR(staffPayload);
        if (actionResult) {
          const pin = await AsyncStorage.getItem('staff_pin') ?? '';
          if (actionResult.action === 'prepare') {
            await staffMarkPrepare(pin, actionResult.order_id).catch(() => {});
          } else if (actionResult.action === 'ready') {
            await staffMarkReady(pin, actionResult.order_id).catch(() => {});
          } else if (actionResult.action === 'flag') {
            await staffFlagOrder(pin, actionResult.order_id, '').catch(() => {});
          }
        }
        return;
      }

      const alreadyVerified = await AsyncStorage.getItem('verified') === 'true';

      if (alreadyVerified) {
        const reorderData = await verifyNfcReorder(token);
        setRevealData({
          variety_name: reorderData.variety_name ?? 'Strawberry',
          tasting_notes: null,
          location_id: reorderData.location_id ?? null,
        });
        setState('revealed');
        TrueSheet.present('main-sheet', 2).catch(() => {});
      } else {
        const result = await verifyNfc(token);
        await AsyncStorage.setItem('verified', 'true');
        if (result.fraise_chat_email) {
          await AsyncStorage.setItem('fraise_chat_email', result.fraise_chat_email);
        }
        // Store is_staff flag for future scans
        if (result.is_dj) {
          await AsyncStorage.setItem('is_staff', 'true');
        }
        if (result.quantity) {
          logStrawberries(result.quantity).catch(() => {});
        }
        requestHealthKitPermissions().catch(() => {});
        setFirstTapResult({ streak_weeks: result.streak_weeks, streak_milestone: result.streak_milestone, bank_days: result.bank_days, tier: result.tier });
        setState('success');
        setTimeout(() => showPanel('verified'), result.streak_milestone ? 2000 : 600);
      }
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Scan failed. Try again.');
      setState('error');
    }
  };

  useEffect(() => {
    const t = setTimeout(() => scan(), 350);
    return () => { clearTimeout(t); cancelNfc(); };
  }, []);

  if (state === 'revealed' && revealData) {
    return (
      <View style={[styles.container, { backgroundColor: c.panelBg }]}>
        <View style={styles.revealHeader}>
          <TouchableOpacity onPress={goHome} activeOpacity={0.7}>
            <Text style={[styles.headerBackText, { color: c.accent }]}>←</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.revealBody}>
          <Text style={[styles.collectedLabel, { color: c.muted, fontFamily: fonts.dmMono }]}>COLLECTED</Text>
          <Text style={[styles.revealVariety, { color: c.text, fontFamily: fonts.playfair }]}>{revealData.variety_name}</Text>
          {!!revealData.tasting_notes && (
            <Text style={[styles.revealNotes, { color: c.muted, fontFamily: fonts.dmSans }]}>{revealData.tasting_notes}</Text>
          )}
        </View>
        <TouchableOpacity
          style={[styles.reorderBtn, { backgroundColor: c.accent }]}
          onPress={() => showPanel('location', revealData.location_id ? { preselect_location_id: revealData.location_id } : undefined)}
          activeOpacity={0.8}
        >
          <Text style={[styles.reorderText, { fontFamily: fonts.dmSans }]}>REORDER →</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.panelBg }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { cancelNfc(); goHome(); }} activeOpacity={0.7} style={styles.headerLeft}>
          <Text style={[styles.headerBackText, { color: c.accent }]}>←</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={state === 'error' ? scan : undefined}
          disabled={state !== 'error'}
          activeOpacity={0.6}
          style={styles.headerTitleBtn}
        >
          <Text style={[styles.headerTitle, { color: c.text }]}>
            {state === 'error' ? "Didn't catch it." : 'box fraise'}
          </Text>

        </TouchableOpacity>
        <View style={styles.headerRight} />
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingTop: 24, paddingBottom: 14 },
  revealHeader: { paddingHorizontal: SPACING.md, paddingTop: 24, paddingBottom: 8 },
  revealBody: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.lg, gap: 16 },
  collectedLabel: { fontSize: 11, letterSpacing: 3 },
  revealVariety: { fontSize: 38, textAlign: 'center', lineHeight: 46 },
  revealNotes: { fontSize: 15, textAlign: 'center', lineHeight: 24, marginTop: 8, maxWidth: 300 },
  reorderBtn: { marginHorizontal: SPACING.lg, marginBottom: 40, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  reorderText: { color: '#fff', fontSize: 14, letterSpacing: 1.5 },
  headerLeft: { width: 72 },
  headerRight: { width: 72, alignItems: 'flex-end' },
  headerBackText: { fontSize: 28, lineHeight: 34 },
  headerTitleBtn: { flex: 1 },
  headerTitle: { textAlign: 'center', fontSize: 18, fontFamily: fonts.playfair },
});
