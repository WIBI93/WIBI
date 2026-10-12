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

// Texto seguro para meter dentro de HTML.
export function esc(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
