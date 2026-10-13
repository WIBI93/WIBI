// W economy: registra todas las pantallas de la sección.

import { renderSummary } from './summary.js';
import { renderMoves } from './moves.js';
import { renderFixed, renderFixedEdit, renderFixedForm } from './fixed.js';
import { renderSavings, renderMediumMove, renderLongMove, renderSavingMove, renderAccountForm } from './savings.js';
import { renderProjection } from './projection.js';
import { renderSim } from './sim.js';
import { renderEcoSettings } from './settings.js';
import { renderSetup, renderSetupEdit } from './setup.js';
import { renderChoose, renderExpense, renderIncome } from './forms.js';

export function registerEconomy(route) {
  const o = { full: true };
  route('/economia', renderSummary, o);
  route('/economia/gastos', renderMoves, o);
  route('/economia/gastos-fijos', renderFixed, o);
  route('/economia/gastos-fijos/editar', renderFixedEdit, o);
  route('/economia/gasto-fijo/:id', renderFixedForm, o);
  route('/economia/ahorro', renderSavings, o);
  route('/economia/ahorro/medio', renderMediumMove, o);
  route('/economia/ahorro/largo', renderLongMove, o);
  route('/economia/ahorro/proyeccion', renderProjection, o);
  route('/economia/ahorro/cuenta/:id', renderAccountForm, o);
  route('/economia/ahorro/mov/:id', renderSavingMove, o);
  route('/economia/simular', renderSim, o);
  route('/economia/ajustes', renderEcoSettings, o);
  route('/economia/inicio', renderSetup, o);
  route('/economia/inicio/editar', renderSetupEdit, o);
  route('/economia/anadir', renderChoose, o);
  route('/economia/gasto/:id', renderExpense, o);
  route('/economia/ingreso/:id', renderIncome, o);
}
