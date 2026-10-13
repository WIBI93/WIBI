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

// Elige texto blanco u oscuro según cuál se lea mejor sobre el color de fondo
// (compara el contraste de los dos), también con colores personalizados.
function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  const lin = (v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
}

export function readableOn(hex, dark = '#1B2A26') {
  const l = luminance(hex);
  const withWhite = 1.05 / (l + 0.05);
  const withDark = (l + 0.05) / (luminance(dark) + 0.05);
  return withWhite >= withDark ? '#FFFFFF' : dark;
}
