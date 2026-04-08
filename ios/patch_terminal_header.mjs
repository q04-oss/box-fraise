import { readFileSync, writeFileSync } from 'fs';

const path = './src/components/panels/TerminalPanel.tsx';
let src = readFileSync(path, 'utf8');
const hasCRLF = src.includes('\r\n');
if (hasCRLF) src = src.replace(/\r\n/g, '\n');

// 1. Add sheetHeight to usePanel destructure
src = src.replace(
  "const { goHome, showPanel, setOrder, order, setActiveLocation, varieties, businesses, activeLocation, panelData, setPanelData } = usePanel();",
  "const { goHome, showPanel, setOrder, order, setActiveLocation, varieties, businesses, activeLocation, panelData, setPanelData, sheetHeight } = usePanel();"
);

if (!src.includes('sheetHeight')) {
  console.error('usePanel destructure not found or already has sheetHeight');
  process.exit(1);
}

// 2. Add isCollapsed derived value after sheetHeight is available
// Insert after the usePanel line
src = src.replace(
  "const { goHome, showPanel, setOrder, order, setActiveLocation, varieties, businesses, activeLocation, panelData, setPanelData, sheetHeight } = usePanel();\n",
  "const { goHome, showPanel, setOrder, order, setActiveLocation, varieties, businesses, activeLocation, panelData, setPanelData, sheetHeight } = usePanel();\n  const isCollapsed = sheetHeight < 110;\n"
);

// 3. Update header JSX — hide border when collapsed, center title
const OLD_HEADER = `      <View style={[styles.terminalHeader, { borderBottomColor: c.border }]}>
        <View style={styles.headerSpacer} />
        <TouchableOpacity onPress={() => showPanel('verifyNFC')} activeOpacity={0.6} style={{ flex: 1 }}>
          <Text style={[styles.terminalTitle, { color: c.text }]}>box fraise</Text>
        </TouchableOpacity>
        <View style={styles.nfcHeaderBtn} />
      </View>`;

const NEW_HEADER = `      <View style={[styles.terminalHeader, { borderBottomColor: isCollapsed ? 'transparent' : c.border }]}>
        {!isCollapsed && <View style={styles.headerSpacer} />}
        <TouchableOpacity onPress={() => showPanel('verifyNFC')} activeOpacity={0.6} style={{ flex: 1 }}>
          <Text style={[styles.terminalTitle, { color: c.text }]}>box fraise</Text>
        </TouchableOpacity>
        {!isCollapsed && <View style={styles.nfcHeaderBtn} />}
      </View>`;

if (!src.includes(OLD_HEADER)) {
  console.error('header JSX not found');
  process.exit(1);
}
src = src.replace(OLD_HEADER, NEW_HEADER);

if (hasCRLF) src = src.replace(/\n/g, '\r\n');
writeFileSync(path, src, 'utf8');
console.log('Done');
