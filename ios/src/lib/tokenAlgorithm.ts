export interface TokenVisuals {
  size: number;
  color: string;
  seeds: number;
  irregularity: number;
}

export function computeTokenVisuals(excessCents: number): TokenVisuals {
  const dollars = excessCents / 100;
  const logMin = 0;
  const logMax = 7;
  const logVal = Math.log10(Math.max(1, dollars));
  const t = Math.min(1, Math.max(0, (logVal - logMin) / (logMax - logMin)));
  const ease = Math.pow(t, 0.6);
  const size = Math.round(1 + ease * 99);
  const seeds = Math.round(3 + ease * 141);
  const irregularity = Math.round(1 + ease * 99);
  const color = interpolateColor(ease);
  return { size, color, seeds, irregularity };
}

function interpolateColor(t: number): string {
  const stops = [
    { t: 0.0, r: 255, g: 205, b: 210 },
    { t: 0.3, r: 229, g: 115, b: 115 },
    { t: 0.6, r: 183, g: 28,  b: 28  },
    { t: 0.8, r: 123, g: 31,  b: 162 },
    { t: 1.0, r: 26,  g: 35,  b: 126 },
  ];
  let lower = stops[0], upper = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i].t && t <= stops[i + 1].t) {
      lower = stops[i]; upper = stops[i + 1]; break;
    }
  }
  const range = upper.t - lower.t || 1;
  const local = (t - lower.t) / range;
  const r = Math.round(lower.r + local * (upper.r - lower.r));
  const g = Math.round(lower.g + local * (upper.g - lower.g));
  const b = Math.round(lower.b + local * (upper.b - lower.b));
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}
