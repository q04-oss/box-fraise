import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useApp } from '../../../App';
import { usePanel } from '../../context/PanelContext';
import {
  fetchPayoutBalance,
  fetchPayoutHistory,
  fetchConnectStatus,
  createConnectLink,
  requestPayout,
} from '../../lib/api';
import { fonts, SPACING, useColors } from '../../theme';

type ConnectStatus = 'not_connected' | 'pending' | 'active';

export default function VentureEarningsPanel() {
  const { goBack } = usePanel();
  const { connectReturn, clearConnectReturn } = useApp();
  const c = useColors();

  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [history, setHistory] = useState<any[]>([]);
  const [connectStatus, setConnectStatus] = useState<ConnectStatus>('not_connected');
  const [connecting, setConnecting] = useState(false);
  const [payingOut, setPayingOut] = useState(false);

  const load = useCallback(async () => {
    try {
      const [bal, hist, status] = await Promise.all([
        fetchPayoutBalance(),
        fetchPayoutHistory(),
        fetchConnectStatus(),
      ]);
      setBalance(bal.available_cents);
      setHistory(hist);
      setConnectStatus(status.status);
    } catch {
      // non-fatal
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // When returning from Stripe Connect onboarding, re-check status
  useEffect(() => {
    if (connectReturn) {
      clearConnectReturn();
      fetchConnectStatus().then(s => setConnectStatus(s.status)).catch(() => {});
    }
  }, [connectReturn]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const { url } = await createConnectLink();
      await Linking.openURL(url);
    } catch {
      Alert.alert('Error', 'Could not start bank account setup. Try again.');
    } finally {
      setConnecting(false);
    }
  };

  const handlePayout = () => {
    Alert.alert(
      'Request payout',
      `Transfer CA$${(balance / 100).toFixed(2)} to your bank account? Standard bank transfer timing applies (2–3 business days).`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Transfer', onPress: async () => {
            setPayingOut(true);
            try {
              await requestPayout();
              await load();
              Alert.alert('Done', 'Transfer initiated. You\'ll see it in your bank within a few business days.');
            } catch (e: any) {
              const msg = e?.message === 'no_balance' ? 'No available balance.'
                : e?.message === 'bank_account_not_connected' ? 'Connect a bank account first.'
                : 'Transfer failed. Try again.';
              Alert.alert('Error', msg);
            } finally {
              setPayingOut(false);
            }
          },
        },
      ],
    );
  };

  const renderConnectSection = () => {
    if (connectStatus === 'not_connected') {
      return (
        <View style={[styles.connectSection, { borderBottomColor: c.border }]}>
          <Text style={[styles.sectionLabel, { color: c.muted }]}>BANK ACCOUNT</Text>
          <Text style={[styles.connectHint, { color: c.muted }]}>
            Connect a bank account to receive payouts. Powered by Stripe — we never see your banking details.
          </Text>
          <TouchableOpacity
            style={[styles.connectBtn, { backgroundColor: c.text }, connecting && { opacity: 0.5 }]}
            onPress={handleConnect}
            disabled={connecting}
            activeOpacity={0.8}
          >
            <Text style={[styles.connectBtnText, { color: c.panelBg }]}>
              {connecting ? 'opening…' : 'connect bank account'}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (connectStatus === 'pending') {
      return (
        <View style={[styles.connectSection, { borderBottomColor: c.border }]}>
          <Text style={[styles.sectionLabel, { color: c.muted }]}>BANK ACCOUNT</Text>
          <Text style={[styles.connectHint, { color: c.muted }]}>
            Setup in progress. Finish the bank account connection to enable payouts.
          </Text>
          <TouchableOpacity
            style={[styles.connectBtn, { borderWidth: StyleSheet.hairlineWidth, borderColor: c.border }, connecting && { opacity: 0.5 }]}
            onPress={handleConnect}
            disabled={connecting}
            activeOpacity={0.7}
          >
            <Text style={[styles.connectBtnText, { color: c.muted }]}>
              {connecting ? 'opening…' : 'continue setup →'}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    // active
    return (
      <View style={[styles.connectSection, { borderBottomColor: c.border }]}>
        <Text style={[styles.sectionLabel, { color: c.muted }]}>BANK ACCOUNT</Text>
        <Text style={[styles.connectedLabel, { color: c.accent }]}>connected ✓</Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: c.panelBg }]}>
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={[styles.backArrow, { color: c.accent }]}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.title, { color: c.text }]}>venture earnings</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <ActivityIndicator color={c.accent} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
          {/* Balance */}
          <View style={[styles.balanceSection, { borderBottomColor: c.border }]}>
            <Text style={[styles.balanceAmount, { color: c.text }]}>
              CA${(balance / 100).toFixed(2)}
            </Text>
            <Text style={[styles.balanceLabel, { color: c.muted }]}>available balance</Text>
            {connectStatus === 'active' && balance > 0 && (
              <TouchableOpacity
                style={[styles.payoutBtn, { backgroundColor: c.text }, payingOut && { opacity: 0.5 }]}
                onPress={handlePayout}
                disabled={payingOut}
                activeOpacity={0.8}
              >
                <Text style={[styles.payoutBtnText, { color: c.panelBg }]}>
                  {payingOut ? 'transferring…' : 'transfer to bank'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Bank account */}
          {renderConnectSection()}

          {/* History */}
          {history.length > 0 && (
            <View style={styles.historySection}>
              <Text style={[styles.sectionLabel, { color: c.muted }]}>HISTORY</Text>
              {history.map(entry => (
                <View key={entry.id} style={[styles.historyRow, { borderBottomColor: c.border }]}>
                  <View style={styles.historyLeft}>
                    <Text style={[styles.historyDesc, { color: c.text }]}>
                      {entry.description ?? (entry.type === 'credit' ? 'revenue credit' : 'payout')}
                    </Text>
                    <Text style={[styles.historyDate, { color: c.muted }]}>
                      {new Date(entry.created_at).toLocaleDateString('en-CA')}
                    </Text>
                  </View>
                  <Text style={[
                    styles.historyAmount,
                    { color: entry.type === 'credit' ? c.accent : c.muted },
                  ]}>
                    {entry.type === 'credit' ? '+' : '−'}CA${(entry.amount_cents / 100).toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {history.length === 0 && !loading && (
            <Text style={[styles.empty, { color: c.muted }]}>
              no earnings yet — venture revenue credits appear here when orders are collected
            </Text>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingTop: 18,
    paddingBottom: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { paddingVertical: 4 },
  backArrow: { fontSize: 28, lineHeight: 34 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerSpacer: { width: 28 },
  title: { fontSize: 17, fontFamily: fonts.playfair },
  balanceSection: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 28,
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    gap: 6,
  },
  balanceAmount: { fontSize: 36, fontFamily: fonts.playfair },
  balanceLabel: { fontSize: 9, fontFamily: fonts.dmMono, letterSpacing: 1.5, textTransform: 'uppercase' },
  payoutBtn: {
    marginTop: 16,
    height: 48,
    borderRadius: 14,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payoutBtnText: { fontSize: 12, fontFamily: fonts.dmMono, letterSpacing: 0.5 },
  connectSection: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  sectionLabel: { fontSize: 9, fontFamily: fonts.dmMono, letterSpacing: 1.5, textTransform: 'uppercase' },
  connectHint: { fontSize: 13, fontFamily: fonts.dmSans, lineHeight: 20 },
  connectBtn: {
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectBtnText: { fontSize: 12, fontFamily: fonts.dmMono, letterSpacing: 0.5 },
  connectedLabel: { fontSize: 13, fontFamily: fonts.dmMono, letterSpacing: 0.3 },
  historySection: {
    paddingHorizontal: SPACING.md,
    paddingTop: 18,
    gap: 0,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  historyLeft: { flex: 1, gap: 3 },
  historyDesc: { fontSize: 13, fontFamily: fonts.dmSans },
  historyDate: { fontSize: 10, fontFamily: fonts.dmMono, letterSpacing: 0.3 },
  historyAmount: { fontSize: 13, fontFamily: fonts.playfair },
  empty: {
    textAlign: 'center',
    marginTop: 40,
    marginHorizontal: SPACING.md,
    fontSize: 13,
    fontFamily: fonts.dmSans,
    fontStyle: 'italic',
    lineHeight: 20,
  },
});
