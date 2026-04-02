import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TokenVisual } from './TokenVisual';
import { fonts } from '../theme';

export interface ProvenanceLedgerEntry {
  user_id: number;
  display_name: string;
  from_year: number;
  to_year: number;
  role: 'founder' | 'patron';
}

export interface ProvenanceTokenCardProps {
  greenhouseName: string;
  greenhouseLocation: string;
  ledger: ProvenanceLedgerEntry[];
  tokenId: number;
}

export function ProvenanceTokenCard({
  greenhouseName,
  greenhouseLocation,
  ledger,
  tokenId,
}: ProvenanceTokenCardProps) {
  const mostRecentIdx = ledger.length - 1;

  return (
    <View style={styles.card}>
      {/* Visual */}
      <View style={styles.visualWrapper}>
        <TokenVisual
          tokenId={tokenId}
          size={100}
          color="#1A237E"
          seeds={144}
          irregularity={100}
          width={160}
        />
      </View>

      {/* Title */}
      <Text style={styles.title}>{'GREENHOUSE PROVENANCE'}</Text>
      <Text style={styles.meta}>
        {`${greenhouseName} · ${greenhouseLocation}`}
      </Text>

      {/* Ledger */}
      <Text style={styles.ledgerLabel}>{'LEDGER'}</Text>
      <Text style={styles.divider}>{'────────────────────────────'}</Text>
      {ledger.map((entry, i) => {
        const isRecent = i === mostRecentIdx;
        const handle = `@${entry.display_name.toLowerCase().replace(/\s+/g, '_')}`;
        const roleLabel = entry.role === 'founder' ? 'FOUNDER' : 'PATRON ';
        return (
          <Text
            key={`${entry.user_id}-${i}`}
            style={[styles.ledgerEntry, isRecent && styles.ledgerEntryHighlight]}
          >
            {`${roleLabel} · ${handle} · ${entry.from_year}–${entry.to_year}`}
          </Text>
        );
      })}
      <Text style={styles.divider}>{'────────────────────────────'}</Text>
    </View>
  );
}

const ACCENT = '#D4A843';

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FAF6EE',
    borderWidth: 2,
    borderColor: ACCENT,
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    gap: 6,
    width: '100%',
  },
  visualWrapper: {
    marginBottom: 8,
  },
  title: {
    fontFamily: fonts.dmMono,
    fontSize: 12,
    color: '#1A237E',
    letterSpacing: 2,
    textAlign: 'center',
  },
  meta: {
    fontFamily: fonts.dmMono,
    fontSize: 11,
    color: '#1C1C1E',
    textAlign: 'center',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  ledgerLabel: {
    fontFamily: fonts.dmMono,
    fontSize: 11,
    color: '#8E8E93',
    letterSpacing: 1.5,
    marginTop: 4,
  },
  divider: {
    fontFamily: fonts.dmMono,
    fontSize: 11,
    color: ACCENT,
    letterSpacing: 0.5,
  },
  ledgerEntry: {
    fontFamily: fonts.dmMono,
    fontSize: 11,
    color: '#3A3A3C',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  ledgerEntryHighlight: {
    color: ACCENT,
  },
});
