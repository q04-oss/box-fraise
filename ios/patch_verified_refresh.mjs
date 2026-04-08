import { readFileSync, writeFileSync } from 'fs';

const path = './src/components/panels/TerminalPanel.tsx';
let src = readFileSync(path, 'utf8');
const hasCRLF = src.includes('\r\n');
if (hasCRLF) src = src.replace(/\r\n/g, '\n');

const OLD = `    ]).then(([email, verified, dbId, chatEmail, name, shopFlag, staffFlag]) => {
      setIsVerified(verified === 'true');`;

const NEW = `    ]).then(([email, verified, dbId, chatEmail, name, shopFlag, staffFlag]) => {
      const cachedVerified = verified === 'true';
      setIsVerified(cachedVerified);
      if (!cachedVerified) {
        fetchMe().then(me => {
          if (me?.verified) {
            AsyncStorage.setItem('verified', 'true').catch(() => {});
            setIsVerified(true);
          }
        }).catch(() => {});
      }`;

if (!src.includes(OLD)) { console.error('target not found'); process.exit(1); }
src = src.replace(OLD, NEW);

if (hasCRLF) src = src.replace(/\n/g, '\r\n');
writeFileSync(path, src, 'utf8');
console.log('Done');
