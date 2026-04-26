import React, { useCallback, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Alert, RefreshControl,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePanel, FraiseInvitation } from '../../context/PanelContext';
import { useColors, fonts, SPACING } from '../../theme';
import { declineInvitation, fetchInvitations } from '../../lib/api';
import { PanelHeader, Card, PillBadge } from '../ui';

export default function MyClaimsPanel() {
  const { invitations, setInvitations, member, setMember } = usePanel();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [releasingId, setReleasingId] = useState<number | null>(null);

  const accepted = invitations.filter(i => i.status === 'accepted' || i.status === 'confirmed');

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try { setInvitations(await fetchInvitations()); } catch {}
    setRefreshing(false);
  }, []);

  const handleRelease = (inv: FraiseInvitation) => {
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
            setReleasingId(inv.event_id);
            try {
              const result = await declineInvitation(inv.event_id);
              setInvitations(invitations.map(i =>
                i.id === inv.id ? { ...i, status: 'declined' } : i
              ));
              if (member && result.credit_returned) {
                setMember({ ...member, credit_balance: result.credit_balance });
              }
            } catch (err: any) {
              Alert.alert('Error', err.message || 'something went wrong.');
            }
            setReleasingId(null);
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
      <PanelHeader title="your spots">
        {member ? (
          <Text style={[styles.balance, { color: c.muted }]}>
            {member.credit_balance} credit{member.credit_balance !== 1 ? 's' : ''} remaining
          </Text>
        ) : null}
      </PanelHeader>

      {accepted.length === 0 ? (
        <Text style={[styles.empty, { color: c.muted }]}>
          no confirmed spots yet.{'\n'}accept an invitation on the discover tab.
        </Text>
      ) : (
        accepted.map(inv => {
          const isReleasing = releasingId === inv.event_id;
          const badgeColor = inv.status === 'confirmed' ? '#27AE60' : c.muted;
          return (
            <Card key={inv.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.cardLeft}>
                  <Text style={[styles.cardBiz, { color: c.muted }]}>{inv.business_name}</Text>
                  <Text style={[styles.cardTitle, { color: c.text }]}>{inv.title}</Text>
                  <Text style={[styles.cardDate, { color: c.muted }]}>
                    {inv.event_date ? `date: ${inv.event_date}` : 'date tbd'}
                  </Text>
                </View>
                <PillBadge
                  label={inv.status === 'confirmed' ? 'confirmed' : 'accepted'}
                  color={badgeColor}
                />
              </View>
              <View style={[styles.cardFooter, { borderTopColor: c.border }]}>
                <TouchableOpacity
                  onPress={() => handleRelease(inv)}
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
