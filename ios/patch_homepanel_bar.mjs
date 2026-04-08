import { readFileSync, writeFileSync } from 'fs';

// ── 1. Revert TerminalPanel debug changes ─────────────────────────────────────
{
  const path = './src/components/panels/TerminalPanel.tsx';
  let src = readFileSync(path, 'utf8');
  const hasCRLF = src.includes('\r\n');
  if (hasCRLF) src = src.replace(/\r\n/g, '\n');

  src = src.replace('>BOX FRAISE TEST</Text>', '>box fraise</Text>');
  src = src.replace('>variety ★</Text>', '>variety</Text>');
  src = src.replace(
    "[styles.batchBarWrap, { backgroundColor: '#FF000033', borderWidth: 1, borderColor: 'red' }]",
    'styles.batchBarWrap'
  );

  if (hasCRLF) src = src.replace(/\n/g, '\r\n');
  writeFileSync(path, src, 'utf8');
  console.log('TerminalPanel debug reverted');
}

// ── 2. Patch HomePanel ────────────────────────────────────────────────────────
{
  const path = './src/components/panels/HomePanel.tsx';
  let src = readFileSync(path, 'utf8');
  const hasCRLF = src.includes('\r\n');
  if (hasCRLF) src = src.replace(/\r\n/g, '\n');

  // Add fetchBatchStatus to import
  src = src.replace(
    "import { fetchVarieties, fetchTodayStats } from '../../lib/api';",
    "import { fetchVarieties, fetchTodayStats, fetchBatchStatus } from '../../lib/api';"
  );

  // Add batchStatus state after the existing useState declarations
  // Find a good anchor: the bizVarieties const
  const ANCHOR = "  const bizVarieties = activeLocation";
  if (!src.includes(ANCHOR)) { console.error('anchor not found'); process.exit(1); }

  src = src.replace(
    ANCHOR,
    `  const [batchStatus, setBatchStatus] = useState<Record<number, { queued_boxes: number; min_quantity: number }>>({});

  useEffect(() => {
    if (!activeLocation?.id) { setBatchStatus({}); return; }
    let cancelled = false;
    fetchBatchStatus(activeLocation.id).then(rows => {
      if (cancelled) return;
      const map: Record<number, { queued_boxes: number; min_quantity: number }> = {};
      rows.forEach(r => { map[r.variety_id] = { queued_boxes: r.queued_boxes, min_quantity: r.min_quantity }; });
      setBatchStatus(map);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [activeLocation?.id]);

  ${ANCHOR}`
  );

  // Add progress bar after varietyBottomRow closing tag, inside the TouchableOpacity
  const BAR_ANCHOR = `                        </TouchableOpacity>
                      </React.Fragment>`;
  if (!src.includes(BAR_ANCHOR)) { console.error('bar anchor not found'); process.exit(1); }

  src = src.replace(
    BAR_ANCHOR,
    `                          <View style={styles.batchBarWrap}>
                            <View style={[styles.batchBarTrack, { backgroundColor: c.border }]}>
                              <View style={[styles.batchBarFill, { backgroundColor: c.accent, width: \`\${Math.min(100, ((batchStatus[v.id]?.queued_boxes ?? 0) / (batchStatus[v.id]?.min_quantity ?? 4)) * 100)}%\` }]} />
                            </View>
                            <Text style={[styles.batchBarLabel, { color: c.muted }]}>
                              {batchStatus[v.id]?.queued_boxes ?? 0} of {batchStatus[v.id]?.min_quantity ?? 4} boxes queued
                            </Text>
                          </View>
                        </TouchableOpacity>
                      </React.Fragment>`
  );

  // Add styles before the closing StyleSheet
  const STYLES_ANCHOR = '});';  // last closing of StyleSheet.create
  const lastClose = src.lastIndexOf(STYLES_ANCHOR);
  src = src.slice(0, lastClose) +
    `  batchBarWrap: { gap: 4, marginTop: 6 },
  batchBarTrack: { height: 2, borderRadius: 1, overflow: 'hidden' },
  batchBarFill: { height: 2, borderRadius: 1 },
  batchBarLabel: { fontSize: 10, fontFamily: fonts.dmMono, letterSpacing: 0.5 },
` + src.slice(lastClose);

  if (hasCRLF) src = src.replace(/\n/g, '\r\n');
  writeFileSync(path, src, 'utf8');
  console.log('HomePanel patched');
}
