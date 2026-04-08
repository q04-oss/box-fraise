import { readFileSync, writeFileSync } from 'fs';

const filePath = new URL('./src/components/panels/TerminalPanel.tsx', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');

let content = readFileSync(filePath, 'utf8');
const hasCRLF = content.includes('\r\n');

// Normalize to LF for processing
if (hasCRLF) content = content.replace(/\r\n/g, '\n');

// ── 1. Add fetchBatchStatus to the import from api ──────────────────────────
const importOld = '  requestWorkerAccess, fetchMyWorkerAccess,\n} from \'../../lib/api\';';
const importNew = '  requestWorkerAccess, fetchMyWorkerAccess,\n  fetchBatchStatus,\n} from \'../../lib/api\';';
if (!content.includes(importOld)) { console.error('PATCH FAILED: import anchor not found'); process.exit(1); }
content = content.replace(importOld, importNew);

// ── 2. Add batchStatus state after confirmedOrder ────────────────────────────
const stateOld = '  const [paying, setPaying] = useState(false);\n  const [confirmedOrder, setConfirmedOrder] = useState<any | null>(null);';
const stateNew = '  const [paying, setPaying] = useState(false);\n  const [confirmedOrder, setConfirmedOrder] = useState<any | null>(null);\n  const [batchStatus, setBatchStatus] = useState<Record<number, { queued_boxes: number; min_quantity: number }>>({});';
if (!content.includes(stateOld)) { console.error('PATCH FAILED: state anchor not found'); process.exit(1); }
content = content.replace(stateOld, stateNew);

// ── 3. Add useEffect for batchStatus after the auto-scroll useEffect ─────────
const effectOld = '  useEffect(() => {\n    if (orderOpen && orderStep !== \'variety\') scrollToBottom();\n  }, [orderStep]);';
const effectNew = [
  '  useEffect(() => {',
  '    if (orderOpen && orderStep !== \'variety\') scrollToBottom();',
  '  }, [orderStep]);',
  '',
  '  // Fetch batch fill progress per variety whenever the active location changes',
  '  useEffect(() => {',
  '    if (!activeLocation?.id) { setBatchStatus({}); return; }',
  '    let cancelled = false;',
  '    fetchBatchStatus(activeLocation.id).then(rows => {',
  '      if (cancelled) return;',
  '      const map: Record<number, { queued_boxes: number; min_quantity: number }> = {};',
  '      rows.forEach(r => { map[r.variety_id] = { queued_boxes: r.queued_boxes, min_quantity: r.min_quantity }; });',
  '      setBatchStatus(map);',
  '    }).catch(() => {});',
  '    return () => { cancelled = true; };',
  '  }, [activeLocation?.id]);',
].join('\n');
if (!content.includes(effectOld)) { console.error('PATCH FAILED: useEffect anchor not found'); process.exit(1); }
content = content.replace(effectOld, effectNew);

// ── 4. Add batch progress bar inside the variety option row ──────────────────
// Find the exact text of the two Text elements inside the variety TouchableOpacity.
// Use indexOf to locate and splice, since template literals would evaluate v.
const searchStr = '<Text style={[styles.optionName, { color: c.text }]}>{v.name}</Text>\n                                <Text style={[styles.optionMeta, { color: c.muted }]}>CA${(v.price_cents / 100).toFixed(0)}</Text>';

const idx = content.indexOf(searchStr);
if (idx === -1) {
  // Try alternate indentation
  console.error('PATCH FAILED: variety row anchor not found');
  // Print surrounding lines to help debug
  const marker = '<Text style={[styles.optionName, { color: c.text }]}>{v.name}</Text>';
  const idx2 = content.indexOf(marker);
  if (idx2 !== -1) {
    console.error('Found optionName text at index', idx2);
    console.error('Context:', JSON.stringify(content.slice(idx2, idx2 + 200)));
  }
  process.exit(1);
}

const replaceStr = [
  '<View style={{ flex: 1 }}>',
  '                                  <Text style={[styles.optionName, { color: c.text }]}>{v.name}</Text>',
  '                                  {batchStatus[v.id] && (',
  '                                    <View style={styles.batchBarWrap}>',
  '                                      <View style={[styles.batchBarTrack, { backgroundColor: c.border }]}>',
  '                                        <View style={[styles.batchBarFill, { backgroundColor: c.accent, width: `${Math.min(100, (batchStatus[v.id].queued_boxes / batchStatus[v.id].min_quantity) * 100)}%` }]} />',
  '                                      </View>',
  '                                      <Text style={[styles.batchBarLabel, { color: c.muted }]}>',
  '                                        {batchStatus[v.id].queued_boxes} of {batchStatus[v.id].min_quantity} boxes queued',
  '                                      </Text>',
  '                                    </View>',
  '                                  )}',
  '                                </View>',
  '                                <Text style={[styles.optionMeta, { color: c.muted }]}>CA${(v.price_cents / 100).toFixed(0)}</Text>',
].join('\n');

content = content.slice(0, idx) + replaceStr + content.slice(idx + searchStr.length);

// ── Verify all patches ───────────────────────────────────────────────────────
const checks = [
  ['fetchBatchStatus import', content.includes('fetchBatchStatus,')],
  ['batchStatus state', content.includes('const [batchStatus, setBatchStatus]')],
  ['batchStatus useEffect', content.includes('fetchBatchStatus(activeLocation.id)')],
  ['variety row bar JSX', content.includes('batchStatus[v.id] &&')],
];

let allOk = true;
for (const [name, ok] of checks) {
  if (!ok) {
    console.error(`PATCH FAILED: "${name}" not found in output`);
    allOk = false;
  } else {
    console.log(`OK: ${name}`);
  }
}

if (!allOk) process.exit(1);

// Restore CRLF if original had it
if (hasCRLF) content = content.replace(/\n/g, '\r\n');

writeFileSync(filePath, content, 'utf8');
console.log('Patch applied successfully to TerminalPanel.tsx');
