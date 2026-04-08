import { readFileSync, writeFileSync } from 'fs';

const path = './src/components/panels/VerifyNFCPanel.tsx';
let src = readFileSync(path, 'utf8');
const hasCRLF = src.includes('\r\n');
if (hasCRLF) src = src.replace(/\r\n/g, '\n');

const OLD = `        // Get device location for nearby AR notes (best-effort, 3s timeout)
        let deviceLat = 0, deviceLng = 0;
        await new Promise<void>((res) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => { deviceLat = pos.coords.latitude; deviceLng = pos.coords.longitude; res(); },
            () => res(),
            { timeout: 3000, enableHighAccuracy: false }
          );
        });`;

const NEW = `        // Get device location for nearby AR notes (best-effort, 3s timeout)
        let deviceLat = 0, deviceLng = 0;
        await new Promise<void>((res) => {
          try {
            navigator.geolocation.getCurrentPosition(
              (pos) => { deviceLat = pos.coords.latitude; deviceLng = pos.coords.longitude; res(); },
              () => res(),
              { timeout: 3000, enableHighAccuracy: false }
            );
          } catch { res(); }
        });`;

if (!src.includes(OLD)) { console.error('target not found'); process.exit(1); }
src = src.replace(OLD, NEW);

if (hasCRLF) src = src.replace(/\n/g, '\r\n');
writeFileSync(path, src, 'utf8');
console.log('Done');
