import { readFileSync, writeFileSync } from 'fs';

const path = './src/components/panels/TerminalPanel.tsx';
let src = readFileSync(path, 'utf8');
const hasCRLF = src.includes('\r\n');
if (hasCRLF) src = src.replace(/\r\n/g, '\n');

// Remove isVerified gate around utility shortcuts — worker access approval is enough
const OLD = `            {/* ── Utility shortcuts ── */}
            {isVerified && (
              <>
                <View style={[styles.divider, { backgroundColor: c.border }]} />
                {workerAccess === 'approved' ? (`;

const NEW = `            {/* ── Utility shortcuts ── */}
            {workerAccess === 'approved' && (
              <>
                <View style={[styles.divider, { backgroundColor: c.border }]} />
                {true ? (`;

if (!src.includes(OLD)) { console.error('target not found'); process.exit(1); }
src = src.replace(OLD, NEW);

if (hasCRLF) src = src.replace(/\n/g, '\r\n');
writeFileSync(path, src, 'utf8');
console.log('Done');
