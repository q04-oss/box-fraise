import { readFileSync, writeFileSync } from 'fs';

const path = './src/components/panels/TerminalPanel.tsx';
let src = readFileSync(path, 'utf8');
const hasCRLF = src.includes('\r\n');
if (hasCRLF) src = src.replace(/\r\n/g, '\n');

// Add a test NFC write button right before the closing of the scroll content
const OLD = `            {/* ── Utility shortcuts ── */}
            {workerAccess === 'approved' && (`;

const NEW = `            {/* ── TEST: NFC write shortcut ── */}
            <View style={[styles.divider, { backgroundColor: c.border }]} />
            <TouchableOpacity style={styles.inboxBtn} onPress={() => showPanel('nfc-write', { nfc_token: '6bc7380a-1a55-466b-b7c7-4e3bbe6676d9', variety_name: 'Albion (test)' })} activeOpacity={0.7}>
              <Text style={[styles.label, { color: c.muted }]}>WRITE TEST TAG</Text>
              <Text style={[styles.label, { color: c.accent }]}>→</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.inboxBtn} onPress={() => showPanel('staff-orders')} activeOpacity={0.7}>
              <Text style={[styles.label, { color: c.muted }]}>STAFF ORDERS</Text>
              <Text style={[styles.label, { color: c.accent }]}>→</Text>
            </TouchableOpacity>

            {/* ── Utility shortcuts ── */}
            {workerAccess === 'approved' && (`;

if (!src.includes(OLD)) { console.error('target not found'); process.exit(1); }
src = src.replace(OLD, NEW);

if (hasCRLF) src = src.replace(/\n/g, '\r\n');
writeFileSync(path, src, 'utf8');
console.log('Done');
