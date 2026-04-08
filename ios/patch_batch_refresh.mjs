import { readFileSync, writeFileSync } from 'fs';

const path = './src/components/panels/TerminalPanel.tsx';
let src = readFileSync(path, 'utf8');
const hasCRLF = src.includes('\r\n');
if (hasCRLF) src = src.replace(/\r\n/g, '\n');

const REFRESH = `\n      if (confirmed.status === 'queued' && location?.id) {
        fetchBatchStatus(location.id).then(rows => {
          const map: Record<number, { queued_boxes: number; min_quantity: number }> = {};
          rows.forEach(r => { map[r.variety_id] = { queued_boxes: r.queued_boxes, min_quantity: r.min_quantity }; });
          setBatchStatus(map);
        }).catch(() => {});
      }`;

// ── handlePay success path ────────────────────────────────────────────────────
const OLD_PAY = `      setConfirmedOrder(confirmed);
      setOrderStep('confirmed');
      setOrder({ order_id: confirmed.id, order_status: confirmed.status, delivery_date: (confirmed as any).delivery_date ?? null, location_id: location.id });
      // Refresh order history
      fetchOrdersByEmail()`;

const NEW_PAY = `      setConfirmedOrder(confirmed);
      setOrderStep('confirmed');
      setOrder({ order_id: confirmed.id, order_status: confirmed.status, delivery_date: (confirmed as any).delivery_date ?? null, location_id: location.id });${REFRESH}
      // Refresh order history
      fetchOrdersByEmail()`;

if (!src.includes(OLD_PAY)) {
  console.error('ERROR: handlePay block not found');
  process.exit(1);
}
src = src.replace(OLD_PAY, NEW_PAY);
console.log('handlePay patched');

// ── handlePayWithBalance success path ─────────────────────────────────────────
const OLD_BAL = `      setConfirmedOrder(confirmed);
      setOrderStep('confirmed');
      setOrder({ order_id: confirmed.id, order_status: confirmed.status, delivery_date: (confirmed as any).delivery_date ?? null, location_id: location.id });
      fetchOrdersByEmail()`;

const NEW_BAL = `      setConfirmedOrder(confirmed);
      setOrderStep('confirmed');
      setOrder({ order_id: confirmed.id, order_status: confirmed.status, delivery_date: (confirmed as any).delivery_date ?? null, location_id: location.id });${REFRESH}
      fetchOrdersByEmail()`;

if (!src.includes(OLD_BAL)) {
  console.error('ERROR: handlePayWithBalance block not found');
  process.exit(1);
}
src = src.replace(OLD_BAL, NEW_BAL);
console.log('handlePayWithBalance patched');

if (hasCRLF) src = src.replace(/\n/g, '\r\n');
writeFileSync(path, src, 'utf8');
console.log('Done');
