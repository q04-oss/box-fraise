// Fraise (FRS) on-chain balance reader.
// Makes a raw JSON-RPC eth_call to Optimism — no wallet SDK needed.

const OPTIMISM_RPC = 'https://mainnet.optimism.io';
// la-fraise Fraise token on Optimism mainnet
const FRAISE_CONTRACT = '0x1698414c85D9B262bdd357c4606149123F459E32';
// keccak256("balanceOf(address)")[0:4]
const BALANCE_OF_SELECTOR = '0x70a08231';
const DECIMALS = 6; // 1 Fraise = 1_000_000 Akène

/** Returns the FRS balance as a human-readable string, e.g. "2.5 FRS" */
export async function fetchFrsBalance(address: string): Promise<string | null> {
  try {
    const padded = address.toLowerCase().replace('0x', '').padStart(64, '0');
    const data = BALANCE_OF_SELECTOR + padded;

    const res = await fetch(OPTIMISM_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [{ to: FRAISE_CONTRACT, data }, 'latest'],
        id: 1,
      }),
    });

    const json = await res.json();
    if (!json.result || json.result === '0x') return '0 FRS';

    const raw = BigInt(json.result);
    if (raw === 0n) return '0 FRS';

    const divisor = BigInt(10 ** DECIMALS);
    const whole = raw / divisor;
    const frac = raw % divisor;

    if (frac === 0n) return `${whole.toLocaleString()} FRS`;

    // Show up to 3 significant decimal places
    const fracStr = frac.toString().padStart(DECIMALS, '0');
    const trimmed = fracStr.replace(/0+$/, '').slice(0, 3);
    return `${whole.toLocaleString()}.${trimmed} FRS`;
  } catch {
    return null;
  }
}
