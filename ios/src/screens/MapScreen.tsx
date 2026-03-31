import React, { useRef, useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, LayoutChangeEvent } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TrueSheet } from '@lodev09/react-native-true-sheet';
import { usePanel } from '../context/PanelContext';
import { useTheme } from '../context/ThemeContext';
import PanelNavigator from '../components/PanelNavigator';
import ProfileAvatar from '../components/ProfileAvatar';
import { fetchBusinesses } from '../lib/api';
import { colors, useColors } from '../theme';
import { getUserId, isVerified } from '../lib/userId';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_NAME = 'main-sheet';
const DETENTS: [number, number, number] = [0.12, 0.5, 1];

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const { setBusinesses, setActiveLocation, businesses, goHome } = usePanel();
  const { isDark, toggleTheme } = useTheme();
  const c = useColors();
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [verified, setVerified] = useState(false);
  const [contentHeight, setContentHeight] = useState(SCREEN_HEIGHT * 0.5);
  const mapRef = useRef<MapView>(null);

  const onSheetLayout = useCallback((e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h > 0) setContentHeight(h);
  }, []);

  useEffect(() => {
    getUserId().then(setUserId).catch(() => {});
    isVerified().then(setVerified).catch(() => {});
    fetchBusinesses()
      .then((data: any[]) => setBusinesses(data))
      .catch(() => {});
  }, []);

  const handleMarkerPress = (biz: any) => {
    setActiveLocation(biz);
    goHome();
    TrueSheet.present(SHEET_NAME, 1);
    mapRef.current?.animateToRegion({
      latitude: biz.lat - 0.003,
      longitude: biz.lng,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    }, 400);
  };

  const collectionPoints = businesses.filter(b => b.type === 'collection');
  const partners = businesses.filter(b => b.type !== 'collection');

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={{
          latitude: 53.5461,
          longitude: -113.4938,
          latitudeDelta: 0.08,
          longitudeDelta: 0.08,
        }}
        userInterfaceStyle={isDark ? 'dark' : 'light'}
        showsUserLocation
        showsCompass={false}
        showsScale={false}
        rotateEnabled={false}
        pitchEnabled={false}
      >
        {collectionPoints.map(b => (
          <Marker
            key={`col-${b.id}`}
            coordinate={{ latitude: b.lat, longitude: b.lng }}
            onPress={() => handleMarkerPress(b)}
          >
            <View style={[styles.pinCollection, { backgroundColor: c.gold }]}>
              <Text style={styles.pinText}>✦</Text>
            </View>
          </Marker>
        ))}
        {partners.map(b => (
          <Marker
            key={`biz-${b.id}`}
            coordinate={{ latitude: b.lat, longitude: b.lng }}
            onPress={() => handleMarkerPress(b)}
          >
            <View style={[styles.pinPartner, { borderColor: c.green }]}>
              <View style={[styles.pinPartnerDot, { backgroundColor: c.green }]} />
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Avatar top-left */}
      <View style={[styles.avatarBtn, { top: insets.top + 12 }]}>
        <ProfileAvatar verified={verified} userId={userId} />
      </View>

      {/* Theme toggle top-right */}
      <TouchableOpacity
        style={[styles.themeBtn, { top: insets.top + 12 }]}
        onPress={toggleTheme}
        activeOpacity={0.8}
      >
        <Text style={styles.themeBtnText}>{isDark ? '☀️' : '🌙'}</Text>
      </TouchableOpacity>

      <TrueSheet
        name={SHEET_NAME}
        detents={DETENTS}
        initialDetentIndex={1}
        cornerRadius={20}
        grabber
        grabberOptions={{ color: 'rgba(0,0,0,0.2)' }}
      >
        <View style={{ height: contentHeight }} onLayout={onSheetLayout}>
          <PanelNavigator />
        </View>
      </TrueSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  avatarBtn: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
  },
  themeBtn: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  themeBtnText: {
    fontSize: 18,
  },
  pinCollection: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  pinText: {
    fontSize: 10,
    color: '#fff',
  },
  pinPartner: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#fff',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinPartnerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
