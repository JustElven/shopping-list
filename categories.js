// Определение раздела по названию товара.
// Три слоя, от самого точного к самому общему:
//   1. learnedCategories: то, что пользователь исправил вручную (приоритет);
//   2. KEYWORDS: словарь ключевых слов (побеждает самое длинное совпадение);
//   3. mlPredict: небольшая модель из model.js, если слов не нашлось.
// Если и модель не уверена, товар уходит в «Other».

const DEFAULT_CATEGORIES = ['Fruits & vegetables','Dairy & eggs','Meat & fish','Bread & bakery','Pantry & canned','Pasta','Grains','Sweets & snacks','Frozen','Drinks','Household','Other'];
const PROTECTED_CATEGORY = 'Other';

// Старые названия разделов (русские и служебные ключи) → нынешние английские.
// Так списки, сохранённые до перевода, открываются без потерь.
const LEGACY_CATEGORIES = {
  fruits_veg: 'Fruits & vegetables', dairy_eggs: 'Dairy & eggs', meat_fish: 'Meat & fish',
  bread_bakery: 'Bread & bakery', canned: 'Pantry & canned', pasta: 'Pasta', grains: 'Grains',
  sweets: 'Sweets & snacks', frozen: 'Frozen', drinks: 'Drinks', household: 'Household', other: 'Other',
  'Овощи и фрукты': 'Fruits & vegetables', 'Молочное и яйца': 'Dairy & eggs', 'Мясо и рыба': 'Meat & fish',
  'Хлеб и выпечка': 'Bread & bakery', 'Консервы': 'Pantry & canned', 'Бакалея': 'Pantry & canned',
  'Паста': 'Pasta', 'Крупы': 'Grains', 'Сладкое': 'Sweets & snacks', 'Заморозка': 'Frozen',
  'Напитки': 'Drinks', 'Хозтовары': 'Household', 'Разное': 'Other'
};

function normalizeCategory(raw) {
  return LEGACY_CATEGORIES[raw] || raw;
}

// То же для списка разделов; заодно убирает повторы (например, «Бакалея» и «Консервы» стали одним разделом)
function normalizeCategoryList(list) {
  return list.map(normalizeCategory).filter((cat, i, all) => all.indexOf(cat) === i);
}

// Слова ищутся целиком, с необязательным множественным числом: «tomato» найдёт и «tomatoes».
// Так «tea» не срабатывает на «steak», а «rice» на «price». Фразы из нескольких слов тоже работают.
const KEYWORDS = {
  'Fruits & vegetables': ['okra','persimmon','kumquat','tomatillo','jicama','kohlrabi','rutabaga','daikon','bok choy','pak choi','chard','collard','lychee','guava','dragon fruit','passion fruit','plantain','sprout','turnip','parsnip','artichoke','fennel','rhubarb','cress','endive','radicchio','mangetout','apple','banana','orange','mandarin','clementine','tangerine','potato','sweet potato','onion','green onion','scallion','shallot','carrot','cucumber','tomato','cherry tomato','cabbage','pepper','bell pepper','chili','garlic','ginger','lemon','lime','grape','pear','berry','strawberry','blueberry','raspberry','blackberry','cranberry','cherry','avocado','lettuce','salad','beet','beetroot','radish','zucchini','courgette','eggplant','aubergine','broccoli','cauliflower','grapefruit','kiwi','peach','plum','nectarine','apricot','watermelon','melon','cantaloupe','pineapple','mango','papaya','pomegranate','parsley','dill','cilantro','coriander','basil','mint','herb','spinach','kale','arugula','rocket','celery','leek','mushroom','corn','asparagus','pumpkin','squash','fig','coconut','fruit','vegetable','veggie','green bean'],
  'Dairy & eggs': ['quark','paneer','skyr','labneh','creme fraiche','custard','whey','milk','cheese','yogurt','yoghurt','cottage cheese','sour cream','cream','butter','egg','kefir','buttermilk','mozzarella','parmesan','cheddar','feta','ricotta','mascarpone','cream cheese','whipped cream','heavy cream','half and half','margarine','ghee','curd','almond milk','soy milk','oat milk','coconut milk'],
  'Meat & fish': ['roast','chuck roast','octopus','hake','haddock','bream','sea bream','mackerel','lobster','oyster','scallop','calamari','cutlet','schnitzel','pork shoulder','sirloin','ribeye','tenderloin','gammon','venison','rabbit','goose','chorizo','prosciutto','pepperoni','frankfurter','kielbasa','shellfish','seafood','chicken','chicken breast','beef','pork','pork chop','ground beef','mince','minced meat','sausage','salami','fish','salmon','smoked salmon','shrimp','prawn','ham','turkey','bacon','tuna','herring','sardine','anchovy','duck','steak','lamb','veal','meat','cod','trout','sea bass','tilapia','crab','squid','mussel','bratwurst','hot dog','ribs','drumstick','fillet','meatball','liver','pastrami','jerky'],
  'Bread & bakery': ['sandwich thin','crumpet','pumpernickel','challah','pizza base','pizza dough','puff pastry','filo','breadstick','bread crumb','panettone','teacake','bread','loaf','baguette','bun','roll','croissant','pita','flatbread','tortilla','bagel','toast','sourdough','ciabatta','brioche','focaccia','naan','lavash','rusk','pastry','muffin','doughnut','donut','danish','scone'],
  'Pantry & canned': ['steak sauce','miso','harissa','tamarind','cumin','oregano','turmeric','curry','nutmeg','cardamom','bay leaf','chili flake','oyster sauce','fish sauce','hoisin','teriyaki','gravy','sriracha','wasabi','gherkin','caper','passata','tomato puree','baked bean','evaporated milk','coconut cream','custard powder','jelly crystal','sauerkraut','coffee bean','instant coffee','espresso','canned','tinned','tin','condensed milk','flour','sugar','salt','vegetable oil','sunflower oil','olive oil','cooking oil','oil','tea','coffee','spice','black pepper','vinegar','ketchup','mayonnaise','mayo','mustard','honey','jam','peanut butter','yeast','baking powder','baking soda','vanilla','cinnamon','paprika','soy sauce','sauce','tomato paste','tomato sauce','canned tomato','canned corn','canned tuna','canned bean','olive','pickle','syrup','maple syrup','stock','broth','bouillon','pesto','hummus','tahini','salsa','dressing','cornstarch','cocoa','stew','tea bag'],
  'Pasta': ['udon','soba','rotini','tortellini','cannelloni','pappardelle','spaetzle','bucatini','ziti','conchiglie','orecchiette','mac and cheese','pasta','macaroni','spaghetti','noodle','vermicelli','ravioli','lasagna','lasagne','penne','fusilli','farfalle','tagliatelle','fettuccine','linguine','rigatoni','gnocchi','ramen','orzo','instant noodle'],
  'Grains': ['rice','buckwheat','groats','oatmeal','oat','rolled oat','bulgur','couscous','barley','pearl barley','millet','semolina','quinoa','lentil','chickpea','pea','bean','cereal','cornflake','granola','muesli','polenta','cornmeal'],
  'Sweets & snacks': ['potato chips','tortilla chips','pork scratching','kitkat','twix','snickers','mars bar','oreo','haribo','pringles','doritos','cheetos','m&m','skittles','toblerone','kinder','turkish delight','fudge','licorice','liquorice','nougat','marzipan','halva','baklava','trail mix','mixed nuts','digestive','shortbread','eclair','tiramisu','cheesecake','mousse','sorbet','ice lolly','chocolate','candy','sweet','cookie','biscuit','cake','cupcake','pie','waffle','marshmallow','marmalade','caramel','toffee','ice cream','lollipop','chewing gum','gum','chips','crisps','popcorn','dried fruit','raisin','nut','walnut','almond','cashew','hazelnut','pistachio','peanut','snack','cracker','pretzel','candy bar','granola bar','protein bar','dessert','pudding','brownie','nutella','gummy','jelly'],
  'Frozen': ['fish finger','potsticker','gyoza','tater tot','hash brown','spring roll','samosa','oven chips','potato wedge','frozen pizza','tv dinner','frozen','dumpling','pelmeni','pierogi','vareniki','ice','ice cube','fries','french fries','nuggets','fish stick','popsicle'],
  'Drinks': ['pepsi','fanta','sprite','7up','dr pepper','root beer','ginger ale','ginger beer','red bull','gatorade','aperol','tequila','bourbon','brandy','cognac','liqueur','baileys','vermouth','sake','stout','ipa','pilsner','squash drink','cordial','milkshake','fruit punch','water','juice','orange juice','lemonade','soda','cola','beer','wine','sparkling water','mineral water','kvass','fruit drink','energy drink','sports drink','smoothie','whiskey','whisky','vodka','rum','gin','champagne','prosecco','cider','kombucha','iced tea','tonic','drink','beverage','liquor','coconut water','lager','ale'],
  'Household': ['colgate','dettol','sellotape','scotch tape','vanish','domestos','listerine','oral b','gillette','pampers','huggies','persil','ariel','febreze','windex','sanitary pad','panty liner','cotton bud','cotton pad','nappy','washing up liquid','kitchen roll','toilet roll','bin liner','scourer','dish cloth','hand cream','sunscreen','plaster','bandage','paracetamol','ibuprofen','vitamin','cat litter','pet food','dog food','cat food','soap','shampoo','conditioner','laundry detergent','detergent','washing powder','sponge','napkin','paper towel','tissue','trash bag','garbage bag','bin bag','plastic bag','freezer bag','ziploc','toilet paper','dish soap','dishwasher tablet','dishwasher','cleaner','cleaning','bleach','toothpaste','toothbrush','mouthwash','floss','deodorant','razor','shaving','cotton','wipe','sanitizer','foil','aluminum foil','cling film','plastic wrap','baking paper','parchment','battery','light bulb','candle','fabric softener','air freshener','tampon','diaper','shower gel','body wash','lotion','toilet cleaner','glass cleaner']
};

// Для каждого слова заранее готовим регулярку: целое слово + (s | es | ies у слов на «y»)
const KEYWORD_PATTERNS = {};
Object.keys(KEYWORDS).forEach(cat => {
  KEYWORD_PATTERNS[cat] = KEYWORDS[cat].map(kw => {
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
  for (const cat of Object.keys(KEYWORD_PATTERNS)) {
    if (!categoryOrder.includes(cat)) continue;
    for (const { kw, re } of KEYWORD_PATTERNS[cat]) {
      if (re.test(n) && (!best || kw.length > best.len)) {
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
