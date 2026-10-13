// Piezas de interfaz compartidas: avisos breves y diálogos de confirmación.

const root = () => document.getElementById('overlay-root');

let toastTimer = null;

export function toast(message) {
  root().querySelectorAll('.toast').forEach((n) => n.remove());
  const node = document.createElement('div');
  node.className = 'toast';
  node.setAttribute('role', 'status');
  node.textContent = message;
  root().appendChild(node);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.remove(), 4500);
}

// Muestra un cuadro de confirmación. Devuelve true si se acepta y false si se cancela.
export function confirmDialog({ title, text, confirmLabel = 'Aceptar', cancelLabel = 'Cancelar', danger = false }) {
  return new Promise((resolve) => {
    const back = document.createElement('div');
    back.className = 'modal-back';
    back.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <h2 id="modal-title"></h2>
        <p></p>
        <div class="btn-row">
          <button type="button" class="btn outline" data-act="cancel"></button>
          <button type="button" class="btn ${danger ? 'danger' : 'primary'}" data-act="ok"></button>
        </div>
      </div>`;
    back.querySelector('h2').textContent = title;
    back.querySelector('p').textContent = text;
    back.querySelector('[data-act="cancel"]').textContent = cancelLabel;
    back.querySelector('[data-act="ok"]').textContent = confirmLabel;

    const close = (result) => {
      document.removeEventListener('keydown', onKey);
      back.remove();
      resolve(result);
    };
    const onKey = (e) => { if (e.key === 'Escape') close(false); };

    back.addEventListener('click', (e) => {
      if (e.target === back) return close(false);
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act === 'ok') close(true);
      if (act === 'cancel') close(false);
    });
    document.addEventListener('keydown', onKey);
    root().appendChild(back);
    back.querySelector('[data-act="cancel"]').focus();
  });
}

// Cuadro con campos para rellenar. Devuelve un objeto {clave: valor} o null si se cancela.
// fields: [{ key, label, type, value, placeholder, maxLength }]
export function formDialog({ title, fields, confirmLabel = 'Guardar', cancelLabel = 'Cancelar' }) {
  return new Promise((resolve) => {
    const back = document.createElement('div');
    back.className = 'modal-back';
    const fieldsHtml = fields
      .map(
        (f, i) => `<label class="field"><span>${esc(f.label)}</span>
          <input data-i="${i}" type="${f.type || 'text'}" value="${esc(f.value || '')}" placeholder="${esc(f.placeholder || '')}" ${f.maxLength ? `maxlength="${f.maxLength}"` : ''}></label>`
      )
      .join('');
    back.innerHTML = `
      <form class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <h2 id="modal-title"></h2>
        ${fieldsHtml}
        <div class="btn-row">
          <button type="button" class="btn outline" data-act="cancel"></button>
          <button type="submit" class="btn primary"></button>
        </div>
      </form>`;
    back.querySelector('h2').textContent = title;
    back.querySelector('[data-act="cancel"]').textContent = cancelLabel;
    back.querySelector('[type="submit"]').textContent = confirmLabel;

    const close = (result) => {
      document.removeEventListener('keydown', onKey);
      back.remove();
      resolve(result);
    };
    const onKey = (e) => { if (e.key === 'Escape') close(null); };

    back.addEventListener('click', (e) => {
      if (e.target === back) close(null);
      if (e.target.closest('[data-act="cancel"]')) close(null);
    });
    back.querySelector('form').addEventListener('submit', (e) => {
      e.preventDefault();
      const out = {};
      fields.forEach((f, i) => { out[f.key] = back.querySelector(`[data-i="${i}"]`).value; });
      close(out);
    });
    document.addEventListener('keydown', onKey);
    root().appendChild(back);
    const first = back.querySelector('input');
    if (first) first.focus();
  });
}

// Texto seguro para meter dentro de HTML.
export function esc(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
