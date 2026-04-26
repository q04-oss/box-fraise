import React, { useCallback, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Alert, RefreshControl,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePanel, FraiseClaim } from '../../context/PanelContext';
import { useColors, fonts, SPACING } from '../../theme';
import { declineClaim, fetchMyClaims } from '../../lib/api';
import { PanelHeader, Card, PillBadge } from '../ui';

function statusDisplay(claim: FraiseClaim): { label: string; color: string } {
  if (claim.event_status === 'confirmed')     return { label: 'confirmed', color: '#27AE60' };
  if (claim.event_status === 'threshold_met') return { label: 'going ahead', color: '#1C1C1E' };
  return { label: 'open', color: '#8E8E93' };
}

export default function MyClaimsPanel() {
  const { claims, setClaims, member, setMember } = usePanel();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [decliningId, setDecliningId] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const fresh = await fetchMyClaims();
      setClaims(fresh);
    } catch {}
    setRefreshing(false);
  }, []);

  const handleDecline = (claim: FraiseClaim) => {
    Alert.alert(
      'Release spot?',
      'Your credit will be returned to your balance.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Release',
          style: 'destructive',
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setDecliningId(claim.event_id);
            try {
              const result = await declineClaim(claim.event_id);
              setClaims(claims.filter(cl => cl.event_id !== claim.event_id));
              if (member) setMember({ ...member, credit_balance: result.credit_balance });
            } catch (err: any) {
              Alert.alert('Error', err.message || 'something went wrong.');
            }
            setDecliningId(null);
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.panelBg }}
      contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 24 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.muted} />
      }
    >
      <PanelHeader
        title="your claims"
      >
        {member ? (
          <Text style={[styles.balance, { color: c.muted }]}>
            {member.credit_balance} credit{member.credit_balance !== 1 ? 's' : ''} remaining
          </Text>
        ) : null}
      </PanelHeader>

      {claims.length === 0 ? (
        <Text style={[styles.empty, { color: c.muted }]}>
          no claims yet.{'\n'}browse events on the discover tab.
        </Text>
      ) : (
        claims.map(claim => {
          const { label, color } = statusDisplay(claim);
          const isReleasing = decliningId === claim.event_id;
          return (
            <Card
              key={claim.id}
              style={styles.card}
            >
              <View style={styles.cardTop}>
                <View style={styles.cardLeft}>
                  <Text style={[styles.cardBiz, { color: c.muted }]}>
                    {claim.business_name}
                  </Text>
                  <Text style={[styles.cardTitle, { color: c.text }]}>
                    {claim.title}
                  </Text>
                  <Text style={[styles.cardDate, { color: c.muted }]}>
                    {claim.event_date ? `date: ${claim.event_date}` : 'date tbd'}
                  </Text>
                </View>
                <PillBadge label={label} color={color} />
              </View>
              <View style={[styles.cardFooter, { borderTopColor: c.border }]}>
                <TouchableOpacity
                  onPress={() => handleDecline(claim)}
                  activeOpacity={0.6}
                  disabled={isReleasing}
                >
                  <Text style={[styles.releaseBtn, { color: isReleasing ? c.muted : '#C0392B' }]}>
                    {isReleasing ? 'releasing…' : 'release spot'}
                  </Text>
                </TouchableOpacity>
              </View>
            </Card>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: SPACING.md },
  balance: { fontSize: 12, fontFamily: fonts.dmMono, marginTop: 2 },
  empty: {
    fontSize: 13,
    fontFamily: fonts.dmMono,
    paddingHorizontal: SPACING.lg,
    lineHeight: 20,
    color: '#8E8E93',
  },
  card: { marginHorizontal: SPACING.lg, marginBottom: SPACING.md },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: SPACING.md,
    gap: SPACING.md,
  },
  cardLeft: { flex: 1, gap: 3 },
  cardBiz: {
    fontSize: 10,
    fontFamily: fonts.dmMono,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  cardTitle: { fontSize: 14, fontFamily: fonts.dmMono, fontWeight: '500' },
  cardDate: { fontSize: 11, fontFamily: fonts.dmMono },
  cardFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  releaseBtn: { fontSize: 11, fontFamily: fonts.dmMono },
});
