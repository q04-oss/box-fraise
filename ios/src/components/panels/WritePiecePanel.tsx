import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePanel } from '../../context/PanelContext';
import { submitEditorialPiece, fetchMyPieces } from '../../lib/api';
import { useColors, fonts, SPACING } from '../../theme';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  pending_review: 'Pending review',
  published: 'Published',
  rejected: 'Rejected',
};

const STATUS_COLORS: Record<string, string> = {
  draft: '#8E8E93',
  pending_review: '#C9973A',
  published: '#34C759',
  rejected: '#FF3B30',
};

export default function WritePiecePanel() {
  const { goBack } = usePanel();
  const c = useColors();
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [myPieces, setMyPieces] = useState<any[]>([]);
  const [loadingPieces, setLoadingPieces] = useState(true);

  useEffect(() => {
    fetchMyPieces()
      .then(setMyPieces)
      .catch(() => {})
      .finally(() => setLoadingPieces(false));
  }, []);

  const canSubmit = title.trim().length > 0 && body.trim().length >= 100 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await submitEditorialPiece(title.trim(), body.trim());
      Alert.alert('Submitted', "We'll review your piece.", [
        { text: 'OK', onPress: goBack },
      ]);
    } catch (e: any) {
      if (e.message?.includes('membership_required') || e.message?.includes('403')) {
        Alert.alert('Membership required', 'An active membership is required to submit pieces.');
      } else {
        Alert.alert('Could not submit', e.message ?? 'Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <View style={[styles.container, { backgroundColor: c.panelBg, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={[styles.backBtnText, { color: c.accent }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: c.text }]}>Write</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <TextInput
          style={[styles.titleInput, { color: c.text, borderBottomColor: c.border, fontFamily: fonts.playfair }]}
          placeholder="Title"
          placeholderTextColor={c.muted}
          value={title}
          onChangeText={setTitle}
          maxLength={200}
          returnKeyType="next"
        />

        <TextInput
          style={[styles.bodyInput, { color: c.text, borderColor: c.border, fontFamily: fonts.dmSans }]}
          placeholder="Write your piece here… (min. 100 characters)"
          placeholderTextColor={c.muted}
          value={body}
          onChangeText={setBody}
          multiline
          textAlignVertical="top"
        />

        <Text style={[styles.charCount, { color: body.length >= 100 ? c.accent : c.muted, fontFamily: fonts.dmMono }]}>
          {body.length} chars{body.length < 100 ? ` (${100 - body.length} more needed)` : ''}
        </Text>

        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: canSubmit ? c.accent : c.border }]}
          onPress={handleSubmit}
          activeOpacity={0.8}
          disabled={!canSubmit}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={[styles.submitBtnText, { fontFamily: fonts.dmSans }]}>Submit for review</Text>
          )}
        </TouchableOpacity>

        {/* My Pieces */}
        <Text style={[styles.sectionLabel, { color: c.muted, fontFamily: fonts.dmMono }]}>My Pieces</Text>

        {loadingPieces ? (
          <ActivityIndicator color={c.accent} style={{ marginTop: SPACING.md }} />
        ) : myPieces.length === 0 ? (
          <Text style={[styles.emptyText, { color: c.muted, fontFamily: fonts.dmSans }]}>
            Nothing submitted yet.
          </Text>
        ) : (
          myPieces.map((piece, idx) => (
            <View
              key={piece.id}
              style={[
                styles.pieceRow,
                { borderColor: c.border },
                idx < myPieces.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth },
              ]}
            >
              <Text style={[styles.pieceTitle, { color: c.text, fontFamily: fonts.playfair }]}>
                {piece.title}
              </Text>
              <View style={styles.pieceMeta}>
                <Text style={[
                  styles.pieceBadge,
                  { color: STATUS_COLORS[piece.status] ?? c.muted, fontFamily: fonts.dmMono },
                ]}>
                  {STATUS_LABELS[piece.status] ?? piece.status}
                </Text>
                {piece.created_at && (
                  <Text style={[styles.pieceDate, { color: c.muted, fontFamily: fonts.dmMono }]}>
                    {formatDate(piece.created_at)}
                  </Text>
                )}
              </View>
            </View>
          ))
        )}
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
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: SPACING.sm },
  backBtnText: { fontSize: 22 },
  title: { flex: 1, textAlign: 'center', fontSize: 18, fontFamily: 'PlayfairDisplay_700Bold' },
  headerSpacer: { width: 44 },
  body: { padding: SPACING.md, paddingBottom: 60 },
  titleInput: {
    fontSize: 22,
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: SPACING.md,
  },
  bodyInput: {
    fontSize: 15,
    lineHeight: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    padding: SPACING.sm,
    marginBottom: SPACING.xs,
    height: 140,
  },
  charCount: { fontSize: 12, textAlign: 'right', marginBottom: SPACING.lg },
  submitBtn: {
    paddingVertical: SPACING.md,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  sectionLabel: { fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginBottom: SPACING.sm },
  emptyText: { fontSize: 14, color: '#8E8E93' },
  pieceRow: { paddingVertical: SPACING.sm },
  pieceTitle: { fontSize: 16, marginBottom: 4 },
  pieceMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  pieceBadge: { fontSize: 12 },
  pieceDate: { fontSize: 12 },
});
