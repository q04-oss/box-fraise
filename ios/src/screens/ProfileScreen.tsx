import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { getUserId } from '../lib/userId';
import { fetchUserProfile } from '../lib/api';
import { COLORS, SPACING } from '../theme';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Profile'>;

interface Profile {
  id: number;
  email: string;
  verified: boolean;
  verified_at: string | null;
  photographed: boolean;
  campaign_interest: boolean;
  created_at: string;
  legitimacy_score: number;
}

export default function ProfileScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [campaignInterest, setCampaignInterest] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const id = await getUserId();
      setUserId(id);
      // Profile requires numeric ID from server — skip if not yet registered
    } catch {
    } finally {
      setLoading(false);
    }
  }

  const verified = profile?.verified ?? false;
  const initials = userId ? userId.substring(3, 7) : '—';

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.cream }}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← BACK</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: SPACING.md, gap: SPACING.md, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator color={COLORS.forestGreen} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Avatar + status */}
            <View style={styles.avatarSection}>
              <View style={[styles.avatar, verified && styles.avatarVerified]}>
                {verified ? (
                  <Text style={styles.avatarInitials}>{initials}</Text>
                ) : (
                  <View style={styles.avatarHollow} />
                )}
              </View>
              <View style={styles.badgeRow}>
                <View style={[styles.badge, verified ? styles.badgeGreen : styles.badgeMuted]}>
                  <Text style={[styles.badgeText, verified ? styles.badgeTextGreen : styles.badgeTextMuted]}>
                    {verified ? 'VERIFIED' : 'NOT YET VERIFIED'}
                  </Text>
                </View>
                {profile?.photographed && (
                  <View style={[styles.badge, styles.badgeGold]}>
                    <Text style={[styles.badgeText, styles.badgeTextGold]}>PHOTOGRAPHED</Text>
                  </View>
                )}
              </View>
              <Text style={styles.userId}>{userId}</Text>
            </View>

            {verified ? (
              <>
                {/* Verified profile */}
                <View style={styles.card}>
                  <InfoRow label="MEMBER SINCE" value={profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-CA', { year: 'numeric', month: 'long' }) : '—'} />
                  <View style={styles.divider} />
                  <InfoRow label="NETWORK STANDING" value={String(profile?.legitimacy_score ?? 0)} />
                </View>

                {/* Campaign interest toggle */}
                <View style={styles.card}>
                  <View style={styles.toggleRow}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={styles.toggleLabel}>Campaign interest</Text>
                      <Text style={styles.toggleDesc}>We'll notify you when portrait sessions open near you.</Text>
                    </View>
                    <Switch
                      value={campaignInterest}
                      onValueChange={setCampaignInterest}
                      trackColor={{ true: COLORS.forestGreen }}
                      thumbColor={COLORS.cream}
                    />
                  </View>
                </View>

                {/* Standing order CTA */}
                <TouchableOpacity
                  style={styles.standingBtn}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('StandingOrderSetup', {
                    variety_id: 0,
                    chocolate: 'guanaja_70',
                    finish: 'plain',
                    quantity: 1,
                    location_id: 0,
                    priceCents: 0,
                    varietyName: '',
                  })}
                >
                  <Text style={styles.standingBtnText}>Set up a standing order  →</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* Unverified instructions */}
                <View style={styles.instructionCard}>
                  <Text style={styles.instructionTitle}>How to get verified</Text>
                  <Text style={styles.instructionText}>
                    Place an order. When you pick it up, open the box and tap your phone to the NFC chip inside the lid.
                  </Text>
                  <Text style={styles.instructionText}>
                    Verification links your order to your account and unlocks standing orders and campaign access.
                  </Text>
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: COLORS.forestGreen,
    paddingHorizontal: SPACING.md,
    paddingBottom: 24,
  },
  backBtn: { paddingVertical: 6, marginBottom: 8 },
  backText: { color: 'rgba(255,255,255,0.5)', fontSize: 13, letterSpacing: 0.5 },
  headerTitle: {
    color: COLORS.cream,
    fontSize: 34,
    fontFamily: 'PlayfairDisplay_700Bold',
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    gap: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.cardBg,
  },
  avatarVerified: {
    backgroundColor: COLORS.forestGreen,
    borderColor: '#C4973A',
    borderWidth: 3,
  },
  avatarInitials: {
    fontSize: 22,
    fontWeight: '700',
    color: '#C4973A',
    letterSpacing: 1,
  },
  avatarHollow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  badgeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeGreen: { backgroundColor: '#D4EDD4' },
  badgeMuted: { backgroundColor: COLORS.cardBg, borderWidth: 1, borderColor: COLORS.border },
  badgeGold: { backgroundColor: 'rgba(196,151,58,0.15)', borderWidth: 1, borderColor: 'rgba(196,151,58,0.4)' },
  badgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  badgeTextGreen: { color: '#2D5A2D' },
  badgeTextMuted: { color: COLORS.textMuted },
  badgeTextGold: { color: '#C4973A' },
  userId: { fontSize: 13, color: COLORS.textMuted, letterSpacing: 1.5, fontWeight: '500' },
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
  },
  infoLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    letterSpacing: 1.8,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 15,
    color: COLORS.textDark,
    fontFamily: 'PlayfairDisplay_700Bold',
  },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: COLORS.border, marginHorizontal: SPACING.md },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    gap: 12,
  },
  toggleLabel: { fontSize: 15, color: COLORS.textDark, fontFamily: 'PlayfairDisplay_700Bold' },
  toggleDesc: { fontSize: 13, color: COLORS.textMuted, lineHeight: 19 },
  standingBtn: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  standingBtnText: {
    fontSize: 15,
    color: COLORS.forestGreen,
    fontFamily: 'PlayfairDisplay_700Bold',
  },
  instructionCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    padding: SPACING.md,
    gap: 12,
  },
  instructionTitle: {
    fontSize: 16,
    fontFamily: 'PlayfairDisplay_700Bold',
    color: COLORS.textDark,
  },
  instructionText: {
    fontSize: 14,
    color: COLORS.textMuted,
    lineHeight: 22,
  },
});
