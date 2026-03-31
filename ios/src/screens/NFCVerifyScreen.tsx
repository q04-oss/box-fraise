import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import NfcManager, { NfcTech } from 'react-native-nfc-manager';
import { RootStackParamList } from '../types';
import { getUserId, setVerified } from '../lib/userId';
import { verifyNfc } from '../lib/api';
import { COLORS, SPACING } from '../theme';

type Nav = NativeStackNavigationProp<RootStackParamList, 'NFCVerify'>;

export default function NFCVerifyScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState<'scanning' | 'error' | 'success'>('scanning');
  const [errorMessage, setErrorMessage] = useState('');
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    startPulse();
    startScan();
    return () => {
      NfcManager.cancelTechnologyRequest().catch(() => {});
    };
  }, []);

  function startPulse() {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.18, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }

  async function startScan() {
    try {
      await NfcManager.start();
      await NfcManager.requestTechnology(NfcTech.Ndef);
      const tag = await NfcManager.getTag();
      const nfcToken = tag?.id ?? tag?.ndefMessage?.[0]?.payload?.toString();

      if (!nfcToken) {
        throw new Error('Could not read tag.');
      }

      const userId = await getUserId();
      await verifyNfc(nfcToken, userId);
      await setVerified();
      setStatus('success');
      navigation.replace('Verified');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not read the chip.';
      setStatus('error');
      setErrorMessage(msg);
    } finally {
      NfcManager.cancelTechnologyRequest().catch(() => {});
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.cream }}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← BACK</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.pulseContainer}>
          <Animated.View style={[styles.pulseOuter, { transform: [{ scale: pulse }] }]} />
          <View style={styles.pulseInner}>
            <Text style={styles.boxIcon}>⬡</Text>
          </View>
        </View>

        <Text style={styles.title}>Tap the box.</Text>
        <Text style={styles.subtitle}>
          Hold your phone to the NFC chip inside the lid. This links your order to your account.
        </Text>

        {status === 'error' && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{errorMessage}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => { setStatus('scanning'); startScan(); }}>
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: SPACING.md,
    paddingBottom: 12,
  },
  backBtn: { paddingVertical: 6 },
  backText: { color: COLORS.textMuted, fontSize: 13, letterSpacing: 0.5 },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.lg,
  },
  pulseContainer: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  pulseOuter: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(28,58,42,0.12)',
  },
  pulseInner: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.forestGreen,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#C4973A',
  },
  boxIcon: { fontSize: 38, color: '#C4973A' },
  title: {
    fontSize: 34,
    fontFamily: 'PlayfairDisplay_700Bold',
    color: COLORS.textDark,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 24,
  },
  errorCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    padding: SPACING.md,
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  errorText: {
    fontSize: 14,
    color: '#C0392B',
    textAlign: 'center',
    lineHeight: 22,
  },
  retryBtn: {
    backgroundColor: COLORS.forestGreen,
    borderRadius: 22,
    paddingVertical: 12,
    paddingHorizontal: 28,
  },
  retryText: {
    color: COLORS.cream,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
