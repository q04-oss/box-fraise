import { readFileSync, writeFileSync } from 'fs';

const path = './src/components/panels/HomePanel.tsx';
let src = readFileSync(path, 'utf8');
const hasCRLF = src.includes('\r\n');
if (hasCRLF) src = src.replace(/\r\n/g, '\n');

// Remove stock Text from bottom row
const OLD = `                            <Text style={[styles.stock, { color: isSoldOut ? '#FF3B30' : stockLow ? '#FF3B30' : c.muted }]}>
                              {isSoldOut ? 'sold out' : stockLow ? 'almost gone' : \`\${v.stock_remaining} left\`}
                            </Text>
                            <View style={styles.batchBarWrap}>`;

const NEW = `                            <View style={styles.batchBarWrap}>`;

if (!src.includes(OLD)) { console.error('not found'); process.exit(1); }
src = src.replace(OLD, NEW);

// Remove isSoldOut / stockLow vars since they're no longer used for display
src = src.replace(`                    const isSoldOut = v.stock_remaining <= 0;\n                    const stockLow = !isSoldOut && v.stock_remaining <= 3;\n`, '');

// Remove isSoldOut opacity and disabled references — variety is always orderable
src = src.replace(
  `                          style={[styles.varietyBlock, isSoldOut && { opacity: 0.35 }]}
                          onPress={isSoldOut ? undefined : () => handleVarietyPress(v)}
                          disabled={isSoldOut}`,
  `                          style={styles.varietyBlock}
                          onPress={() => handleVarietyPress(v)}`
);

// Remove freshColor ref to isSoldOut in price color
src = src.replace(
  `{ color: isSoldOut ? c.muted : c.text }`,
  `{ color: c.text }`
);

// Remove stock style
src = src.replace(`  stock: { fontSize: 11, fontFamily: fonts.dmSans },\n`, '');

if (hasCRLF) src = src.replace(/\n/g, '\r\n');
writeFileSync(path, src, 'utf8');
console.log('Done');
