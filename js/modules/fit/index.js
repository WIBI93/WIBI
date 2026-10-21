// W fit: registra todas las pantallas de la sección.

import { renderHome, renderWeek, renderCommonMedals, renderCommonSettings } from './common.js';
import { renderSportHome, renderSportTab } from './sport.js';
import { renderRoutines, renderRoutineEdit, renderSessions, renderSessionDetail, renderStart, renderMyExercises } from './gym.js';

import { renderRunMedals, renderRunRetos } from './gym2.js';
import { renderGoalNew } from './goals.js';
import { renderPlans } from './plans.js';
import { renderImport, renderRuns, renderRunDetail, renderRunStats } from './run.js';
import { renderGymMedals, renderGymStats, renderGymRetos } from './gym2.js';
import { getFit } from './data.js';

// Pone el color de acento del gimnasio antes de dibujar su pantalla.
const gymScreen = (fn) => (el, params) => { document.documentElement.dataset.accent = getFit().settings.accent; return fn(el, params); };

export function registerFit(route) {
  route('/fit', renderHome, { theme: 'fitc' });
  route('/fit/semana', renderWeek, { theme: 'fitc' });
  route('/fit/medallas', renderCommonMedals, { theme: 'fitc' });
  route('/fit/ajustes', renderCommonSettings, { theme: 'fitc' });
  route('/fit/gym', renderSportHome('gym'), { theme: 'fitg' });
  const g = { theme: 'fitg' };
  route('/fit/gym/rutinas', gymScreen(renderRoutines), g);
  route('/fit/gym/rutina/:id', gymScreen(renderRoutineEdit), g);
  route('/fit/gym/entrenos', gymScreen(renderSessions), g);
  route('/fit/gym/entreno/:id', gymScreen(renderSessionDetail), g);
  route('/fit/gym/empezar', gymScreen(renderStart), g);
  route('/fit/gym/ejercicios', gymScreen(renderMyExercises), g);
  route('/fit/gym/medallas', gymScreen(renderGymMedals), g);
  route('/fit/gym/estadisticas', gymScreen(renderGymStats), g);
  route('/fit/gym/retos', gymScreen(renderGymRetos), g);
  route('/fit/gym/meta', gymScreen(renderGoalNew('gym')), g);
  route('/fit/gym/:tab', renderSportTab('gym'), g);
  route('/fit/running', renderSportHome('run'), { theme: 'fitr' });
  const r = { theme: 'fitr' };
  route('/fit/running/importar', renderImport, r);
  route('/fit/running/carreras', renderRuns, r);
  route('/fit/running/planes', renderPlans, r);
  route('/fit/running/carrera/:id', renderRunDetail, r);
  route('/fit/running/estadisticas', renderRunStats, r);
  route('/fit/running/medallas', renderRunMedals, r);
  route('/fit/running/retos', renderRunRetos, r);
  route('/fit/running/meta', renderGoalNew('run'), r);
  route('/fit/running/:tab', renderSportTab('run'), { theme: 'fitr' });
}
