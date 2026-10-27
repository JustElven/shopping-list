// Тексты интерфейса на двух языках и переключение между ними.
// Выбранный язык хранится в localStorage; пока выбора нет, берётся язык браузера (русский или английский).
// Названия встроенных разделов лежат здесь же, под ключами «cat.<ключ раздела>».
// В списке разделов и в товарах хранятся сами ключи (fruits_veg, dairy_eggs…), поэтому смена языка
// переименовывает разделы без потерь, а разделы, добавленные пользователем, остаются как есть.

const I18N = {
  ru: {
    title: 'Список покупок',
    sectionsTitle: 'Разделы списка',
    orderLabel: 'Порядок разделов',
    backToList: '← К списку',
    orderHint: 'Перетащите разделы за значок ⠿, чтобы расставить их в удобном порядке. Чтобы убрать раздел, смахните его влево.',
    newSectionPlaceholder: 'Название нового раздела',
    add: 'Добавить',
    savedOrders: 'Сохранённые порядки',
    choose: '— выбрать —',
    apply: 'Выбрать',
    newOrderPlaceholder: 'Название нового порядка',
    save: 'Сохранить',
    deleteOrder: 'Удалить сохранённый порядок «{name}»',
    itemPlaceholder: 'Например, молоко',
    qtyPlaceholder: '1 шт',
    addToList: 'Добавить в список',
    totalItems: 'Всего позиций',
    bought: 'Куплено',
    boughtOf: '{n} из {total}',
    clearBought: 'Убрать купленное',
    editSections: 'Настроить разделы',
    downloadBackup: 'Скачать резервную копию',
    restoreBackup: 'Восстановить из файла',
    customOrder: 'Свой порядок',
    dragAria: 'Перетащить «{cat}»',
    delete: 'Удалить',
    deleteSectionAria: 'Удалить раздел «{cat}»',
    empty: 'Список пуст. Добавьте первый продукт выше.',
    markBought: 'Отметить как купленное',
    markNotBought: 'Отметить как не купленное',
    remove: 'Удалить',
    backupError: 'Не удалось прочитать файл резервной копии — проверь, что это тот самый экспортированный файл.',
    themeToLight: 'Включить светлую тему',
    themeToDark: 'Включить тёмную тему',
    langAria: 'Сменить язык',
    'cat.fruits_veg': 'Овощи и фрукты',
    'cat.dairy_eggs': 'Молочное и яйца',
    'cat.meat_fish': 'Мясо и рыба',
    'cat.bread_bakery': 'Хлеб и выпечка',
    'cat.canned': 'Консервы',
    'cat.pasta': 'Паста',
    'cat.grains': 'Крупы',
    'cat.sweets': 'Сладкое',
    'cat.frozen': 'Заморозка',
    'cat.drinks': 'Напитки',
    'cat.household': 'Хозтовары',
    'cat.other': 'Разное'
  },
  en: {
    title: 'Shopping List',
    sectionsTitle: 'Sections',
    orderLabel: 'Section order',
    backToList: '← Back to list',
    orderHint: 'Drag sections by the ⠿ handle to put them in the order you like. To remove a section, swipe it left.',
    newSectionPlaceholder: 'New section name',
    add: 'Add',
    savedOrders: 'Saved orders',
    choose: '— choose —',
    apply: 'Apply',
    newOrderPlaceholder: 'New order name',
    save: 'Save',
    deleteOrder: 'Delete saved order “{name}”',
    itemPlaceholder: 'e.g. milk',
    qtyPlaceholder: '1 pc',
    addToList: 'Add to list',
    totalItems: 'Total items',
    bought: 'Bought',
    boughtOf: '{n} of {total}',
    clearBought: 'Clear bought',
    editSections: 'Edit sections',
    downloadBackup: 'Download backup',
    restoreBackup: 'Restore from file',
    customOrder: 'Custom order',
    dragAria: 'Drag “{cat}”',
    delete: 'Delete',
    deleteSectionAria: 'Delete section “{cat}”',
    empty: 'Your list is empty. Add your first item above.',
    markBought: 'Mark as bought',
    markNotBought: 'Mark as not bought',
    remove: 'Remove',
    backupError: "Couldn't read the backup file. Make sure it's the file exported by this app.",
    themeToLight: 'Switch to light theme',
    themeToDark: 'Switch to dark theme',
    langAria: 'Change language',
    'cat.fruits_veg': 'Fruits & vegetables',
    'cat.dairy_eggs': 'Dairy & eggs',
    'cat.meat_fish': 'Meat & fish',
    'cat.bread_bakery': 'Bread & bakery',
    'cat.canned': 'Pantry & canned',
    'cat.pasta': 'Pasta',
    'cat.grains': 'Grains',
    'cat.sweets': 'Sweets & snacks',
    'cat.frozen': 'Frozen',
    'cat.drinks': 'Drinks',
    'cat.household': 'Household',
    'cat.other': 'Other'
  }
};

const LANGS = ['ru', 'en'];

function detectLang() {
  let lang = null;
  try { lang = localStorage.getItem('shopping-list-lang'); } catch (e) {}
  if (LANGS.includes(lang)) return lang;
  return /^ru/i.test(navigator.language || '') ? 'ru' : 'en';
}

let currentLang = detectLang();

// Строка по ключу; {name}, {n} и подобные заменяются значениями из vars
function t(key, vars) {
  const str = (I18N[currentLang] && I18N[currentLang][key]) || I18N.en[key] || key;
  return vars ? str.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m)) : str;
}

// Подпись раздела: у встроенных берётся перевод, у добавленных пользователем остаётся как есть
function catLabel(cat) {
  const key = 'cat.' + cat;
  return I18N[currentLang][key] ? t(key) : cat;
}

// Расставляет переводы по странице: data-i18n (текст), data-i18n-placeholder, data-i18n-aria-label
function translateDom() {
  document.documentElement.lang = currentLang;
  document.title = t('title');
  const appTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
  if (appTitle) appTitle.content = t('title');
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => { el.placeholder = t(el.dataset.i18nPlaceholder); });
  document.querySelectorAll('[data-i18n-aria-label]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAriaLabel)); });
}
