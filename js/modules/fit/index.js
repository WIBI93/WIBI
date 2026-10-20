// W fit: registra todas las pantallas de la sección.

import { renderHome, renderWeek, renderCommonMedals, renderCommonSettings } from './common.js';
import { renderSportHome, renderSportTab } from './sport.js';

export function registerFit(route) {
  route('/fit', renderHome, { theme: 'fitc' });
  route('/fit/semana', renderWeek, { theme: 'fitc' });
  route('/fit/medallas', renderCommonMedals, { theme: 'fitc' });
  route('/fit/ajustes', renderCommonSettings, { theme: 'fitc' });
  route('/fit/gym', renderSportHome('gym'), { theme: 'fitg' });
  route('/fit/gym/:tab', renderSportTab('gym'), { theme: 'fitg' });
  route('/fit/running', renderSportHome('run'), { theme: 'fitr' });
  route('/fit/running/:tab', renderSportTab('run'), { theme: 'fitr' });
}
