import { readFileSync, writeFileSync } from 'fs';

const path = './src/components/panels/TerminalPanel.tsx';
let src = readFileSync(path, 'utf8');
const hasCRLF = src.includes('\r\n');
if (hasCRLF) src = src.replace(/\r\n/g, '\n');

const OLD = `  // Fetch batch fill progress per variety whenever the active location changes
  useEffect(() => {
    if (!activeLocation?.id) { setBatchStatus({}); return; }
    let cancelled = false;
    fetchBatchStatus(activeLocation.id).then(rows => {
      if (cancelled) return;
      const map: Record<number, { queued_boxes: number; min_quantity: number }> = {};
      rows.forEach(r => { map[r.variety_id] = { queued_boxes: r.queued_boxes, min_quantity: r.min_quantity }; });
      setBatchStatus(map);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [activeLocation?.id]);`;

const NEW = `  // Fetch batch fill progress per variety whenever the active location changes
  useEffect(() => {
    if (!location?.id) { setBatchStatus({}); return; }
    let cancelled = false;
    fetchBatchStatus(location.id).then(rows => {
      if (cancelled) return;
      const map: Record<number, { queued_boxes: number; min_quantity: number }> = {};
      rows.forEach(r => { map[r.variety_id] = { queued_boxes: r.queued_boxes, min_quantity: r.min_quantity }; });
      setBatchStatus(map);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [location?.id]);`;

if (!src.includes(OLD)) {
  console.error('ERROR: block not found');
  process.exit(1);
}

src = src.replace(OLD, NEW);
if (hasCRLF) src = src.replace(/\n/g, '\r\n');
writeFileSync(path, src, 'utf8');
console.log('Done');
