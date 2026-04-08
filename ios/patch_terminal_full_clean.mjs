import { readFileSync, writeFileSync } from 'fs';

const path = './src/components/panels/TerminalPanel.tsx';
let src = readFileSync(path, 'utf8');
const hasCRLF = src.includes('\r\n');
if (hasCRLF) src = src.replace(/\r\n/g, '\n');

// 1. Remove fetchBatchStatus import
src = src.replace('  fetchBatchStatus,\n', '');

// 2. Remove bar remnant after </TouchableOpacity> in variety list
const REMNANT = `                                  <Text style={[styles.batchBarLabel, { color: c.muted }]}>\n                                    {batchStatus[v.id]?.queued_boxes ?? 0} of {batchStatus[v.id]?.min_quantity ?? 4} boxes queued\n                                  </Text>\n                                </View>\n`;
if (!src.includes(REMNANT)) { console.error('remnant not found'); process.exit(1); }
src = src.replace(REMNANT, '');

// 3. Remove batchStatus refresh blocks in handlePay and handlePayWithBalance
const REFRESH = `\n      if (confirmed.status === 'queued' && location?.id) {\n        fetchBatchStatus(location.id).then(rows => {\n          const map: Record<number, { queued_boxes: number; min_quantity: number }> = {};\n          rows.forEach(r => { map[r.variety_id] = { queued_boxes: r.queued_boxes, min_quantity: r.min_quantity }; });\n          setBatchStatus(map);\n        }).catch(() => {});\n      }`;
// Remove both occurrences
src = src.split(REFRESH).join('');

if (hasCRLF) src = src.replace(/\n/g, '\r\n');
writeFileSync(path, src, 'utf8');
console.log('Done');
