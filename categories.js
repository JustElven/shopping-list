// Определение раздела по названию товара. Понимает русские и английские названия независимо от языка интерфейса.
// Три слоя, от самого точного к самому общему:
//   1. learnedCategories: то, что пользователь исправил вручную (приоритет);
//   2. KEYWORDS_RU и KEYWORDS_EN: словари ключевых слов (побеждает самое длинное совпадение);
//   3. mlPredict: небольшие модели из model_ru.js и model_en.js, если слов не нашлось.
// Если и модели не уверены, товар уходит в «other» (Разное / Other).
//
// Разделы внутри приложения хранятся как ключи, а не как названия: так при смене языка они просто
// получают другую подпись (см. catLabel в i18n.js). Разделы, добавленные пользователем, хранятся по названию.

const DEFAULT_CATEGORIES = ['fruits_veg','dairy_eggs','meat_fish','bread_bakery','canned','pasta','grains','sweets','frozen','drinks','household','other'];
const PROTECTED_CATEGORY = 'other';

// Старые названия разделов (русские, английские) → ключи. Так списки, сохранённые раньше, открываются без потерь.
const LEGACY_CATEGORIES = { 'Бакалея': 'canned' };
DEFAULT_CATEGORIES.forEach(key => {
  LANGS.forEach(lang => { LEGACY_CATEGORIES[I18N[lang]['cat.' + key]] = key; });
});

function normalizeCategory(raw) {
  return LEGACY_CATEGORIES[raw] || raw;
}

// То же для списка разделов; заодно убирает повторы (например, «Бакалея» и «Консервы» стали одним разделом)
function normalizeCategoryList(list) {
  return list.map(normalizeCategory).filter((cat, i, all) => all.indexOf(cat) === i);
}

// Русский словарь: корни слов, ищутся внутри названия («молок» найдёт и «молоко», и «молочный»)
const KEYWORDS_RU = {
  fruits_veg: ['яблок','банан','апельсин','мандарин','картоф','лук','морков','огур','помидор','томат','капуст','перец','чеснок','зелен','лимон','виноград','груш','ягод','авокадо','салат','свекл','редис','кабачк','баклажан','брокколи','грейпфрут','киви','персик','слив','арбуз','дын','петрушк','укроп','шпинат'],
  dairy_eggs: ['молок','сыр','йогурт','творог','сметан','кефир','масл','сливочн','сливк','яйц','ряженк','простокваш'],
  meat_fish: ['курин','куриц','говядин','свинин','фарш','колбас','сосиск','рыба','лосос','креветк','ветчин','индейк','бекон','тунец','сельд','утин'],
  bread_bakery: ['хлеб','батон','булк','багет','лаваш','круассан','лепешк','сдоб','сухар'],
  canned: ['консерв','тушенк','сгущ','мука','сахар','соль','масло раст','растительн','подсолнечн','оливков','маслин','масло оливков','чай','кофе','специи','уксус','кетчуп','майонез','горчиц','мед'],
  pasta: ['макарон','паста','спагетти','вермишель','лапша','равиол','лазан','пенне','фузилли','фарфалле'],
  grains: ['рис','гречк','крупа','овсян','булгур','кускус','перлов','пшено','манк','киноа','чечевиц','горох'],
  sweets: ['шоколад','конфет','печень','пирожн','торт','вафл','зефир','мармелад','карамел','мороженое','пастил','чипсы','попкорн','сухофрукт','орех','изюм'],
  frozen: ['заморож','пельмен','лед','вареник замороженн'],
  drinks: ['вода','сок','лимонад','пиво','вино','газировк','квас','морс','энергетик'],
  household: ['мыло','шампун','стиральный порошок','порошок','губк','салфетк','пакет','туалетная бумага','бумага туалет','моющ','зубная паста','зубной порошок','зубная щетк','средство для мытья','мусорн','фольга','пленк пищев','бытовая хими']
};

// Английский словарь: слова ищутся целиком, с необязательным множественным числом
// («tomato» найдёт и «tomatoes», но «tea» не сработает на «steak», а «rice» на «price»).
// Фразы из нескольких слов тоже работают.
const KEYWORDS_EN = {
  fruits_veg: ['okra','persimmon','kumquat','tomatillo','jicama','kohlrabi','rutabaga','daikon','bok choy','pak choi','chard','collard','lychee','guava','dragon fruit','passion fruit','plantain','sprout','turnip','parsnip','artichoke','fennel','rhubarb','cress','endive','radicchio','mangetout','apple','banana','orange','mandarin','clementine','tangerine','potato','sweet potato','onion','green onion','scallion','shallot','carrot','cucumber','tomato','cherry tomato','cabbage','pepper','bell pepper','chili','garlic','ginger','lemon','lime','grape','pear','berry','strawberry','blueberry','raspberry','blackberry','cranberry','cherry','avocado','lettuce','salad','beet','beetroot','radish','zucchini','courgette','eggplant','aubergine','broccoli','cauliflower','grapefruit','kiwi','peach','plum','nectarine','apricot','watermelon','melon','cantaloupe','pineapple','mango','papaya','pomegranate','parsley','dill','cilantro','coriander','basil','mint','herb','spinach','kale','arugula','rocket','celery','leek','mushroom','corn','asparagus','pumpkin','squash','fig','coconut','fruit','vegetable','veggie','green bean'],
  dairy_eggs: ['quark','paneer','skyr','labneh','creme fraiche','custard','whey','milk','cheese','yogurt','yoghurt','cottage cheese','sour cream','cream','butter','egg','kefir','buttermilk','mozzarella','parmesan','cheddar','feta','ricotta','mascarpone','cream cheese','whipped cream','heavy cream','half and half','margarine','ghee','curd','almond milk','soy milk','oat milk','coconut milk'],
  meat_fish: ['roast','chuck roast','octopus','hake','haddock','bream','sea bream','mackerel','lobster','oyster','scallop','calamari','cutlet','schnitzel','pork shoulder','sirloin','ribeye','tenderloin','gammon','venison','rabbit','goose','chorizo','prosciutto','pepperoni','frankfurter','kielbasa','shellfish','seafood','chicken','chicken breast','beef','pork','pork chop','ground beef','mince','minced meat','sausage','salami','fish','salmon','smoked salmon','shrimp','prawn','ham','turkey','bacon','tuna','herring','sardine','anchovy','duck','steak','lamb','veal','meat','cod','trout','sea bass','tilapia','crab','squid','mussel','bratwurst','hot dog','ribs','drumstick','fillet','meatball','liver','pastrami','jerky'],
  bread_bakery: ['sandwich thin','crumpet','pumpernickel','challah','pizza base','pizza dough','puff pastry','filo','breadstick','bread crumb','panettone','teacake','bread','loaf','baguette','bun','roll','croissant','pita','flatbread','tortilla','bagel','toast','sourdough','ciabatta','brioche','focaccia','naan','lavash','rusk','pastry','muffin','doughnut','donut','danish','scone'],
  canned: ['steak sauce','miso','harissa','tamarind','cumin','oregano','turmeric','curry','nutmeg','cardamom','bay leaf','chili flake','oyster sauce','fish sauce','hoisin','teriyaki','gravy','sriracha','wasabi','gherkin','caper','passata','tomato puree','baked bean','evaporated milk','coconut cream','custard powder','jelly crystal','sauerkraut','coffee bean','instant coffee','espresso','canned','tinned','tin','condensed milk','flour','sugar','salt','vegetable oil','sunflower oil','olive oil','cooking oil','oil','tea','coffee','spice','black pepper','vinegar','ketchup','mayonnaise','mayo','mustard','honey','jam','peanut butter','yeast','baking powder','baking soda','vanilla','cinnamon','paprika','soy sauce','sauce','tomato paste','tomato sauce','canned tomato','canned corn','canned tuna','canned bean','olive','pickle','syrup','maple syrup','stock','broth','bouillon','pesto','hummus','tahini','salsa','dressing','cornstarch','cocoa','stew','tea bag'],
  pasta: ['udon','soba','rotini','tortellini','cannelloni','pappardelle','spaetzle','bucatini','ziti','conchiglie','orecchiette','mac and cheese','pasta','macaroni','spaghetti','noodle','vermicelli','ravioli','lasagna','lasagne','penne','fusilli','farfalle','tagliatelle','fettuccine','linguine','rigatoni','gnocchi','ramen','orzo','instant noodle'],
  grains: ['rice','buckwheat','groats','oatmeal','oat','rolled oat','bulgur','couscous','barley','pearl barley','millet','semolina','quinoa','lentil','chickpea','pea','bean','cereal','cornflake','granola','muesli','polenta','cornmeal'],
  sweets: ['potato chips','tortilla chips','pork scratching','kitkat','twix','snickers','mars bar','oreo','haribo','pringles','doritos','cheetos','m&m','skittles','toblerone','kinder','turkish delight','fudge','licorice','liquorice','nougat','marzipan','halva','baklava','trail mix','mixed nuts','digestive','shortbread','eclair','tiramisu','cheesecake','mousse','sorbet','ice lolly','chocolate','candy','sweet','cookie','biscuit','cake','cupcake','pie','waffle','marshmallow','marmalade','caramel','toffee','ice cream','lollipop','chewing gum','gum','chips','crisps','popcorn','dried fruit','raisin','nut','walnut','almond','cashew','hazelnut','pistachio','peanut','snack','cracker','pretzel','candy bar','granola bar','protein bar','dessert','pudding','brownie','nutella','gummy','jelly'],
  frozen: ['fish finger','potsticker','gyoza','tater tot','hash brown','spring roll','samosa','oven chips','potato wedge','frozen pizza','tv dinner','frozen','dumpling','pelmeni','pierogi','vareniki','ice','ice cube','fries','french fries','nuggets','fish stick','popsicle'],
  drinks: ['pepsi','fanta','sprite','7up','dr pepper','root beer','ginger ale','ginger beer','red bull','gatorade','aperol','tequila','bourbon','brandy','cognac','liqueur','baileys','vermouth','sake','stout','ipa','pilsner','squash drink','cordial','milkshake','fruit punch','water','juice','orange juice','lemonade','soda','cola','beer','wine','sparkling water','mineral water','kvass','fruit drink','energy drink','sports drink','smoothie','whiskey','whisky','vodka','rum','gin','champagne','prosecco','cider','kombucha','iced tea','tonic','drink','beverage','liquor','coconut water','lager','ale'],
  household: ['colgate','dettol','sellotape','scotch tape','vanish','domestos','listerine','oral b','gillette','pampers','huggies','persil','ariel','febreze','windex','sanitary pad','panty liner','cotton bud','cotton pad','nappy','washing up liquid','kitchen roll','toilet roll','bin liner','scourer','dish cloth','hand cream','sunscreen','plaster','bandage','paracetamol','ibuprofen','vitamin','cat litter','pet food','dog food','cat food','soap','shampoo','conditioner','laundry detergent','detergent','washing powder','sponge','napkin','paper towel','tissue','trash bag','garbage bag','bin bag','plastic bag','freezer bag','ziploc','toilet paper','dish soap','dishwasher tablet','dishwasher','cleaner','cleaning','bleach','toothpaste','toothbrush','mouthwash','floss','deodorant','razor','shaving','cotton','wipe','sanitizer','foil','aluminum foil','cling film','plastic wrap','baking paper','parchment','battery','light bulb','candle','fabric softener','air freshener','tampon','diaper','shower gel','body wash','lotion','toilet cleaner','glass cleaner']
};

// Для английских слов заранее готовим регулярку: целое слово + (s | es | ies у слов на «y»)
const KEYWORD_PATTERNS_EN = {};
Object.keys(KEYWORDS_EN).forEach(cat => {
  KEYWORD_PATTERNS_EN[cat] = KEYWORDS_EN[cat].map(kw => {
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const stem = kw.endsWith('y') ? escaped.slice(0, -1) + '(?:y|ies)' : escaped + '(?:s|es)?';
    return { kw, re: new RegExp('(?:^|[^a-z])' + stem + '(?![a-z])') };
  });
});

let learnedCategories = {};
try {
  const savedLearned = localStorage.getItem('shopping-list-learned');
  if (savedLearned) {
    learnedCategories = JSON.parse(savedLearned);
    Object.keys(learnedCategories).forEach(key => {
      learnedCategories[key] = normalizeCategory(learnedCategories[key]);
    });
  }
} catch (e) {}

function saveLearned() {
  try { localStorage.setItem('shopping-list-learned', JSON.stringify(learnedCategories)); }
  catch (e) {}
}


const ML_CONFIDENCE_THRESHOLD = 0.42;
// Две модели: у каждой свой словарь n-грамм, так что чужой язык просто не находит в нём ни одной n-граммы
const ML_MODELS = [ML_MODEL_RU, ML_MODEL_EN];

function mlVocabIndex(model) {
  if (!model._vocabIndex) {
    model._vocabIndex = {};
    model.vocab.forEach((g, i) => { model._vocabIndex[g] = i; });
  }
  return model._vocabIndex;
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

function mlPredictWith(model, text) {
  const vocabIndex = mlVocabIndex(model);
  const grams = mlTextToNgrams(text, model.ngram_min, model.ngram_max);
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
    const val = counts[g] * model.idf[idx];
    tfidf[g] = val;
    sumSq += val * val;
  });
  const norm = Math.sqrt(sumSq) || 1;

  const nClasses = model.classes.length;
  const scores = new Array(nClasses).fill(0);
  keys.forEach(g => {
    const idx = vocabIndex[g];
    const v = tfidf[g] / norm;
    for (let c = 0; c < nClasses; c++) {
      scores[c] += model.coef[c][idx] * v;
    }
  });
  for (let c = 0; c < nClasses; c++) scores[c] += model.intercept[c];

  const maxScore = Math.max(...scores);
  const exps = scores.map(s => Math.exp(s - maxScore));
  const sumExp = exps.reduce((a, b) => a + b, 0);
  const probs = exps.map(e => e / sumExp);

  let bestIdx = 0;
  for (let c = 1; c < nClasses; c++) if (probs[c] > probs[bestIdx]) bestIdx = c;
  return { category: normalizeCategory(model.classes[bestIdx]), confidence: probs[bestIdx] };
}

// Берём ответ той модели, которая увереннее: для русского текста это русская, для английского английская
function mlPredict(text) {
  let best = null;
  for (const model of ML_MODELS) {
    const result = mlPredictWith(model, text);
    if (result && (!best || result.confidence > best.confidence)) best = result;
  }
  return best;
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
  const consider = (cat, kw) => {
    if (!best || kw.length > best.len) best = { cat, len: kw.length };
  };
  for (const cat of categoryOrder) {
    if (KEYWORDS_RU[cat]) {
      for (const kw of KEYWORDS_RU[cat]) if (n.includes(kw)) consider(cat, kw);
    }
    if (KEYWORD_PATTERNS_EN[cat]) {
      for (const { kw, re } of KEYWORD_PATTERNS_EN[cat]) if (re.test(n)) consider(cat, kw);
    }
  }
  if (best) return best.cat;

  const mlResult = mlPredict(n);
  if (mlResult && mlResult.confidence >= ML_CONFIDENCE_THRESHOLD && categoryOrder.includes(mlResult.category)) {
    return mlResult.category;
  }

  return categoryOrder.includes(PROTECTED_CATEGORY) ? PROTECTED_CATEGORY : categoryOrder[0];
}
