import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useNavigation, useRoute, CommonActions } from '@react-navigation/native';
import * as Location from 'expo-location';
import { RootStackParamList } from '../types';
import { isVerified } from '../lib/userId';
import { COLORS, SPACING } from '../theme';

type Nav = NativeStackNavigationProp<RootStackParamList, 'OrderConfirm'>;
type RouteProps = RouteProp<RootStackParamList, 'OrderConfirm'>;

function formatSlot(date: string, time: string): string {
  const d = new Date(date + 'T00:00:00');
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[d.getDay()]} ${months[d.getMonth()]} ${d.getDate()} · ${time}`;
}

export default function OrderConfirmScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProps>();
  const insets = useSafeAreaInsets();
  const {
    orderId, locationName, slotDate, slotTime, totalCents,
    varietyName, nfc_token, chocolate, finish, quantity, variety_id, location_id, priceCents,
  } = route.params;

  const [verified, setVerifiedState] = useState(false);

  useEffect(() => {
    isVerified().then(setVerifiedState);
    requestLocationPermission();
  }, []);

  async function requestLocationPermission() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      await Location.requestBackgroundPermissionsAsync();
    }
  }

  function handleDone() {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      })
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.cream }}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerLabel}>ORDER CONFIRMED</Text>
        <Text style={styles.headerTitle}>{'You\'re all set.'}</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: SPACING.md, gap: SPACING.md, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Order details card */}
        <View style={styles.card}>
          <Row label="ORDER" value={`#${orderId}`} />
          <View style={styles.divider} />
          <Row label="STRAWBERRY" value={varietyName} />
          <View style={styles.divider} />
          <Row label="COLLECTION" value={locationName} />
          <View style={styles.divider} />
          <Row label="WHEN" value={formatSlot(slotDate, slotTime)} />
        </View>

        {/* Total card */}
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>TOTAL</Text>
          <Text style={styles.totalAmount}>CA${(totalCents / 100).toFixed(2)}</Text>
        </View>

        {/* NFC note */}
        {nfc_token && (
          <View style={styles.nfcCard}>
            <Text style={styles.nfcIcon}>⬡</Text>
            <Text style={styles.nfcTitle}>Open your box when you arrive.</Text>
            <Text style={styles.nfcBody}>
              Tap your phone to the NFC chip inside the lid. This links your order to your account and verifies your membership.
            </Text>
          </View>
        )}

        {/* Standing order — verified only */}
        {verified && (
          <TouchableOpacity
            style={styles.standingBtn}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('StandingOrderSetup', {
              variety_id, chocolate, finish, quantity, location_id, priceCents, varietyName,
            })}
          >
            <Text style={styles.standingBtnText}>Make this a standing order  →</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Done button */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
        <TouchableOpacity style={styles.doneBtn} onPress={handleDone} activeOpacity={0.85}>
          <Text style={styles.doneBtnText}>Done</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: COLORS.forestGreen,
    paddingHorizontal: SPACING.md,
    paddingBottom: 28,
  },
  headerLabel: {
    color: 'rgba(232,224,208,0.5)',
    fontSize: 10,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  headerTitle: {
    color: COLORS.cream,
    fontSize: 38,
    fontFamily: 'PlayfairDisplay_700Bold',
    lineHeight: 44,
  },
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    gap: 12,
  },
  rowLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    letterSpacing: 1.8,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  rowValue: {
    fontSize: 15,
    color: COLORS.textDark,
    fontFamily: 'PlayfairDisplay_700Bold',
    textAlign: 'right',
    flex: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.md,
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
    color: 'rgba(232,224,208,0.55)',
    fontSize: 11,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  totalAmount: {
    color: COLORS.cream,
    fontSize: 22,
    fontFamily: 'PlayfairDisplay_700Bold',
  },
  nfcCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(196,151,58,0.3)',
    gap: 8,
  },
  nfcIcon: {
    fontSize: 24,
    color: '#C4973A',
  },
  nfcTitle: {
    fontSize: 16,
    fontFamily: 'PlayfairDisplay_700Bold',
    color: COLORS.textDark,
  },
  nfcBody: {
    fontSize: 14,
    color: COLORS.textMuted,
    lineHeight: 22,
  },
  standingBtn: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  standingBtnText: {
    fontSize: 14,
    color: COLORS.forestGreen,
    fontFamily: 'PlayfairDisplay_700Bold',
  },
  footer: {
    paddingHorizontal: SPACING.md,
    paddingTop: 12,
    backgroundColor: COLORS.cream,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  doneBtn: {
    backgroundColor: COLORS.forestGreen,
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: 'center',
  },
  doneBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
});
