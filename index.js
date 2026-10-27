// Главная логика приложения: состояние (товары, порядок разделов, сохранённые порядки),
// отрисовка списка, панель «Разделы списка» с перетаскиванием, резервная копия.
// Данные хранятся в localStorage; функции определения раздела берутся из categories.js.

let items = [];
try {
  const saved = localStorage.getItem('shopping-list-items');
  if (saved) items = JSON.parse(saved).map(i => ({ ...i, category: normalizeCategory(i.category) }));
} catch (e) {}

function save() {
  try { localStorage.setItem('shopping-list-items', JSON.stringify(items)); }
  catch (e) {}
}

let categoryOrder = DEFAULT_CATEGORIES.slice();
try {
  const savedOrder = localStorage.getItem('shopping-list-order');
  if (savedOrder) {
    const parsed = JSON.parse(savedOrder);
    if (Array.isArray(parsed) && parsed.length) categoryOrder = normalizeCategoryList(parsed);
  }
} catch (e) {}
if (!categoryOrder.includes(PROTECTED_CATEGORY)) categoryOrder.push(PROTECTED_CATEGORY);

let presets = {};
try {
  const savedPresets = localStorage.getItem('shopping-list-presets');
  if (savedPresets) {
    const parsed = JSON.parse(savedPresets);
    Object.keys(parsed).forEach(name => { presets[name] = normalizeCategoryList(parsed[name]); });
  }
} catch (e) {}

let activePreset = '';
try {
  activePreset = localStorage.getItem('shopping-list-active-preset') || '';
} catch (e) {}

function saveOrder() {
  try { localStorage.setItem('shopping-list-order', JSON.stringify(categoryOrder)); }
  catch (e) {}
}

function savePresets() {
  try { localStorage.setItem('shopping-list-presets', JSON.stringify(presets)); }
  catch (e) {}
}

function saveActivePreset() {
  try { localStorage.setItem('shopping-list-active-preset', activePreset); }
  catch (e) {}
}

const catSelect = document.getElementById('itemCat');
function renderCategorySelect() {
  const prev = catSelect.value;
  catSelect.innerHTML = '';
  categoryOrder.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c; opt.textContent = catLabel(c);
    catSelect.appendChild(opt);
  });
  catSelect.value = categoryOrder.includes(prev) ? prev : categoryOrder[0];
}
renderCategorySelect();

const orderToggle = document.getElementById('orderToggle');
const orderBack = document.getElementById('orderBack');
const orderBar = document.getElementById('orderBar');
const orderSelect = document.getElementById('orderSelect');
const orderPanel = document.getElementById('orderPanel');
const orderList = document.getElementById('orderList');
const newCategoryName = document.getElementById('newCategoryName');
const addCategoryBtn = document.getElementById('addCategoryBtn');
const presetSelect = document.getElementById('presetSelect');
const presetName = document.getElementById('presetName');
const applyPresetBtn = document.getElementById('applyPresetBtn');
const savePresetBtn = document.getElementById('savePresetBtn');
const deletePresetBtn = document.getElementById('deletePresetBtn');

// ---------- Светлая / тёмная тема ----------
// Тема хранится в атрибуте data-theme на <html>; сам атрибут ставит скрипт в <head>,
// чтобы страница не мигала. Здесь только кнопка: меняет атрибут и запоминает выбор.

const themeToggle = document.getElementById('themeToggle');
const themeColorMeta = document.querySelector('meta[name="theme-color"]');

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  themeToggle.textContent = theme === 'dark' ? '☀' : '☾'; // показываем, на какую тему переключимся
  themeToggle.setAttribute('aria-label', theme === 'dark' ? t('themeToLight') : t('themeToDark'));
  if (themeColorMeta) themeColorMeta.content = theme === 'dark' ? '#0C0C0C' : '#E4E4E4';
}

themeToggle.addEventListener('click', () => {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  try { localStorage.setItem('shopping-list-theme', next); } catch (e) {}
});

applyTheme(document.documentElement.getAttribute('data-theme') || 'dark');

// ---------- Язык интерфейса ----------
// Кнопка показывает текущий язык; по нажатию переключает на другой и перерисовывает всё, что зависит от языка.

const langToggle = document.getElementById('langToggle');

function applyLanguage() {
  translateDom();
  langToggle.textContent = currentLang.toUpperCase();
  applyTheme(document.documentElement.getAttribute('data-theme') || 'dark');
  updateViewTitle();
  renderCategorySelect();
  renderOrderPanel();
  render();
}

langToggle.addEventListener('click', () => {
  currentLang = currentLang === 'ru' ? 'en' : 'ru';
  try { localStorage.setItem('shopping-list-lang', currentLang); } catch (e) {}
  applyLanguage();
});

// Переключение между двумя экранами: список покупок и настройка разделов.
const viewList = document.getElementById('viewList');
const viewTitle = document.getElementById('viewTitle');

let activeView = 'list';

function updateViewTitle() {
  viewTitle.textContent = activeView === 'sections' ? t('sectionsTitle') : t('title');
}

function showView(name) {
  const sections = name === 'sections';
  activeView = name;
  if (sections) renderOrderPanel(); // перед показом строим актуальный список разделов
  viewList.hidden = sections;
  orderPanel.hidden = !sections;
  orderBar.hidden = sections;
  updateViewTitle();
  window.scrollTo(0, 0);
}

orderToggle.addEventListener('click', () => showView('sections'));
orderBack.addEventListener('click', () => showView('list'));

function addCategory() {
  const name = newCategoryName.value.trim();
  if (!name) { newCategoryName.focus(); return; }
  // Если ввели название встроенного раздела (на любом языке), добавляем сам раздел, а не копию с тем же названием
  const key = normalizeCategory(name);
  const lower = name.toLowerCase();
  if (categoryOrder.includes(key) || categoryOrder.some(c => c.toLowerCase() === lower || catLabel(c).toLowerCase() === lower)) {
    newCategoryName.value = '';
    return;
  }
  categoryOrder.splice(categoryOrder.length - 1, 0, key);
  newCategoryName.value = '';
  saveOrder();
  renderCategorySelect();
  render();
  renderOrderPanel();
}

addCategoryBtn.addEventListener('click', addCategory);
newCategoryName.addEventListener('keydown', e => { if (e.key === 'Enter') addCategory(); });

function deleteCategory(cat) {
  if (cat === PROTECTED_CATEGORY) return;
  categoryOrder = categoryOrder.filter(c => c !== cat);
  items.forEach(item => { if (item.category === cat) item.category = PROTECTED_CATEGORY; });
  save();
  saveOrder();
  renderCategorySelect();
  render();
  renderOrderPanel();
}

function renderPresetSelect() {
  presetSelect.innerHTML = '';
  const choose = document.createElement('option');
  choose.value = '';
  choose.textContent = t('choose');
  presetSelect.appendChild(choose);
  Object.keys(presets).forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    if (name === activePreset) opt.selected = true;
    presetSelect.appendChild(opt);
  });
  if (activePreset && presets[activePreset]) {
    deletePresetBtn.style.display = 'block';
    deletePresetBtn.textContent = t('deleteOrder', { name: activePreset });
  } else {
    deletePresetBtn.style.display = 'none';
  }
  renderOrderSelect();
}

// Название порядка, который сейчас действует: пустое, если раздел переставили вручную
function currentOrderName() {
  const p = presets[activePreset];
  const same = p && p.length === categoryOrder.length && p.every((c, i) => c === categoryOrder[i]);
  return same ? activePreset : '';
}

// Выбор порядка на главном экране: показывает действующий порядок и переключает на сохранённый
function renderOrderSelect() {
  const current = currentOrderName();
  const names = Object.keys(presets);
  orderSelect.innerHTML = '';
  if (!current) {
    const own = document.createElement('option');
    own.value = '';
    own.textContent = t('customOrder');
    orderSelect.appendChild(own);
  }
  names.forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    orderSelect.appendChild(opt);
  });
  orderSelect.value = current;
  orderSelect.disabled = names.length === 0;
}

orderSelect.addEventListener('change', () => applyPreset(orderSelect.value));

let dragEl = null;
let dragPointerId = null;

function renumberOrderRows() {
  Array.from(orderList.children).forEach((row, i) => {
    const numEl = row.querySelector('.order-num');
    if (numEl) numEl.textContent = (i + 1) + '.';
  });
}

function renderOrderPanel() {
  orderList.innerHTML = '';
  categoryOrder.forEach((cat, i) => {
    const row = document.createElement('div');
    row.className = 'order-row';
    row.dataset.cat = cat;

    // Содержимое строки: оно сдвигается пальцем влево и открывает красную кнопку под собой
    const content = document.createElement('div');
    content.className = 'order-content';

    const num = document.createElement('span');
    num.className = 'order-num';
    num.textContent = (i + 1) + '.';

    const label = document.createElement('span');
    label.className = 'order-label';
    label.textContent = catLabel(cat);

    // Значок из шести точек справа: за него строку перетаскивают
    const handle = document.createElement('span');
    handle.className = 'drag-handle';
    handle.textContent = '⠿';
    handle.setAttribute('aria-label', t('dragAria', { cat: catLabel(cat) }));
    handle.addEventListener('pointerdown', e => startDrag(e, row));

    content.append(num, label, handle);
    row.appendChild(content);

    // «Разное» удалить нельзя: у неё нет ни красной кнопки, ни свайпа
    if (cat !== PROTECTED_CATEGORY) {
      const del = document.createElement('button');
      del.className = 'swipe-delete';
      del.type = 'button';
      del.textContent = t('delete');
      del.setAttribute('aria-label', t('deleteSectionAria', { cat: catLabel(cat) }));
      del.addEventListener('click', () => deleteCategory(cat));
      row.appendChild(del);
      enableSwipe(row, content);
    }
    orderList.appendChild(row);
  });
  renderPresetSelect();
}

// ---------- Свайп влево для удаления раздела ----------
// Тянем содержимое строки пальцем: насколько сдвинули, настолько оно и едет.
// Отпустили дальше середины, и строка остаётся открытой, под ней красная кнопка «Удалить».
// Отпустили раньше, и строка возвращается на место.

const SWIPE_WIDTH = 88;      // ширина красной кнопки (px), совпадает с .swipe-delete в CSS
const SWIPE_START = 8;       // с какого сдвига (px) считаем жест свайпом, а не случайным касанием

function setSwipe(row, content, x, animate) {
  content.style.transition = animate ? 'transform 0.2s ease' : 'none';
  content.style.transform = x ? 'translateX(' + x + 'px)' : '';
  row.classList.toggle('swiped', x < 0); // пока строка сдвинута, красная кнопка видна
  row.classList.toggle('open', x <= -SWIPE_WIDTH);
}

function closeSwipes(except) {
  orderList.querySelectorAll('.order-row.swiped').forEach(r => {
    if (r === except) return;
    setSwipe(r, r.querySelector('.order-content'), 0, true);
  });
}

function enableSwipe(row, content) {
  let startX = 0, startY = 0, baseX = 0, swiping = false, tracking = false;

  content.addEventListener('pointerdown', e => {
    if (e.target.closest('.drag-handle')) return; // за значок строку перетаскивают, не свайпают
    closeSwipes(row);
    tracking = true;
    swiping = false;
    startX = e.clientX;
    startY = e.clientY;
    baseX = row.classList.contains('open') ? -SWIPE_WIDTH : 0;
  });

  content.addEventListener('pointermove', e => {
    if (!tracking) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (!swiping) {
      // Решаем, свайп это или прокрутка страницы: свайп, если сдвиг больше по горизонтали
      if (Math.abs(dx) < SWIPE_START || Math.abs(dx) < Math.abs(dy)) return;
      swiping = true;
      try { content.setPointerCapture(e.pointerId); } catch (err) {}
    }
    const x = Math.max(-SWIPE_WIDTH, Math.min(0, baseX + dx));
    setSwipe(row, content, x, false);
  });

  const finish = () => {
    if (!tracking) return;
    tracking = false;
    if (!swiping) return;
    const current = new DOMMatrix(getComputedStyle(content).transform).m41;
    setSwipe(row, content, current < -SWIPE_WIDTH / 2 ? -SWIPE_WIDTH : 0, true);
  };
  content.addEventListener('pointerup', finish);
  content.addEventListener('pointercancel', finish);
}

// Нажали где-то мимо открытой строки: закрываем её
document.addEventListener('pointerdown', e => {
  const row = e.target.closest('.order-row');
  closeSwipes(row && row.querySelector('.swipe-delete') ? row : null);
});

function startDrag(e, row) {
  e.preventDefault();
  dragEl = row;
  dragPointerId = e.pointerId;
  row.classList.add('dragging');
  try { row.setPointerCapture(dragPointerId); } catch (err) {}
  document.addEventListener('pointermove', onDragMove);
  document.addEventListener('pointerup', onDragEnd);
  document.addEventListener('pointercancel', onDragEnd);
}

function onDragMove(e) {
  if (!dragEl) return;
  const rows = Array.from(orderList.children);
  const y = e.clientY;

  let targetRow = null;
  for (const r of rows) {
    if (r === dragEl) continue;
    const rect = r.getBoundingClientRect();
    const mid = rect.top + rect.height / 2;
    if (y < mid) { targetRow = r; break; }
  }

  const wouldBeNoOp = targetRow
    ? (dragEl.nextSibling === targetRow)
    : (dragEl === orderList.lastElementChild);
  if (wouldBeNoOp) return;

  const oldRects = new Map();
  rows.forEach(r => oldRects.set(r, r.getBoundingClientRect()));

  if (targetRow) {
    orderList.insertBefore(dragEl, targetRow);
  } else {
    orderList.appendChild(dragEl);
  }

  Array.from(orderList.children).forEach(r => {
    if (r === dragEl) return;
    const oldRect = oldRects.get(r);
    if (!oldRect) return;
    const newRect = r.getBoundingClientRect();
    const deltaY = oldRect.top - newRect.top;
    if (deltaY) {
      r.style.transition = 'none';
      r.style.transform = 'translateY(' + deltaY + 'px)';
      r.getBoundingClientRect();
      r.style.transition = 'transform 0.18s ease';
      r.style.transform = '';
    }
  });

  renumberOrderRows();
}

function onDragEnd() {
  if (!dragEl) return;
  dragEl.classList.remove('dragging');
  try { dragEl.releasePointerCapture(dragPointerId); } catch (err) {}
  document.removeEventListener('pointermove', onDragMove);
  document.removeEventListener('pointerup', onDragEnd);
  document.removeEventListener('pointercancel', onDragEnd);
  categoryOrder = Array.from(orderList.children).map(r => r.dataset.cat);
  dragEl = null;
  saveOrder();
  render();
}

function applyPreset(name) {
  if (!name || !presets[name]) return;
  categoryOrder = presets[name].slice();
  if (!categoryOrder.includes(PROTECTED_CATEGORY)) categoryOrder.push(PROTECTED_CATEGORY);
  items.forEach(item => { if (!categoryOrder.includes(item.category)) item.category = PROTECTED_CATEGORY; });
  activePreset = name;
  save();
  saveOrder();
  saveActivePreset();
  renderCategorySelect();
  render();
  renderOrderPanel();
}

applyPresetBtn.addEventListener('click', () => applyPreset(presetSelect.value));

savePresetBtn.addEventListener('click', () => {
  const name = presetName.value.trim();
  if (!name) { presetName.focus(); return; }
  presets[name] = categoryOrder.slice();
  activePreset = name;
  presetName.value = '';
  savePresets();
  saveActivePreset();
  renderOrderPanel();
});

deletePresetBtn.addEventListener('click', () => {
  if (!activePreset || !presets[activePreset]) return;
  delete presets[activePreset];
  activePreset = '';
  savePresets();
  saveActivePreset();
  renderOrderPanel();
});

const nameInput = document.getElementById('itemName');
const qtyInput = document.getElementById('itemQty');
const listArea = document.getElementById('listArea');
const totalCountEl = document.getElementById('totalCount');
const boughtCountEl = document.getElementById('boughtCount');
const clearBtn = document.getElementById('clearBtn');
const progressBar = document.getElementById('progressBar');


nameInput.addEventListener('input', () => {
  const guess = guessCategory(nameInput.value);
  if (nameInput.value.trim().length > 1) catSelect.value = guess;
});

function addItem() {
  const name = nameInput.value.trim();
  if (!name) { nameInput.focus(); return; }
  const qty = qtyInput.value.trim();
  const category = catSelect.value;
  const autoGuess = guessCategory(name);
  if (autoGuess !== category) {
    learnedCategories[name.toLowerCase()] = category;
    saveLearned();
  }
  items.push({ id: Date.now() + Math.random(), name, qty, category, checked: false });
  nameInput.value = '';
  qtyInput.value = '';
  catSelect.value = categoryOrder[0];
  save();
  render();
  nameInput.focus();
}

document.getElementById('addBtn').addEventListener('click', addItem);
[nameInput, qtyInput].forEach(el => el.addEventListener('keydown', e => {
  if (e.key === 'Enter') addItem();
}));

clearBtn.addEventListener('click', () => {
  items = items.filter(i => !i.checked);
  save();
  render();
});

function render() {
  listArea.innerHTML = '';

  if (items.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = t('empty');
    listArea.appendChild(empty);
  } else {
    const grouped = {};
    items.forEach(item => {
      if (!grouped[item.category]) grouped[item.category] = [];
      grouped[item.category].push(item);
    });

    categoryOrder.forEach(cat => {
      if (!grouped[cat]) return;
      const group = grouped[cat].slice().sort((a, b) => a.checked - b.checked);
      const section = document.createElement('div');
      section.className = 'category';
      const label = document.createElement('p');
      label.className = 'category-name';
      label.textContent = catLabel(cat);
      section.appendChild(label);

      group.forEach(item => {
        const row = document.createElement('div');
        row.className = 'item' + (item.checked ? ' checked' : '');

        const check = document.createElement('button');
        check.className = 'check';
        check.setAttribute('aria-label', item.checked ? t('markNotBought') : t('markBought'));
        check.innerHTML = '<svg viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        check.addEventListener('click', () => {
          item.checked = !item.checked;
          save();
          render();
        });

        const nameEl = document.createElement('span');
        nameEl.className = 'item-name';
        nameEl.textContent = item.name;

        row.appendChild(check);
        row.appendChild(nameEl);

        if (item.qty) {
          const qtyEl = document.createElement('span');
          qtyEl.className = 'item-qty';
          qtyEl.textContent = item.qty;
          row.appendChild(qtyEl);
        }

        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove';
        removeBtn.setAttribute('aria-label', t('remove'));
        removeBtn.textContent = '×';
        removeBtn.addEventListener('click', () => {
          items = items.filter(i => i.id !== item.id);
          save();
          render();
        });
        row.appendChild(removeBtn);

        section.appendChild(row);
      });

      listArea.appendChild(section);
    });
  }

  const total = items.length;
  const bought = items.filter(i => i.checked).length;
  totalCountEl.textContent = total;
  boughtCountEl.textContent = t('boughtOf', { n: bought, total });
  clearBtn.disabled = bought === 0;
  progressBar.style.width = (total ? Math.round(bought / total * 100) : 0) + '%';
  renderOrderSelect();
}

const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importFile = document.getElementById('importFile');

exportBtn.addEventListener('click', () => {
  const payload = { items, categoryOrder, presets, activePreset, exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'shopping-list-backup.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

importBtn.addEventListener('click', () => importFile.click());

importFile.addEventListener('change', () => {
  const file = importFile.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (Array.isArray(data.items)) items = data.items.map(i => ({ ...i, category: normalizeCategory(i.category) }));
      if (Array.isArray(data.categoryOrder) && data.categoryOrder.length) categoryOrder = normalizeCategoryList(data.categoryOrder);
      if (!categoryOrder.includes(PROTECTED_CATEGORY)) categoryOrder.push(PROTECTED_CATEGORY);
      if (data.presets && typeof data.presets === 'object') {
        presets = {};
        Object.keys(data.presets).forEach(name => { presets[name] = normalizeCategoryList(data.presets[name]); });
      }
      if (typeof data.activePreset === 'string') activePreset = data.activePreset;
      save();
      saveOrder();
      savePresets();
      saveActivePreset();
      renderCategorySelect();
      render();
      renderOrderPanel();
    } catch (e) {
      alert(t('backupError'));
    }
  };
  reader.readAsText(file);
  importFile.value = '';
});

applyLanguage();
