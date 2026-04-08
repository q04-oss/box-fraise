import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, SafeAreaView, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColors, fonts } from '../theme';
import { SPACING } from '../theme';
import { applyReferralCode } from '../lib/api';

const { width: W } = Dimensions.get('window');

const STEPS = [
  {
    kanji: '旬',
    title: 'Box Fraise',
    subtitle: 'A seasonal strawberry atelier in Montréal.',
    body: 'We source directly from small farms and offer curated varieties by the box — chocolate-dipped, finished with fleur de sel or or fin.',
  },
  {
    kanji: '場',
    title: 'The Platform',
    subtitle: 'More than an order.',
    body: 'Follow photographers and DJs. Discover popup events. Nominate people you love into our world.',
  },
  {
    kanji: '始',
    title: 'Ready?',
    subtitle: 'Sign in to continue.',
    body: 'Your Apple ID keeps everything private. No passwords, no newsletters — just strawberries.',
  },
];

interface Props {
  onDone: () => void;
}

export default function OnboardingScreen({ onDone }: Props) {
  const c = useColors();
  const [step, setStep] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  React.useEffect(() => {
    AsyncStorage.getItem('user_db_id').then(id => setIsLoggedIn(!!id));
  }, []);

  const handleReferralCode = () => {
    Alert.prompt('Referral Code', 'Enter your code for 10% off your first order', async (code) => {
      if (!code) return;
      try {
        await applyReferralCode(code.toUpperCase());
        Alert.alert('', '10% discount applied to your first order 🍓');
      } catch {
        Alert.alert('', 'Code not found or already used.');
      }
    });
  };

  const handleNext = async () => {
    if (isLast) {
      await AsyncStorage.setItem('onboarding_done', '1');
      onDone();
    } else {
      setStep(s => s + 1);
    }
  };

  const handleSkip = async () => {
    await AsyncStorage.setItem('onboarding_done', '1');
    onDone();
  };

  return (
    <View style={[styles.container, { backgroundColor: c.panelBg }]}>
      <SafeAreaView style={styles.safe}>
        {/* Kanji */}
        <Text style={[styles.kanji, { color: c.border }]}>{current.kanji}</Text>

        {/* Content */}
        <View style={styles.content}>
          <Text style={[styles.title, { color: c.text }]}>{current.title}</Text>
          <Text style={[styles.subtitle, { color: c.accent }]}>{current.subtitle}</Text>
          <Text style={[styles.body, { color: c.muted }]}>{current.body}</Text>
        </View>

        {/* Dots */}
        <View style={styles.dots}>
          {STEPS.map((_, i) => (
            <View key={i} style={[styles.dot, { backgroundColor: i === step ? c.accent : c.border }]} />
          ))}
        </View>

        {/* Button */}
        <TouchableOpacity style={[styles.btn, { backgroundColor: c.accent }]} onPress={handleNext} activeOpacity={0.85}>
          <Text style={styles.btnText}>{isLast ? 'GET STARTED' : 'CONTINUE'}</Text>
        </TouchableOpacity>

        {isLast && isLoggedIn && (
          <TouchableOpacity onPress={handleReferralCode} style={styles.referralBtn} activeOpacity={0.7}>
            <Text style={[styles.referralText, { color: c.muted }]}>Have a referral code?</Text>
          </TouchableOpacity>
        )}

        {isLast && (
          <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
            <Text style={[styles.skipText, { color: c.muted }]}>Skip</Text>
          </TouchableOpacity>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, alignItems: 'center', paddingHorizontal: SPACING.md, paddingTop: 60, paddingBottom: 48 },
  kanji: { fontSize: 120, fontFamily: fonts.playfair, opacity: 0.15, position: 'absolute', top: 40, right: -10 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'flex-start', width: '100%', gap: 16, paddingTop: 60 },
  title: { fontSize: 36, fontFamily: fonts.playfair, lineHeight: 44 },
  subtitle: { fontSize: 16, fontFamily: fonts.dmSans, fontStyle: 'italic' },
  body: { fontSize: 15, fontFamily: fonts.dmSans, lineHeight: 24 },
  dots: { flexDirection: 'row', gap: 8, marginBottom: 32 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  btn: { width: '100%', paddingVertical: 18, borderRadius: 30, alignItems: 'center' },
  btnText: { fontFamily: fonts.dmMono, fontSize: 12, letterSpacing: 2, color: '#0C0C0E' },
  referralBtn: { marginTop: 16, paddingVertical: 6, alignItems: 'center' },
  referralText: { fontFamily: fonts.dmMono, fontSize: 12, textAlign: 'center' },
  skipBtn: { marginTop: 20, paddingVertical: 8 },
  skipText: { fontFamily: fonts.dmSans, fontSize: 13 },
});
