import { readFileSync, writeFileSync } from 'fs';

const path = './src/components/panels/TerminalPanel.tsx';
let src = readFileSync(path, 'utf8');
const hasCRLF = src.includes('\r\n');
if (hasCRLF) src = src.replace(/\r\n/g, '\n');

// Find start: the <View style={{ flex: 1 }}> wrapper the agent added
const START = '                                <View style={{ flex: 1 }}>\n                                  <Text style={[styles.optionName, { color: c.text }]}>{v.name}</Text>';

// Find end: the </View> that closes the flex:1 wrapper (after the IIFE block)
// The wrapper ends after the IIFE closing
const END_MARKER = '                                </View>\n                                <Text style={[styles.optionMeta';

const si = src.indexOf(START);
if (si === -1) { console.error('START not found'); process.exit(1); }

const ei = src.indexOf(END_MARKER, si);
if (ei === -1) { console.error('END not found'); process.exit(1); }

// We want to replace everything from START up to (not including) END_MARKER's </View>
// i.e. replace: <View flex:1> + name Text + IIFE bar block + </View>
// with: name Text (back as direct child) — then bar goes after the </TouchableOpacity>

// First, find where the TouchableOpacity closes so we can put the bar after it
// The closing </TouchableOpacity> comes after the optionMeta text
const TO_END = '                              </TouchableOpacity>';
const toei = src.indexOf(TO_END, ei);
if (toei === -1) { console.error('TouchableOpacity end not found'); process.exit(1); }
const toeFull = toei + TO_END.length;

// Extract the optionMeta text between END_MARKER </View> and </TouchableOpacity>
// END_MARKER starts with the </View> then newline then <Text optionMeta...>
const metaStart = ei + '                                </View>\n'.length;
const metaEnd = toei;
const metaBlock = src.slice(metaStart, metaEnd);

// Build the replacement:
// 1. optionName Text as direct child of TouchableOpacity (restoring original)
// 2. optionMeta Text as direct child (restoring original)
// 3. </TouchableOpacity>
// 4. bar as a sibling below

const NEW = `                                <Text style={[styles.optionName, { color: c.text }]}>{v.name}</Text>\n${metaBlock}${TO_END}\n                                <View style={styles.batchBarWrap}>\n                                  <View style={[styles.batchBarTrack, { backgroundColor: c.border }]}>\n                                    <View style={[styles.batchBarFill, { backgroundColor: c.accent, width: \`\${Math.min(100, ((batchStatus[v.id]?.queued_boxes ?? 0) / (batchStatus[v.id]?.min_quantity ?? 4)) * 100)}%\` }]} />\n                                  </View>\n                                  <Text style={[styles.batchBarLabel, { color: c.muted }]}>\n                                    {batchStatus[v.id]?.queued_boxes ?? 0} of {batchStatus[v.id]?.min_quantity ?? 4} boxes queued\n                                  </Text>\n                                </View>`;

src = src.slice(0, si) + NEW + src.slice(toeFull);

if (hasCRLF) src = src.replace(/\n/g, '\r\n');
writeFileSync(path, src, 'utf8');
console.log('Done');
