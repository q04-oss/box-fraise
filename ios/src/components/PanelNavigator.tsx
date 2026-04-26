import React from 'react';
import { Animated, StyleSheet, useWindowDimensions } from 'react-native';
import { usePanel } from '../context/PanelContext';
import { useColors } from '../theme';
import HomePanel from './panels/HomePanel';
import InvitationDetailPanel from './panels/InvitationDetailPanel';
import MyClaimsPanel from './panels/MyClaimsPanel';
import AccountPanel from './panels/AccountPanel';
import CreditsPanel from './panels/CreditsPanel';
import MembersPanel from './panels/MembersPanel';

const PANELS: Record<string, React.ComponentType<any>> = {
  home:                HomePanel,
  'invitation-detail': InvitationDetailPanel,
  'my-claims':         MyClaimsPanel,
  account:             AccountPanel,
  credits:             CreditsPanel,
  members:             MembersPanel,
};

export default function PanelNavigator() {
  const { currentPanel, slideAnim } = usePanel();
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const c = useColors();
  const CurrentComponent = PANELS[currentPanel] ?? HomePanel;

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
