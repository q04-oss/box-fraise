import { readFileSync, writeFileSync } from 'fs';

const path = './src/components/panels/TerminalPanel.tsx';
let src = readFileSync(path, 'utf8');
const hasCRLF = src.includes('\r\n');
if (hasCRLF) src = src.replace(/\r\n/g, '\n');

// Find the batchStatus conditional in the variety list and replace it
// Use indexOf to find the exact start and end
const START_MARKER = '                                  {batchStatus[v.id] && (';
const END_MARKER   = '                                  )}';

const start = src.indexOf(START_MARKER);
if (start === -1) { console.error('START not found'); process.exit(1); }

// Find the matching END after start
const end = src.indexOf(END_MARKER, start);
if (end === -1) { console.error('END not found'); process.exit(1); }

const endFull = end + END_MARKER.length;

const NEW_BLOCK = `                                  {(() => {
                                    const bs = batchStatus[v.id] ?? { queued_boxes: 0, min_quantity: 4 };
                                    return (
                                      <View style={styles.batchBarWrap}>
                                        <View style={[styles.batchBarTrack, { backgroundColor: c.border }]}>
                                          <View style={[styles.batchBarFill, { backgroundColor: c.accent, width: \`\${Math.min(100, (bs.queued_boxes / bs.min_quantity) * 100)}%\` }]} />
                                        </View>
                                        <Text style={[styles.batchBarLabel, { color: c.muted }]}>
                                          {bs.queued_boxes} of {bs.min_quantity} boxes queued
                                        </Text>
                                      </View>
                                    );
                                  })()}`;

src = src.slice(0, start) + NEW_BLOCK + src.slice(endFull);

if (hasCRLF) src = src.replace(/\n/g, '\r\n');
writeFileSync(path, src, 'utf8');
console.log('Done — replaced', endFull - start, 'chars at offset', start);
