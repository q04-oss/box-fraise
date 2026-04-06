import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePanel } from '../../context/PanelContext';
import { useColors, fonts, SPACING } from '../../theme';
import { fetchARVideo } from '../../lib/api';

const STATUS_COLORS: Record<string, string> = {
  published: '#34C759',
  processing: '#C9973A',
  processing_failed: '#FF3B30',
  submitted: '#C9973A',
  commissioned: '#007AFF',
  abstract_submitted: '#C9973A',
  abstract_declined: '#FF3B30',
  declined: '#FF3B30',
};

function formatDate(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function ARVideoDetailPanel() {
  const { goBack, panelData } = usePanel();
  const c = useColors();
  const insets = useSafeAreaInsets();

  const videoId: number | undefined = panelData?.videoId;

  const [item, setItem] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (videoId == null) {
      setError(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
    fetchARVideo(videoId)
      .then(data => {
        if (!data) {
          setError(true);
        } else {
          setItem(data);
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [videoId]);

  const statusColor = item ? (STATUS_COLORS[item.status] ?? '#8E8E93') : '#8E8E93';

  return (
    <View style={[styles.container, { backgroundColor: c.panelBg, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <TouchableOpacity onPress={goBack} activeOpacity={0.7}>
          <Text style={[styles.back, { color: c.accent }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.text, fontFamily: fonts.dmMono }]}>AR VIDEO</Text>
        <View style={{ width: 28 }} />
      </View>

      {loading && (
        <View style={styles.center}>
          <ActivityIndicator color={c.accent} />
        </View>
      )}

      {!loading && error && (
        <View style={styles.center}>
          <Text style={[styles.notFound, { color: c.muted, fontFamily: fonts.dmSans }]}>
            Video not found.
          </Text>
        </View>
      )}

      {!loading && !error && item && (
        <ScrollView
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
        >
          {/* Thumbnail placeholder */}
          <View
            style={[
              styles.thumbnail,
              { backgroundColor: c.card },
            ]}
          >
            <Text style={[styles.kanjiText, { color: c.accent }]}>映</Text>
          </View>

          {/* Status badge */}
          <View style={styles.badgeRow}>
            <View style={[styles.statusBadge, { borderColor: statusColor }]}>
              <Text style={[styles.statusText, { color: statusColor, fontFamily: fonts.dmMono }]}>
                {item.status}
              </Text>
            </View>
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: c.text, fontFamily: fonts.playfair }]}>
            {item.title}
          </Text>

          {/* Meta line */}
          <Text style={[styles.meta, { color: c.muted, fontFamily: fonts.dmMono }]}>
            {item.author_display_name ?? 'Anonymous'}
            {' · '}
            {formatDate(item.published_at ?? item.created_at)}
          </Text>

          {/* Tag badge */}
          {item.tag ? (
            <View style={[styles.tagPill, { borderColor: c.accent }]}>
              <Text style={[styles.tagText, { color: c.accent, fontFamily: fonts.dmMono }]}>
                {item.tag}
              </Text>
            </View>
          ) : null}

          {/* Description */}
          {item.description ? (
            <Text style={[styles.description, { color: c.text, fontFamily: fonts.dmSans }]}>
              {item.description}
            </Text>
          ) : null}

          {/* AR scene link */}
          {item.luma_scene_url ? (
            <View style={{ marginTop: SPACING.lg }}>
              <TouchableOpacity
                onPress={() => Linking.openURL(item.luma_scene_url)}
                activeOpacity={0.7}
              >
                <Text style={[styles.sceneLink, { color: c.accent, fontFamily: fonts.dmMono }]}>
                  View AR scene →
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Commission */}
          {item.commission_cents != null ? (
            <Text style={[styles.commission, { color: c.muted, fontFamily: fonts.dmMono }]}>
              {`Commission: €${(item.commission_cents / 100).toFixed(2)}`}
            </Text>
          ) : null}

          {/* Editor note */}
          {item.editor_note ? (
            <View style={[styles.editorNote, { borderColor: c.accent, backgroundColor: `${c.accent}10` }]}>
              <Text style={[styles.editorNoteLabel, { color: c.accent, fontFamily: fonts.dmMono }]}>
                EDITOR'S NOTE
              </Text>
              <Text style={[styles.editorNoteText, { color: c.text, fontFamily: fonts.dmSans }]}>
                {item.editor_note}
              </Text>
            </View>
          ) : null}

          <View style={{ height: SPACING.xl }} />
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
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  back: { fontSize: 28 },
  headerTitle: { fontSize: 14, letterSpacing: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFound: { fontSize: 14 },
  body: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  thumbnail: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    marginBottom: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kanjiText: { fontSize: 48 },
  badgeRow: { flexDirection: 'row', marginBottom: SPACING.sm },
  statusBadge: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusText: { fontSize: 11, letterSpacing: 0.5 },
  title: { fontSize: 24, marginBottom: SPACING.xs },
  meta: { fontSize: 12, letterSpacing: 0.3 },
  tagPill: {
    alignSelf: 'flex-start',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: SPACING.sm,
  },
  tagText: { fontSize: 11, letterSpacing: 0.5 },
  description: { fontSize: 15, lineHeight: 23, marginTop: SPACING.sm },
  sceneLink: { fontSize: 13, letterSpacing: 0.5 },
  commission: { fontSize: 13, letterSpacing: 0.3, marginTop: SPACING.md },
  editorNote: {
    borderLeftWidth: 2,
    paddingLeft: SPACING.sm,
    paddingVertical: SPACING.xs,
    marginTop: SPACING.md,
  },
  editorNoteLabel: { fontSize: 10, letterSpacing: 1.5, marginBottom: 4 },
  editorNoteText: { fontSize: 13, lineHeight: 19 },
});
