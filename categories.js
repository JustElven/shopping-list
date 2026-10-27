// Определение раздела по названию товара.
// Три слоя, от самого точного к самому общему:
//   1. learnedCategories: то, что пользователь исправил вручную (приоритет);
//   2. KEYWORDS: словарь ключевых слов (побеждает самое длинное совпадение);
//   3. mlPredict: небольшая модель из model.js, если слов не нашлось.
// Если и модель не уверена, товар уходит в «Разное».

const DEFAULT_CATEGORIES = ['Овощи и фрукты','Молочное и яйца','Мясо и рыба','Хлеб и выпечка','Консервы','Паста','Крупы','Сладкое','Заморозка','Напитки','Хозтовары','Разное'];
const PROTECTED_CATEGORY = 'Разное';

const KEY_TO_RU = {
  fruits_veg: 'Овощи и фрукты', dairy_eggs: 'Молочное и яйца', meat_fish: 'Мясо и рыба',
  bread_bakery: 'Хлеб и выпечка', canned: 'Консервы', pasta: 'Паста', grains: 'Крупы',
  sweets: 'Сладкое', frozen: 'Заморозка', drinks: 'Напитки', household: 'Хозтовары', other: 'Разное'
};
const LEGACY_RU = {
  'Бакалея': 'Консервы'
};

function normalizeCategory(raw) {
  if (KEY_TO_RU[raw]) return KEY_TO_RU[raw];
  if (LEGACY_RU[raw]) return LEGACY_RU[raw];
  return raw;
}

const KEYWORDS = {
  'Овощи и фрукты': ['яблок','банан','апельсин','мандарин','картоф','лук','морков','огур','помидор','томат','капуст','перец','чеснок','зелен','лимон','виноград','груш','ягод','авокадо','салат','свекл','редис','кабачк','баклажан','брокколи','грейпфрут','киви','персик','слив','арбуз','дын','петрушк','укроп','шпинат'],
  'Молочное и яйца': ['молок','сыр','йогурт','творог','сметан','кефир','масл','сливочн','сливк','яйц','ряженк','простокваш'],
  'Мясо и рыба': ['курин','куриц','говядин','свинин','фарш','колбас','сосиск','рыба','лосос','креветк','ветчин','индейк','бекон','тунец','сельд','утин'],
  'Хлеб и выпечка': ['хлеб','батон','булк','багет','лаваш','круассан','лепешк','сдоб','сухар'],
  'Консервы': ['консерв','тушенк','сгущ','мука','сахар','соль','масло раст','растительн','подсолнечн','оливков','маслин','масло оливков','чай','кофе','специи','уксус','кетчуп','майонез','горчиц','мед'],
  'Паста': ['макарон','паста','спагетти','вермишель','лапша','равиол','лазан','пенне','фузилли','фарфалле'],
  'Крупы': ['рис','гречк','крупа','овсян','булгур','кускус','перлов','пшено','манк','киноа','чечевиц','горох'],
  'Сладкое': ['шоколад','конфет','печень','пирожн','торт','вафл','зефир','мармелад','карамел','мороженое','пастил','чипсы','попкорн','сухофрукт','орех','изюм'],
  'Заморозка': ['заморож','пельмен','лед','вареник замороженн'],
  'Напитки': ['вода','сок','лимонад','пиво','вино','газировк','квас','морс','энергетик'],
  'Хозтовары': ['мыло','шампун','стиральный порошок','порошок','губк','салфетк','пакет','туалетная бумага','бумага туалет','моющ','зубная паста','зубной порошок','зубная щетк','средство для мытья','мусорн','фольга','пленк пищев','бытовая хими']
};

let learnedCategories = {};
try {
  const savedLearned = localStorage.getItem('shopping-list-learned');
  if (savedLearned) learnedCategories = JSON.parse(savedLearned);
} catch (e) {}

function saveLearned() {
  try { localStorage.setItem('shopping-list-learned', JSON.stringify(learnedCategories)); }
  catch (e) {}
}


const ML_CONFIDENCE_THRESHOLD = 0.42;
let ML_VOCAB_INDEX = null;
function mlVocabIndex() {
  if (!ML_VOCAB_INDEX) {
    ML_VOCAB_INDEX = {};
    ML_MODEL.vocab.forEach((g, i) => { ML_VOCAB_INDEX[g] = i; });
  }
  return ML_VOCAB_INDEX;
}

function mlTextToNgrams(text, minN, maxN) {
  const grams = [];
  const words = text.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  for (const word of words) {
    const w = ' ' + word + ' ';
    const wLen = w.length;
    for (let n = minN; n <= Math.min(maxN, wLen); n++) {
      let offset = 0;
      grams.push(w.slice(offset, offset + n));
      while (offset + n < wLen) {
        offset += 1;
        grams.push(w.slice(offset, offset + n));
      }
      if (offset === 0) break;
    }
  }
  return grams;
}

function mlPredict(text) {
  const vocabIndex = mlVocabIndex();
  const grams = mlTextToNgrams(text, ML_MODEL.ngram_min, ML_MODEL.ngram_max);
  const counts = {};
  for (const g of grams) {
    if (Object.prototype.hasOwnProperty.call(vocabIndex, g)) {
      counts[g] = (counts[g] || 0) + 1;
    }
  }
  const keys = Object.keys(counts);
  if (keys.length === 0) return null;

  let sumSq = 0;
  const tfidf = {};
  keys.forEach(g => {
    const idx = vocabIndex[g];
    const val = counts[g] * ML_MODEL.idf[idx];
    tfidf[g] = val;
    sumSq += val * val;
  });
  const norm = Math.sqrt(sumSq) || 1;

  const nClasses = ML_MODEL.classes.length;
  const scores = new Array(nClasses).fill(0);
  keys.forEach(g => {
    const idx = vocabIndex[g];
    const v = tfidf[g] / norm;
    for (let c = 0; c < nClasses; c++) {
      scores[c] += ML_MODEL.coef[c][idx] * v;
    }
  });
  for (let c = 0; c < nClasses; c++) scores[c] += ML_MODEL.intercept[c];

  const maxScore = Math.max(...scores);
  const exps = scores.map(s => Math.exp(s - maxScore));
  const sumExp = exps.reduce((a, b) => a + b, 0);
  const probs = exps.map(e => e / sumExp);

  let bestIdx = 0;
  for (let c = 1; c < nClasses; c++) if (probs[c] > probs[bestIdx]) bestIdx = c;
  return { category: ML_MODEL.classes[bestIdx], confidence: probs[bestIdx] };
}

function guessCategory(rawName) {
  const n = rawName.trim().toLowerCase();
  if (!n) return categoryOrder[0];

  let bestLearned = null;
  Object.keys(learnedCategories).forEach(key => {
    if (!key) return;
    if (n.includes(key) && categoryOrder.includes(learnedCategories[key])) {
      if (!bestLearned || key.length > bestLearned.length) bestLearned = key;
    }
  });
  if (bestLearned) return learnedCategories[bestLearned];

  let best = null;
  for (const cat of Object.keys(KEYWORDS)) {
    if (!categoryOrder.includes(cat)) continue;
    for (const kw of KEYWORDS[cat]) {
      if (n.includes(kw) && (!best || kw.length > best.len)) {
        best = { cat, len: kw.length };
      }
    }
  }
  if (best) return best.cat;

  const mlResult = mlPredict(n);
  if (mlResult && mlResult.confidence >= ML_CONFIDENCE_THRESHOLD && categoryOrder.includes(mlResult.category)) {
    return mlResult.category;
  }

  return categoryOrder.includes(PROTECTED_CATEGORY) ? PROTECTED_CATEGORY : categoryOrder[0];
}
