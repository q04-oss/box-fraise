import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Image,
  StyleSheet,
} from 'react-native';
import { PatronTokenCard } from '../PatronTokenCard';
import { ProvenanceTokenCard } from '../ProvenanceTokenCard';
import type { ProvenanceLedgerEntry } from '../ProvenanceTokenCard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePanel } from '../../context/PanelContext';
import {
  fetchProfile,
  fetchMyPortalAccess,
  fetchPublicProfile,
  followUser,
  unfollowUser,
  fetchFollowStatus,
} from '../../lib/api';
import { useColors, fonts, SPACING } from '../../theme';

function BlinkingCursor() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const id = setInterval(() => setVisible(v => !v), 500);
    return () => clearInterval(id);
  }, []);
  return <Text style={{ opacity: visible ? 1 : 0 }}>_</Text>;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getInitials(name: string): string {
  return name.slice(0, 1).toUpperCase();
}

export default function UserProfilePanel() {
  const { goBack, panelData, showPanel, setPanelData } = usePanel();
  const c = useColors();

  const userId: number | null = panelData?.userId ?? null;

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [publicProfile, setPublicProfile] = useState<any>(null);
  const [myAccessRecord, setMyAccessRecord] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const hasPortalAccess = myAccessRecord && new Date(myAccessRecord.expires_at) > new Date();

  const load = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    try {
      const storedId = await AsyncStorage.getItem('user_db_id');
      const cid = storedId ? parseInt(storedId, 10) : null;
      setCurrentUserId(cid);

      const [profileData, pubProfile, myAccess] = await Promise.all([
        fetchProfile(userId).catch(() => null),
        fetchPublicProfile(userId).catch(() => null),
        fetchMyPortalAccess().catch(() => []),
      ]);

      setProfile(profileData);
      setPublicProfile(pubProfile);

      const found = (myAccess as any[]).find(
        (a: any) => a.owner_id === userId || a.portal_owner_id === userId,
      );
      setMyAccessRecord(found ?? null);

      if (cid && cid !== userId) {
        const status = await fetchFollowStatus(userId, cid).catch(() => null);
        if (status) setIsFollowing(status.is_following);
      }
    } catch {
      // non-fatal
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const handleFollowToggle = async () => {
    if (!userId || !currentUserId || followLoading) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await unfollowUser(userId, currentUserId);
        setIsFollowing(false);
      } else {
        await followUser(userId, currentUserId);
        setIsFollowing(true);
      }
    } catch {
      // non-fatal
    } finally {
      setFollowLoading(false);
    }
  };

  const handleViewPiece = (pieceId: number) => {
    setPanelData({ pieceId });
    showPanel('editorial-piece');
  };

  const handleRequestPortalAccess = () => {
    if (!userId) return;
    setPanelData({ userId, requesting: true });
    showPanel('portal-subscriber');
  };

  const handleViewPortal = () => {
    if (!userId) return;
    setPanelData({ userId });
    showPanel('portal-subscriber');
  };

  const displayName = profile?.display_name ?? publicProfile?.display_name ?? '';
  const handle = displayName
    ? `@${displayName.toLowerCase().replace(/\s+/g, '_')}`
    : `@user_${userId}`;
  const tier = profile?.membership_tier ?? publicProfile?.membership_tier ?? '';
  const portraitUrl = profile?.portrait_url ?? null;
  const workerStatus = profile?.worker_status ?? null;
  const portalOptedIn = profile?.portal_opted_in ?? false;
  const editorialPieces: any[] = profile?.editorial_pieces ?? [];
  const patronTokens: any[] = profile?.patron_tokens ?? [];
  const isPatron: boolean = profile?.is_patron ?? false;
  const isFounder: boolean = profile?.is_founder ?? false;
  const foundedGreenhouses: any[] = profile?.founded_greenhouses ?? [];

  const showFollowBtn = currentUserId !== null && userId !== null && currentUserId !== userId;

  return (
    <View style={[styles.container, { backgroundColor: c.panelBg }]}>
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={[styles.backBtnText, { color: c.accent }]}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleRow}>
          <Text style={[styles.headerPrompt, { color: c.accent }]}>{'> '}</Text>
          <Text style={[styles.headerTitle, { color: c.text }]} numberOfLines={1}>
            {loading ? 'profile' : `profile: ${handle}`}
          </Text>
          {loading && <BlinkingCursor />}
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {!loading && (
          <>
            <Text style={[styles.separator, { color: c.border }]}>{'────────────────────────────────'}</Text>

            {/* Portrait */}
            <View style={styles.portraitRow}>
              {portraitUrl ? (
                <Image source={{ uri: portraitUrl }} style={styles.portrait} />
              ) : displayName ? (
                <View style={[styles.initialsCircle, { backgroundColor: c.accent }]}>
                  <Text style={styles.initialsText}>{getInitials(displayName)}</Text>
                </View>
              ) : null}
            </View>

            {/* Name and tier */}
            <Text style={[styles.nameText, { color: c.text }]}>{displayName.toUpperCase()}</Text>
            {tier ? (
              <View style={styles.tierRow}>
                <Text style={[styles.tierText, { color: c.muted }]}>
                  {`Maison · ${tier.charAt(0).toUpperCase() + tier.slice(1)}`}
                </Text>
                {isPatron && (
                  <View style={styles.patronBadge}>
                    <Text style={styles.patronBadgeText}>{'PATRON'}</Text>
                  </View>
                )}
                {isFounder && (
                  <View style={styles.founderBadge}>
                    <Text style={styles.founderBadgeText}>{'FOUNDER'}</Text>
                  </View>
                )}
              </View>
            ) : null}
            {workerStatus ? (
              <Text style={[styles.workerText, { color: c.muted }]}>
                {`Worker: ${workerStatus}`}
              </Text>
            ) : null}

            {/* Follow button */}
            {showFollowBtn && (
              <TouchableOpacity
                style={[styles.followBtn, { borderColor: isFollowing ? c.border : c.accent }]}
                onPress={handleFollowToggle}
                disabled={followLoading}
                activeOpacity={0.7}
              >
                <Text style={[styles.followBtnText, { color: isFollowing ? c.muted : c.accent }]}>
                  {followLoading ? '…' : isFollowing ? '> following_' : '> follow_'}
                </Text>
              </TouchableOpacity>
            )}

            {/* Editorial section */}
            {editorialPieces.length > 0 && (
              <>
                <Text style={[styles.separator, { color: c.border }]}>{'────────────────────────────────'}</Text>
                <Text style={[styles.sectionHeader, { color: c.muted }]}>
                  {`EDITORIAL [${editorialPieces.length}]`}
                </Text>
                {editorialPieces.map((piece: any, i: number) => (
                  <View key={piece.id ?? i} style={styles.pieceBlock}>
                    <Text style={[styles.pieceDate, { color: c.muted }]}>
                      {`[${fmtDate(piece.created_at ?? new Date().toISOString())}]`}
                    </Text>
                    <Text style={[styles.pieceTitle, { color: c.text }]}>{piece.title}</Text>
                    {piece.tag && (
                      <Text style={[styles.pieceTag, { color: c.muted }]}>{`tag: ${piece.tag}`}</Text>
                    )}
                    <TouchableOpacity
                      style={styles.actionLine}
                      onPress={() => handleViewPiece(piece.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.actionText, { color: c.accent }]}>{'> read_'}</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </>
            )}

            {/* Patron tokens section */}
            {patronTokens.length > 0 && (
              <>
                <Text style={[styles.separator, { color: c.border }]}>{'────────────────────────────────'}</Text>
                <Text style={[styles.sectionHeader, { color: c.muted }]}>
                  {`PATRON TOKENS [${patronTokens.length}]`}
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tokenScrollRow}>
                  {patronTokens.map((pt: any, i: number) => (
                    <PatronTokenCard
                      key={pt.token_id ?? i}
                      data={{
                        tokenId: pt.token_id ?? i,
                        locationName: pt.location_name ?? '',
                        year: pt.year ?? 0,
                        patronHandle: handle.replace('@', ''),
                      }}
                    />
                  ))}
                </ScrollView>
              </>
            )}

            {/* Founded greenhouses section */}
            {foundedGreenhouses.length > 0 && (
              <>
                <Text style={[styles.separator, { color: c.border }]}>{'────────────────────────────────'}</Text>
                <Text style={[styles.sectionHeader, { color: c.muted }]}>
                  {`FOUNDED [${foundedGreenhouses.length}]`}
                </Text>
                {foundedGreenhouses.map((gh: any, i: number) => {
                  const rawLedger = gh.provenance_token?.provenance_ledger;
                  let ledger: ProvenanceLedgerEntry[] = [];
                  try {
                    const parsed = typeof rawLedger === 'string' ? JSON.parse(rawLedger) : rawLedger;
                    if (Array.isArray(parsed)) ledger = parsed as ProvenanceLedgerEntry[];
                  } catch {}
                  return (
                    <ProvenanceTokenCard
                      key={gh.id ?? i}
                      greenhouseName={gh.name ?? ''}
                      greenhouseLocation={gh.location ?? ''}
                      ledger={ledger}
                      tokenId={gh.provenance_token?.id ?? i + 1}
                    />
                  );
                })}
              </>
            )}

            {/* Portal section */}
            {portalOptedIn && (
              <>
                <Text style={[styles.separator, { color: c.border }]}>{'────────────────────────────────'}</Text>
                <Text style={[styles.sectionHeader, { color: c.muted }]}>{'PORTAL'}</Text>

                {hasPortalAccess ? (
                  <>
                    <Text style={[styles.accessStatus, { color: '#4CAF50' }]}>
                      {`▓ subscribed · expires ${fmtDate(myAccessRecord.expires_at)}`}
                    </Text>
                    <TouchableOpacity
                      style={styles.actionLine}
                      onPress={handleViewPortal}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.actionText, { color: c.accent }]}>{'> view content_'}</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={[styles.accessStatus, { color: c.muted }]}>{'▓ access required'}</Text>
                    <TouchableOpacity
                      style={styles.actionLine}
                      onPress={handleRequestPortalAccess}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.actionText, { color: c.accent }]}>{'> request access_'}</Text>
                    </TouchableOpacity>
                  </>
                )}
              </>
            )}
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingTop: 18,
    paddingBottom: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 40, paddingVertical: 4 },
  backBtnText: { fontSize: 28, lineHeight: 34 },
  headerTitleRow: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  headerPrompt: { fontFamily: fonts.dmMono, fontSize: 12, letterSpacing: 1 },
  headerTitle: { fontFamily: fonts.dmMono, fontSize: 11, letterSpacing: 1.5, flex: 1 },
  headerSpacer: { width: 40 },

  body: { paddingHorizontal: SPACING.md, paddingTop: SPACING.md, gap: 8 },
  separator: { fontFamily: fonts.dmMono, fontSize: 11, marginVertical: 4 },

  portraitRow: { alignItems: 'flex-start', marginBottom: 4 },
  portrait: { width: 72, height: 72, borderRadius: 36 },
  initialsCircle: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center' },
  initialsText: { fontFamily: fonts.dmMono, fontSize: 28, color: '#fff' },

  nameText: { fontFamily: fonts.dmMono, fontSize: 15, letterSpacing: 2 },
  tierRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  tierText: { fontFamily: fonts.dmMono, fontSize: 12 },
  patronBadge: {
    backgroundColor: '#D4A843',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  patronBadgeText: { fontFamily: fonts.dmMono, fontSize: 9, color: '#fff', letterSpacing: 1 },
  founderBadge: {
    backgroundColor: '#D4A843',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  founderBadgeText: { fontFamily: fonts.dmMono, fontSize: 9, color: '#fff', letterSpacing: 1 },
  workerText: { fontFamily: fonts.dmMono, fontSize: 12 },
  tokenScrollRow: { marginTop: 4 },

  followBtn: {
    alignSelf: 'flex-start',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 6,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
  },
  followBtnText: { fontFamily: fonts.dmMono, fontSize: 12 },

  sectionHeader: { fontFamily: fonts.dmMono, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' },

  pieceBlock: { gap: 2, paddingLeft: 8 },
  pieceDate: { fontFamily: fonts.dmMono, fontSize: 11 },
  pieceTitle: { fontFamily: fonts.dmMono, fontSize: 13 },
  pieceTag: { fontFamily: fonts.dmMono, fontSize: 11 },

  accessStatus: { fontFamily: fonts.dmMono, fontSize: 12 },

  actionLine: { flexDirection: 'row', alignItems: 'center' },
  actionText: { fontFamily: fonts.dmMono, fontSize: 12 },
});
