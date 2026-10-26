// Lee días escritos a mano: «28», «28/10», «28 oct», «lunes», «mañana», «4 nov noche», «28, 30 oct»…
// Devuelve fechas (AAAA-MM-DD) y, si se escribió el turno al final («noche», «n»), el turno elegido.

const MON = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const WDF = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
const WDS = ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab'];

const pad = (n) => String(n).padStart(2, '0');
const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const monthIdx = (w) => (w.length >= 3 ? MON.findIndex((m) => w.startsWith(m)) : -1);

export function parseDays(text, { today = new Date(), skip = new Set(), shifts = [] } = {}) {
  const T = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const items = [];
  const bad = [];
  const seen = new Set(skip);

  const nextDom = (n) => {
    let d = new Date(T.getFullYear(), T.getMonth(), n);
    if (d.getDate() !== n) return null;
    if (d < T) { d = new Date(T.getFullYear(), T.getMonth() + 1, n); if (d.getDate() !== n) return null; }
    return d;
  };
  const pick = (n, mi) => {
    if (mi < 0) return nextDom(n);
    let d = new Date(T.getFullYear(), mi, n);
    if (d.getMonth() !== mi) return null;
    if (d < T) d = new Date(T.getFullYear() + 1, mi, n);
    return d;
  };
  const one = (raw) => {
    const t = norm(raw).replace(/^el\s+/, '').replace(/\s+de\s+/g, ' ');
    if (!t) return null;
    let m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) { const d = new Date(+m[1], +m[2] - 1, +m[3]); return d.getMonth() === +m[2] - 1 ? d : null; }
    if (t === 'hoy') return T;
    if (t === 'manana') return addDays(T, 1);
    if (t === 'pasado manana') return addDays(T, 2);
    m = t.match(/^([a-z]+)\.?(?:\s+(\d{1,2}))?(?:\s+([a-z]+))?$/);
    if (m) {
      let wi = WDF.indexOf(m[1]); if (wi < 0) wi = WDS.indexOf(m[1].slice(0, 3));
      if (wi < 0) return null;
      if (!m[2]) { let d = addDays(T, 1); while (d.getDay() !== wi) d = addDays(d, 1); return d; }
      return pick(+m[2], m[3] ? monthIdx(m[3]) : -1);
    }
    m = t.match(/^(\d{1,2})\s*[/\-.]\s*(\d{1,2})$/); if (m) return pick(+m[1], +m[2] - 1);
    m = t.match(/^(\d{1,2})\s+([a-z]+)$/); if (m) { const mi = monthIdx(m[2]); return mi >= 0 ? pick(+m[1], mi) : null; }
    m = t.match(/^(\d{1,2})$/); if (m) return nextDom(+m[1]);
    return null;
  };
  // Turno escrito al final: por nombre («noche») o por letra («n»).
  const withShift = (p) => {
    const w = p.trim().split(/\s+/);
    if (w.length < 2) return [p, null];
    const last = norm(w[w.length - 1]);
    const rest = w.slice(0, -1).join(' ');
    const s = shifts.find((x) => norm(x.name) === last || (last.length >= 3 && norm(x.name).startsWith(last)) || (last.length === 1 && norm(x.letter) === last));
    return s && one(rest) ? [rest, s.id] : [p, null];
  };

  const parts = String(text).split(/[,;]|\sy\s/).map((x) => x.trim()).filter(Boolean);
  const lastM = parts.length ? norm(parts[parts.length - 1]).match(/([a-z]{3,})$/) : null;
  const lastMi = lastM ? monthIdx(lastM[1]) : -1;
  parts.forEach((p0) => {
    const [p, sh] = withShift(p0);
    let d = one(p);
    if (!d && lastMi >= 0 && /^\d{1,2}$/.test(p)) d = pick(+p, lastMi);
    if (!d) { bad.push(p0); return; }
    const k = keyOf(d);
    if (skip.has(k)) { if (!seen.has(k)) bad.push(p0); return; }
    if (seen.has(k)) return;
    seen.add(k);
    items.push({ key: k, shift: sh });
  });
  return { items, bad };
}
