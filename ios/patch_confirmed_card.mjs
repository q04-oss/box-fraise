import { readFileSync, writeFileSync } from 'fs';

const path = './src/components/panels/TerminalPanel.tsx';
let src = readFileSync(path, 'utf8');

// Normalize CRLF → LF for matching, track if we need to restore
const hasCRLF = src.includes('\r\n');
if (hasCRLF) src = src.replace(/\r\n/g, '\n');

// ── JSX: replace confirmed state block ───────────────────────────────────────
const OLD_JSX = `                  <View style={styles.confirmedBlock}>
                    <Text style={[styles.confirmedTitle, { color: c.text }]}>
                      {confirmedOrder.status === 'queued' ? "you're in the queue." : 'order placed.'}
                    </Text>
                    <Text style={[styles.confirmedDetail, { color: c.muted }]}>
                      {inlineOrder.variety_name}{'  ·  '}{inlineOrder.chocolate_name}{'  ·  '}{inlineOrder.finish_name}{'  ·  '}×{inlineOrder.quantity}
                    </Text>
                    <Text style={[styles.confirmedDetail, { color: c.muted }]}>{location?.name}</Text>
                    {confirmedOrder.queued_boxes != null && (
                      <View style={styles.batchBarWrap}>
                        <View style={[styles.batchBarTrack, { backgroundColor: c.border }]}>
                          <View style={[styles.batchBarFill, { backgroundColor: c.accent, width: \`\${Math.min(100, (confirmedOrder.queued_boxes / confirmedOrder.min_quantity) * 100)}%\`}]} />
                        </View>
                        <Text style={[styles.batchBarLabel, { color: c.muted }]}>
                          {confirmedOrder.status === 'queued'
                            ? \`\${confirmedOrder.queued_boxes} of \${confirmedOrder.min_quantity} boxes · \${confirmedOrder.min_quantity - confirmedOrder.queued_boxes} more to fill\`
                            : 'batch filled · being prepared'}
                        </Text>
                        {confirmedOrder.status === 'queued' && (
                          <Text style={[styles.confirmedHint, { color: c.muted }]}>card held — charged when batch fills</Text>
                        )}
                      </View>
                    )}
                    <TouchableOpacity onPress={() => { resetInlineOrder(); }} style={styles.newOrderBtn} activeOpacity={0.7}>
                      <Text style={[styles.label, { color: c.accent }]}>NEW ORDER</Text>
                    </TouchableOpacity>
                  </View>`;

const NEW_JSX = `                  <View style={styles.confirmedBlock}>
                    <Text style={[styles.confirmedTitle, { color: c.text }]}>
                      {confirmedOrder.status === 'queued' ? "you're in the queue." : 'order placed.'}
                    </Text>
                    <View style={[styles.confirmedCard, { backgroundColor: c.card }]}>
                      <Text style={[styles.confirmedDetail, { color: c.muted }]}>
                        {inlineOrder.variety_name}{'  ·  '}{inlineOrder.chocolate_name}{'  ·  '}{inlineOrder.finish_name}{'  ·  '}×{inlineOrder.quantity}
                      </Text>
                      <Text style={[styles.confirmedDetail, { color: c.muted }]}>{location?.name}</Text>
                      {confirmedOrder.queued_boxes != null && (
                        <>
                          <View style={[styles.confirmedDivider, { backgroundColor: c.border }]} />
                          <View style={[styles.batchBarTrack, { backgroundColor: c.border }]}>
                            <View style={[styles.batchBarFill, { backgroundColor: c.accent, width: \`\${Math.min(100, (confirmedOrder.queued_boxes / confirmedOrder.min_quantity) * 100)}%\`}]} />
                          </View>
                          <Text style={[styles.batchBarLabel, { color: c.muted }]}>
                            {confirmedOrder.status === 'queued'
                              ? \`\${confirmedOrder.queued_boxes} of \${confirmedOrder.min_quantity} boxes · \${confirmedOrder.min_quantity - confirmedOrder.queued_boxes} more to fill\`
                              : 'batch filled · being prepared'}
                          </Text>
                        </>
                      )}
                    </View>
                    {confirmedOrder.status === 'queued' && (
                      <Text style={[styles.confirmedHint, { color: c.muted }]}>card held — charged when batch fills</Text>
                    )}
                    <TouchableOpacity onPress={() => { resetInlineOrder(); }} style={styles.newOrderBtn} activeOpacity={0.7}>
                      <Text style={[styles.label, { color: c.accent }]}>NEW ORDER</Text>
                    </TouchableOpacity>
                  </View>`;

if (!src.includes(OLD_JSX)) {
  // Debug: find the actual confirmed block in the file
  const idx = src.indexOf('confirmedBlock');
  console.error('ERROR: JSX block not found. Nearby context:');
  console.error(JSON.stringify(src.slice(idx - 20, idx + 200)));
  process.exit(1);
}
src = src.replace(OLD_JSX, NEW_JSX);
console.log('JSX block replaced');

// ── Styles: replace batchBarWrap, add confirmedCard + confirmedDivider ────────
const OLD_STYLES = `  confirmedBlock: { paddingTop: 12, gap: 8 },
  confirmedTitle: { fontSize: 22, fontFamily: fonts.playfair },
  confirmedDetail: { fontSize: 12, fontFamily: fonts.dmMono },
  confirmedHint: { fontSize: 11, fontFamily: fonts.dmMono, letterSpacing: 0.5, fontStyle: 'italic' },
  batchBarWrap: { gap: 6, paddingTop: 4 },`;

const NEW_STYLES = `  confirmedBlock: { paddingTop: 12, gap: 8 },
  confirmedTitle: { fontSize: 22, fontFamily: fonts.playfair },
  confirmedCard: { borderRadius: 10, padding: 12, gap: 4 },
  confirmedDivider: { height: StyleSheet.hairlineWidth, marginVertical: 8 },
  confirmedDetail: { fontSize: 12, fontFamily: fonts.dmMono },
  confirmedHint: { fontSize: 11, fontFamily: fonts.dmMono, letterSpacing: 0.5, fontStyle: 'italic' },`;

if (!src.includes(OLD_STYLES)) {
  const idx = src.indexOf('confirmedBlock');
  console.error('ERROR: styles block not found. Nearby context:');
  console.error(JSON.stringify(src.slice(idx + 200, idx + 600)));
  process.exit(1);
}
src = src.replace(OLD_STYLES, NEW_STYLES);
console.log('Styles block replaced');

// Restore CRLF if needed
if (hasCRLF) src = src.replace(/\n/g, '\r\n');

writeFileSync(path, src, 'utf8');
console.log('Done — patch_confirmed_card applied');
