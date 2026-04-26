import React, { createContext, useContext, useRef, useState, ReactNode, useCallback } from 'react';
import { Animated, Dimensions } from 'react-native';
import { FraiseEvent, FraiseMember, FraiseClaim } from '../lib/api';

export type PanelId = 'home' | 'event-detail' | 'my-claims' | 'account' | 'credits';
export type RootTab = 'discover' | 'claims' | 'account';

export { FraiseEvent, FraiseMember, FraiseClaim };

const SCREEN_WIDTH = Dimensions.get('window').width;

interface PanelContextValue {
  // navigation
  stack: PanelId[];
  currentPanel: PanelId;
  slideAnim: Animated.Value;
  isAnimating: boolean;
  showPanel: (id: PanelId, data?: Record<string, any>) => void;
  jumpToPanel: (id: PanelId) => void;
  goBack: () => void;
  goHome: () => void;
  lastNavType: React.MutableRefObject<'show' | 'jump'>;
  panelData: Record<string, any> | null;
  setPanelData: (data: Record<string, any> | null) => void;
  sheetHeight: number;
  setSheetHeight: (h: number) => void;
  activeRootTab: RootTab;
  suppressCollapseBack: React.MutableRefObject<boolean>;

  // domain
  member: FraiseMember | null;
  setMember: (m: FraiseMember | null) => void;
  events: FraiseEvent[];
  setEvents: (evs: FraiseEvent[]) => void;
  claims: FraiseClaim[];
  setClaims: (c: FraiseClaim[]) => void;
  activeEvent: FraiseEvent | null;
  setActiveEvent: (ev: FraiseEvent | null) => void;
}

const PanelContext = createContext<PanelContextValue | null>(null);

export function PanelProvider({ children }: { children: ReactNode }) {
  const [stack, setStack]             = useState<PanelId[]>(['home']);
  const [currentPanel, setCurrentPanel] = useState<PanelId>('home');
  const [isAnimating, setIsAnimating] = useState(false);
  const [panelData, setPanelData]     = useState<Record<string, any> | null>(null);
  const [sheetHeight, setSheetHeight] = useState(0);
  const [member, setMember]           = useState<FraiseMember | null>(null);
  const [events, setEvents]           = useState<FraiseEvent[]>([]);
  const [claims, setClaims]           = useState<FraiseClaim[]>([]);
  const [activeEvent, setActiveEvent] = useState<FraiseEvent | null>(null);

  const slideAnim           = useRef(new Animated.Value(0)).current;
  const animSafetyRef       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastNavType         = useRef<'show' | 'jump'>('show');
  const suppressCollapseBack = useRef(false);

  const activeRootTab: RootTab =
    currentPanel === 'my-claims' ? 'claims' :
    currentPanel === 'account'   ? 'account' : 'discover';

  const clearSafety = () => {
    if (animSafetyRef.current) { clearTimeout(animSafetyRef.current); animSafetyRef.current = null; }
  };
  const startSafety = (done: () => void) => {
    clearSafety();
    animSafetyRef.current = setTimeout(done, 600);
  };

  const showPanel = useCallback((id: PanelId, data?: Record<string, any>) => {
    if (isAnimating) return;
    lastNavType.current = 'show';
    setIsAnimating(true);
    setPanelData(data ?? null);
    slideAnim.setValue(1);
    setCurrentPanel(id);
    setStack(prev => [...prev, id]);
    const done = () => { clearSafety(); setIsAnimating(false); };
    startSafety(done);
    Animated.timing(slideAnim, { toValue: 0, duration: 320, useNativeDriver: true }).start(() => done());
  }, [isAnimating, slideAnim]);

  const goBack = useCallback(() => {
    if (isAnimating || stack.length <= 1) return;
    setIsAnimating(true);
    const done = () => {
      clearSafety();
      const newStack = stack.slice(0, -1);
      setStack(newStack);
      setCurrentPanel(newStack[newStack.length - 1]);
      slideAnim.setValue(0);
      setIsAnimating(false);
    };
    startSafety(done);
    Animated.timing(slideAnim, { toValue: 1, duration: 280, useNativeDriver: true }).start(() => done());
  }, [isAnimating, stack, slideAnim]);

  const goHome = useCallback(() => {
    clearSafety();
    slideAnim.stopAnimation();
    setStack(['home']);
    setCurrentPanel('home');
    slideAnim.setValue(0);
    setIsAnimating(false);
  }, [slideAnim]);

  const jumpToPanel = useCallback((id: PanelId) => {
    lastNavType.current = 'jump';
    setIsAnimating(false);
    slideAnim.setValue(0);
    setCurrentPanel(id);
    setStack(['home', id]);
  }, [slideAnim]);

  return (
    <PanelContext.Provider value={{
      stack, currentPanel, slideAnim, isAnimating,
      showPanel, jumpToPanel, goBack, goHome, lastNavType,
      panelData, setPanelData,
      sheetHeight, setSheetHeight,
      activeRootTab, suppressCollapseBack,
      member, setMember,
      events, setEvents,
      claims, setClaims,
      activeEvent, setActiveEvent,
    }}>
      {children}
    </PanelContext.Provider>
  );
}

export function usePanel() {
  const ctx = useContext(PanelContext);
  if (!ctx) throw new Error('usePanel must be used within PanelProvider');
  return ctx;
}
