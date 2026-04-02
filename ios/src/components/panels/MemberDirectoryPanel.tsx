import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, SectionList,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePanel } from '../../context/PanelContext';
import { fetchMembers } from '../../lib/api';
import { useColors, fonts, SPACING } from '../../theme';

const TIER_ORDER = ['maison', 'reserve', 'atelier', 'fondateur', 'patrimoine', 'souverain', 'unnamed'];
const TIER_LABELS: Record<string, string> = {
  maison: 'Maison',
  reserve: 'Réserve',
  atelier: 'Atelier',
  fondateur: 'Fondateur',
  patrimoine: 'Patrimoine',
  souverain: 'Souverain',
  unnamed: '—',
};
const TIER_COLORS: Record<string, string> = {
  maison: '#C9973A',
  reserve: '#8E8E93',
  atelier: '#34C759',
  fondateur: '#FF9500',
  patrimoine: '#AF52DE',
  souverain: '#FF2D55',
  unnamed: '#8E8E93',
};

export default function MemberDirectoryPanel() {
  const { goBack, showPanel, setPanelData } = usePanel();
  const c = useColors();
  const insets = useSafeAreaInsets();

  const [sections, setSections] = useState<{ title: string; tier: string; data: any[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const members = await fetchMembers();
      const grouped: Record<string, any[]> = {};
      for (const m of members) {
        const tier = m.tier ?? 'maison';
        if (!grouped[tier]) grouped[tier] = [];
        grouped[tier].push(m);
      }
      const built = TIER_ORDER
        .filter(t => grouped[t] && grouped[t].length > 0)
        .map(t => ({ title: TIER_LABELS[t] ?? t, tier: t, data: grouped[t] }));
      setSections(built);
    } catch {
      // non-fatal
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const handleMemberTap = (member: any) => {
    setPanelData({ userId: member.user_id });
    showPanel('user-profile');
  };

  const handleContribute = (member: any) => {
    setPanelData({ toUserId: member.user_id, toName: member.display_name });
    showPanel('fund-contribute');
  };

  return (
    <View style={[styles.container, { backgroundColor: c.panelBg, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={[styles.backBtnText, { color: c.accent }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: c.text }]}>Members</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <ActivityIndicator color={c.accent} style={{ marginTop: 40 }} />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={item => String(item.user_id)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />}
          renderSectionHeader={({ section }) => (
            <View style={[styles.sectionHeader, { backgroundColor: c.panelBg }]}>
              <Text style={[styles.sectionHeaderText, { color: c.muted, fontFamily: fonts.dmMono }]}>
                {section.title}
              </Text>
            </View>
          )}
          renderItem={({ item, index, section }) => (
            <>
              <View style={styles.memberRow}>
                <TouchableOpacity
                  style={styles.memberInfo}
                  onPress={() => handleMemberTap(item)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.memberName, { color: c.text, fontFamily: fonts.playfair }]}>
                    {item.display_name}
                  </Text>
                  <View style={styles.memberMeta}>
                    <Text style={[styles.tierBadge, { color: TIER_COLORS[item.tier] ?? c.accent, fontFamily: fonts.dmMono }]}>
                      {TIER_LABELS[item.tier] ?? item.tier}
                    </Text>
                    {item.started_at && (
                      <Text style={[styles.memberYear, { color: c.muted, fontFamily: fonts.dmMono }]}>
                        {new Date(item.started_at).getFullYear()}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.contributeBtn, { borderColor: c.border }]}
                  onPress={() => handleContribute(item)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.contributeBtnText, { color: c.accent, fontFamily: fonts.dmMono }]}>
                    Fund
                  </Text>
                </TouchableOpacity>
              </View>
              {index < section.data.length - 1 && (
                <View style={[styles.divider, { backgroundColor: c.border }]} />
              )}
            </>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: SPACING.sm },
  backBtnText: { fontSize: 22 },
  title: { flex: 1, textAlign: 'center', fontSize: 18, fontFamily: 'PlayfairDisplay_700Bold' },
  headerSpacer: { width: 44 },
  listContent: { paddingBottom: 40 },
  sectionHeader: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    paddingTop: SPACING.md,
  },
  sectionHeaderText: { fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 17, marginBottom: 2 },
  memberMeta: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  tierBadge: { fontSize: 12 },
  memberYear: { fontSize: 12 },
  contributeBtn: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
  contributeBtnText: { fontSize: 12 },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: SPACING.md },
});
