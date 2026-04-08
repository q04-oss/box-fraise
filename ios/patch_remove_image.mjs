import { readFileSync, writeFileSync } from 'fs';

const path = './src/components/panels/HomePanel.tsx';
let src = readFileSync(path, 'utf8');
const hasCRLF = src.includes('\r\n');
if (hasCRLF) src = src.replace(/\r\n/g, '\n');

// Remove image block
src = src.replace(
  `                            {v.image_url && (\n                              <Image source={{ uri: v.image_url }} style={[styles.thumb, { backgroundColor: c.border }]} />\n                            )}\n`,
  ''
);

// Remove Image from RN imports
src = src.replace(', Image,', ',');
src = src.replace(', Image ', ' ');

// Remove thumb style
src = src.replace(/\s*thumb: \{ width: 64, height: 64[^}]*\},?\n/, '\n');

if (hasCRLF) src = src.replace(/\n/g, '\r\n');
writeFileSync(path, src, 'utf8');
console.log('Done');
