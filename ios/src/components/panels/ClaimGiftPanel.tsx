import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePanel } from '../../context/PanelContext';
import { useColors, fonts, SPACING } from '../../theme';
import { API_BASE_URL } from '../../config/api';

type Step = 'code' | 'shipping' | 'claimed';

export default function ClaimGiftPanel() {
  const { goBack } = usePanel();
  const c = useColors();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<Step>('code');
  const [claimToken, setClaimToken] = useState('');
  const [giftType, setGiftType] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Shipping fields
  const [shippingName, setShippingName] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingCity, setShippingCity] = useState('');
  const [shippingProvince, setShippingProvince] = useState('');
  const [shippingPostal, setShippingPostal] = useState('');

  const handleSubmitCode = async () => {
    const token = claimToken.trim().toUpperCase();
    if (token.length < 6) {
      Alert.alert('Invalid code', 'Please enter your full claim code.');
      return;
    }
    const authToken = await AsyncStorage.getItem('auth_token');
    if (!authToken) {
      Alert.alert('Sign in required', 'Please sign in before claiming a gift.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/gifts/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ claim_token: token }),
      });
      const data = await res.json();

      if (res.status === 400 && data.error === 'shipping_required') {
        setGiftType(data.gift_type);
        setStep('shipping');
        return;
      }
      if (!res.ok) {
        const msg = data.error === 'already_claimed' ? 'This gift has already been claimed.'
          : data.error === 'gift_not_paid' ? 'This gift hasn\'t been paid for yet.'
          : data.error === 'gift_not_found' ? 'Gift code not found. Check the code and try again.'
          : 'Something went wrong.';
        Alert.alert('Could not claim', msg);
        return;
      }
      setGiftType(data.gift_type);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep('claimed');
    } catch {
      Alert.alert('Error', 'Could not reach the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitShipping = async () => {
    if (!shippingName || !shippingAddress || !shippingCity || !shippingProvince || !shippingPostal) {
      Alert.alert('Missing details', 'Please fill in all shipping fields.');
      return;
    }
    const authToken = await AsyncStorage.getItem('auth_token');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/gifts/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          claim_token: claimToken.trim().toUpperCase(),
          shipping_name: shippingName,
          shipping_address: shippingAddress,
          shipping_city: shippingCity,
          shipping_province: shippingProvince,
          shipping_postal_code: shippingPostal,
        }),
      });
      if (!res.ok) {
        Alert.alert('Could not claim', 'Something went wrong. Please try again.');
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep('claimed');
    } catch {
      Alert.alert('Error', 'Could not reach the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'claimed') {
    const isPhysical = giftType === 'physical' || giftType === 'bundle';
    const isDigital = giftType === 'digital' || giftType === 'bundle';
    return (
      <View style={[styles.container, { backgroundColor: c.panelBg }]}>
        <View style={[styles.header, { borderBottomColor: c.border }]}>
          <View style={styles.backBtn} />
          <Text style={[styles.title, { color: c.text }]}>Gift claimed</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.claimedBody}>
          <Text style={styles.claimedEmoji}>🍓</Text>
          <Text style={[styles.claimedHeading, { color: c.text }]}>It's yours.</Text>
          {isDigital && (
            <Text style={[styles.claimedSub, { color: c.muted }]}>Your digital sticker is now in your collection.</Text>
          )}
          {isPhysical && (
            <Text style={[styles.claimedSub, { color: c.muted }]}>Your physical sticker pack will be mailed to the address you provided.</Text>
          )}
          <TouchableOpacity
            style={[styles.doneBtn, { backgroundColor: c.accent }]}
            onPress={goBack}
            activeOpacity={0.8}
          >
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (step === 'shipping') {
    return (
      <View style={[styles.container, { backgroundColor: c.panelBg }]}>
        <View style={[styles.header, { borderBottomColor: c.border }]}>
          <TouchableOpacity onPress={() => setStep('code')} style={styles.backBtn} activeOpacity={0.7}>
            <Text style={[styles.backBtnText, { color: c.accent }]}>←</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: c.text }]}>Shipping address</Text>
          <View style={styles.headerSpacer} />
        </View>
        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={[styles.hint, { color: c.muted, marginBottom: SPACING.md }]}>
            Where should we mail your sticker pack?
          </Text>
          {[
            { label: 'FULL NAME', value: shippingName, set: setShippingName, placeholder: 'Jane Smith' },
            { label: 'ADDRESS', value: shippingAddress, set: setShippingAddress, placeholder: '123 Main Street' },
            { label: 'CITY', value: shippingCity, set: setShippingCity, placeholder: 'Edmonton' },
            { label: 'PROVINCE / STATE', value: shippingProvince, set: setShippingProvince, placeholder: 'AB' },
            { label: 'POSTAL CODE', value: shippingPostal, set: setShippingPostal, placeholder: 'T5J 1A1' },
          ].map(field => (
            <View key={field.label} style={{ marginBottom: 14 }}>
              <Text style={[styles.fieldLabel, { color: c.muted }]}>{field.label}</Text>
              <View style={[styles.inputWrapper, { borderColor: c.border, backgroundColor: c.card }]}>
                <TextInput
                  style={[styles.input, { color: c.text }]}
                  placeholder={field.placeholder}
                  placeholderTextColor={c.muted}
                  value={field.value}
                  onChangeText={field.set}
                  autoCapitalize="words"
                />
              </View>
            </View>
          ))}
          <View style={{ height: 120 }} />
        </ScrollView>
        <View style={[styles.actionBar, { borderTopColor: c.border, paddingBottom: Math.max(insets.bottom, SPACING.md) }]}>
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: c.accent, opacity: loading ? 0.7 : 1 }]}
            onPress={handleSubmitShipping}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.sendBtnText}>Claim gift →</Text>}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.panelBg }]}>
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={[styles.backBtnText, { color: c.accent }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: c.text }]}>Claim a gift</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.body}>
        <View style={styles.bodyContent}>
          <Text style={[styles.hint, { color: c.muted, marginBottom: SPACING.lg }]}>
            Enter the claim code from your email.
          </Text>
          <View style={[styles.inputWrapper, { borderColor: c.border, backgroundColor: c.card }]}>
            <TextInput
              style={[styles.codeInput, { color: c.text }]}
              placeholder="XXXX-XXXX"
              placeholderTextColor={c.muted}
              value={claimToken}
              onChangeText={t => setClaimToken(t.toUpperCase())}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={9}
            />
          </View>
        </View>
      </View>

      <View style={[styles.actionBar, { borderTopColor: c.border, paddingBottom: Math.max(insets.bottom, SPACING.md) }]}>
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: c.accent, opacity: loading ? 0.7 : 1 }]}
          onPress={handleSubmitCode}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.sendBtnText}>Claim →</Text>}
        </TouchableOpacity>
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
  title: { flex: 1, textAlign: 'center', fontSize: 20, fontFamily: fonts.playfair },
  headerSpacer: { width: 40 },
  body: { flex: 1 },
  bodyContent: { paddingHorizontal: SPACING.md, paddingTop: SPACING.lg },
  hint: { fontSize: 12, fontFamily: fonts.dmMono, letterSpacing: 0.3, lineHeight: 18 },
  fieldLabel: { fontSize: 9, fontFamily: fonts.dmMono, letterSpacing: 1.5, marginBottom: 6 },
  inputWrapper: {
    borderWidth: StyleSheet.hairlineWidth, borderRadius: 12,
    paddingHorizontal: SPACING.md, paddingVertical: 14,
  },
  input: { fontSize: 15, fontFamily: fonts.dmSans },
  codeInput: { fontSize: 22, fontFamily: fonts.dmMono, letterSpacing: 4, textAlign: 'center' },
  actionBar: {
    paddingHorizontal: SPACING.md, paddingTop: SPACING.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  sendBtn: { paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  sendBtnText: { fontSize: 14, fontFamily: fonts.dmSans, fontWeight: '600', color: '#fff' },
  claimedBody: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.lg, gap: 16 },
  claimedEmoji: { fontSize: 48 },
  claimedHeading: { fontSize: 26, fontFamily: fonts.playfair, fontStyle: 'italic' },
  claimedSub: { fontSize: 13, fontFamily: fonts.dmMono, letterSpacing: 0.3, textAlign: 'center', lineHeight: 20 },
  doneBtn: { marginTop: 8, paddingVertical: 16, paddingHorizontal: 40, borderRadius: 14, alignItems: 'center' },
  doneBtnText: { fontSize: 14, fontFamily: fonts.dmSans, fontWeight: '600', color: '#fff' },
});
