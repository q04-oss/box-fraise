import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePanel } from '../../context/PanelContext';
import { fetchEditorialPiece } from '../../lib/api';
import { useColors, fonts, SPACING } from '../../theme';

export default function EditorialPiecePanel() {
  const { goBack, panelData } = usePanel();
  const c = useColors();
  const insets = useSafeAreaInsets();

  const pieceId: number | undefined = panelData?.pieceId;
  const [piece, setPiece] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!pieceId) { setLoading(false); return; }
    fetchEditorialPiece(pieceId)
      .then(data => setPiece(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [pieceId]);

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const formatCents = (cents: number) => `CA$${(cents / 100).toFixed(2)}`;

  return (
    <View style={[styles.container, { backgroundColor: c.panelBg, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={[styles.backBtnText, { color: c.accent }]}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <ActivityIndicator color={c.accent} style={{ marginTop: 40 }} />
      ) : !piece ? (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: c.muted, fontFamily: fonts.dmSans }]}>
            Piece not found.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <Text style={[styles.title, { color: c.text, fontFamily: fonts.playfair }]}>
            {piece.title}
          </Text>

          <View style={styles.meta}>
            <Text style={[styles.metaText, { color: c.muted, fontFamily: fonts.dmMono }]}>
              {piece.author_display_name ?? 'Anonymous'}
            </Text>
            {piece.published_at && (
              <Text style={[styles.metaText, { color: c.muted, fontFamily: fonts.dmMono }]}>
                {' · '}{formatDate(piece.published_at)}
              </Text>
            )}
          </View>

          {piece.commission_cents != null && (
            <View style={[styles.commissionBadge, { backgroundColor: c.card, borderColor: c.border }]}>
              <Text style={[styles.commissionText, { color: c.accent, fontFamily: fonts.dmMono }]}>
                Commissioned at {formatCents(piece.commission_cents)}
              </Text>
            </View>
          )}

          <Text style={[styles.bodyText, { color: c.text, fontFamily: fonts.dmSans }]}>
            {piece.body}
          </Text>
        </ScrollView>
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
  headerSpacer: { flex: 1 },
  body: { padding: SPACING.lg, paddingBottom: 60 },
  title: { fontSize: 24, lineHeight: 32, marginBottom: SPACING.sm },
  meta: { flexDirection: 'row', marginBottom: SPACING.md },
  metaText: { fontSize: 13 },
  commissionBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: SPACING.md,
  },
  commissionText: { fontSize: 12 },
  bodyText: { fontSize: 16, lineHeight: 26 },
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 16 },
});
