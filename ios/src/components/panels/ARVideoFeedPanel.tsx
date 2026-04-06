import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchARVideoFeed } from '../../lib/api';
import { usePanel } from '../../context/PanelContext';
import { useColors, fonts, SPACING } from '../../theme';

const TAGS = ['All', 'Nature', 'Art', 'Architecture', 'Food', 'Dance'];

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

interface ARVideoItem {
  id: string;
  title: string;
  description: string;
  author_display_name: string;
  tag: string;
  created_at: string;
}

export default function ARVideoFeedPanel() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { goBack, showPanel, setPanelData } = usePanel();

  const [videos, setVideos] = useState<ARVideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTag, setSelectedTag] = useState('All');

  const load = useCallback(async () => {
    try {
      const data = await fetchARVideoFeed();
      setVideos(data);
    } catch (_) {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const filtered =
    selectedTag === 'All'
      ? videos
      : videos.filter((v) => v.tag === selectedTag);

  const s = styles(c);

  const renderItem = ({ item }: { item: ARVideoItem }) => (
    <TouchableOpacity
      style={s.row}
      activeOpacity={0.7}
      onPress={() => {
        setPanelData({ videoId: item.id });
        showPanel('ar-video-detail');
      }}
    >
      <View style={s.thumbnail} />
      <View style={s.rowContent}>
        <Text style={s.rowTitle}>{item.title}</Text>
        <Text style={s.rowDescription} numberOfLines={2}>
          {item.description}
        </Text>
        <Text style={s.rowMeta}>
          {item.author_display_name} · {formatDate(item.created_at)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={s.emptyList}>
      <Text style={s.emptyKanji}>映</Text>
      <Text style={s.emptyText}>No videos yet.</Text>
    </View>
  );

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity style={s.back} onPress={goBack}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <Text style={s.title}>AR VIDEOS</Text>
        <TouchableOpacity onPress={() => showPanel('submit-ar-video')}>
          <Text style={s.submit}>submit →</Text>
        </TouchableOpacity>
      </View>

      <View style={s.tagScroll}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.tagRow}
        >
          {TAGS.map((tag) => (
            <TouchableOpacity
              key={tag}
              style={[
                s.tagPill,
                selectedTag === tag && { backgroundColor: c.accent },
              ]}
              onPress={() => setSelectedTag(tag)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  s.tagText,
                  selectedTag === tag && { color: c.background },
                ]}
              >
                {tag}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={c.accent} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={filtered.length === 0 ? s.center : s.list}
          onRefresh={onRefresh}
          refreshing={refreshing}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = (c: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
    },
    back: {
      marginRight: SPACING.sm,
    },
    backText: {
      fontFamily: fonts.dmMono,
      fontSize: 18,
      color: c.text,
    },
    title: {
      flex: 1,
      fontFamily: fonts.dmMono,
      fontSize: 14,
      color: c.text,
      letterSpacing: 1,
    },
    submit: {
      fontFamily: fonts.dmMono,
      fontSize: 13,
      color: c.accent,
    },
    tagScroll: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    tagRow: {
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      gap: SPACING.xs,
    },
    tagPill: {
      paddingHorizontal: SPACING.sm,
      paddingVertical: 4,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
    },
    tagText: {
      fontFamily: fonts.dmMono,
      fontSize: 12,
      color: c.textMuted,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyList: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: SPACING.xl * 2,
    },
    emptyKanji: {
      fontSize: 48,
      color: c.accent,
      marginBottom: SPACING.sm,
    },
    emptyText: {
      fontFamily: fonts.dmSans,
      fontSize: 14,
      color: c.textMuted,
    },
    list: {
      paddingHorizontal: SPACING.md,
      paddingTop: SPACING.sm,
      paddingBottom: SPACING.xl,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingVertical: SPACING.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
      gap: SPACING.sm,
    },
    thumbnail: {
      width: 60,
      height: 60,
      borderRadius: 6,
      backgroundColor: c.card,
      flexShrink: 0,
    },
    rowContent: {
      flex: 1,
      gap: 4,
    },
    rowTitle: {
      fontFamily: fonts.playfair,
      fontSize: 16,
      color: c.text,
    },
    rowDescription: {
      fontFamily: fonts.dmSans,
      fontSize: 13,
      color: c.textMuted,
      lineHeight: 18,
    },
    rowMeta: {
      fontFamily: fonts.dmMono,
      fontSize: 11,
      color: c.textMuted,
    },
  });
