// Iconos de WIBI. Todos usan "currentColor": toman el color del texto donde se pongan.

const svg = (inner) =>
  `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;

export const ICONS = {
  wallet: svg('<path d="M3 7a2 2 0 0 1 2-2h12v3"/><rect x="3" y="8" width="18" height="12" rx="2.5"/><circle cx="16.5" cy="14" r="1.2"/>'),
  calendar: svg('<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
  dumbbell: svg('<path d="M6 8v8M3 10v4M18 8v8M21 10v4M6 12h12"/>'),
  cart: svg('<circle cx="9" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/><path d="M3 4h2.5l2.2 11h10l2-8H7"/>'),
  car: svg('<path d="M4 17v-5l2-5h12l2 5v5M4 17h16M7 17v2M17 17v2M4 12h16"/>'),
  gear: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  back: svg('<path d="M15 6l-6 6 6 6"/>'),
  chevron: svg('<path d="M9 6l6 6-6 6"/>'),
  download: svg('<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>'),
  upload: svg('<path d="M12 16V5M7 9l5-5 5 5M5 20h14"/>'),
  check: svg('<path d="M5 12l5 5 9-10"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
};

// El icono de la app (la W blanca sobre verde), para la cabecera del inicio.
export const LOGO = `<svg viewBox="0 0 70 70" role="img" aria-label="WIBI">
<rect x="0" y="0" width="70" height="70" rx="16" fill="#17594A"/>
<polyline points="16,22 26,50 35,30 44,50 54,22" fill="none" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
