import { readFileSync, writeFileSync } from 'fs';

// 1. Remove test buttons from TerminalPanel
{
  const path = './src/components/panels/TerminalPanel.tsx';
  let src = readFileSync(path, 'utf8');
  const hasCRLF = src.includes('\r\n');
  if (hasCRLF) src = src.replace(/\r\n/g, '\n');

  const OLD = `            {/* ── TEST: NFC write shortcut ── */}
            <View style={[styles.divider, { backgroundColor: c.border }]} />
            <TouchableOpacity style={styles.inboxBtn} onPress={() => showPanel('nfc-write', { nfc_token: '6bc7380a-1a55-466b-b7c7-4e3bbe6676d9', variety_name: 'Albion (test)' })} activeOpacity={0.7}>
              <Text style={[styles.label, { color: c.muted }]}>WRITE TEST TAG</Text>
              <Text style={[styles.label, { color: c.accent }]}>→</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.inboxBtn} onPress={() => showPanel('staff-orders')} activeOpacity={0.7}>
              <Text style={[styles.label, { color: c.muted }]}>STAFF ORDERS</Text>
              <Text style={[styles.label, { color: c.accent }]}>→</Text>
            </TouchableOpacity>

            `;
  const NEW = `            `;

  if (!src.includes(OLD)) { console.error('TerminalPanel: test buttons not found'); process.exit(1); }
  src = src.replace(OLD, NEW);

  if (hasCRLF) src = src.replace(/\n/g, '\r\n');
  writeFileSync(path, src, 'utf8');
  console.log('TerminalPanel done');
}

// 2. Remove debug error text from VerifyNFCPanel (the duplicate red error lines)
{
  const path = './src/components/panels/VerifyNFCPanel.tsx';
  let src = readFileSync(path, 'utf8');
  const hasCRLF = src.includes('\r\n');
  if (hasCRLF) src = src.replace(/\r\n/g, '\n');

  const OLD = `          {state === 'error' && !!errorMsg && (
            <Text style={{ color: 'red', fontSize: 11, textAlign: 'center', paddingHorizontal: 16, paddingTop: 4 }}>{errorMsg}</Text>
          )}`;
  const NEW = ``;

  // Remove all occurrences
  while (src.includes(OLD)) {
    src = src.replace(OLD, NEW);
  }

  if (hasCRLF) src = src.replace(/\n/g, '\r\n');
  writeFileSync(path, src, 'utf8');
  console.log('VerifyNFCPanel done');
}
