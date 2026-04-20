/**
 * AnimatedCard — Reanimated playground
 *
 * Demonstrates: useSharedValue, useAnimatedStyle, withSpring
 *
 * Before using, install:
 *   npx expo install react-native-reanimated
 * Then add to babel.config.js plugins:
 *   'react-native-reanimated/plugin'
 *
 * Not imported anywhere — this file is for learning only.
 */

import React, { useRef } from 'react';
import {
  PanResponder,
  Text,
  View,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { lightColors, fonts, SPACING } from '../../theme';

const c = lightColors;
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const CARD_W = 260;
const CARD_H = 160;

// Spring config — tweak these to feel the difference
const SPRING_CONFIG = {
  damping: 12,      // lower = more bouncy
  stiffness: 120,   // higher = snappier
  mass: 0.8,        // higher = heavier feel
};

export default function AnimatedCard() {
  // useSharedValue lives on the UI thread — no bridge round-trips
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);

  // Track the drag offset so we can accumulate across gestures
  const lastX = useRef(0);
  const lastY = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,

      onPanResponderGrant: () => {
        // Lift the card slightly on press
        scale.value = withSpring(1.05, SPRING_CONFIG);
      },

      onPanResponderMove: (_evt, gesture) => {
        // Directly write to shared values — no setState, no re-render
        translateX.value = lastX.current + gesture.dx;
        translateY.value = lastY.current + gesture.dy;

        // Tilt based on horizontal drag velocity
        const tilt = Math.min(Math.max(gesture.vx * 4, -15), 15);
        rotate.value = tilt;
      },

      onPanResponderRelease: () => {
        // Spring back to origin
        translateX.value = withSpring(0, SPRING_CONFIG);
        translateY.value = withSpring(0, SPRING_CONFIG);
        rotate.value = withSpring(0, SPRING_CONFIG);
        scale.value = withSpring(1, SPRING_CONFIG);

        lastX.current = 0;
        lastY.current = 0;
      },
    })
  ).current;

  // useAnimatedStyle runs on the UI thread — derives style from shared values
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
      { scale: scale.value },
    ],
  }));

  return (
    <View style={styles.container}>
      <Text style={styles.label}>drag me</Text>

      {/* Animated.View bridges the shared values to the native layer */}
      <Animated.View style={[styles.card, animatedStyle]} {...panResponder.panHandlers}>
        <Text style={styles.cardTitle}>AnimatedCard</Text>
        <Text style={styles.cardBody}>
          translateX · translateY · rotate · scale
        </Text>
        <View style={styles.row}>
          <Pill label="useSharedValue" />
          <Pill label="withSpring" />
        </View>
      </Animated.View>

      <Text style={styles.hint}>
        Edit SPRING_CONFIG above to change damping, stiffness, and mass.
      </Text>
    </View>
  );
}

function Pill({ label }: { label: string }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.bg,
    gap: SPACING.lg,
  },
  label: {
    fontFamily: fonts.dmMono,
    fontSize: 12,
    color: c.muted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  card: {
    width: CARD_W,
    minHeight: CARD_H,
    backgroundColor: c.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.border,
    padding: SPACING.lg,
    gap: SPACING.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  cardTitle: {
    fontFamily: fonts.playfair,
    fontSize: 20,
    color: c.text,
  },
  cardBody: {
    fontFamily: fonts.dmMono,
    fontSize: 11,
    color: c.muted,
    letterSpacing: 0.4,
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.xs,
    flexWrap: 'wrap',
    marginTop: SPACING.xs,
  },
  pill: {
    backgroundColor: c.cardDark,
    borderRadius: 99,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
  },
  pillText: {
    fontFamily: fonts.dmMono,
    fontSize: 10,
    color: c.accent,
  },
  hint: {
    fontFamily: fonts.dmSans,
    fontSize: 13,
    color: c.muted,
    textAlign: 'center',
    maxWidth: CARD_W,
  },
});
