import React, { useRef } from 'react';
import {
  View, Text, StyleSheet, PanResponder, Animated,
} from 'react-native';
import { useColors, fonts } from '../theme';

interface SwipeBarProps {
  label: string;
  onNext: () => void;
  onBack?: () => void;
  disabled?: boolean;
}

const THRESHOLD = 80;

export default function SwipeBar({ label, onNext, onBack, disabled }: SwipeBarProps) {
  const c = useColors();
  const translateX = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponder: (_, g) => !disabled && Math.abs(g.dx) > 5,
      onPanResponderMove: (_, g) => {
        const clamped = Math.max(-120, Math.min(120, g.dx));
        translateX.setValue(clamped);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx > THRESHOLD) {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true, speed: 20 }).start();
          onNext();
        } else if (g.dx < -THRESHOLD && onBack) {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true, speed: 20 }).start();
          onBack();
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true, speed: 20 }).start();
        }
      },
    })
  ).current;

  return (
    <View style={[
      styles.track,
      { backgroundColor: c.pillBg, borderColor: c.pillBorder },
      disabled && styles.trackDisabled,
    ]}>
      {onBack && <Text style={[styles.arrow, { color: c.muted }]}>←</Text>}
      <Animated.View
        style={[styles.bar, { backgroundColor: c.green, transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        <Text style={[styles.label, { color: c.cream }]}>{label}</Text>
        <Text style={styles.hint}>swipe</Text>
      </Animated.View>
      <Text style={[styles.arrow, { color: c.muted }]}>→</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    marginHorizontal: 16,
    marginVertical: 12,
    height: 56,
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  trackDisabled: { opacity: 0.35 },
  arrow: {
    fontSize: 18,
  },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  label: {
    fontSize: 14,
    fontFamily: fonts.dmSans,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  hint: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontFamily: fonts.dmSans,
    letterSpacing: 1.5,
  },
});
