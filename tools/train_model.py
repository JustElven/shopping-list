"""Обучение модели определения раздела.

Читает tools/dataset.json ({раздел: [названия товаров]}), обучает логистическую регрессию
на символьных n-граммах и записывает веса в model.js.

Запуск из корня проекта (нужны scikit-learn и numpy):
    python3 tools/train_model.py

Признаки считаются так же, как в categories.js (mlTextToNgrams / mlPredict):
char_wb n-граммы 2..5, счётчик * idf, L2-нормировка. Менять параметры здесь нужно вместе с JS.
"""
import json
import pathlib
import sys

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score
from sklearn.model_selection import train_test_split

ROOT = pathlib.Path(__file__).resolve().parent.parent
NGRAM_MIN, NGRAM_MAX, MAX_FEATURES = 2, 5, 3000


def load_dataset():
    data = json.loads((ROOT / 'tools' / 'dataset.json').read_text(encoding='utf-8'))
    texts, labels = [], []
    for category, names in data.items():
        for name in names:
            texts.append(name.lower())
            labels.append(category)
    return texts, labels


def make_vectorizer():
    return TfidfVectorizer(analyzer='char_wb', ngram_range=(NGRAM_MIN, NGRAM_MAX), max_features=MAX_FEATURES)


def main():
    texts, labels = load_dataset()

    # Честная оценка: часть названий откладываем и проверяем на них
    x_train, x_test, y_train, y_test = train_test_split(texts, labels, test_size=0.2, random_state=0, stratify=labels)
    vec = make_vectorizer()
    clf = LogisticRegression(C=10, max_iter=2000)
    clf.fit(vec.fit_transform(x_train), y_train)
    acc = accuracy_score(y_test, clf.predict(vec.transform(x_test)))
    print(f'Hold-out accuracy: {acc:.3f} on {len(x_test)} names', file=sys.stderr)

    # Итоговая модель обучается на всех данных
    vec = make_vectorizer()
    clf = LogisticRegression(C=10, max_iter=2000)
    clf.fit(vec.fit_transform(texts), labels)

    vocab = [None] * len(vec.vocabulary_)
    for gram, idx in vec.vocabulary_.items():
        vocab[idx] = gram

    model = {
        'vocab': vocab,
        'idf': [round(float(v), 4) for v in vec.idf_],
        'classes': [str(c) for c in clf.classes_],
        'coef': [[round(float(v), 3) for v in row] for row in clf.coef_],
        'intercept': [round(float(v), 3) for v in clf.intercept_],
        'ngram_min': NGRAM_MIN,
        'ngram_max': NGRAM_MAX,
    }
    header = (
        '// Обученная модель определения раздела (веса логистической регрессии).\n'
        '// Файл сгенерирован скриптом tools/train_model.py на датасете tools/dataset.json, руками не правится.\n'
    )
    body = 'const ML_MODEL = ' + json.dumps(model, ensure_ascii=False, separators=(',', ':')) + ';\n'
    (ROOT / 'model.js').write_text(header + body, encoding='utf-8')
    print(f'Wrote model.js: {len(model["vocab"])} grams, {len(model["classes"])} classes', file=sys.stderr)


if __name__ == '__main__':
    main()
