import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from '../types';
import { COLORS } from '../theme';
import BoardScreen from '../screens/BoardScreen';
import WhereScreen from '../screens/WhereScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

function GlassPillTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  const labels: Record<string, string> = {
    Board: 'BOARD',
    Where: 'WHERE',
  };

  return (
    <View style={[styles.pillWrapper, { bottom: Math.max(insets.bottom, 16) + 4 }]} pointerEvents="box-none">
      <View style={styles.pill}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const label = labels[route.name] ?? route.name.toUpperCase();

          return (
            <TouchableOpacity
              key={route.key}
              style={[styles.pillTab, focused && styles.pillTabActive]}
              onPress={() => { if (!focused) navigation.navigate(route.name); }}
              activeOpacity={0.8}
            >
              <Text style={[styles.pillLabel, focused && styles.pillLabelActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function BottomTabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <GlassPillTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Board" component={BoardScreen} />
      <Tab.Screen name="Where" component={WhereScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  pillWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    backgroundColor: 'rgba(28,58,42,0.92)',
    borderRadius: 30,
    paddingVertical: 6,
    paddingHorizontal: 6,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  pillTab: {
    paddingVertical: 9,
    paddingHorizontal: 24,
    borderRadius: 22,
    alignItems: 'center',
  },
  pillTabActive: {
    backgroundColor: COLORS.cream,
  },
  pillLabel: {
    fontSize: 11,
    letterSpacing: 1.8,
    fontWeight: '700',
    color: 'rgba(232,224,208,0.5)',
  },
  pillLabelActive: {
    color: COLORS.forestGreen,
  },
});
