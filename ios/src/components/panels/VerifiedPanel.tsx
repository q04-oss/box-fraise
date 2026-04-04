import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Clipboard } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePanel } from '../../context/PanelContext';
import { useColors, fonts } from '../../theme';
import { SPACING } from '../../theme';

export default function VerifiedPanel() {
  const { goHome, showPanel } = usePanel();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [fraiseChatEmail, setFraiseChatEmail] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('fraise_chat_email').then(v => { if (v) setFraiseChatEmail(v); });
  }, []);

  const handleCopyEmail = () => {
    if (!fraiseChatEmail) return;
    Clipboard.setString(fraiseChatEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View style={[styles.container, { backgroundColor: c.panelBg }]}>
      <View style={styles.body}>
        <View style={[styles.badge, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.check, { color: c.accent }]}>✓</Text>
        </View>
        <Text style={[styles.title, { color: c.text }]}>You're in.</Text>
        <Text style={[styles.subtitle, { color: c.muted }]}>Your account is now verified. Standing orders and campaigns will unlock when they're ready.</Text>

        {fraiseChatEmail && (
          <TouchableOpacity
            style={[styles.emailCard, { backgroundColor: c.card, borderColor: c.border }]}
            onPress={handleCopyEmail}
            activeOpacity={0.8}
          >
            <Text style={[styles.emailLabel, { color: c.muted }]}>YOUR ADDRESS</Text>
            <Text style={[styles.emailValue, { color: c.text }]}>{fraiseChatEmail}</Text>
            <Text style={[styles.emailHint, { color: c.accent }]}>{copied ? 'Copied.' : 'Tap to copy'}</Text>
          </TouchableOpacity>
        )}

        <View style={[styles.unlockedCard, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.unlockedHeader, { color: c.muted }]}>UNLOCKED</Text>
          <View style={styles.unlockedRow}>
            <Text style={[styles.unlockedIcon, { color: c.accent }]}>↻</Text>
            <View style={styles.unlockedText}>
              <Text style={[styles.unlockedTitle, { color: c.text }]}>Standing orders</Text>
              <Text style={[styles.unlockedDesc, { color: c.muted }]}>Set up weekly, biweekly, or monthly orders.</Text>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: c.border }]} />
          <View style={styles.unlockedRow}>
            <Text style={[styles.unlockedIcon, { color: c.accent }]}>◈</Text>
            <View style={styles.unlockedText}>
              <Text style={[styles.unlockedTitle, { color: c.text }]}>Campaign access</Text>
              <Text style={[styles.unlockedDesc, { color: c.muted }]}>Portrait sessions at partner salons.</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.standingBtn, { backgroundColor: c.card, borderColor: c.border }]}
          onPress={() => showPanel('standingOrder')}
          activeOpacity={0.85}
        >
          <Text style={[styles.standingBtnText, { color: c.accent }]}>Set up a standing order →</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.footer, { borderTopColor: c.border, paddingBottom: insets.bottom || SPACING.md }]}>
        <TouchableOpacity
          style={[styles.doneBtn, { backgroundColor: c.text }]}
          onPress={goHome}
          activeOpacity={0.8}
        >
          <Text style={[styles.doneBtnText, { color: c.ctaText }]}>Done</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { flex: 1, padding: SPACING.md, gap: SPACING.md, alignItems: 'center', justifyContent: 'center' },
  badge: {
    width: 72, height: 72, borderRadius: 36,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center', justifyContent: 'center',
  },
  check: { fontSize: 32 },
  title: { fontSize: 32, fontFamily: fonts.playfair },
  subtitle: { fontSize: 15, fontFamily: fonts.dmSans, textAlign: 'center', lineHeight: 24 },
  emailCard: {
    borderRadius: 14, padding: SPACING.md, width: '100%',
    borderWidth: StyleSheet.hairlineWidth, gap: 4,
  },
  emailLabel: { fontSize: 10, fontFamily: fonts.dmMono, letterSpacing: 2 },
  emailValue: { fontSize: 17, fontFamily: fonts.dmMono },
  emailHint: { fontSize: 11, fontFamily: fonts.dmMono, letterSpacing: 0.5 },
  unlockedCard: { borderRadius: 14, padding: SPACING.md, width: '100%', gap: 12, borderWidth: StyleSheet.hairlineWidth },
  unlockedHeader: { fontSize: 10, fontFamily: fonts.dmMono, letterSpacing: 2 },
  unlockedRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  unlockedIcon: { fontSize: 16, width: 24, textAlign: 'center', marginTop: 2 },
  unlockedText: { flex: 1 },
  unlockedTitle: { fontSize: 15, fontFamily: fonts.playfair },
  unlockedDesc: { fontSize: 13, fontFamily: fonts.dmSans, lineHeight: 20 },
  divider: { height: StyleSheet.hairlineWidth },
  standingBtn: { borderRadius: 14, padding: SPACING.md, width: '100%', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth },
  standingBtnText: { fontSize: 14, fontFamily: fonts.playfair },
  footer: { padding: SPACING.md, borderTopWidth: StyleSheet.hairlineWidth },
  doneBtn: { borderRadius: 16, paddingVertical: 20, alignItems: 'center' },
  doneBtnText: { fontSize: 16, fontFamily: fonts.dmSans, fontWeight: '700' },
});
