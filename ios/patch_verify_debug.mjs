import { readFileSync, writeFileSync } from 'fs';

const path = './src/components/panels/VerifyNFCPanel.tsx';
let src = readFileSync(path, 'utf8');
const hasCRLF = src.includes('\r\n');
if (hasCRLF) src = src.replace(/\r\n/g, '\n');

const OLD = `          <Text style={[styles.headerTitle, { color: c.text }]}>
            {state === 'error' ? "Didn't catch it." : 'box fraise'}
          </Text>`;

const NEW = `          <Text style={[styles.headerTitle, { color: c.text }]}>
            {state === 'error' ? "Didn't catch it." : 'box fraise'}
          </Text>
          {state === 'error' && !!errorMsg && (
            <Text style={{ color: 'red', fontSize: 11, textAlign: 'center', paddingHorizontal: 16, paddingTop: 4 }}>{errorMsg}</Text>
          )}`;

if (!src.includes(OLD)) { console.error('target not found'); process.exit(1); }
src = src.replace(OLD, NEW);

if (hasCRLF) src = src.replace(/\n/g, '\r\n');
writeFileSync(path, src, 'utf8');
console.log('Done');
