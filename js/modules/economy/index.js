// W economy: registra todas las pantallas de la sección.

import { renderSummary } from './summary.js';
import { renderMoves } from './moves.js';
import { renderFixed, renderFixedEdit, renderFixedForm } from './fixed.js';
import { renderChoose, renderExpense, renderIncome } from './forms.js';

export function registerEconomy(route) {
  const o = { full: true };
  route('/economia', renderSummary, o);
  route('/economia/gastos', renderMoves, o);
  route('/economia/gastos-fijos', renderFixed, o);
  route('/economia/gastos-fijos/editar', renderFixedEdit, o);
  route('/economia/gasto-fijo/:id', renderFixedForm, o);
  route('/economia/anadir', renderChoose, o);
  route('/economia/gasto/:id', renderExpense, o);
  route('/economia/ingreso/:id', renderIncome, o);
}
