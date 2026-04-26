import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePanel } from '../../context/PanelContext';
import { useColors, fonts, SPACING } from '../../theme';
import { fetchMembersDirectory, FraiseMemberPublic } from '../../lib/api';
import { PanelHeader, Card } from '../ui';

function memberSince(createdAt: string): string {
  const d = new Date(createdAt);
  return d.toLocaleString('default', { month: 'short', year: 'numeric' }).toLowerCase();
}

export default function MembersPanel() {
  const { member } = usePanel();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [members, setMembers] = useState<FraiseMemberPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { setMembers(await fetchMembersDirectory()); } catch {}
    setLoading(false);
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try { setMembers(await fetchMembersDirectory()); } catch {}
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, []);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.panelBg }}
      contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 24 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.muted} />
      }
    >
      <PanelHeader title="members" />

      {loading ? null : !member ? (
        <Text style={[styles.empty, { color: c.muted }]}>sign in to see the member directory.</Text>
      ) : members.length === 0 ? (
        <Text style={[styles.empty, { color: c.muted }]}>no members yet.</Text>
      ) : (
        <View style={styles.list}>
          {members.map((m, i) => (
            <Card key={m.id} style={styles.card}>
              <View style={styles.row}>
                <View style={styles.left}>
                  <Text style={[styles.rank, { color: c.muted }]}>{i + 1}</Text>
                  <View style={styles.info}>
                    <Text style={[styles.name, { color: c.text }]}>{m.name}</Text>
                    <Text style={[styles.meta, { color: c.muted }]}>
                      {m.events_attended} event{m.events_attended !== 1 ? 's' : ''} · since {memberSince(m.created_at)}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.standing, { color: c.text }]}>{m.standing}</Text>
              </View>
            </Card>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: SPACING.md },
  empty: { fontSize: 13, fontFamily: fonts.dmMono, paddingHorizontal: SPACING.lg },
  list: { paddingHorizontal: SPACING.lg, gap: SPACING.sm },
  card: { padding: SPACING.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flex: 1 },
  rank: { fontSize: 10, fontFamily: fonts.dmMono, width: 16, textAlign: 'right' },
  info: { flex: 1, gap: 2 },
  name: { fontSize: 13, fontFamily: fonts.dmMono, fontWeight: '500' },
  meta: { fontSize: 10, fontFamily: fonts.dmMono },
  standing: { fontSize: 14, fontFamily: fonts.dmMono, fontWeight: '500' },
});
