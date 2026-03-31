import React, { useRef, useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, Dimensions, LayoutChangeEvent } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { TrueSheet } from '@lodev09/react-native-true-sheet';
import { usePanel } from '../context/PanelContext';
import { useTheme } from '../context/ThemeContext';
import PanelNavigator from '../components/PanelNavigator';
import { fetchBusinesses } from '../lib/api';
import { useColors } from '../theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_NAME = 'main-sheet';
const DETENTS: [number, number, number] = [0.12, 0.5, 1];

export default function MapScreen() {
  const { setBusinesses, setActiveLocation, businesses, goHome } = usePanel();
  const { isDark } = useTheme();
  const c = useColors();
  const [contentHeight, setContentHeight] = useState(SCREEN_HEIGHT * 0.5);
  const mapRef = useRef<MapView>(null);

  const onSheetLayout = useCallback((e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h > 0) setContentHeight(h);
  }, []);

  useEffect(() => {
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
            <View style={[styles.pinCollection, { backgroundColor: c.markerBg }]}>
              <View style={styles.pinCollectionDot} />
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


      <TrueSheet
        name={SHEET_NAME}
        detents={DETENTS}
        initialDetentIndex={1}
        cornerRadius={20}
        backgroundBlur={isDark ? 'system-ultra-thin-material-dark' : 'system-material'}
        grabber
        grabberOptions={{ color: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)' }}
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
  pinCollection: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  pinCollectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  pinPartner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#fff',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  pinPartnerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
