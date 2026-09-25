const app = document.querySelector('#app');
const sheet = document.querySelector('.sheet');
const sheetScroll = document.querySelector('.sheet-scroll');
const overlay = document.querySelector('.overlay');
const sheetUnderlay = document.querySelector('.sheet-underlay');
const breakdown = document.querySelector('#breakdown');
const breakdownRows = document.querySelector('.breakdown-rows');
const breakdownToggle = document.querySelector('#breakdown-toggle');
const scoreGauge = document.querySelector('#score-gauge');
const scoreProgress = document.querySelector('.score-progress');
const scoreValue = document.querySelector('#score-value');
const plotScroll = document.querySelector('#plot-scroll');
const chartCard = document.querySelector('.chart-card');
const chartTooltip = document.querySelector('#chart-tooltip');
const bars = document.querySelector('#bars');
const times = document.querySelector('#times');
const feedbackSheet = document.querySelector('.feedback-sheet');
const feedbackDimmer = document.querySelector('.feedback-dimmer');
const feelingRange = document.querySelector('#feeling-range');
const feelingSlider = document.querySelector('#feeling-slider');
const feelingLabel = document.querySelector('#feeling-label');
const hourlyTrack = document.querySelector('#main-hourly-track');
const ratingControl = document.querySelector('.rating-control');
const summary = document.querySelector('.summary');
const legend = document.querySelector('.legend');
const forecastList = document.querySelector('#forecast-list');
const ratingNote = document.querySelector('.rating-note');
const feedbackForm = document.querySelector('.feedback-form');
const feedbackDone = document.querySelector('.feedback-done');
const weatherComment = document.querySelector('#weather-comment');

const CURRENT_HOUR = 10;
let condition = 'good';
let selectedDay = 0;
let selectedHour = null;
let lockedScrollY = 0;
let tooltipPositionFrame = 0;
let forecastPointer = null;
let forecastHideTimer = 0;
const panelOpenFrames = new WeakMap();
const underlayHideTimers = new WeakMap();

function lockPageScroll() {
  if (document.body.classList.contains('is-scroll-locked')) return;
  lockedScrollY = window.scrollY;
  document.documentElement.classList.add('is-scroll-locked');
  document.body.classList.add('is-scroll-locked');
}

function unlockPageScroll() {
  if (!document.body.classList.contains('is-scroll-locked')) return;
  document.documentElement.classList.remove('is-scroll-locked');
  document.body.classList.remove('is-scroll-locked');
  if (Math.abs(window.scrollY - lockedScrollY) > 1) window.scrollTo(0, lockedScrollY);
}

function cancelPanelOpen(panel) {
  const frame = panelOpenFrames.get(panel);
  if (frame) cancelAnimationFrame(frame);
  panelOpenFrames.delete(panel);
}

function panelUnderlay(panel) {
  return panel === sheet ? sheetUnderlay : null;
}

function panelTransform(panel, offset) {
  return panel === feedbackSheet
    ? `translateY(${offset})`
    : `translate(-50%, ${offset})`;
}

function syncPanelUnderlay(panel) {
  const underlay = panelUnderlay(panel);
  if (!underlay) return;
  const pageScrollY = document.body.classList.contains('is-scroll-locked')
    ? lockedScrollY
    : window.scrollY;
  const layoutHeight = window.innerHeight;
  const visibleHeight = Math.max(0, panel.offsetHeight - layoutHeight);
  const restingTop = Math.max(0, layoutHeight - visibleHeight);
  const underlayInset = 56;
  const documentTop = pageScrollY + Math.max(0, restingTop) + underlayInset;
  const viewport = window.visualViewport;
  const visualBottom = pageScrollY + (viewport ? viewport.offsetTop + viewport.height : layoutHeight);
  const layoutBottom = pageScrollY + layoutHeight;
  const coveredBottom = Math.max(layoutBottom, visualBottom) + 480;

  underlay.style.setProperty('--underlay-top', `${documentTop}px`);
  underlay.style.setProperty('--underlay-height', `${Math.max(visibleHeight + 480, coveredBottom - documentTop)}px`);
  underlay.style.setProperty('--underlay-closed-offset', `${visibleHeight + 64}px`);
}

function syncOpenUnderlays() {
  if (sheet.classList.contains('open')) syncPanelUnderlay(sheet);
}

function closePanelUnderlay(panel) {
  const underlay = panelUnderlay(panel);
  if (!underlay) return;
  const pendingHide = underlayHideTimers.get(underlay);
  if (pendingHide) clearTimeout(pendingHide);
  underlay.classList.remove('open');
  underlay.style.removeProperty('transition');
  underlay.style.removeProperty('transform');
  const hideTimer = window.setTimeout(() => {
    if (!underlay.classList.contains('open')) underlay.hidden = true;
    underlayHideTimers.delete(underlay);
  }, 440);
  underlayHideTimers.set(underlay, hideTimer);
}

function openPanelFromBottom(panel) {
  const underlay = panelUnderlay(panel);
  if (underlay) {
    const pendingHide = underlayHideTimers.get(underlay);
    if (pendingHide) clearTimeout(pendingHide);
    underlayHideTimers.delete(underlay);
    underlay.hidden = false;
  }
  cancelPanelOpen(panel);
  clearPanelDrag(panel);
  if (underlay) {
    syncPanelUnderlay(panel);
    underlay.classList.remove('open');
    underlay.style.transition = 'none';
    void underlay.offsetHeight;
    underlay.style.removeProperty('transition');
  }
  panel.classList.remove('open');
  panel.style.transition = 'none';
  void panel.offsetHeight;
  panel.style.removeProperty('transition');
  const frame = requestAnimationFrame(() => {
    panel.classList.add('open');
    if (underlay) underlay.classList.add('open');
    panelOpenFrames.delete(panel);
  });
  panelOpenFrames.set(panel, frame);
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
      { tone: '', items: [[10, 'sun', 24]] },
      { tone: 'rain', items: [[11, 'rain', 24], [12, null, 24], [13, null, 24], [14, null, 23], [15, 'rain2', 22], [16, null, 21]] },
      { tone: '', items: [[17, 'cloud', 20], [18, null, 19]] },
      { tone: '', items: [['18:42', 'sunset', 'закат']] },
      { tone: '', items: [[19, 'evening', 18], [20, null, 17], [21, null, 16], [22, null, 16], [23, null, 15]] }
    ]
  },
  bad: {
    title: 'На улице неприятно из‑за\u00a0дождя и ветра',
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
      { tone: 'rain', items: [[10, 'rain', 17], [11, null, 17], [12, null, 16], [13, 'rain2', 16], [14, null, 15], [15, null, 15], [16, 'rain', 14], [17, null, 14]] },
      { tone: '', items: [[18, 'cloud', 14], [19, null, 15]] },
      { tone: '', items: [['18:42', 'sunset', 'закат']] },
      { tone: '', items: [[20, 'evening', 14], [21, null, 13], [22, null, 12], [23, null, 12]] }
    ]
  }
};

const todayGood = [86, 84, 82, 83, 85, 87, 89, 91, 93, 95, 96, 76, 70, 67, 52, 24, 16, 48, 57, 62, 68, 74, 91, 90];
const todayBad = [63, 60, 58, 55, 52, 48, 46, 44, 45, 47, 48, 42, 34, 28, 23, 36, 58, 71, 82, 86, 84, 82, 72, 68];
const fullDays = [
  [82, 86, 88, 91, 93, 94, 92, 88, 82, 76, 70, 64, 58, 52, 47, 42, 48, 56, 65, 72, 78, 83, 86, 84],
  [64, 62, 60, 58, 56, 59, 64, 70, 75, 79, 83, 86, 88, 84, 80, 76, 72, 68, 66, 69, 73, 77, 74, 70],
  [78, 80, 82, 84, 86, 85, 82, 78, 72, 66, 58, 49, 42, 36, 31, 28, 34, 43, 55, 64, 71, 76, 80, 82],
  [58, 55, 52, 50, 54, 60, 68, 75, 81, 85, 87, 84, 80, 77, 73, 69, 65, 62, 64, 68, 72, 70, 66, 62]
];

const forecastValues = {
  good: [
    todayGood,
    [92, 91, 90, 88, 86, 84, 82, 82, 80, 76, 72, 70, 70, 70, 74, 78, 82, 85, 90, 92, 93, 91, 88, 86],
    [94, 95, 94, 93, 92, 90, 88, 87, 86, 86, 86, 87, 90, 92, 94, 95, 94, 93, 92, 91, 90, 87, 86, 85],
    [88, 86, 84, 70, 66, 62, 56, 48, 40, 34, 30, 28, 26, 30, 38, 46, 54, 60, 64, 68, 76, 82, 84, 83],
    [90, 90, 89, 88, 88, 86, 84, 80, 76, 70, 66, 60, 56, 52, 50, 52, 58, 64, 70, 74, 78, 86, 88, 89]
  ],
  bad: [
    todayBad,
    [62, 60, 58, 56, 54, 52, 50, 48, 44, 40, 36, 34, 32, 34, 38, 44, 52, 60, 68, 74, 78, 76, 70, 66],
    [76, 78, 80, 82, 84, 86, 84, 82, 80, 78, 76, 74, 76, 80, 84, 86, 88, 86, 84, 82, 80, 78, 76, 74],
    [44, 42, 40, 36, 32, 28, 24, 22, 20, 18, 18, 20, 24, 28, 34, 40, 46, 52, 58, 64, 70, 74, 72, 68],
    [68, 70, 72, 74, 72, 68, 64, 58, 52, 48, 42, 38, 34, 36, 42, 48, 54, 62, 68, 74, 80, 82, 78, 74]
  ]
};

const forecastDays = [
  {
    title: 'Сегодня',
    good: 'Комфортно до 11:00 и снова с 22:00 — для поздней прогулки',
    bad: 'Дождливый день — комфортное окно с 18:00 до 22:00'
  },
  {
    title: 'Завтра',
    good: 'Комфортно до 9:00 и снова после 16:00',
    bad: 'Для прогулки лучше выбрать время после 18:00'
  },
  {
    title: '14 августа, ср',
    good: 'Почти лучший день в году — можно гулять без плана',
    bad: 'Самый приятный день недели — комфортно почти весь день'
  },
  {
    title: '15 августа, чт',
    good: 'Для прогулки лучше выбрать время после 21:00',
    bad: 'День для уютных планов — спокойнее станет после 18:00'
  },
  {
    title: '16 августа, пт',
    good: 'Комфортно до 8:00 и снова после 21:00',
    bad: 'Для прогулки лучше выбрать время до 9:00 или после 18:00'
  }
];

const chartCopy = [
  () => condition === 'good'
    ? 'Комфортно до 11:00, после этого условия ухудшатся из-за грозы до 21:00'
    : 'Комфортное окно для выхода на улицу с 18:00 до 22:00',
  () => 'Комфортно ранним утром до 10:00 и вечером с 21:00',
  () => 'Комфортное окно для прогулки с 10:00 до 15:00',
  () => 'Комфортно с 1:00 до 7:00 и поздним вечером с 22:00',
  () => 'Лучшее время для выхода на улицу — с 8:00 до 13:00'
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

function chartPointsForDay(day) {
  const values = valuesForDay(day);
  const firstHour = day === 0 ? CURRENT_HOUR : 0;
  const step = day >= 2 ? 3 : 1;
  const points = [];
  for (let hour = firstHour; hour < 24; hour += step) {
    points.push({ hour, value: values[hour] });
  }
  return points;
}

function tooltipDetails(day, hour, value) {
  if (day === 0 && condition === 'good' && hour === 14) {
    return [
      ['14°', 'tooltip-status-orange.svg'],
      ['19 м/с', 'tooltip-status-orange.svg'],
      ['сухо', 'status-green.svg'],
      ['0, низкий', 'status-green.svg'],
      ['ветер', 'status-yellow.svg']
    ];
  }

  if (day === 0 && hour === CURRENT_HOUR) {
    return conditions[condition].details.map(([detailValue, icon]) => [
      detailValue === 'отсутствуют' ? 'сухо' : detailValue,
      icon === 'status-orange.svg' ? 'tooltip-status-orange.svg' : icon
    ]);
  }

  const daylight = hour >= 8 && hour <= 18;
  const feels = Math.round(7 + value * .12 + (daylight ? 3 : 0) + Math.sin((hour - 6) / 24 * Math.PI * 2) * 4);
  const wind = Math.min(19, Math.max(3, Math.round(3 + Math.max(0, 70 - value) * .35)));
  const rainNow = day === 0
    ? condition === 'bad' ? hour < 18 : hour >= 11 && hour <= 16 && hour !== 14
    : value < 38;
  const thunder = day === 0 && condition === 'good' && hour >= 11 && hour <= 13;
  const uvValue = daylight ? Math.max(0, Math.round(9 - Math.abs(13 - hour) * .8)) : 0;
  const danger = thunder ? 'гроза' : wind >= 12 ? 'ветер' : 'нет';
  const feelIcon = value >= 80 ? 'status-green.svg' : value >= 50 ? 'status-yellow.svg' : 'tooltip-status-orange.svg';
  const windIcon = wind >= 12 ? 'tooltip-status-orange.svg' : wind >= 7 ? 'status-yellow.svg' : 'status-green.svg';
  const uvIcon = uvValue <= 2 ? 'status-green.svg' : uvValue <= 5 ? 'status-yellow.svg' : 'tooltip-status-orange.svg';

  return [
    [`${feels}°`, feelIcon],
    [`${wind} м/с`, windIcon],
    [rainNow ? 'дождь' : 'сухо', rainNow ? 'tooltip-status-orange.svg' : 'status-green.svg'],
    [`${uvValue}, ${uvValue <= 2 ? 'низкий' : uvValue <= 5 ? 'средний' : 'высокий'}`, uvIcon],
    [danger, danger === 'нет' ? 'status-green.svg' : 'status-yellow.svg']
  ];
}

function hideChartTooltip(immediate = false) {
  cancelAnimationFrame(tooltipPositionFrame);
  selectedHour = null;
  chartCard.classList.remove('has-selection');
  chartTooltip.classList.remove('is-visible', 'is-edge-hidden');
  chartTooltip.setAttribute('aria-hidden', 'true');
  bars.querySelectorAll('.bar').forEach(bar => {
    bar.classList.remove('selected');
    bar.removeAttribute('aria-describedby');
  });
  times.querySelectorAll('span').forEach(time => time.classList.remove('selected'));
  if (immediate) chartTooltip.style.setProperty('transition', 'none');
  if (immediate) requestAnimationFrame(() => chartTooltip.style.removeProperty('transition'));
}

function positionChartTooltip() {
  cancelAnimationFrame(tooltipPositionFrame);
  tooltipPositionFrame = requestAnimationFrame(() => {
    if (selectedHour === null) return;
    const selectedBar = bars.querySelector(`.bar[data-hour="${selectedHour}"]`);
    if (!selectedBar) return;
    const cardRect = chartCard.getBoundingClientRect();
    const barRect = selectedBar.getBoundingClientRect();
    const tooltipWidth = chartTooltip.offsetWidth;
    const tooltipHeight = chartTooltip.offsetHeight;
    const anchorX = barRect.left + barRect.width / 2 - cardRect.left;
    const minLeft = 8;
    const maxLeft = Math.max(minLeft, cardRect.width - tooltipWidth - 8);
    const left = Math.min(maxLeft, Math.max(minLeft, anchorX - tooltipWidth / 2 - 8));
    const tailX = Math.min(tooltipWidth - 24, Math.max(24, anchorX - left));
    const top = barRect.top - cardRect.top - tooltipHeight - 16;
    const scrollRect = plotScroll.getBoundingClientRect();
    const barCenter = barRect.left + barRect.width / 2;
    const tailNearCorner = tailX <= 25 || tailX >= tooltipWidth - 25;
    const barNearViewportEdge = barCenter <= scrollRect.left + 14 || barCenter >= scrollRect.right - 14;
    chartTooltip.style.setProperty('--tooltip-x', `${left}px`);
    chartTooltip.style.setProperty('--tooltip-y', `${top}px`);
    chartTooltip.style.setProperty('--tail-x', `${tailX}px`);
    chartTooltip.classList.toggle('is-edge-hidden', tailNearCorner || barNearViewportEdge);
  });
}

function showChartTooltip(hour) {
  if (selectedHour === hour && chartTooltip.classList.contains('is-visible')) {
    hideChartTooltip();
    return;
  }

  selectedHour = hour;
  chartTooltip.classList.remove('is-edge-hidden');
  const value = valuesForDay(selectedDay)[hour];
  const detailIds = ['#tooltip-feels', '#tooltip-wind', '#tooltip-rain', '#tooltip-uv', '#tooltip-danger'];
  tooltipDetails(selectedDay, hour, value).forEach(([detailValue, icon], index) => {
    chartTooltip.querySelector(detailIds[index]).innerHTML = `${detailValue} <img src="assets/${icon}" alt="">`;
  });
  chartCard.classList.add('has-selection');
  bars.querySelectorAll('.bar').forEach(bar => {
    const selected = Number(bar.dataset.hour) === hour;
    bar.classList.toggle('selected', selected);
    if (selected) bar.setAttribute('aria-describedby', 'chart-tooltip');
    else bar.removeAttribute('aria-describedby');
  });
  times.querySelectorAll('span').forEach(time => time.classList.toggle('selected', Number(time.dataset.hour) === hour));
  chartTooltip.setAttribute('aria-hidden', 'false');
  positionChartTooltip();
  requestAnimationFrame(() => chartTooltip.classList.add('is-visible'));
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

function forecastLegendMarkup() {
  return `
    <div class="forecast-legend" aria-label="Легенда индекса">
      <span><i style="--legend-color:${colorHex.green}"></i>80–100, комфортно</span>
      <span><i style="--legend-color:${colorHex.yellow}"></i>50–79, нормально</span>
      <span><i style="--legend-color:${colorHex.orange}"></i>30–49, неприятно</span>
      <span><i style="--legend-color:${colorHex.red}"></i>0–29, лучше дома</span>
    </div>`;
}

function renderForecastList() {
  const days = forecastValues[condition];
  forecastList.innerHTML = forecastDays.map((day, dayIndex) => {
    const values = days[dayIndex];
    const barsMarkup = values.map((value, hour) => `
      <i class="forecast-bar" data-hour="${hour}" data-value="${value}"
        style="height:${Math.max(28, Math.min(96, Math.round(value)))}px;--bar-color:${colorHex[color(value)]}"></i>
    `).join('');
    const labels = [0, 6, 12, 18, 23].map(hour =>
      `<span data-hour="${hour}">${hour}</span>`
    ).join('');

    return `
      <article class="forecast-day" data-day="${dayIndex}">
        <header class="forecast-day-header">
          <h2>${day.title}</h2>
          <p>${day[condition]}</p>
        </header>
        <div class="forecast-chart" aria-label="${day.title}: интерактивный почасовой график комфортности">
          <div class="forecast-bars">${barsMarkup}</div>
          <div class="forecast-times" aria-hidden="true">${labels}</div>
        </div>
        ${dayIndex === 0 ? forecastLegendMarkup() : ''}
        <div class="forecast-tooltip-layer" aria-hidden="true">
          <div class="forecast-tooltip" role="tooltip" aria-hidden="true">
            <div class="forecast-tooltip-head">
              <span class="forecast-tooltip-hour">11:00</span>
              <span class="forecast-tooltip-score"><b>64</b><small>/100</small><i></i></span>
            </div>
            <div class="forecast-tooltip-chips"></div>
          </div>
          <svg class="forecast-tooltip-connector" viewBox="0 0 353 120" preserveAspectRatio="none" aria-hidden="true"><path></path></svg>
        </div>
      </article>`;
  }).join('');
  requestAnimationFrame(positionForecastTimeLabels);
}

function positionForecastTimeLabels() {
  forecastList.querySelectorAll('.forecast-day').forEach(card => {
    const timeline = card.querySelector('.forecast-times');
    const timelineRect = timeline.getBoundingClientRect();
    const bars = card.querySelectorAll('.forecast-bar');
    timeline.querySelectorAll('span').forEach(label => {
      const bar = bars[Number(label.dataset.hour)];
      label.style.left = `${bar.getBoundingClientRect().left - timelineRect.left}px`;
    });
  });
}

function forecastChip(icon, text, tone, extraClass = '') {
  return `<span class="forecast-chip ${tone} ${extraClass}"><i class="forecast-chip-icon" style="--chip-icon:url('assets/${icon}')"></i>${text}</span>`;
}

function forecastTooltipData(day, hour, value) {
  const details = tooltipDetails(day, hour, value);
  const feels = details[0][0];
  const wind = details[1][0];
  const rain = details[2][0];
  const uv = details[3][0].split(',')[0];
  const danger = details[4][0];
  const windSpeed = Number.parseInt(wind, 10) || 0;
  const uvValue = Number.parseInt(uv, 10) || 0;
  const temperatureTone = value >= 70 ? 'green' : value >= 45 ? 'yellow' : 'red';
  const windTone = windSpeed <= 3 ? 'green' : windSpeed <= 8 ? 'yellow' : 'orange';
  const rainTone = rain === 'сухо' ? 'green' : 'red';
  const dangerText = danger === 'нет' ? 'безопасно' : danger;
  const dangerTone = danger === 'нет' ? 'green' : 'orange';

  const chips = [
    forecastChip('new-tooltip-temperature.svg', feels, temperatureTone),
    forecastChip('new-tooltip-wind.svg', wind, windTone),
    forecastChip(rain === 'сухо' ? 'new-tooltip-dry.svg' : 'new-tooltip-rain.svg', rain, rainTone),
    forecastChip('new-tooltip-uv.svg', `УФ ${uvValue}`, uvValue <= 2 ? 'green' : uvValue <= 5 ? 'yellow' : 'red'),
    forecastChip(danger === 'нет' ? 'new-tooltip-like.svg' : 'new-tooltip-warning.svg', dangerText, dangerTone, danger === 'нет' ? 'safe' : 'warning')
  ];
  return `<span class="forecast-tooltip-chip-row">${[chips[0], chips[1], chips[3]].join('')}</span><span class="forecast-tooltip-chip-row">${[chips[2], chips[4]].join('')}</span>`;
}

function forecastBarAt(chart, clientX) {
  const allBars = [...chart.querySelectorAll('.forecast-bar')];
  let best = allBars[0];
  let bestDistance = Infinity;
  allBars.forEach(bar => {
    const rect = bar.getBoundingClientRect();
    const distance = Math.abs(clientX - (rect.left + rect.width / 2));
    if (distance < bestDistance) {
      best = bar;
      bestDistance = distance;
    }
  });
  return best;
}

function forecastTooltipSquircle(width, height, leftRadius, rightRadius) {
  const points = [];
  const topRadius = 48;
  const steps = 10;
  const add = (x, y) => points.push(`${x.toFixed(3)}px ${y.toFixed(3)}px`);
  const addCorner = (cx, cy, radius, startAngle, endAngle) => {
    for (let step = 1; step <= steps; step += 1) {
      const angle = startAngle + (endAngle - startAngle) * step / steps;
      const cosine = Math.cos(angle);
      const sine = Math.sin(angle);
      const x = cx + Math.sign(cosine) * Math.sqrt(Math.abs(cosine)) * radius;
      const y = cy + Math.sign(sine) * Math.sqrt(Math.abs(sine)) * radius;
      add(x, y);
    }
  };

  add(topRadius, 0);
  add(width - topRadius, 0);
  addCorner(width - topRadius, topRadius, topRadius, -Math.PI / 2, 0);
  add(width, height - rightRadius);
  addCorner(width - rightRadius, height - rightRadius, rightRadius, 0, Math.PI / 2);
  add(leftRadius, height);
  addCorner(leftRadius, height - leftRadius, leftRadius, Math.PI / 2, Math.PI);
  add(0, topRadius);
  addCorner(topRadius, topRadius, topRadius, Math.PI, Math.PI * 1.5);
  return `polygon(${points.join(',')})`;
}

function positionForecastTooltip(card, bar) {
  const tooltip = card.querySelector('.forecast-tooltip');
  const connector = card.querySelector('.forecast-tooltip-connector');
  const chartBars = card.querySelector('.forecast-bars');
  const cardRect = card.getBoundingClientRect();
  const barRect = bar.getBoundingClientRect();
  const barsRect = chartBars.getBoundingClientRect();
  const tooltipWidth = tooltip.offsetWidth;
  // The Figma connector runs along the selected bar's left edge so it does not
  // visually cut through the bar itself. Pixel snapping keeps the 2px stem solid.
  const anchorX = Math.round(barRect.left - cardRect.left);
  const left = Math.min(cardRect.width - tooltipWidth, Math.max(0, anchorX - tooltipWidth / 2));
  const cornerRadius = 48;
  const connectorHalfWidth = 29;
  const anchorInsideTooltip = anchorX - left;
  const leftRadius = Math.min(cornerRadius, Math.max(8, anchorInsideTooltip - connectorHalfWidth));
  const rightRadius = Math.min(cornerRadius, Math.max(8, tooltipWidth - anchorInsideTooltip - connectorHalfWidth));
  const top = barsRect.bottom - cardRect.top - 276;
  tooltip.style.setProperty('--tooltip-left', `${Math.round(left)}px`);
  tooltip.style.setProperty('--tooltip-top', `${Math.round(top)}px`);
  tooltip.style.setProperty('--tooltip-br-left', `${Math.round(leftRadius)}px`);
  tooltip.style.setProperty('--tooltip-br-right', `${Math.round(rightRadius)}px`);
  const squircle = forecastTooltipSquircle(tooltipWidth, tooltip.offsetHeight, leftRadius, rightRadius);
  tooltip.style.clipPath = squircle;
  tooltip.style.webkitClipPath = squircle;
  const leftShoulder = Math.max(left + leftRadius, anchorX - connectorHalfWidth);
  const rightShoulder = Math.min(left + tooltipWidth - rightRadius, anchorX + connectorHalfWidth);
  const path = [
    `M ${leftShoulder} 0`,
    `H ${rightShoulder}`,
    `C ${anchorX + 10} 3 ${anchorX + 1} 12 ${anchorX + 1} 28`,
    `V 120`,
    `H ${anchorX - 1}`,
    `V 28`,
    `C ${anchorX - 1} 12 ${anchorX - 10} 3 ${leftShoulder} 0 Z`
  ].join(' ');
  connector.setAttribute('viewBox', `0 0 ${cardRect.width} 120`);
  connector.querySelector('path').setAttribute('d', path);
  connector.style.setProperty('--connector-top', `${Math.round(top + 155)}px`);
}

function showForecastTooltip(chart, clientX) {
  window.clearTimeout(forecastHideTimer);
  const card = chart.closest('.forecast-day');
  const bar = forecastBarAt(chart, clientX);
  if (!card || !bar) return;
  const day = Number(card.dataset.day);
  const hour = Number(bar.dataset.hour);
  const value = Number(bar.dataset.value);
  const tooltip = card.querySelector('.forecast-tooltip');
  const alreadySelected = Number(card.dataset.selectedHour) === hour;

  forecastList.querySelectorAll('.forecast-day.is-interacting').forEach(other => {
    if (other !== card) hideForecastTooltip(other);
  });

  card.dataset.selectedHour = String(hour);
  card.classList.add('is-interacting');
  card.querySelectorAll('.forecast-bar').forEach(candidate => {
    const distance = Math.abs(Number(candidate.dataset.hour) - hour);
    const opacity = distance === 0 ? 1 : distance === 1 ? .52 : distance === 2 ? .32 : .18;
    candidate.style.setProperty('--focus-opacity', opacity);
    candidate.classList.toggle('is-current', distance === 0);
  });

  if (!alreadySelected) {
    tooltip.querySelector('.forecast-tooltip-hour').textContent = `${hour}:00`;
    tooltip.querySelector('.forecast-tooltip-score b').textContent = value;
    tooltip.querySelector('.forecast-tooltip-score').style.setProperty('--tooltip-dot', colorHex[color(value)]);
    tooltip.querySelector('.forecast-tooltip-chips').innerHTML = forecastTooltipData(day, hour, value);
  }
  tooltip.setAttribute('aria-hidden', 'false');
  const layer = card.querySelector('.forecast-tooltip-layer');
  layer.setAttribute('aria-hidden', 'false');
  positionForecastTooltip(card, bar);
  requestAnimationFrame(() => layer.classList.add('is-visible'));
}

function hideForecastTooltip(card = null) {
  const cards = card ? [card] : [...forecastList.querySelectorAll('.forecast-day')];
  cards.forEach(dayCard => {
    dayCard.classList.remove('is-interacting');
    delete dayCard.dataset.selectedHour;
    dayCard.querySelectorAll('.forecast-bar').forEach(bar => {
      bar.style.removeProperty('--focus-opacity');
      bar.classList.remove('is-current');
    });
    const tooltip = dayCard.querySelector('.forecast-tooltip');
    tooltip?.setAttribute('aria-hidden', 'true');
    const layer = dayCard.querySelector('.forecast-tooltip-layer');
    layer?.classList.remove('is-visible');
    layer?.setAttribute('aria-hidden', 'true');
  });
}

function setForecastListView(active) {
  hideForecastTooltip();
  forecastPointer = null;
  setBreakdownExpanded(false);
  sheet.classList.toggle('forecast-list-view', active);
  scoreGauge.setAttribute('aria-pressed', String(active));
  forecastList.setAttribute('aria-hidden', String(!active));
  sheetScroll.scrollTo({ top: 0, behavior: 'auto' });
  if (!active) updateCompactSheetHeight();
  requestAnimationFrame(() => {
    updateSheetScrollMode();
    syncPanelUnderlay(sheet);
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
  hideChartTooltip(true);
  const points = chartPointsForDay(selectedDay);

  document.querySelector('#chart-copy').textContent = chartCopy[selectedDay]();
  plotScroll.setAttribute('aria-label', selectedDay >= 2 ? 'График комфортности с шагом три часа' : 'Почасовой график комфортности');
  bars.innerHTML = points.map(({ hour, value }) =>
    `<button type="button" class="bar ${color(value)}" data-hour="${hour}" aria-label="${hour}:00, индекс комфортности ${value} из 100" style="height:${Math.max(28, Math.round(value))}px">${value}</button>`
  ).join('');

  times.innerHTML = points.map(({ hour }) => {
    const current = selectedDay === 0 && hour === CURRENT_HOUR;
    const label = current || (selectedDay !== 0 && hour === 0) ? `${hour}:00` : String(hour);
    return `<span data-hour="${hour}" class="${current ? 'current' : ''}">${label}</span>`;
  }).join('');

  requestAnimationFrame(() => { plotScroll.scrollLeft = 0; });
}

function renderCondition() {
  const data = conditions[condition];
  app.dataset.condition = condition;
  document.body.dataset.condition = condition;
  document.documentElement.dataset.condition = condition;
  scoreValue.textContent = data.score;
  scoreGauge.setAttribute('aria-label', `${data.score} из 100. Переключить формат прогноза`);
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
  renderForecastList();
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
  requestAnimationFrame(() => syncPanelUnderlay(sheet));
}

let overlayHideTimer = 0;
function showOverlay(feedbackMode = false) {
  clearTimeout(overlayHideTimer);
  overlay.hidden = false;
  overlay.classList.remove('is-dismissing');
  overlay.classList.toggle('feedback-mode', feedbackMode);
  requestAnimationFrame(() => overlay.classList.add('is-visible'));
}

function hideOverlay() {
  clearTimeout(overlayHideTimer);
  overlay.classList.add('is-dismissing');
  overlay.classList.remove('is-visible');
  overlayHideTimer = window.setTimeout(() => {
    if (!sheet.classList.contains('open') && !feedbackSheet.classList.contains('open')) {
      overlay.hidden = true;
      overlay.classList.remove('is-dismissing');
    }
  }, 440);
}

function compactSheetContentHeight() {
  const scrollRect = sheetScroll.getBoundingClientRect();
  const legendRect = legend.getBoundingClientRect();
  const paddingBottom = parseFloat(getComputedStyle(sheetScroll).paddingBottom) || 0;
  return Math.ceil(legendRect.bottom - scrollRect.top + paddingBottom);
}

function updateSheetScrollMode() {
  if (sheet.classList.contains('forecast-list-view')) {
    sheetScroll.classList.add('can-scroll');
    sheet.classList.remove('surface-dismiss');
    return;
  }
  if (!sheet.classList.contains('open') || sheet.classList.contains('expanded')) {
    sheetScroll.classList.remove('can-scroll');
    sheet.classList.remove('surface-dismiss');
    return;
  }
  const canScroll = compactSheetContentHeight() - sheetScroll.clientHeight > 32;
  sheetScroll.classList.toggle('can-scroll', canScroll);
  sheet.classList.toggle('surface-dismiss', !canScroll);
}

function updateCompactSheetHeight() {
  if (sheet.classList.contains('expanded') || sheet.classList.contains('forecast-list-view')) return;
  sheet.style.setProperty('--compact-sheet-height', `${compactSheetContentHeight()}px`);
}

function openSheet() {
  setForecastListView(true);
  selectedDay = 0;
  document.querySelectorAll('.days button').forEach(button => {
    button.classList.toggle('active', Number(button.dataset.day) === 0);
  });
  renderCondition();
  setBreakdownExpanded(false);
  updateCompactSheetHeight();
  cancelPanelOpen(feedbackSheet);
  feedbackSheet.classList.remove('open');
  closePanelUnderlay(feedbackSheet);
  feedbackSheet.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('feedback-open');
  sheet.setAttribute('aria-hidden', 'false');
  showOverlay(false);
  lockPageScroll();
  openPanelFromBottom(sheet);
  sheetScroll.scrollTop = 0;
  scoreGauge.classList.remove('is-animating');
  void scoreGauge.offsetWidth;
  scoreGauge.classList.add('is-animating');
  requestAnimationFrame(updateSheetScrollMode);
}

function openFeedback() {
  suppressCommentFocusUntil = 0;
  feedbackSheet.classList.remove('submitted');
  feedbackSheet.setAttribute('aria-hidden', 'false');
  document.body.classList.add('feedback-open');
  showOverlay(true);
  lockPageScroll();
  openPanelFromBottom(feedbackSheet);
}

let suppressCommentFocusUntil = 0;
function dismissCommentKeyboard() {
  suppressCommentFocusUntil = performance.now() + 700;
  weatherComment.blur();
}

function closeFeedback() {
  dismissCommentKeyboard();
  resetFeelingDrag();
  cancelPanelOpen(feedbackSheet);
  feedbackSheet.classList.remove('open');
  closePanelUnderlay(feedbackSheet);
  feedbackSheet.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('feedback-open');
  if (sheet.classList.contains('open')) {
    syncPanelUnderlay(sheet);
    requestAnimationFrame(() => syncPanelUnderlay(sheet));
    showOverlay(false);
  }
  else {
    hideOverlay();
    unlockPageScroll();
  }
}

function closeSheet() {
  hideChartTooltip(true);
  hideForecastTooltip();
  dismissCommentKeyboard();
  resetFeelingDrag();
  cancelPanelOpen(sheet);
  cancelPanelOpen(feedbackSheet);
  setBreakdownExpanded(false);
  sheet.classList.remove('open');
  closePanelUnderlay(sheet);
  sheet.setAttribute('aria-hidden', 'true');
  feedbackSheet.classList.remove('open');
  closePanelUnderlay(feedbackSheet);
  feedbackSheet.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('feedback-open');
  overlay.classList.remove('feedback-mode');
  hideOverlay();
  unlockPageScroll();
}

document.querySelectorAll('.mascot-toggle').forEach(button => button.addEventListener('click', toggleCondition));
document.querySelectorAll('[data-open]').forEach(button => button.addEventListener('click', openSheet));
document.querySelectorAll('.days button').forEach(button => button.addEventListener('click', () => selectDay(Number(button.dataset.day))));
bars.addEventListener('click', event => {
  const bar = event.target.closest('.bar');
  if (!bar) return;
  showChartTooltip(Number(bar.dataset.hour));
});
scoreGauge.addEventListener('click', () => {
  setForecastListView(!sheet.classList.contains('forecast-list-view'));
});

forecastList.addEventListener('pointerdown', event => {
  const chart = event.target.closest('.forecast-chart');
  if (!chart || (event.pointerType === 'mouse' && event.button !== 0)) return;
  forecastPointer = {
    id: event.pointerId,
    type: event.pointerType,
    chart,
    startX: event.clientX,
    startY: event.clientY,
    dragging: event.pointerType === 'mouse'
  };
  showForecastTooltip(chart, event.clientX);
});

forecastList.addEventListener('pointermove', event => {
  const hoveredChart = event.target.closest('.forecast-chart');
  if (event.pointerType === 'mouse' && (!forecastPointer || forecastPointer.id !== event.pointerId)) {
    if (hoveredChart) showForecastTooltip(hoveredChart, event.clientX);
    return;
  }
  if (!forecastPointer || forecastPointer.id !== event.pointerId) return;
  const deltaX = event.clientX - forecastPointer.startX;
  const deltaY = event.clientY - forecastPointer.startY;
  if (!forecastPointer.dragging) {
    if (Math.abs(deltaX) < 6 && Math.abs(deltaY) < 6) return;
    if (Math.abs(deltaY) > Math.abs(deltaX)) {
      hideForecastTooltip(forecastPointer.chart.closest('.forecast-day'));
      forecastPointer = null;
      return;
    }
    forecastPointer.dragging = true;
    try { forecastPointer.chart.setPointerCapture(event.pointerId); } catch {}
  }
  showForecastTooltip(forecastPointer.chart, event.clientX);
  event.preventDefault();
}, { passive: false });

forecastList.addEventListener('pointerout', event => {
  if (event.pointerType !== 'mouse' || forecastPointer) return;
  const chart = event.target.closest('.forecast-chart');
  if (!chart || chart.contains(event.relatedTarget)) return;
  hideForecastTooltip(chart.closest('.forecast-day'));
});

const finishForecastPointer = event => {
  if (!forecastPointer || forecastPointer.id !== event.pointerId) return;
  const { chart, type } = forecastPointer;
  try {
    if (chart.hasPointerCapture(event.pointerId)) chart.releasePointerCapture(event.pointerId);
  } catch {}
  forecastPointer = null;
  if (type !== 'mouse') {
    forecastHideTimer = window.setTimeout(() => hideForecastTooltip(chart.closest('.forecast-day')), 420);
  }
};
forecastList.addEventListener('pointerup', finishForecastPointer);
forecastList.addEventListener('pointercancel', event => {
  finishForecastPointer(event);
  hideForecastTooltip();
});
plotScroll.addEventListener('scroll', positionChartTooltip, { passive: true });
sheetScroll.addEventListener('scroll', () => {
  if (sheet.classList.contains('forecast-list-view')) hideForecastTooltip();
}, { passive: true });
document.addEventListener('pointerdown', event => {
  if (selectedHour === null || event.target.closest('.bar')) return;
  hideChartTooltip();
});
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

const finishBreakdownLayoutChange = event => {
  if (event.target !== breakdown || event.propertyName !== 'height') return;
  updateCompactSheetHeight();
  updateSheetScrollMode();
  syncPanelUnderlay(sheet);
};
breakdown.addEventListener('transitionend', finishBreakdownLayoutChange);
breakdown.addEventListener('transitioncancel', finishBreakdownLayoutChange);

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

function updateFeelingAt(clientX) {
  const rect = feelingSlider.getBoundingClientRect();
  const thumbRadius = 28;
  const usableWidth = Math.max(1, rect.width - thumbRadius * 2);
  const ratio = Math.min(1, Math.max(0, (clientX - rect.left - thumbRadius) / usableWidth));
  const nextValue = String(Math.round(ratio * 3));
  if (feelingRange.value === nextValue) return;
  feelingRange.value = nextValue;
  updateFeeling();
  feelingRange.dispatchEvent(new Event('change', { bubbles: true }));
}

function resetFeelingDrag() {
  feelingPointerId = null;
  feelingSlider.classList.remove('dragging');
}

feelingSlider.addEventListener('pointerdown', event => {
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  dismissCommentKeyboard();
  feelingPointerId = event.pointerId;
  feelingSlider.classList.add('dragging');
  updateFeelingAt(event.clientX);
  event.preventDefault();
});

document.addEventListener('pointermove', event => {
  if (event.pointerId !== feelingPointerId) return;
  updateFeelingAt(event.clientX);
  event.preventDefault();
}, { passive: false });

const finishFeelingDrag = event => {
  if (event.pointerId !== feelingPointerId) return;
  resetFeelingDrag();
};
document.addEventListener('pointerup', finishFeelingDrag);
document.addEventListener('pointercancel', finishFeelingDrag);
window.addEventListener('blur', resetFeelingDrag);
document.addEventListener('visibilitychange', resetFeelingDrag);
window.addEventListener('resize', () => {
  updateFeeling();
  updateCompactSheetHeight();
  updateSheetScrollMode();
  requestAnimationFrame(positionForecastTimeLabels);
  syncOpenUnderlays();
  positionChartTooltip();
});
weatherComment.addEventListener('focus', event => {
  if (performance.now() < suppressCommentFocusUntil) event.currentTarget.blur();
});
if ('ResizeObserver' in window) {
  new ResizeObserver(updateSheetScrollMode).observe(sheetScroll);
  new ResizeObserver(() => syncPanelUnderlay(sheet)).observe(sheet);
  new ResizeObserver(() => syncPanelUnderlay(feedbackSheet)).observe(feedbackSheet);
}
window.visualViewport?.addEventListener('resize', syncOpenUnderlays);
window.visualViewport?.addEventListener('scroll', syncOpenUnderlays);
document.fonts?.ready.then(() => {
  updateCompactSheetHeight();
  updateSheetScrollMode();
});
feedbackForm.addEventListener('submit', event => {
  event.preventDefault();
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  dismissCommentKeyboard();
  setReaction('dislike');
  feedbackSheet.classList.add('submitted');
});
feedbackDone.addEventListener('click', closeFeedback);

feedbackDimmer.addEventListener('pointerdown', event => {
  event.preventDefault();
  event.stopPropagation();
}, { passive: false });
feedbackDimmer.addEventListener('pointerup', event => {
  event.preventDefault();
  event.stopPropagation();
  closeFeedback();
}, { passive: false });
feedbackDimmer.addEventListener('click', event => {
  event.preventDefault();
  event.stopPropagation();
});

overlay.addEventListener('pointerdown', event => {
  event.preventDefault();
  event.stopPropagation();
}, { passive: false });
overlay.addEventListener('pointerup', event => {
  event.preventDefault();
  event.stopPropagation();
  if (feedbackSheet.classList.contains('open')) closeFeedback();
  else closeSheet();
}, { passive: false });
overlay.addEventListener('click', event => {
  event.preventDefault();
  event.stopPropagation();
});
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  if (selectedHour !== null) {
    hideChartTooltip();
    return;
  }
  if (feedbackSheet.classList.contains('open')) closeFeedback();
  else closeSheet();
});

['gesturestart', 'gesturechange', 'gestureend'].forEach(eventName => {
  document.addEventListener(eventName, event => event.preventDefault(), { passive: false });
});
document.addEventListener('dblclick', event => event.preventDefault(), { passive: false });

function clearPanelDrag(panel) {
  const underlay = panelUnderlay(panel);
  panel.classList.remove('dragging');
  panel.style.removeProperty('transition');
  panel.style.removeProperty('transform');
  if (underlay) {
    underlay.style.removeProperty('transition');
    underlay.style.removeProperty('transform');
  }
  overlay.style.removeProperty('opacity');
}

function attachDismissGesture(panel, closePanel) {
  const underlay = panelUnderlay(panel);
  let active = false;
  let pointerId = null;
  let candidate = null;
  let startY = 0;
  let startOffset = 0;
  let distance = 0;
  let startedAt = 0;
  let settleTimer = 0;
  let suppressClickUntil = 0;

  const start = clientY => {
    dismissCommentKeyboard();
    clearTimeout(settleTimer);
    const panelRect = panel.getBoundingClientRect();
    const openTop = window.innerHeight * 2 - panelRect.height;
    startOffset = Math.max(0, panelRect.top - openTop);
    panel.style.transform = panelTransform(panel, `${startOffset}px`);
    void panel.offsetWidth;
    active = true;
    startY = clientY;
    distance = 0;
    startedAt = performance.now();
    panel.classList.add('dragging');
  };

  const moveTo = clientY => {
    if (!active) return;
    distance = Math.max(0, clientY - startY);
    panel.style.transform = panelTransform(panel, `${startOffset + distance}px`);
    if (underlay) {
      underlay.style.transition = 'none';
      underlay.style.transform = `translate(-50%, ${startOffset + distance}px)`;
    }
    overlay.style.opacity = String(Math.max(.38, 1 - distance / 360));
  };

  const finish = () => {
    if (!active) return;
    active = false;
    const duration = Math.max(1, performance.now() - startedAt);
    const dismiss = distance > 64 || (distance > 28 && distance / duration > .42);
    panel.classList.remove('dragging');
    overlay.style.removeProperty('opacity');
    panel.style.transition = 'transform .2s cubic-bezier(.2,.8,.2,1)';
    if (underlay) underlay.style.transition = 'transform .2s cubic-bezier(.2,.8,.2,1)';

    if (dismiss) {
      panel.style.transform = panelTransform(panel, '110%');
      if (underlay) underlay.style.transform = 'translate(-50%, 110%)';
      settleTimer = window.setTimeout(() => {
        clearPanelDrag(panel);
        closePanel();
      }, 190);
      return;
    }

    panel.style.transform = panelTransform(panel, '0');
    if (underlay) underlay.style.transform = 'translate(-50%, 0)';
    settleTimer = window.setTimeout(() => clearPanelDrag(panel), 210);
  };

  const surfaceGestureAllowed = target => {
    if (target.closest('.feeling-slider, textarea')) return false;
    if (panel === sheet) {
      return sheet.classList.contains('surface-dismiss') && !sheet.classList.contains('expanded');
    }
    return true;
  };

  panel.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (panel === sheet && feedbackSheet.classList.contains('open')) return;
    const directHandle = Boolean(event.target.closest('.grabber'));
    if (!directHandle && !surfaceGestureAllowed(event.target)) return;

    pointerId = event.pointerId;
    candidate = directHandle ? null : { x: event.clientX, y: event.clientY };

    if (directHandle) {
      start(event.clientY);
      try { panel.setPointerCapture(event.pointerId); } catch {}
      event.preventDefault();
    }
  }, { passive: false });

  panel.addEventListener('pointermove', event => {
    if (event.pointerId !== pointerId) return;

    if (!active && candidate) {
      const deltaX = event.clientX - candidate.x;
      const deltaY = event.clientY - candidate.y;
      if (Math.abs(deltaX) < 8 && Math.abs(deltaY) < 8) return;
      if (deltaY <= 0 || Math.abs(deltaX) >= Math.abs(deltaY)) {
        pointerId = null;
        candidate = null;
        return;
      }

      start(candidate.y);
      candidate = null;
      try { panel.setPointerCapture(event.pointerId); } catch {}
    }

    if (!active) return;
    moveTo(event.clientY);
    event.preventDefault();
  }, { passive: false });

  const finishPointer = event => {
    if (event.pointerId !== pointerId) return;
    const wasActive = active;
    try {
      if (panel.hasPointerCapture(event.pointerId)) panel.releasePointerCapture(event.pointerId);
    } catch {}
    pointerId = null;
    candidate = null;
    if (!wasActive) return;
    suppressClickUntil = performance.now() + 450;
    finish();
    event.preventDefault();
  };

  panel.addEventListener('pointerup', finishPointer, { passive: false });
  panel.addEventListener('pointercancel', finishPointer, { passive: false });
  panel.addEventListener('click', event => {
    if (performance.now() >= suppressClickUntil) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
}

attachDismissGesture(sheet, closeSheet);
attachDismissGesture(feedbackSheet, closeFeedback);

renderCondition();
updateFeeling();
