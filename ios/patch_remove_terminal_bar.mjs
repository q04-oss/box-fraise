import { readFileSync, writeFileSync } from 'fs';

const path = './src/components/panels/TerminalPanel.tsx';
let src = readFileSync(path, 'utf8');
const hasCRLF = src.includes('\r\n');
if (hasCRLF) src = src.replace(/\r\n/g, '\n');

// Remove batchStatus state
src = src.replace(
  `  const [batchStatus, setBatchStatus] = useState<Record<number, { queued_boxes: number; min_quantity: number }>>({});\n`,
  ''
);

// Remove batchStatus useEffect
const EFFECT_START = '  // Fetch batch fill progress per variety whenever the active location changes\n  useEffect(() => {';
const EFFECT_END = '  }, [location?.id]);\n';
const si = src.indexOf(EFFECT_START);
const ei = src.indexOf(EFFECT_END, si) + EFFECT_END.length;
if (si === -1 || ei === -1) { console.error('effect not found'); process.exit(1); }
src = src.slice(0, si) + src.slice(ei);

// Remove fetchBatchStatus import
src = src.replace(
  '  fetchBatchStatus,\n',
  ''
);

// Remove the bar render block — sibling of </TouchableOpacity> in variety list
const BAR_START = '                                <View style={styles.batchBarWrap}>';
const BAR_END = '                                </View>';
const bi = src.indexOf(BAR_START);
if (bi === -1) { console.error('bar block not found'); process.exit(1); }
const bei = src.indexOf(BAR_END, bi) + BAR_END.length;
src = src.slice(0, bi) + src.slice(bei + 1); // +1 for newline

// Remove batchBarWrap/Track/Fill/Label styles from TerminalPanel stylesheet
// (keep them only if used in confirmed state — check confirmed state uses batchBarTrack etc directly)
// The confirmed state uses batchBarWrap, batchBarTrack, batchBarFill, batchBarLabel — keep those

if (hasCRLF) src = src.replace(/\n/g, '\r\n');
writeFileSync(path, src, 'utf8');
console.log('Done');
