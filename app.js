const app = document.querySelector('#app');
const sheet = document.querySelector('.sheet');
const sheetScroll = document.querySelector('.sheet-scroll');
const overlay = document.querySelector('.overlay');
const breakdown = document.querySelector('#breakdown');
const breakdownRows = document.querySelector('.breakdown-rows');
const breakdownToggle = document.querySelector('#breakdown-toggle');
const scoreGauge = document.querySelector('#score-gauge');
const scoreProgress = document.querySelector('.score-progress');
const scoreValue = document.querySelector('#score-value');
const plotScroll = document.querySelector('#plot-scroll');
const feedbackSheet = document.querySelector('.feedback-sheet');
const feelingRange = document.querySelector('#feeling-range');
const feelingSlider = document.querySelector('#feeling-slider');
const feelingLabel = document.querySelector('#feeling-label');
const hourlyTrack = document.querySelector('#main-hourly-track');
const ratingControl = document.querySelector('.rating-control');
const summary = document.querySelector('.summary');
const ratingNote = document.querySelector('.rating-note');
const feedbackForm = document.querySelector('.feedback-form');
const feedbackDone = document.querySelector('.feedback-done');
const themeColor = document.querySelector('meta[name="theme-color"]');
const mainSheetUnderlay = document.querySelector('.main-sheet-underlay');
const feedbackSheetUnderlay = document.querySelector('.feedback-sheet-underlay');
const weatherComment = document.querySelector('#weather-comment');

const CURRENT_HOUR = 10;
const HOUR_STEP = 43.333;
let condition = 'good';
let selectedDay = 0;
let lockedScrollY = 0;

function lockPageScroll() {
  if (document.body.classList.contains('is-scroll-locked')) return;
  lockedScrollY = window.scrollY;
  document.body.style.top = `-${lockedScrollY}px`;
  document.body.classList.add('is-scroll-locked');
}

function unlockPageScroll() {
  if (!document.body.classList.contains('is-scroll-locked')) return;
  document.body.classList.remove('is-scroll-locked');
  document.body.style.removeProperty('top');
  window.scrollTo(0, lockedScrollY);
}

const conditions = {
  good: {
    title: 'На улице комфортно',
    copy: 'Сейчас и до 11:00 наиболее подходящее время для выхода на улицу',
    score: 96,
    scoreColor: '#00e794',
    currentCondition: 'Ясно',
    currentCopy: 'Дождь начнётся около 11:00',
    cardTitle: 'На улице сейчас комфортно',
    cardCopy: 'После 11:00 погода существенно ухудшится',
    details: [
      ['22°', 'status-green.svg'],
      ['3 м/с', 'status-yellow.svg'],
      ['отсутствуют', 'status-green.svg'],
      ['2, низкий', 'status-green.svg'],
      ['нет', 'status-green.svg']
    ],
    hourly: [
      { tone: '', items: [[9, 'sun', 24], [10, null, 24]] },
      { tone: 'rain', items: [[11, 'rain', 24], [12, null, 24], [13, null, 24], [14, null, 23], [15, 'rain2', 22], [16, null, 21]] },
      { tone: '', items: [[17, 'cloud', 20], [18, null, 19]] },
      { tone: '', items: [['18:42', 'sunset', 'закат']] },
      { tone: '', items: [[19, 'evening', 18], [20, null, 17], [21, null, 16], [22, null, 16], [23, null, 15]] }
    ]
  },
  bad: {
    title: 'Дискомфортно из‑за\u00a0холода и ветра',
    copy: 'Если выход можно отложить, лучше выбрать время с 18:00 до 22:00',
    score: 48,
    scoreColor: '#ffa451',
    currentCondition: 'Дождь',
    currentCopy: 'закончится около 18:00',
    cardTitle: 'На улице сейчас дискомфортно',
    cardCopy: 'Дождь и сильный ветер до 18:00',
    details: [
      ['14°', 'status-orange.svg'],
      ['19 м/с', 'status-red.svg'],
      ['слабый дождь', 'status-orange.svg'],
      ['0, низкий', 'status-green.svg'],
      ['ветер', 'status-orange.svg']
    ],
    hourly: [
      { tone: 'rain', items: [[9, 'rain', 18], [10, null, 17], [11, null, 17], [12, null, 16], [13, 'rain2', 16], [14, null, 15], [15, null, 15], [16, 'rain', 14], [17, null, 14]] },
      { tone: '', items: [[18, 'cloud', 14], [19, null, 15]] },
      { tone: '', items: [['18:42', 'sunset', 'закат']] },
      { tone: '', items: [[20, 'evening', 14], [21, null, 13], [22, null, 12], [23, null, 12]] }
    ]
  }
};

const todayGood = [86, 84, 82, 80, 78, 76, 79, 84, 89, 93, 96, 76, 70, 67, 52, 24, 16, 48, 67, 78, 84, 88, 91, 90];
const todayBad = [63, 60, 58, 55, 52, 48, 46, 44, 45, 47, 48, 42, 34, 28, 23, 36, 58, 71, 82, 86, 83, 78, 72, 68];
const fullDays = [
  [82, 86, 88, 91, 93, 94, 92, 88, 82, 76, 70, 64, 58, 52, 47, 42, 48, 56, 65, 72, 78, 83, 86, 84],
  [64, 62, 60, 58, 56, 59, 64, 70, 75, 79, 83, 86, 88, 84, 80, 76, 72, 68, 66, 69, 73, 77, 74, 70],
  [78, 80, 82, 84, 86, 85, 82, 78, 72, 66, 58, 49, 42, 36, 31, 28, 34, 43, 55, 64, 71, 76, 80, 82],
  [58, 55, 52, 50, 54, 60, 68, 75, 81, 85, 87, 84, 80, 77, 73, 69, 65, 62, 64, 68, 72, 70, 66, 62]
];

const chartCopy = [
  () => condition === 'good'
    ? 'Лучше выйти сейчас или после 20:00'
    : 'Лучше выйти с 18:00 до 20:00',
  () => 'Комфортно до 8:00 и после 21:00',
  () => 'Лучше выйти с 10:00 до 14:00',
  () => 'Комфортно с 1:00 до 6:00 и после 22:00',
  () => 'Лучше выйти с 8:00 до 12:00'
];

const colorHex = {
  green: '#00e794',
  yellow: '#eedf44',
  orange: '#ffa451',
  red: '#ff495f'
};

function color(value) {
  if (value >= 80) return 'green';
  if (value >= 50) return 'yellow';
  if (value >= 30) return 'orange';
  return 'red';
}

function valuesForDay(day) {
  if (day === 0) return condition === 'good' ? todayGood : todayBad;
  return fullDays[day - 1];
}

function stripGradient(values) {
  const width = 100 / values.length;
  const stops = values.map((value, index) => {
    const start = (index * width).toFixed(3);
    const end = ((index + 1) * width).toFixed(3);
    return `${colorHex[color(value)]} ${start}% ${end}%`;
  });
  return `linear-gradient(90deg, ${stops.join(', ')})`;
}

function renderDayStrips() {
  const dayValues = [valuesForDay(0), ...fullDays];
  document.querySelectorAll('.days button').forEach((button, index) => {
    button.querySelector('.strip').style.background = stripGradient(dayValues[index]);
  });
}

function weatherIcon(type) {
  if (!type) return '<span class="weather-icon" aria-hidden="true"></span>';
  if (type === 'sun') {
    return '<span class="weather-icon sun"><img src="assets/weather-sun.svg" alt=""></span>';
  }
  if (type === 'sunset') {
    return '<span class="weather-icon sunset"><img src="assets/weather-sunset.svg" alt=""></span>';
  }
  if (type === 'rain' || type === 'rain2') {
    const drops = type === 'rain2'
      ? '<img class="drop drop-1" src="assets/weather-drop.svg" alt=""><img class="drop drop-2" src="assets/weather-drop.svg" alt="">'
      : '<img class="drop drop-1" src="assets/weather-drop.svg" alt=""><img class="drop drop-2" src="assets/weather-drop.svg" alt=""><img class="drop drop-3" src="assets/weather-drop.svg" alt="">';
    return `<span class="weather-icon rainy ${type === 'rain2' ? 'rain-two' : 'rain-three'}"><img class="part-day" src="assets/weather-part-day.svg" alt=""><img class="cloud" src="assets/weather-cloud.svg" alt="">${drops}</span>`;
  }
  if (type === 'evening') {
    return '<span class="weather-icon cloudy"><img class="part-day" src="assets/weather-part-day-evening.svg" alt=""><img class="cloud" src="assets/weather-cloud-evening.svg" alt=""></span>';
  }
  return '<span class="weather-icon cloudy"><img class="part-day" src="assets/weather-part-day.svg" alt=""><img class="cloud" src="assets/weather-cloud.svg" alt=""></span>';
}

function renderMainHourly() {
  hourlyTrack.innerHTML = conditions[condition].hourly.map(group => {
    const markers = group.items
      .map((item, index) => item[1] ? { index, icon: item[1] } : null)
      .filter(Boolean);
    const iconSegments = markers.map((marker, markerIndex) => {
      const nextIndex = markers[markerIndex + 1]?.index ?? group.items.length;
      const left = 24 + marker.index * 64;
      const width = (nextIndex - marker.index) * 64 - 20;
      return `<span class="hourly-icon-segment" style="left:${left}px;width:${width}px"><span class="sticky-weather-icon">${weatherIcon(marker.icon)}</span></span>`;
    }).join('');

    return `
    <div class="hourly-group ${group.tone}">
      ${iconSegments}
      ${group.items.map(([hour, icon, temperature]) => `
        <div class="hourly-cell">
          ${weatherIcon(null)}
          <span class="hourly-time">${typeof hour === 'number' ? `${hour}:00` : hour}</span>
          <strong class="hourly-value">${typeof temperature === 'number' ? `${temperature}°` : temperature}</strong>
        </div>
      `).join('')}
    </div>
  `;
  }).join('');
}

function renderChart() {
  const values = valuesForDay(selectedDay);
  const hours = Array.from({ length: 24 }, (_, index) => index);

  document.querySelector('#chart-copy').textContent = chartCopy[selectedDay]();
  document.querySelector('#bars').innerHTML = values.map((value, hour) =>
    `<div class="bar ${color(value)}${selectedDay === 0 && hour < CURRENT_HOUR ? ' past' : ''}" style="height:${Math.max(28, Math.round(value))}px">${value}</div>`
  ).join('');

  document.querySelector('#times').innerHTML = hours.map(hour => {
    const current = selectedDay === 0 && hour === CURRENT_HOUR;
    const label = current || (selectedDay !== 0 && hour === 0) ? `${hour}:00` : String(hour);
    const past = selectedDay === 0 && hour < CURRENT_HOUR;
    return `<span class="${current ? 'current' : ''}${past ? ' past' : ''}">${label}</span>`;
  }).join('');

  requestAnimationFrame(() => {
    plotScroll.scrollLeft = selectedDay === 0 ? CURRENT_HOUR * HOUR_STEP : 0;
  });
}

function renderCondition() {
  const data = conditions[condition];
  app.dataset.condition = condition;
  document.body.dataset.condition = condition;
  themeColor.setAttribute('content', condition === 'good' ? '#3e8cdd' : '#355992');
  scoreValue.textContent = data.score;
  scoreGauge.setAttribute('aria-label', `${data.score} из 100`);
  scoreGauge.style.setProperty('--score-color', data.scoreColor);
  scoreProgress.style.strokeDasharray = `${data.score} ${100 - data.score}`;
  document.querySelector('#sheet-title').textContent = data.title;
  document.querySelector('#sheet-copy').textContent = data.copy;
  document.querySelector('#current-condition').textContent = data.currentCondition;
  document.querySelector('#current-condition-copy').textContent = data.currentCopy;
  document.querySelector('#main-score').textContent = data.score;
  document.querySelector('#main-score-title').textContent = data.cardTitle;
  document.querySelector('#main-score-copy').textContent = data.cardCopy;
  document.querySelector('.mini-score').style.setProperty('--mini-score', `${data.score}%`);

  const detailIds = ['#feels-value', '#wind-value', '#rain-value', '#uv-value', '#danger-value'];
  detailIds.forEach((selector, index) => {
    const [value, icon] = data.details[index];
    document.querySelector(selector).innerHTML = `${value} <img src="assets/${icon}" alt="">`;
  });

  renderMainHourly();
  renderDayStrips();
  renderChart();
}

function selectDay(day) {
  selectedDay = day;
  document.querySelectorAll('.days button').forEach(button => {
    button.classList.toggle('active', Number(button.dataset.day) === day);
  });
  renderChart();
}

function toggleCondition() {
  condition = condition === 'good' ? 'bad' : 'good';
  selectedDay = 0;
  document.querySelectorAll('.days button').forEach(button => {
    button.classList.toggle('active', Number(button.dataset.day) === 0);
  });
  renderCondition();
}

function setBreakdownExpanded(expanded) {
  sheet.classList.toggle('expanded', expanded);
  breakdown.setAttribute('aria-expanded', String(expanded));
  breakdownRows.setAttribute('aria-hidden', String(!expanded));
}

let overlayHideTimer = 0;
function showOverlay(feedbackMode = false) {
  clearTimeout(overlayHideTimer);
  overlay.hidden = false;
  overlay.classList.toggle('feedback-mode', feedbackMode);
  requestAnimationFrame(() => overlay.classList.add('is-visible'));
}

function hideOverlay() {
  clearTimeout(overlayHideTimer);
  overlay.classList.remove('is-visible');
  overlayHideTimer = window.setTimeout(() => {
    if (!sheet.classList.contains('open') && !feedbackSheet.classList.contains('open')) overlay.hidden = true;
  }, 440);
}

function updateSheetScrollMode() {
  if (!sheet.classList.contains('open') || sheet.classList.contains('expanded')) {
    sheetScroll.classList.remove('can-scroll');
    return;
  }
  sheetScroll.classList.toggle('can-scroll', sheetScroll.scrollHeight > sheetScroll.clientHeight + 2);
}

function syncVisualViewport() {
  const viewport = window.visualViewport;
  const viewportHeight = viewport?.height ?? window.innerHeight;
  const viewportTop = viewport?.offsetTop ?? 0;
  const keyboardOpen = feedbackSheet.classList.contains('open') && window.innerHeight - viewportHeight > 120;

  document.documentElement.style.setProperty('--visual-viewport-height', `${viewportHeight}px`);
  document.documentElement.style.setProperty('--visual-viewport-top', `${viewportTop}px`);
  document.documentElement.style.setProperty('--main-floor-top', `${Math.max(0, window.innerHeight - sheet.offsetHeight + 56)}px`);
  document.body.classList.toggle('keyboard-open', keyboardOpen);

  requestAnimationFrame(() => {
    if (!feedbackSheet.classList.contains('open')) return;
    const sheetTop = viewportTop + viewportHeight - feedbackSheet.offsetHeight;
    document.documentElement.style.setProperty('--feedback-floor-top', `${Math.max(0, sheetTop + 56)}px`);
  });
}

function openSheet() {
  selectedDay = 0;
  document.querySelectorAll('.days button').forEach(button => {
    button.classList.toggle('active', Number(button.dataset.day) === 0);
  });
  renderCondition();
  setBreakdownExpanded(false);
  feedbackSheet.classList.remove('open');
  feedbackSheet.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('feedback-open', 'keyboard-open');
  feedbackSheetUnderlay.classList.remove('is-visible');
  sheet.classList.add('open');
  sheet.setAttribute('aria-hidden', 'false');
  mainSheetUnderlay.classList.add('is-visible');
  showOverlay(false);
  lockPageScroll();
  sheetScroll.scrollTop = 0;
  scoreGauge.classList.remove('is-animating');
  void scoreGauge.offsetWidth;
  scoreGauge.classList.add('is-animating');
  syncVisualViewport();
  requestAnimationFrame(updateSheetScrollMode);
}

function openFeedback() {
  feedbackSheet.classList.remove('submitted');
  feedbackSheet.classList.add('open');
  feedbackSheet.setAttribute('aria-hidden', 'false');
  document.body.classList.add('feedback-open');
  feedbackSheetUnderlay.classList.add('is-visible');
  showOverlay(true);
  lockPageScroll();
  syncVisualViewport();
}

function closeFeedback() {
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  feedbackSheet.classList.remove('open');
  feedbackSheet.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('feedback-open', 'keyboard-open');
  feedbackSheetUnderlay.classList.remove('is-visible');
  if (sheet.classList.contains('open')) showOverlay(false);
  else {
    mainSheetUnderlay.classList.remove('is-visible');
    hideOverlay();
    unlockPageScroll();
  }
}

function closeSheet() {
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  setBreakdownExpanded(false);
  sheet.classList.remove('open');
  sheet.setAttribute('aria-hidden', 'true');
  feedbackSheet.classList.remove('open');
  feedbackSheet.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('feedback-open', 'keyboard-open');
  mainSheetUnderlay.classList.remove('is-visible');
  feedbackSheetUnderlay.classList.remove('is-visible');
  overlay.classList.remove('feedback-mode');
  hideOverlay();
  unlockPageScroll();
}

document.querySelectorAll('.mascot-toggle').forEach(button => button.addEventListener('click', toggleCondition));
document.querySelectorAll('[data-open]').forEach(button => button.addEventListener('click', openSheet));
document.querySelectorAll('.days button').forEach(button => button.addEventListener('click', () => selectDay(Number(button.dataset.day))));
document.querySelectorAll('[data-report]').forEach(button => button.addEventListener('click', () => {
  const control = button.closest('.report-control');
  const choice = button.dataset.report;
  control.classList.add('has-choice');
  control.classList.toggle('choice-no', choice === 'no');
  control.classList.toggle('choice-yes', choice === 'yes');
  control.querySelectorAll('[data-report]').forEach(option => {
    option.setAttribute('aria-pressed', String(option === button));
  });
}));

breakdownToggle.addEventListener('click', () => {
  const willExpand = !sheet.classList.contains('expanded');
  setBreakdownExpanded(willExpand);
  if (!willExpand) sheetScroll.scrollTo({ top: 0, behavior: 'smooth' });
  requestAnimationFrame(updateSheetScrollMode);
});

document.querySelector('.rating-dislike').addEventListener('click', () => {
  if (ratingControl.classList.contains('disliked')) setReaction(null);
  else openFeedback();
});

function setReaction(reaction) {
  if (!reaction) {
    ratingControl.classList.remove('liked', 'disliked');
    ratingControl.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', 'false'));
    ratingNote.textContent = '';
    summary.classList.remove('reaction-set');
    return;
  }
  const liked = reaction === 'like';
  ratingControl.classList.toggle('liked', liked);
  ratingControl.classList.toggle('disliked', !liked);
  ratingControl.querySelector('.rating-like').setAttribute('aria-pressed', String(liked));
  ratingControl.querySelector('.rating-dislike').setAttribute('aria-pressed', String(!liked));
  ratingNote.textContent = liked ? 'Спасибо!' : 'Оценка сохранена';
  summary.classList.add('reaction-set');
}

document.querySelector('.rating-like').addEventListener('click', () => {
  setReaction(ratingControl.classList.contains('liked') ? null : 'like');
});

function updateFeeling() {
  const value = Number(feelingRange.value);
  const ratio = value / 3;
  const trackWidth = feelingSlider.clientWidth;
  const edgeInset = 4;
  const thumbWidth = 56;
  const thumbLeft = edgeInset + ratio * (trackWidth - edgeInset * 2 - thumbWidth);
  const fillEdge = Math.min(trackWidth, thumbLeft + thumbWidth + edgeInset);
  feelingSlider.style.setProperty('--feeling-width', `${trackWidth}px`);
  feelingSlider.style.setProperty('--feeling-fill', `${fillEdge}px`);

  const states = [
    ['Очень дискомфортно', colorHex.red],
    ['Дискомфортно', colorHex.orange],
    ['Нормально', colorHex.yellow],
    ['Идеально!', colorHex.green]
  ];
  feelingLabel.textContent = states[value][0];
  feelingLabel.style.color = states[value][1];
}

feelingRange.addEventListener('input', updateFeeling);
feelingRange.addEventListener('change', updateFeeling);
let feelingPointerId = null;
function updateFeelingFromPointer(event) {
  const rect = feelingSlider.getBoundingClientRect();
  const thumbRadius = 28;
  const usableWidth = Math.max(1, rect.width - thumbRadius * 2);
  const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left - thumbRadius) / usableWidth));
  const nextValue = String(Math.round(ratio * 3));
  if (feelingRange.value === nextValue) return;
  feelingRange.value = nextValue;
  updateFeeling();
  feelingRange.dispatchEvent(new Event('change', { bubbles: true }));
}
feelingSlider.addEventListener('pointerdown', event => {
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  feelingPointerId = event.pointerId;
  feelingSlider.classList.add('dragging');
  feelingSlider.setPointerCapture(event.pointerId);
  updateFeelingFromPointer(event);
  event.preventDefault();
});
feelingSlider.addEventListener('pointermove', event => {
  if (event.pointerId !== feelingPointerId) return;
  updateFeelingFromPointer(event);
  event.preventDefault();
});
function finishFeelingPointer(event) {
  if (event.pointerId !== feelingPointerId) return;
  if (feelingSlider.hasPointerCapture(event.pointerId)) feelingSlider.releasePointerCapture(event.pointerId);
  feelingPointerId = null;
  feelingSlider.classList.remove('dragging');
}
feelingSlider.addEventListener('pointerup', finishFeelingPointer);
feelingSlider.addEventListener('pointercancel', finishFeelingPointer);
window.addEventListener('resize', () => {
  updateFeeling();
  updateSheetScrollMode();
  syncVisualViewport();
});
window.visualViewport?.addEventListener('resize', syncVisualViewport);
window.visualViewport?.addEventListener('scroll', syncVisualViewport);
weatherComment.addEventListener('focus', () => window.setTimeout(syncVisualViewport, 120));
weatherComment.addEventListener('blur', () => window.setTimeout(syncVisualViewport, 80));
if ('ResizeObserver' in window) new ResizeObserver(updateSheetScrollMode).observe(sheetScroll);
document.fonts?.ready.then(updateSheetScrollMode);
feedbackForm.addEventListener('submit', event => {
  event.preventDefault();
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  document.body.classList.remove('keyboard-open');
  setReaction('dislike');
  feedbackSheet.classList.add('submitted');
  window.setTimeout(syncVisualViewport, 80);
});
feedbackDone.addEventListener('click', closeFeedback);

overlay.addEventListener('click', () => {
  if (feedbackSheet.classList.contains('open')) closeFeedback();
  else closeSheet();
});
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  if (feedbackSheet.classList.contains('open')) closeFeedback();
  else closeSheet();
});

['gesturestart', 'gesturechange', 'gestureend'].forEach(eventName => {
  document.addEventListener(eventName, event => event.preventDefault(), { passive: false });
});
document.addEventListener('dblclick', event => event.preventDefault(), { passive: false });

function clearPanelDrag(panel) {
  panel.classList.remove('dragging');
  panel.style.removeProperty('transition');
  panel.style.removeProperty('transform');
  overlay.style.removeProperty('opacity');
}

function attachDismissGesture(panel, closePanel) {
  const handle = panel.querySelector('.grabber');
  let active = false;
  let startY = 0;
  let distance = 0;
  let startedAt = 0;
  let settleTimer = 0;

  handle.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    clearTimeout(settleTimer);
    active = true;
    startY = event.clientY;
    distance = 0;
    startedAt = performance.now();
    panel.classList.add('dragging');
    handle.setPointerCapture(event.pointerId);
  });

  handle.addEventListener('pointermove', event => {
    if (!active) return;
    distance = Math.max(0, event.clientY - startY);
    panel.style.transform = `translate(-50%, ${distance}px)`;
    overlay.style.opacity = String(Math.max(.38, 1 - distance / 360));
    event.preventDefault();
  });

  const finish = event => {
    if (!active) return;
    active = false;
    if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
    const duration = Math.max(1, performance.now() - startedAt);
    const dismiss = distance > 64 || (distance > 28 && distance / duration > .42);
    panel.classList.remove('dragging');
    overlay.style.removeProperty('opacity');
    panel.style.transition = 'transform .2s cubic-bezier(.2,.8,.2,1)';

    if (dismiss) {
      panel.style.transform = 'translate(-50%, 110%)';
      settleTimer = window.setTimeout(() => {
        clearPanelDrag(panel);
        closePanel();
      }, 190);
      return;
    }

    panel.style.transform = 'translate(-50%, 0)';
    settleTimer = window.setTimeout(() => clearPanelDrag(panel), 210);
  };

  handle.addEventListener('pointerup', finish);
  handle.addEventListener('pointercancel', finish);
}

attachDismissGesture(sheet, closeSheet);
attachDismissGesture(feedbackSheet, closeFeedback);

let dimFrame = 0;
function updateBackgroundDim() {
  cancelAnimationFrame(dimFrame);
  dimFrame = requestAnimationFrame(() => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
    const dim = Math.min(Math.max(scrollTop - 64, 0) / 720 * .24, .24);
    app.style.setProperty('--bg-dim', dim.toFixed(3));
  });
}
window.addEventListener('scroll', updateBackgroundDim, { passive: true });

renderCondition();
updateFeeling();
updateBackgroundDim();
