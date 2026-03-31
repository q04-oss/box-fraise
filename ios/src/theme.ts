import { useTheme } from './context/ThemeContext';

// Legacy tokens — used by old screens still in codebase
export const COLORS = {
  forestGreen: '#1C3A2A',
  cream: '#FFFFFF',
  cardBg: '#F2F2F7',
  highlightCardBg: '#F2F2F7',
  textDark: '#1C1C1E',
  textMuted: '#8E8E93',
  accentGold: '#C4973A',
  white: '#FFFFFF',
  border: '#E5E5EA',
  greenBadgeBg: '#D4EDD4',
  greenBadgeText: '#2D5A2D',
  chocolateDark: '#2C1810',
  strawberryRed: '#CC3333',
  leafGreen: '#2D5A2D',
  separator: '#E5E5EA',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const lightColors = {
  green: '#1C3A2A',
  bg: '#FFFFFF',
  cream: '#FFFFFF',
  card: '#F2F2F7',
  cardDark: '#E5E5EA',
  text: '#1C1C1E',
  muted: '#8E8E93',
  gold: '#C4973A',
  border: '#E5E5EA',
  terminal: '#000000',
  terminalText: '#FFFFFF',
  terminalClaude: '#F5A623',
  panelBg: '#F5F0E8',
  optionCard: 'rgba(255,255,255,0.5)',
  optionCardBorder: 'rgba(0,0,0,0.06)',
  stripBg: '#E5E5EA',
  searchBg: 'rgba(0,0,0,0.05)',
  searchBorder: 'rgba(0,0,0,0.1)',
  pillBg: 'rgba(0,0,0,0.06)',
  pillBorder: 'rgba(0,0,0,0.1)',
};

export const darkColors = {
  green: '#2A5C3F',
  bg: '#000000',
  cream: '#FFFFFF',
  card: '#1C1C1E',
  cardDark: '#2C2C2E',
  text: '#FFFFFF',
  muted: '#8E8E93',
  gold: '#D4A955',
  border: '#38383A',
  terminal: '#000000',
  terminalText: '#FFFFFF',
  terminalClaude: '#F5A623',
  panelBg: '#000000',
  optionCard: 'rgba(255,255,255,0.07)',
  optionCardBorder: 'rgba(255,255,255,0.1)',
  stripBg: '#2C2C2E',
  searchBg: 'rgba(255,255,255,0.08)',
  searchBorder: 'rgba(255,255,255,0.12)',
  pillBg: 'rgba(255,255,255,0.08)',
  pillBorder: 'rgba(255,255,255,0.12)',
};

// Static fallback for StyleSheet.create() (uses light by default)
export const colors = lightColors;

// Hook — call inside components to get the live color set
export function useColors() {
  const { isDark } = useTheme();
  return isDark ? darkColors : lightColors;
}

// Font family references
export const fonts = {
  playfair: 'PlayfairDisplay_700Bold',
  playfairRegular: 'PlayfairDisplay_400Regular',
  playfairItalic: 'PlayfairDisplay_400Regular_Italic',
  dmSans: 'DMSans_400Regular',
  dmSansMedium: 'DMSans_500Medium',
  dmMono: 'DMMono_400Regular',
};
