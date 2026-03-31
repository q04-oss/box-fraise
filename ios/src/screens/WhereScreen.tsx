import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Animated,
  ScrollView,
} from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchBusinesses } from '../lib/api';
import { COLORS, SPACING } from '../theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Business {
  id: number;
  name: string;
  address: string;
  lat: number;
  lng: number;
  type: string;
  description?: string;
}

const INITIAL_REGION: Region = {
  latitude: 45.4868,
  longitude: -73.5700,
  latitudeDelta: 0.06,
  longitudeDelta: 0.06,
};

export default function WhereScreen() {
  const insets = useSafeAreaInsets();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Business | null>(null);
  const sheetAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchBusinesses()
      .then(setBusinesses)
      .catch(() => setBusinesses([]))
      .finally(() => setLoading(false));
  }, []);

  const showSheet = (biz: Business) => {
    setSelected(biz);
    Animated.spring(sheetAnim, { toValue: 1, useNativeDriver: true, damping: 20, stiffness: 200 }).start();
  };

  const hideSheet = () => {
    Animated.timing(sheetAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setSelected(null));
  };

  const sheetTranslate = sheetAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [300, 0],
  });

  const mapStyle = [
    { elementType: 'geometry', stylers: [{ color: '#1a2e23' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#a8c4b0' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#1a2e23' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2d4a38' }] },
    { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1a2e23' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0a1f15' }] },
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
    { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.cream }}>
      {/* Map takes full screen */}
      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={INITIAL_REGION}
        customMapStyle={mapStyle}
        showsUserLocation
        showsCompass={false}
        showsPointsOfInterest={false}
        onPress={hideSheet}
      >
        {/* Collection location pins (forest green) */}
        {businesses
          .filter(b => b.type === 'collection')
          .map(b => (
            <Marker
              key={`c-${b.id}`}
              coordinate={{ latitude: b.lat, longitude: b.lng }}
              pinColor={COLORS.forestGreen}
              onPress={() => showSheet(b)}
            />
          ))}

        {/* Partner business pins (gold) */}
        {businesses
          .filter(b => b.type !== 'collection')
          .map(b => (
            <Marker
              key={`b-${b.id}`}
              coordinate={{ latitude: b.lat, longitude: b.lng }}
              onPress={() => showSheet(b)}
            >
              <View style={styles.goldPin}>
                <View style={styles.goldPinDot} />
              </View>
            </Marker>
          ))}
      </MapView>

      {/* Header overlay */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.headerTitle}>Where.</Text>
      </View>

      {/* Loading overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={COLORS.cream} />
        </View>
      )}

      {/* Empty state if no businesses */}
      {!loading && businesses.length === 0 && (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No locations yet.</Text>
          <Text style={styles.emptyText}>Collection points and partners will appear here when active.</Text>
        </View>
      )}

      {/* Legend */}
      {!loading && businesses.length > 0 && !selected && (
        <View style={[styles.legend, { bottom: insets.bottom + 30 }]}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.forestGreen }]} />
            <Text style={styles.legendText}>Collection</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#C4973A' }]} />
            <Text style={styles.legendText}>Partner</Text>
          </View>
        </View>
      )}

      {/* Bottom sheet */}
      {selected && (
        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: insets.bottom + 16, transform: [{ translateY: sheetTranslate }] },
          ]}
        >
          <View style={styles.sheetHandle} />
          <View style={styles.sheetTypeBadge}>
            <Text style={styles.sheetTypeText}>
              {selected.type === 'collection' ? 'COLLECTION POINT' : 'PARTNER'}
            </Text>
          </View>
          <Text style={styles.sheetName}>{selected.name}</Text>
          <Text style={styles.sheetAddress}>{selected.address}</Text>
          {selected.description ? (
            <Text style={styles.sheetDesc}>{selected.description}</Text>
          ) : null}
          <TouchableOpacity style={styles.sheetDismiss} onPress={hideSheet} activeOpacity={0.7}>
            <Text style={styles.sheetDismissText}>Close</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: SPACING.md,
    paddingBottom: 16,
  },
  headerTitle: {
    color: COLORS.cream,
    fontSize: 38,
    fontFamily: 'PlayfairDisplay_700Bold',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(28,58,42,0.5)',
  },
  emptyCard: {
    position: 'absolute',
    bottom: 40,
    left: SPACING.md,
    right: SPACING.md,
    backgroundColor: COLORS.cream,
    borderRadius: 14,
    padding: SPACING.md,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: 'PlayfairDisplay_700Bold',
    color: COLORS.textDark,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 20,
  },
  goldPin: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(196,151,58,0.25)',
    borderWidth: 2,
    borderColor: '#C4973A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goldPinDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#C4973A',
  },
  legend: {
    position: 'absolute',
    left: SPACING.md,
    backgroundColor: 'rgba(28,58,42,0.85)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: COLORS.cream, fontSize: 12, fontWeight: '500' },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.cream,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: SPACING.md,
    paddingTop: 12,
    gap: SPACING.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: 8,
  },
  sheetTypeBadge: {
    backgroundColor: COLORS.cardBg,
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  sheetTypeText: {
    fontSize: 10,
    color: COLORS.textMuted,
    letterSpacing: 1.5,
    fontWeight: '700',
  },
  sheetName: {
    fontSize: 22,
    fontFamily: 'PlayfairDisplay_700Bold',
    color: COLORS.textDark,
  },
  sheetAddress: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  sheetDesc: {
    fontSize: 14,
    color: COLORS.textDark,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  sheetDismiss: {
    marginTop: 4,
    paddingVertical: 12,
    alignItems: 'center',
  },
  sheetDismissText: {
    fontSize: 14,
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
});
