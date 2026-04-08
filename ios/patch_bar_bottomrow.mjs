import { readFileSync, writeFileSync } from 'fs';

const path = './src/components/panels/HomePanel.tsx';
let src = readFileSync(path, 'utf8');
const hasCRLF = src.includes('\r\n');
if (hasCRLF) src = src.replace(/\r\n/g, '\n');

// Remove the standalone batchBarWrap block we added after varietyBottomRow
const OLD_STANDALONE = `                          <View style={styles.batchBarWrap}>
                            <View style={[styles.batchBarTrack, { backgroundColor: c.border }]}>
                              <View style={[styles.batchBarFill, { backgroundColor: c.accent, width: \`\${Math.min(100, ((batchStatus[v.id]?.queued_boxes ?? 0) / (batchStatus[v.id]?.min_quantity ?? 4)) * 100)}%\` }]} />
                            </View>
                            <Text style={[styles.batchBarLabel, { color: c.muted }]}>
                              {batchStatus[v.id]?.queued_boxes ?? 0} of {batchStatus[v.id]?.min_quantity ?? 4} boxes queued
                            </Text>
                          </View>
                        </TouchableOpacity>`;

if (!src.includes(OLD_STANDALONE)) {
  console.error('standalone block not found');
  process.exit(1);
}

src = src.replace(OLD_STANDALONE, `                        </TouchableOpacity>`);

// Now find the varietyBottomRow closing tag and inject the bar inside it,
// between the stock text and the image
// The bottom row contains: <Text stock> ... </Text>  {image}  </View>
const OLD_BOTTOM = `                          <View style={styles.varietyBottomRow}>
                            <Text style={[styles.stock, { color: isSoldOut ? '#FF3B30' : stockLow ? '#FF3B30' : c.muted }]}>
                              {isSoldOut ? 'sold out' : stockLow ? 'almost gone' : \`\${v.stock_remaining} left\`}
                            </Text>
                            {v.image_url && (
                              <Image source={{ uri: v.image_url }} style={[styles.thumb, { backgroundColor: c.border }]} />
                            )}
                          </View>`;

const NEW_BOTTOM = `                          <View style={styles.varietyBottomRow}>
                            <Text style={[styles.stock, { color: isSoldOut ? '#FF3B30' : stockLow ? '#FF3B30' : c.muted }]}>
                              {isSoldOut ? 'sold out' : stockLow ? 'almost gone' : \`\${v.stock_remaining} left\`}
                            </Text>
                            <View style={styles.batchBarWrap}>
                              <View style={[styles.batchBarTrack, { backgroundColor: c.border }]}>
                                <View style={[styles.batchBarFill, { backgroundColor: c.accent, width: \`\${Math.min(100, ((batchStatus[v.id]?.queued_boxes ?? 0) / (batchStatus[v.id]?.min_quantity ?? 4)) * 100)}%\` }]} />
                              </View>
                              <Text style={[styles.batchBarLabel, { color: c.muted }]}>
                                {batchStatus[v.id]?.queued_boxes ?? 0} of {batchStatus[v.id]?.min_quantity ?? 4} queued
                              </Text>
                            </View>
                            {v.image_url && (
                              <Image source={{ uri: v.image_url }} style={[styles.thumb, { backgroundColor: c.border }]} />
                            )}
                          </View>`;

if (!src.includes(OLD_BOTTOM)) {
  console.error('bottom row not found');
  process.exit(1);
}
src = src.replace(OLD_BOTTOM, NEW_BOTTOM);

// Update batchBarWrap style to work inline in a row
src = src.replace(
  '  batchBarWrap: { gap: 4, marginTop: 6 },',
  '  batchBarWrap: { flex: 1, gap: 3, marginHorizontal: 12 },'
);

if (hasCRLF) src = src.replace(/\n/g, '\r\n');
writeFileSync(path, src, 'utf8');
console.log('Done');
