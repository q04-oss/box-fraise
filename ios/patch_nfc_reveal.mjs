import { readFileSync, writeFileSync } from 'fs';

// 1. PanelContext — add 'nfc-reveal' to PanelId
{
  const path = './src/context/PanelContext.tsx';
  let src = readFileSync(path, 'utf8');
  const hasCRLF = src.includes('\r\n');
  if (hasCRLF) src = src.replace(/\r\n/g, '\n');

  const OLD = `  | 'nfc-write';`;
  const NEW = `  | 'nfc-write'
  | 'nfc-reveal';`;

  if (!src.includes(OLD)) { console.error('PanelContext: target not found'); process.exit(1); }
  src = src.replace(OLD, NEW);

  if (hasCRLF) src = src.replace(/\n/g, '\r\n');
  writeFileSync(path, src, 'utf8');
  console.log('PanelContext done');
}

// 2. PanelNavigator — import and register NfcRevealPanel
{
  const path = './src/components/PanelNavigator.tsx';
  let src = readFileSync(path, 'utf8');
  const hasCRLF = src.includes('\r\n');
  if (hasCRLF) src = src.replace(/\r\n/g, '\n');

  // Add import
  const OLD_IMPORT = `import NfcWritePanel from './panels/NfcWritePanel';`;
  const NEW_IMPORT = `import NfcWritePanel from './panels/NfcWritePanel';
import NfcRevealPanel from './panels/NfcRevealPanel';`;

  if (!src.includes(OLD_IMPORT)) { console.error('PanelNavigator: import target not found'); process.exit(1); }
  src = src.replace(OLD_IMPORT, NEW_IMPORT);

  // Register in PANELS
  const OLD_PANEL = `  'nfc-write': NfcWritePanel,`;
  const NEW_PANEL = `  'nfc-write': NfcWritePanel,
  'nfc-reveal': NfcRevealPanel,`;

  if (!src.includes(OLD_PANEL)) { console.error('PanelNavigator: PANELS target not found'); process.exit(1); }
  src = src.replace(OLD_PANEL, NEW_PANEL);

  // Add to FULL_HEIGHT_PANELS
  const OLD_FH = `  'nfc-write', 'walk-in',`;
  const NEW_FH = `  'nfc-write', 'nfc-reveal', 'walk-in',`;

  if (!src.includes(OLD_FH)) { console.error('PanelNavigator: FULL_HEIGHT target not found'); process.exit(1); }
  src = src.replace(OLD_FH, NEW_FH);

  if (hasCRLF) src = src.replace(/\n/g, '\r\n');
  writeFileSync(path, src, 'utf8');
  console.log('PanelNavigator done');
}

// 3. VerifyNFCPanel — replace ARBoxModule.presentAR call with showPanel('nfc-reveal')
{
  const path = './src/components/panels/VerifyNFCPanel.tsx';
  let src = readFileSync(path, 'utf8');
  const hasCRLF = src.includes('\r\n');
  if (hasCRLF) src = src.replace(/\r\n/g, '\n');

  const OLD = `        setState('success');
        const arResult = await ARBoxModule.presentAR(arPayload);
        // Save tasting journal rating if user provided one
        if (arResult && arResult.rating && reorderData.variety_id) {
          saveTastingRating(reorderData.variety_id, arResult.rating, arResult.notes ?? null).catch(() => {});
        }
        if (arResult?.gift_registry_added && reorderData.variety_id) {
          addToGiftRegistry(reorderData.variety_id, reorderData.variety_name ?? undefined).catch(() => {});
        }
        if (arResult?.note_body && arResult?.note_color) {
          postArNote(deviceLat, deviceLng, arResult.note_body, arResult.note_color).catch(() => {});
        }
        goHome();`;

  const NEW = `        showPanel('nfc-reveal', {
          variety_name: reorderData.variety_name,
          tasting_notes: (varietyProfile as any)?.tasting_notes ?? null,
          location_id: reorderData.location_id ?? null,
        });`;

  if (!src.includes(OLD)) { console.error('VerifyNFCPanel: target not found'); process.exit(1); }
  src = src.replace(OLD, NEW);

  if (hasCRLF) src = src.replace(/\n/g, '\r\n');
  writeFileSync(path, src, 'utf8');
  console.log('VerifyNFCPanel done');
}
