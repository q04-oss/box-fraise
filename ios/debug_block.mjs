import { readFileSync } from 'fs';
let src = readFileSync('./src/components/panels/TerminalPanel.tsx', 'utf8');
if (src.includes('\r\n')) src = src.replace(/\r\n/g, '\n');
const start = src.indexOf('<View style={styles.confirmedBlock}>');
const end = src.indexOf('</View>', start + 200) + '</View>'.length;
// find outer end
const end2 = src.indexOf('</View>', end) + '</View>'.length;
console.log(JSON.stringify(src.slice(start - 18, end2 + 5)));
