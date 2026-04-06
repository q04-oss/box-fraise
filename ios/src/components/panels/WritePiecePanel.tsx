import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePanel } from '../../context/PanelContext';
import { useColors, fonts, SPACING } from '../../theme';
import { submitEditorialPiece, fetchMyPieces } from '../../lib/api';

const TAGS = ['Harvest', 'Portrait', 'Criticism', 'Dispatch', 'Essay'];

const STATUS_COLORS: Record<string, string> = {
  draft: '#8E8E93',
  submitted: '#C9973A',
  pending_review: '#C9973A',
  published: '#34C759',
  rejected: '#FF3B30',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Pending review',
  pending_review: 'Pending review',
  published: 'Published',
  rejected: 'Rejected',
};

function formatDate(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function WritePiecePanel() {
  const { goBack } = usePanel();
  const c = useColors();
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [myPieces, setMyPieces] = useState<any[]>([]);
  const [piecesLoading, setPiecesLoading] = useState(true);

  useEffect(() => {
    fetchMyPieces()
      .then(setMyPieces)
      .catch(() => setMyPieces([]))
      .finally(() => setPiecesLoading(false));
  }, []);

  const bodyLen = body.length;
  const canSubmit = title.trim().length > 0 && bodyLen >= 100 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await submitEditorialPiece(title.trim(), body, selectedTag);
      Alert.alert('Submitted', 'We\'ll review your piece.', [
        { text: 'OK', onPress: goBack },
      ]);
    } catch (err: any) {
      const status = err?.status ?? err?.response?.status;
      const code = err?.code ?? err?.response?.data?.error;
      if (status === 403 || code === 'membership_required') {
        Alert.alert('Membership required', 'You need an active membership to submit editorial pieces.');
      } else {
        Alert.alert('Error', 'Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: c.panelBg, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <TouchableOpacity onPress={goBack} activeOpacity={0.7}>
          <Text style={[styles.back, { color: c.accent }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.text, fontFamily: fonts.dmMono }]}>WRITE</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Title input */}
        <TextInput
          style={[
            styles.titleInput,
            { color: c.text, fontFamily: fonts.playfair, borderBottomColor: c.border },
          ]}
          placeholder="Title"
          placeholderTextColor={c.muted}
          value={title}
          onChangeText={setTitle}
          returnKeyType="next"
        />

        {/* Tag selector */}
        <View style={styles.tagRow}>
          {TAGS.map(tag => {
            const active = tag === selectedTag;
            return (
              <TouchableOpacity
                key={tag}
                onPress={() => setSelectedTag(active ? null : tag)}
                activeOpacity={0.7}
                style={[
                  styles.tagPill,
                  {
                    backgroundColor: active ? c.accent : 'transparent',
                    borderColor: c.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tagText,
                    {
                      fontFamily: fonts.dmMono,
                      color: active ? '#FFFFFF' : c.muted,
                    },
                  ]}
                >
                  {tag}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Body input */}
        <TextInput
          style={[
            styles.bodyInput,
            { color: c.text, fontFamily: fonts.dmSans, borderColor: c.border },
          ]}
          placeholder="Write your piece…"
          placeholderTextColor={c.muted}
          value={body}
          onChangeText={setBody}
          multiline
          textAlignVertical="top"
        />

        {/* Char counter */}
        <Text
          style={[
            styles.charCount,
            {
              fontFamily: fonts.dmMono,
              color: bodyLen >= 100 ? c.accent : c.muted,
            },
          ]}
        >
          {bodyLen} {bodyLen < 100 ? `/ 100 min` : 'chars'}
        </Text>

        {/* Submit button */}
        <TouchableOpacity
          style={[
            styles.submitBtn,
            {
              backgroundColor: canSubmit ? c.accent : c.card,
              borderColor: c.border,
            },
          ]}
          onPress={handleSubmit}
          disabled={!canSubmit}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text
              style={[
                styles.submitText,
                {
                  fontFamily: fonts.dmMono,
                  color: canSubmit ? '#FFFFFF' : c.muted,
                },
              ]}
            >
              Submit for review
            </Text>
          )}
        </TouchableOpacity>

        {/* My pieces */}
        <View style={[styles.myPiecesHeader, { borderTopColor: c.border }]}>
          <Text style={[styles.myPiecesTitle, { color: c.text, fontFamily: fonts.dmMono }]}>
            MY PIECES
          </Text>
        </View>

        {piecesLoading && (
          <ActivityIndicator color={c.accent} style={{ marginTop: SPACING.md }} />
        )}

        {!piecesLoading && myPieces.length === 0 && (
          <Text style={[styles.noPieces, { color: c.muted, fontFamily: fonts.dmSans }]}>
            You haven't submitted any pieces yet.
          </Text>
        )}

        {!piecesLoading &&
          myPieces.map(item => {
            const statusKey = item.status ?? 'draft';
            const statusColor = STATUS_COLORS[statusKey] ?? '#8E8E93';
            const statusLabel = STATUS_LABELS[statusKey] ?? statusKey;
            return (
              <View
                key={String(item.id)}
                style={[styles.pieceRow, { borderBottomColor: c.border }]}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Text
                    style={[styles.pieceTitle, { color: c.text, fontFamily: fonts.playfair }]}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                  <Text style={[styles.pieceDate, { color: c.muted, fontFamily: fonts.dmMono }]}>
                    {formatDate(item.created_at)}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { borderColor: statusColor }]}>
                  <Text style={[styles.statusText, { color: statusColor, fontFamily: fonts.dmMono }]}>
                    {statusLabel}
                  </Text>
                </View>
              </View>
            );
          })}

        <View style={{ height: SPACING.xl }} />
      </ScrollView>
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
  body: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.lg,
  },
  titleInput: {
    fontSize: 22,
    lineHeight: 30,
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: SPACING.md,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  tagPill: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  tagText: { fontSize: 12, letterSpacing: 0.5 },
  bodyInput: {
    fontSize: 15,
    lineHeight: 22,
    height: 180,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    padding: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  charCount: {
    fontSize: 12,
    letterSpacing: 0.5,
    textAlign: 'right',
    marginBottom: SPACING.md,
  },
  submitBtn: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  submitText: { fontSize: 14, letterSpacing: 1 },
  myPiecesHeader: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: SPACING.md,
    marginBottom: SPACING.md,
  },
  myPiecesTitle: { fontSize: 12, letterSpacing: 2 },
  noPieces: { fontSize: 13, marginBottom: SPACING.md },
  pieceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: SPACING.sm,
  },
  pieceTitle: { fontSize: 15 },
  pieceDate: { fontSize: 11, letterSpacing: 0.3 },
  statusBadge: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusText: { fontSize: 11, letterSpacing: 0.5 },
});
