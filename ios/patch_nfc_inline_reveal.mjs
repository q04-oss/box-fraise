import { readFileSync, writeFileSync } from 'fs';

const path = './src/components/panels/VerifyNFCPanel.tsx';
let src = readFileSync(path, 'utf8');
const hasCRLF = src.includes('\r\n');
if (hasCRLF) src = src.replace(/\r\n/g, '\n');

// 1. Add TrueSheet import
const OLD_IMPORT = `import { usePanel } from '../../context/PanelContext';`;
const NEW_IMPORT = `import { TrueSheet } from '@lodev09/react-native-true-sheet';
import { usePanel } from '../../context/PanelContext';`;
if (!src.includes(OLD_IMPORT)) { console.error('import target not found'); process.exit(1); }
src = src.replace(OLD_IMPORT, NEW_IMPORT);

// 2. Change State type to include 'revealed'
const OLD_STATE = `type State = 'scanning' | 'success' | 'error';`;
const NEW_STATE = `type State = 'scanning' | 'success' | 'error' | 'revealed';`;
if (!src.includes(OLD_STATE)) { console.error('State type not found'); process.exit(1); }
src = src.replace(OLD_STATE, NEW_STATE);

// 3. Add revealData state after errorMsg state
const OLD_STATE_VAR = `  const [errorMsg, setErrorMsg] = useState('');`;
const NEW_STATE_VAR = `  const [errorMsg, setErrorMsg] = useState('');
  const [revealData, setRevealData] = useState<{ variety_name: string; tasting_notes: string | null; location_id: number | null } | null>(null);`;
if (!src.includes(OLD_STATE_VAR)) { console.error('errorMsg state not found'); process.exit(1); }
src = src.replace(OLD_STATE_VAR, NEW_STATE_VAR);

// 4. Replace showPanel('nfc-reveal') with inline reveal
const OLD_SHOW = `        showPanel('nfc-reveal', {
          variety_name: reorderData.variety_name,
          tasting_notes: (varietyProfile as any)?.tasting_notes ?? null,
          location_id: reorderData.location_id ?? null,
        });`;
const NEW_SHOW = `        setRevealData({
          variety_name: reorderData.variety_name ?? 'Strawberry',
          tasting_notes: (varietyProfile as any)?.tasting_notes ?? null,
          location_id: reorderData.location_id ?? null,
        });
        setState('revealed');
        TrueSheet.present('main-sheet', 2).catch(() => {});`;
if (!src.includes(OLD_SHOW)) { console.error('showPanel nfc-reveal not found'); process.exit(1); }
src = src.replace(OLD_SHOW, NEW_SHOW);

// 5. Replace the render return with one that handles 'revealed' state
const OLD_RETURN = `  return (
    <View style={[styles.container, { backgroundColor: c.panelBg }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { cancelNfc(); goHome(); }} activeOpacity={0.7} style={styles.headerLeft}>
          <Text style={[styles.headerBackText, { color: c.accent }]}>←</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={state === 'error' ? scan : undefined}
          disabled={state !== 'error'}
          activeOpacity={0.6}
          style={styles.headerTitleBtn}
        >
          <Text style={[styles.headerTitle, { color: c.text }]}>
            {state === 'error' ? "Didn't catch it." : 'box fraise'}
          </Text>
          {state === 'error' && !!errorMsg && (
            <Text style={{ color: 'red', fontSize: 11, textAlign: 'center', paddingHorizontal: 16, paddingTop: 4 }}>{errorMsg}</Text>
          )}
          {state === 'error' && !!errorMsg && (
            <Text style={{ color: 'red', fontSize: 11, textAlign: 'center', paddingHorizontal: 16, paddingTop: 4 }}>{errorMsg}</Text>
          )}
        </TouchableOpacity>
        <View style={styles.headerRight} />
      </View>
    </View>
  );`;

const NEW_RETURN = `  if (state === 'revealed' && revealData) {
    return (
      <View style={[styles.container, { backgroundColor: c.panelBg }]}>
        <View style={styles.revealHeader}>
          <TouchableOpacity onPress={goHome} activeOpacity={0.7}>
            <Text style={[styles.headerBackText, { color: c.accent }]}>←</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.revealBody}>
          <Text style={[styles.collectedLabel, { color: c.muted, fontFamily: fonts.dmMono }]}>COLLECTED</Text>
          <Text style={[styles.revealVariety, { color: c.text, fontFamily: fonts.playfair }]}>{revealData.variety_name}</Text>
          {!!revealData.tasting_notes && (
            <Text style={[styles.revealNotes, { color: c.muted, fontFamily: fonts.dmSans }]}>{revealData.tasting_notes}</Text>
          )}
        </View>
        <TouchableOpacity
          style={[styles.reorderBtn, { backgroundColor: c.accent }]}
          onPress={() => showPanel('location', revealData.location_id ? { preselect_location_id: revealData.location_id } : undefined)}
          activeOpacity={0.8}
        >
          <Text style={[styles.reorderText, { fontFamily: fonts.dmSans }]}>REORDER →</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.panelBg }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { cancelNfc(); goHome(); }} activeOpacity={0.7} style={styles.headerLeft}>
          <Text style={[styles.headerBackText, { color: c.accent }]}>←</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={state === 'error' ? scan : undefined}
          disabled={state !== 'error'}
          activeOpacity={0.6}
          style={styles.headerTitleBtn}
        >
          <Text style={[styles.headerTitle, { color: c.text }]}>
            {state === 'error' ? "Didn't catch it." : 'box fraise'}
          </Text>
          {state === 'error' && !!errorMsg && (
            <Text style={{ color: 'red', fontSize: 11, textAlign: 'center', paddingHorizontal: 16, paddingTop: 4 }}>{errorMsg}</Text>
          )}
        </TouchableOpacity>
        <View style={styles.headerRight} />
      </View>
    </View>
  );`;

if (!src.includes(OLD_RETURN)) { console.error('return block not found'); process.exit(1); }
src = src.replace(OLD_RETURN, NEW_RETURN);

// 6. Add new styles before the closing of StyleSheet
const OLD_STYLES = `  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingTop: 24, paddingBottom: 14 },`;
const NEW_STYLES = `  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingTop: 24, paddingBottom: 14 },
  revealHeader: { paddingHorizontal: SPACING.md, paddingTop: 24, paddingBottom: 8 },
  revealBody: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.lg, gap: 16 },
  collectedLabel: { fontSize: 11, letterSpacing: 3 },
  revealVariety: { fontSize: 38, textAlign: 'center', lineHeight: 46 },
  revealNotes: { fontSize: 15, textAlign: 'center', lineHeight: 24, marginTop: 8, maxWidth: 300 },
  reorderBtn: { marginHorizontal: SPACING.lg, marginBottom: 40, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  reorderText: { color: '#fff', fontSize: 14, letterSpacing: 1.5 },`;
if (!src.includes(OLD_STYLES)) { console.error('styles target not found'); process.exit(1); }
src = src.replace(OLD_STYLES, NEW_STYLES);

if (hasCRLF) src = src.replace(/\n/g, '\r\n');
writeFileSync(path, src, 'utf8');
console.log('Done');
