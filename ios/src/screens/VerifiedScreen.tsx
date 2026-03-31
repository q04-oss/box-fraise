import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { COLORS, SPACING } from '../theme';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Verified'>;

export default function VerifiedScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.cream }}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Verified badge */}
        <View style={styles.badge}>
          <View style={styles.badgeInner}>
            <Text style={styles.checkmark}>✓</Text>
          </View>
        </View>

        <Text style={styles.title}>You're in.</Text>
        <Text style={styles.body}>
          Your account is now verified. Standing orders and campaigns will unlock when they're ready.
        </Text>

        {/* Unlocked features */}
        <View style={styles.unlockedCard}>
          <Text style={styles.unlockedHeader}>UNLOCKED</Text>
          <UnlockedRow icon="↻" title="Standing orders" description="Set up weekly, biweekly, or monthly orders." />
          <View style={styles.innerDivider} />
          <UnlockedRow icon="◈" title="Campaign access" description="Portrait sessions at partner salons. Invitations will appear when campaigns open." />
        </View>

        {/* Actions */}
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.navigate('Profile')}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>View your profile</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => navigation.dispatch(
            CommonActions.reset({ index: 0, routes: [{ name: 'Main' }] })
          )}
          activeOpacity={0.7}
        >
          <Text style={styles.secondaryBtnText}>Back to Board</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function UnlockedRow({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <View style={styles.unlockedRow}>
      <View style={styles.unlockedIcon}>
        <Text style={styles.unlockedIconText}>{icon}</Text>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.unlockedTitle}>{title}</Text>
        <Text style={styles.unlockedDesc}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.lg,
  },
  badge: {
    width: 108,
    height: 108,
    borderRadius: 54,
    borderWidth: 3,
    borderColor: '#C4973A',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.forestGreen,
    marginBottom: 8,
  },
  badgeInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(196,151,58,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: { fontSize: 32, color: '#C4973A' },
  title: {
    fontSize: 38,
    fontFamily: 'PlayfairDisplay_700Bold',
    color: COLORS.textDark,
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 24,
  },
  unlockedCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    padding: SPACING.md,
    width: '100%',
    gap: 12,
  },
  unlockedHeader: {
    fontSize: 10,
    color: COLORS.textMuted,
    letterSpacing: 2,
    fontWeight: '700',
    marginBottom: 4,
  },
  unlockedRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  unlockedIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(28,58,42,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unlockedIconText: { fontSize: 16, color: COLORS.forestGreen },
  unlockedTitle: {
    fontSize: 15,
    fontFamily: 'PlayfairDisplay_700Bold',
    color: COLORS.textDark,
  },
  unlockedDesc: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 20,
  },
  innerDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.border,
  },
  primaryBtn: {
    backgroundColor: COLORS.forestGreen,
    borderRadius: 30,
    paddingVertical: 16,
    paddingHorizontal: 40,
    width: '100%',
    alignItems: 'center',
  },
  primaryBtnText: {
    color: COLORS.cream,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  secondaryBtn: {
    paddingVertical: 12,
  },
  secondaryBtnText: {
    color: COLORS.textMuted,
    fontSize: 14,
    letterSpacing: 0.5,
  },
});
