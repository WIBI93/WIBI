// Colores sobrios para las secciones. Se pueden cambiar desde Ajustes.

export const PALETTE = [
  { name: 'Verde', hex: '#17594A' },
  { name: 'Azul', hex: '#2F5D78' },
  { name: 'Violeta', hex: '#5E557F' },
  { name: 'Terracota', hex: '#9A5A45' },
  { name: 'Ocre', hex: '#8A6A1F' },
  { name: 'Gris verdoso', hex: '#3F5650' },
];

export const HEX_RE = /^#[0-9a-fA-F]{6}$/;

// Elige texto blanco u oscuro según lo claro que sea el color de fondo,
// para que siempre se lea bien (también con colores personalizados).
export function readableOn(hex) {
  const n = parseInt(hex.slice(1), 16);
  const lin = (v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const lum = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  return lum > 0.4 ? '#1B2A26' : '#FFFFFF';
}
