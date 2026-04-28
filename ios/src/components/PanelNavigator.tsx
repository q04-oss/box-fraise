import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, useWindowDimensions } from 'react-native';
import { TrueSheet } from '@lodev09/react-native-true-sheet';
import { usePanel } from '../context/PanelContext';
import { useColors } from '../theme';
import HomePanel from './panels/HomePanel';
import EventDetailPanel from './panels/EventDetailPanel';
import MyClaimsPanel from './panels/MyClaimsPanel';
import AccountPanel from './panels/AccountPanel';
import CreditsPanel from './panels/CreditsPanel';

const PANELS: Record<string, React.ComponentType<any>> = {
  home:           HomePanel,
  'event-detail': EventDetailPanel,
  'my-claims':    MyClaimsPanel,
  account:        AccountPanel,
  credits:        CreditsPanel,
};

const FULL_HEIGHT_PANELS = new Set(['my-claims', 'account', 'credits']);

export function detentIndexForPanel(panelId: string): 0 | 1 | 2 {
  if (FULL_HEIGHT_PANELS.has(panelId)) return 2;
  return 1;
}

export default function PanelNavigator() {
  const { currentPanel, slideAnim, lastNavType } = usePanel();
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const c = useColors();
  const CurrentComponent = PANELS[currentPanel] ?? HomePanel;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (FULL_HEIGHT_PANELS.has(currentPanel) && lastNavType.current === 'show') {
      timerRef.current = setTimeout(() => TrueSheet.resize('main-sheet', 2), 350);
    } else if ((currentPanel === 'home' || currentPanel === 'event-detail') && mountedRef.current) {
      timerRef.current = setTimeout(() => TrueSheet.resize('main-sheet', 1), 350);
    }
    mountedRef.current = true;
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [currentPanel]);

  return (
    <Animated.View style={[styles.container, {
      backgroundColor: c.panelBg,
      transform: [{
        translateX: slideAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, SCREEN_WIDTH],
        }),
      }],
    }]}>
      <CurrentComponent />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
