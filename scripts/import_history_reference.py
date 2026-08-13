#!/usr/bin/env python3
"""Generate reference timeline items from the supplied page-level OCR JSON.

The importer is deliberately conservative:
- the printed date label is preserved while a representative signed year is
  used only for sorting;
- existing authored items win over reference duplicates;
- attribution falls back to the international line instead of guessing;
- imported facts are marked ``reference`` until independently verified.
"""

from __future__ import annotations

import argparse
import json
import re
import unicodedata
from dataclasses import dataclass
from difflib import SequenceMatcher
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_TS = ROOT / "src/data/items/reference.ts"
OUTPUT_CONTENT = ROOT / "content/items/reference"
REPORT = ROOT / "docs/reference-import-report.md"
COUNTRY_OVERRIDES_PATH = ROOT / "scripts/reference_country_overrides.json"

# Некоторые заголовки принципиально неоднозначны: в них названы сразу несколько
# государств, место конференции не совпадает с её исторической линией или имя
# деятеля важнее формулировки OCR. Этот проверенный список применяется по
# стабильному id после общей эвристики и не даёт повторному импорту вернуть уже
# исправленные атрибуции.
REFERENCE_COUNTRY_OVERRIDES: dict[str, str] = json.loads(
    COUNTRY_OVERRIDES_PATH.read_text(encoding="utf-8"),
)

# Исправление опечатки в заголовке не должно менять публичный id карточки и
# ломать сохранённые ссылки/связи.
STABLE_REFERENCE_IDS: dict[str, str] = {
    "Возникновение города-государства Ашшур": "ref-p009-vozniknovenie-goroda-gosudarstva-apipur",
}

MONTHS = {
    "январ": 1,
    "феврал": 2,
    "март": 3,
    "апрел": 4,
    "мая": 5,
    "май": 5,
    "июн": 6,
    "июл": 7,
    "август": 8,
    "сентябр": 9,
    "октябр": 10,
    "ноябр": 11,
    "декабр": 12,
}

ROMAN_VALUES = {"I": 1, "V": 5, "X": 10, "L": 50, "C": 100, "D": 500, "M": 1000}

TEXT_REPLACEMENTS = {
    "Тутмоса Ш": "Тутмоса III",
    "Рамcece ||": "Рамсеса II",
    "Рамсесом ||": "Рамсесом II",
    "Навуходоносора П": "Навуходоносора II",
    "Навуходоносором Il": "Навуходоносором II",
    "Дария 1": "Дария I",
    "Филиппа П": "Филиппа II",
    "законов ХП таблиц": "законов XII таблиц",
    "Карла У": "Карла V",
    "Ивана Ш": "Ивана III",
    "Ивана ТУ": "Ивана IV",
    "Иваном [У": "Иваном IV",
    "Петром [": "Петром I",
    "Екатерины П": "Екатерины II",
    "Май 1908": "Май 1968",
    "апреле 1901": "апреле 1961",
    "2 июля 1970": "2 июля 1976",
    "войнав": "война в",
    "разгабление": "разграбление",
    "италиискими": "италийскими",
    "КНРв": "КНР в",
    "КНРс": "КНР с",
    "г.в": "г. в",
    "CPB": "СРВ",
    "КИК": "ЦК КПК",
    "сьезд": "съезд",
    "сегуном": "сёгуном",
    "ТУтмос": "Тутмос",
    "Viepycaлим": "Иерусалим",
    "OTO льда": "ото льда",
    "Аполлон-1 I": "Аполлон-11",
    "более ТО млн": "более 10 млн",
    "1 б-тысячной": "16-тысячной",
    "192Т г.": "1921 г.",
    "19Т9г.": "1919 г.",
    "191У гг.": "1917 гг.",
    "I O-4aсовой": "10-часовой",
    "| O-4aсовой": "10-часовой",
    "(Han)": "(нэп)",
    "Han стимулировал": "Нэп стимулировал",
    "К 1920 г. СССР достиг довоенного уровня": "К 1926 г. СССР достиг довоенного уровня",
    "С. I). Королевым": "С. П. Королёвым",
    "гражданин СССР tO. А. Гагарин": "гражданин СССР Ю. А. Гагарин",
    "в мае 1900 г. правительство Демократической партии": "в мае 1960 г. правительство Демократической партии",
    "В мае 1900 г. правительство Демократической партии": "В мае 1960 г. правительство Демократической партии",
    "требования НАТО ‹«вывести": "требования НАТО «вывести",
    "napламент": "парламент",
    "Погибло более ТОО тыс.": "Погибло более 100 тыс.",
    "Аполлон-1 |": "Аполлон-11",
    "Тутмос I!": "Тутмос III",
    "Тир (Cyp)": "Тир",
    "Апипур": "Ашшур",
    "на I 2 деревянных": "на 12 деревянных",
    "Kaролингская": "Каролингская",
    "NANA ПОД HATUCKOM": "пала под натиском",
    "BNOCTb": "власть",
    "богатые горожане тяготились зависимостью OT феодалов": "богатые горожане тяготились зависимостью от феодалов",
    " A5": "",
    "Дж. Kea": "Дж. Кея",
    "Haциональным": "Национальным",
    "управление ca- мого царя": "управление самого царя",
    "Ивану М безгранично": "Ивану IV безгранично",
    "6eглых": "беглых",
    "швед- CKUM": "шведским",
    "Ceвастополь": "Севастополь",
    "предоставления OQBTOHOMUU Чехии В СО- ставе": "предоставления автономии Чехии в составе",
    "Закончилась 1/ июня": "Закончилась 17 июня",
    "450 МЛН naHos": "450 млн лянов",
    "деятельности всех пар- TUM": "деятельности всех партий",
    "созда- i? тель": "создатель",
    "Пунических. Zs": "Пунических.",
    "Итоги работы П Всероссийского": "Итоги работы II Всероссийского",
    "(BLINK)": "(ВЦИК)",
    "Kpaсная": "Красная",
    "EOYC": "ЕОУС",
    "Maастрихт": "Маастрихт",
    "(EC)": "(ЕС)",
    "penapaции": "репарации",
    "Союза CCP": "Союза ССР",
    "(BC)": "(ВС)",
    "ОСН о разделе": "ООН о разделе",
    "тыс. KM’": "тыс. км²",
    "Болгаova": "Болгария",
    "в феврале 1930 г. Народный фронт": "в феврале 1936 г. Народный фронт",
    "OQBTOHOMUU": "автономии",
    "Чехии В СОставе": "Чехии в составе",
    "Проходила ПОД лозунгом": "Проходила под лозунгом",
}

WRAPPED_TITLES: dict[str, tuple[str, str]] = {
    "Ромул Августул — последний император Западной Римской": ("Ромул Августул — последний император Западной Римской империи", "империи"),
    "Вторжение монголов на территории Польши, Хорватии, Чехии,": ("Вторжение монголов на территории Польши, Хорватии, Чехии и Венгрии", "Венгрии"),
    "Заключение Брестского мирного договора между Советской": ("Заключение Брестского мирного договора между Советской Россией и Германией", "Россией и Германией"),
    "Нападение Японии на американскую военно-морскую базу": ("Нападение Японии на Перл-Харбор. Вступление США во Вторую мировую войну", "Перл-Харбор. Вступление США во Вторую мировую войну"),
    "\u0412\u043e\u0437\u043d\u0438\u043a\u043d\u043e\u0432\u0435\u043d\u0438\u0435 \u043f\u0435\u0440\u0432\u044b\u0445 \u0433\u043e\u0440\u043e\u0434\u043e\u0432-\u0433\u043e\u0441\u0443\u0434\u0430\u0440\u0441\u0442\u0432 \u0432 \u0434\u043e\u043b\u0438\u043d\u0435 \u0422\u0438\u0433\u0440\u0430": ("\u0412\u043e\u0437\u043d\u0438\u043a\u043d\u043e\u0432\u0435\u043d\u0438\u0435 \u043f\u0435\u0440\u0432\u044b\u0445 \u0433\u043e\u0440\u043e\u0434\u043e\u0432-\u0433\u043e\u0441\u0443\u0434\u0430\u0440\u0441\u0442\u0432 \u0432 \u0434\u043e\u043b\u0438\u043d\u0435 \u0422\u0438\u0433\u0440\u0430 \u0438 \u0415\u0432\u0444\u0440\u0430\u0442\u0430 \u0438 \u0438\u0437\u043e\u0431\u0440\u0435\u0442\u0435\u043d\u0438\u0435 \u043a\u043b\u0438\u043d\u043e\u043f\u0438\u0441\u043d\u043e\u0433\u043e \u043f\u0438\u0441\u044c\u043c\u0430", "\u0438 \u0415\u0432\u0444\u0440\u0430\u0442\u0430 \u0438 \u0438\u0437\u043e\u0431\u0440\u0435\u0442\u0435\u043d\u0438\u0435 \u043a\u043b\u0438\u043d\u043e\u043f\u0438\u0441\u043d\u043e\u0433\u043e \u043f\u0438\u0441\u044c\u043c\u0430"),
    "\u041d\u0438\u0437\u043b\u043e\u0436\u0435\u043d\u0438\u0435 \u0420\u043e\u043c\u0443\u043b\u0430 \u0410\u0432\u0433\u0443\u0441\u0442\u0443\u043b\u0430. \u041f\u0430\u0434\u0435\u043d\u0438\u0435 \u0417\u0430\u043f\u0430\u0434\u043d\u043e\u0439 \u0420\u0438\u043c\u0441\u043a\u043e\u0439": ("\u041d\u0438\u0437\u043b\u043e\u0436\u0435\u043d\u0438\u0435 \u0420\u043e\u043c\u0443\u043b\u0430 \u0410\u0432\u0433\u0443\u0441\u0442\u0443\u043b\u0430. \u041f\u0430\u0434\u0435\u043d\u0438\u0435 \u0417\u0430\u043f\u0430\u0434\u043d\u043e\u0439 \u0420\u0438\u043c\u0441\u043a\u043e\u0439 \u0438\u043c\u043f\u0435\u0440\u0438\u0438", "\u0438\u043c\u043f\u0435\u0440\u0438\u0438"),
    "\u041c\u043e\u043d\u0433\u043e\u043b\u044c\u0441\u043a\u0438\u0435 \u043f\u043e\u0445\u043e\u0434\u044b \u0432 \u041a\u0438\u0442\u0430\u0439, \u0421\u0440\u0435\u0434\u043d\u044e\u044e \u0410\u0437\u0438\u044e, \u0417\u0430\u043a\u0430\u0432\u043a\u0430\u0437\u044c\u0435": ("\u041c\u043e\u043d\u0433\u043e\u043b\u044c\u0441\u043a\u0438\u0435 \u043f\u043e\u0445\u043e\u0434\u044b \u0432 \u041a\u0438\u0442\u0430\u0439, \u0421\u0440\u0435\u0434\u043d\u044e\u044e \u0410\u0437\u0438\u044e, \u0417\u0430\u043a\u0430\u0432\u043a\u0430\u0437\u044c\u0435 \u0438 \u0415\u0432\u0440\u043e\u043f\u0443", "\u0438 \u0415\u0432\u0440\u043e\u043f\u0443"),
    "\u041f\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u0435 \u0418\u0432\u0430\u043d\u0430 \u041a\u0430\u043b\u0438\u0442\u044b (1325\u20141340). \u0423\u0441\u0438\u043b\u0435\u043d\u0438\u0435 \u041c\u043e\u0441\u043a\u043e\u0432\u0441\u043a\u043e\u0433\u043e": ("\u041f\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u0435 \u0418\u0432\u0430\u043d\u0430 \u041a\u0430\u043b\u0438\u0442\u044b (1325\u20141340). \u0423\u0441\u0438\u043b\u0435\u043d\u0438\u0435 \u041c\u043e\u0441\u043a\u043e\u0432\u0441\u043a\u043e\u0433\u043e \u043a\u043d\u044f\u0436\u0435\u0441\u0442\u0432\u0430", "\u043a\u043d\u044f\u0436\u0435\u0441\u0442\u0432\u0430"),
    "\u0412\u043e\u0439\u043d\u0430 \u0437\u0430 \u043d\u0435\u0437\u0430\u0432\u0438\u0441\u0438\u043c\u043e\u0441\u0442\u044c \u0438\u0441\u043f\u0430\u043d\u0441\u043a\u0438\u0445 \u043a\u043e\u043b\u043e\u043d\u0438\u0439 \u0432 \u041b\u0430\u0442\u0438\u043d\u0441\u043a\u043e\u0439 \u0410\u043c\u0435-": ("\u0412\u043e\u0439\u043d\u0430 \u0437\u0430 \u043d\u0435\u0437\u0430\u0432\u0438\u0441\u0438\u043c\u043e\u0441\u0442\u044c \u0438\u0441\u043f\u0430\u043d\u0441\u043a\u0438\u0445 \u043a\u043e\u043b\u043e\u043d\u0438\u0439 \u0432 \u041b\u0430\u0442\u0438\u043d\u0441\u043a\u043e\u0439 \u0410\u043c\u0435\u0440\u0438\u043a\u0435", "\u0440\u0438\u043a\u0435"),
    "\u0417\u0430\u043a\u043b\u044e\u0447\u0438\u0442\u0435\u043b\u044c\u043d\u044b\u0439 \u043f\u0440\u043e\u0442\u043e\u043a\u043e\u043b \u2014 \u0441\u043e\u0433\u043b\u0430\u0448\u0435\u043d\u0438\u0435 \u043e\u0442 7 \u0441\u0435\u043d\u0442\u044f\u0431\u0440\u044f 1901 \u0433.": ("\u0417\u0430\u043a\u043b\u044e\u0447\u0438\u0442\u0435\u043b\u044c\u043d\u044b\u0439 \u043f\u0440\u043e\u0442\u043e\u043a\u043e\u043b \u2014 \u0441\u043e\u0433\u043b\u0430\u0448\u0435\u043d\u0438\u0435 \u043c\u0435\u0436\u0434\u0443 \u041a\u0438\u0442\u0430\u0435\u043c \u0438 11 \u0434\u0435\u0440\u0436\u0430\u0432\u0430\u043c\u0438", "\u043c\u0435\u0436\u0434\u0443 \u041a\u0438\u0442\u0430\u0435\u043c \u0438 11 \u0434\u0435\u0440\u0436\u0430\u0432\u0430\u043c\u0438"),
    "\u0413\u0435\u043d\u0443\u044d\u0437\u0441\u043a\u0430\u044f \u043a\u043e\u043d\u0444\u0435\u0440\u0435\u043d\u0446\u0438\u044f. \u041f\u043e\u0434\u043f\u0438\u0441\u0430\u043d\u0438\u0435 \u0420\u0430\u043f\u0430\u043b\u043b\u044c\u0441\u043a\u043e\u0433\u043e \u0434\u043e\u0433\u043e\u0432\u043e\u0440\u0430": ("\u0413\u0435\u043d\u0443\u044d\u0437\u0441\u043a\u0430\u044f \u043a\u043e\u043d\u0444\u0435\u0440\u0435\u043d\u0446\u0438\u044f. \u041f\u043e\u0434\u043f\u0438\u0441\u0430\u043d\u0438\u0435 \u0420\u0430\u043f\u0430\u043b\u043b\u044c\u0441\u043a\u043e\u0433\u043e \u0434\u043e\u0433\u043e\u0432\u043e\u0440\u0430 \u043c\u0435\u0436\u0434\u0443 \u0413\u0435\u0440\u043c\u0430\u043d\u0438\u0435\u0439 \u0438 \u0420\u0421\u0424\u0421\u0420", "\u043c\u0435\u0436\u0434\u0443 \u0413\u0435\u0440\u043c\u0430\u043d\u0438\u0435\u0439 \u0438 \u0420\u0421\u0424\u0421\u0420"),
    "\u0413\u043e\u0441\u0443\u0434\u0430\u0440\u0441\u0442\u0432\u0435\u043d\u043d\u044b\u0439 \u043f\u0435\u0440\u0435\u0432\u043e\u0440\u043e\u0442 \u0432 \u041a\u043e\u0440\u043e\u043b\u0435\u0432\u0441\u0442\u0432\u0435 \u0441\u0435\u0440\u0431\u043e\u0432, \u0445\u043e\u0440\u0432\u0430\u0442\u043e\u0432": ("\u0413\u043e\u0441\u0443\u0434\u0430\u0440\u0441\u0442\u0432\u0435\u043d\u043d\u044b\u0439 \u043f\u0435\u0440\u0435\u0432\u043e\u0440\u043e\u0442 \u0432 \u041a\u043e\u0440\u043e\u043b\u0435\u0432\u0441\u0442\u0432\u0435 \u0441\u0435\u0440\u0431\u043e\u0432, \u0445\u043e\u0440\u0432\u0430\u0442\u043e\u0432 \u0438 \u0441\u043b\u043e\u0432\u0435\u043d\u0446\u0435\u0432", "\u0438 \u0441\u043b\u043e\u0432\u0435\u043d\u0446\u0435\u0432"),
    "\u041f\u043e\u0431\u0435\u0434\u0430 \u041d\u0430\u0440\u043e\u0434\u043d\u043e\u0433\u043e \u0444\u0440\u043e\u043d\u0442\u0430 \u043d\u0430 \u043f\u0430\u0440\u043b\u0430\u043c\u0435\u043d\u0442\u0441\u043a\u0438\u0445 \u0432\u044b\u0431\u043e\u0440\u0430\u0445 \u0432\u043e \u0424\u0440\u0430\u043d-": ("\u041f\u043e\u0431\u0435\u0434\u0430 \u041d\u0430\u0440\u043e\u0434\u043d\u043e\u0433\u043e \u0444\u0440\u043e\u043d\u0442\u0430 \u043d\u0430 \u043f\u0430\u0440\u043b\u0430\u043c\u0435\u043d\u0442\u0441\u043a\u0438\u0445 \u0432\u044b\u0431\u043e\u0440\u0430\u0445 \u0432\u043e \u0424\u0440\u0430\u043d\u0446\u0438\u0438", "\u0426\u0418\u0418"),
    "\u041c\u044e\u043d\u0445\u0435\u043d\u0441\u043a\u0430\u044f \u043a\u043e\u043d\u0444\u0435\u0440\u0435\u043d\u0446\u0438\u044f \u0413\u0435\u0440\u043c\u0430\u043d\u0438\u0438, \u0418\u0442\u0430\u043b\u0438\u0438, \u0412\u0435\u043b\u0438\u043a\u043e\u0431\u0440\u0438\u0442\u0430\u043d\u0438\u0438": ("\u041c\u044e\u043d\u0445\u0435\u043d\u0441\u043a\u0430\u044f \u043a\u043e\u043d\u0444\u0435\u0440\u0435\u043d\u0446\u0438\u044f \u0413\u0435\u0440\u043c\u0430\u043d\u0438\u0438, \u0418\u0442\u0430\u043b\u0438\u0438, \u0412\u0435\u043b\u0438\u043a\u043e\u0431\u0440\u0438\u0442\u0430\u043d\u0438\u0438 \u0438 \u0424\u0440\u0430\u043d\u0446\u0438\u0438", "\u0438 \u0424\u0440\u0430\u043d\u0446\u0438\u0438"),
    "\u0414\u0435\u044f\u0442\u0435\u043b\u044c\u043d\u043e\u0441\u0442\u044c \u041a\u043e\u043c\u043c\u0443\u043d\u0438\u0441\u0442\u0438\u0447\u0435\u0441\u043a\u043e\u0433\u043e \u0438\u043d\u0442\u0435\u0440\u043d\u0430\u0446\u0438\u043e\u043d\u0430\u043b\u0430 (\u041a\u043e\u043c\u0438\u043d-": ("\u0414\u0435\u044f\u0442\u0435\u043b\u044c\u043d\u043e\u0441\u0442\u044c \u041a\u043e\u043c\u043c\u0443\u043d\u0438\u0441\u0442\u0438\u0447\u0435\u0441\u043a\u043e\u0433\u043e \u0438\u043d\u0442\u0435\u0440\u043d\u0430\u0446\u0438\u043e\u043d\u0430\u043b\u0430 (\u041a\u043e\u043c\u0438\u043d\u0442\u0435\u0440\u043d\u0430)", "\u0442\u0435\u0440\u043d\u0430)"),
    "\u041f\u043e\u0434\u043f\u0438\u0441\u0430\u043d\u0438\u0435 \u0441\u043e\u0432\u0435\u0442\u0441\u043a\u043e-\u0433\u0435\u0440\u043c\u0430\u043d\u0441\u043a\u043e\u0433\u043e \u0434\u043e\u0433\u043e\u0432\u043e\u0440\u0430 \u043e \u043d\u0435\u043d\u0430\u043f\u0430\u0434\u0435\u043d\u0438\u0438": ("\u041f\u043e\u0434\u043f\u0438\u0441\u0430\u043d\u0438\u0435 \u0441\u043e\u0432\u0435\u0442\u0441\u043a\u043e-\u0433\u0435\u0440\u043c\u0430\u043d\u0441\u043a\u043e\u0433\u043e \u0434\u043e\u0433\u043e\u0432\u043e\u0440\u0430 \u043e \u043d\u0435\u043d\u0430\u043f\u0430\u0434\u0435\u043d\u0438\u0438 \u0438 \u043d\u0435\u0439\u0442\u0440\u0430\u043b\u0438\u0442\u0435\u0442\u0435", "\u0438 \u043d\u0435\u0439\u0442\u0440\u0430\u043b\u0438\u0442\u0435\u0442\u0435"),
    "\u041f\u043e\u0434\u043f\u0438\u0441\u0430\u043d\u0438\u0435 \u0441\u043e\u0432\u0435\u0442\u0441\u043a\u043e-\u0433\u0435\u0440\u043c\u0430\u043d\u0441\u043a\u043e\u0433\u043e \u043f\u0430\u043a\u0442\u0430 \u043e \u043d\u0435\u043d\u0430\u043f\u0430\u0434\u0435\u043d\u0438\u0438 (\u043f\u0430\u043a\u0442": ("\u041f\u043e\u0434\u043f\u0438\u0441\u0430\u043d\u0438\u0435 \u0441\u043e\u0432\u0435\u0442\u0441\u043a\u043e-\u0433\u0435\u0440\u043c\u0430\u043d\u0441\u043a\u043e\u0433\u043e \u043f\u0430\u043a\u0442\u0430 \u043e \u043d\u0435\u043d\u0430\u043f\u0430\u0434\u0435\u043d\u0438\u0438 (\u043f\u0430\u043a\u0442 \u041c\u043e\u043b\u043e\u0442\u043e\u0432\u0430 \u2014 \u0420\u0438\u0431\u0431\u0435\u043d\u0442\u0440\u043e\u043f\u0430)", "\u041c\u043e\u043b\u043e\u0442\u043e\u0432\u0430 \u2014 \u0420\u0438\u0431\u0431\u0435\u043d\u0442\u0440\u043e\u043f\u0430)"),
    "\u041f\u043e\u0434\u043f\u0438\u0441\u0430\u043d\u0438\u0435 \u0422\u0440\u043e\u0439\u0441\u0442\u0432\u0435\u043d\u043d\u043e\u0433\u043e \u043f\u0430\u043a\u0442\u0430 \u043c\u0435\u0436\u0434\u0443 \u042f\u043f\u043e\u043d\u0438\u0435\u0439, \u0413\u0435\u0440\u043c\u0430\u043d\u0438\u0435\u0439": ("\u041f\u043e\u0434\u043f\u0438\u0441\u0430\u043d\u0438\u0435 \u0422\u0440\u043e\u0439\u0441\u0442\u0432\u0435\u043d\u043d\u043e\u0433\u043e \u043f\u0430\u043a\u0442\u0430 \u043c\u0435\u0436\u0434\u0443 \u042f\u043f\u043e\u043d\u0438\u0435\u0439, \u0413\u0435\u0440\u043c\u0430\u043d\u0438\u0435\u0439 \u0438 \u0418\u0442\u0430\u043b\u0438\u0435\u0439", "\u0438 \u0418\u0442\u0430\u043b\u0438\u0435\u0439"),
    "\u041d\u0430\u043f\u0430\u0434\u0435\u043d\u0438\u0435 \u0413\u0435\u0440\u043c\u0430\u043d\u0438\u0438 \u043d\u0430 \u0421\u0421\u0421\u0420 \u041d\u0430\u0447\u0430\u043b\u043e \u0412\u0435\u043b\u0438\u043a\u043e\u0439 \u041e\u0442\u0435\u0447\u0435\u0441\u0442\u0432\u0435\u043d\u043d\u043e\u0439": ("\u041d\u0430\u043f\u0430\u0434\u0435\u043d\u0438\u0435 \u0413\u0435\u0440\u043c\u0430\u043d\u0438\u0438 \u043d\u0430 \u0421\u0421\u0421\u0420. \u041d\u0430\u0447\u0430\u043b\u043e \u0412\u0435\u043b\u0438\u043a\u043e\u0439 \u041e\u0442\u0435\u0447\u0435\u0441\u0442\u0432\u0435\u043d\u043d\u043e\u0439 \u0432\u043e\u0439\u043d\u044b", "\u0432\u043e\u0439\u043d\u044b"),
    "\u041f\u043e\u0434\u043f\u0438\u0441\u0430\u043d\u0438\u0435 \u0412\u0435\u043b\u0438\u043a\u043e\u0431\u0440\u0438\u0442\u0430\u043d\u0438\u0435\u0439 \u0438 \u0421\u0428\u0410 \u0410\u0442\u043b\u0430\u043d\u0442\u0438\u0447\u0435\u0441\u043a\u043e\u0439 \u0445\u0430\u0440-": ("\u041f\u043e\u0434\u043f\u0438\u0441\u0430\u043d\u0438\u0435 \u0412\u0435\u043b\u0438\u043a\u043e\u0431\u0440\u0438\u0442\u0430\u043d\u0438\u0435\u0439 \u0438 \u0421\u0428\u0410 \u0410\u0442\u043b\u0430\u043d\u0442\u0438\u0447\u0435\u0441\u043a\u043e\u0439 \u0445\u0430\u0440\u0442\u0438\u0438", "THU"),
    "\u041f\u043e\u0434\u043f\u0438\u0441\u0430\u043d\u0438\u0435 \u0414\u0435\u043a\u043b\u0430\u0440\u0430\u0446\u0438\u0438 \u041e\u0431\u044a\u0435\u0434\u0438\u043d\u0435\u043d\u043d\u044b\u0445 \u041d\u0430\u0446\u0438\u0439. \u0421\u043e\u0437\u0434\u0430\u043d\u0438\u0435": ("\u041f\u043e\u0434\u043f\u0438\u0441\u0430\u043d\u0438\u0435 \u0414\u0435\u043a\u043b\u0430\u0440\u0430\u0446\u0438\u0438 \u041e\u0431\u044a\u0435\u0434\u0438\u043d\u0435\u043d\u043d\u044b\u0445 \u041d\u0430\u0446\u0438\u0439. \u0421\u043e\u0437\u0434\u0430\u043d\u0438\u0435 \u0430\u043d\u0442\u0438\u0433\u0438\u0442\u043b\u0435\u0440\u043e\u0432\u0441\u043a\u043e\u0439 \u043a\u043e\u0430\u043b\u0438\u0446\u0438\u0438", "\u0430\u043d\u0442\u0438\u0433\u0438\u0442\u043b\u0435\u0440\u043e\u0432\u0441\u043a\u043e\u0439 \u043a\u043e\u0430\u043b\u0438\u0446\u0438\u0438"),
    "\u0412\u044b\u0441\u0430\u0434\u043a\u0430 \u0430\u043d\u0433\u043b\u043e-\u0430\u043c\u0435\u0440\u0438\u043a\u0430\u043d\u0441\u043a\u0438\u0445 \u0432\u043e\u0439\u0441\u043a \u0432 \u0415\u0432\u0440\u043e\u043f\u0435: \u041d\u043e\u0440\u043c\u0430\u043d\u0434\u0441\u043a\u0430\u044f": ("\u0412\u044b\u0441\u0430\u0434\u043a\u0430 \u0430\u043d\u0433\u043b\u043e-\u0430\u043c\u0435\u0440\u0438\u043a\u0430\u043d\u0441\u043a\u0438\u0445 \u0432\u043e\u0439\u0441\u043a \u0432 \u0415\u0432\u0440\u043e\u043f\u0435: \u041d\u043e\u0440\u043c\u0430\u043d\u0434\u0441\u043a\u0430\u044f \u043e\u043f\u0435\u0440\u0430\u0446\u0438\u044f", "\u043e\u043f\u0435\u0440\u0430\u0446\u0438\u044f"),
    "\u041c\u0435\u0436\u0434\u0443\u043d\u0430\u0440\u043e\u0434\u043d\u044b\u0439 \u0441\u0443\u0434\u0435\u0431\u043d\u044b\u0439 \u043f\u0440\u043e\u0446\u0435\u0441\u0441 \u043d\u0430\u0434 \u0433\u043b\u0430\u0432\u043d\u044b\u043c\u0438 \u043d\u0430\u0446\u0438\u0441\u0442\u0441\u043a\u0438\u043c\u0438": ("\u041c\u0435\u0436\u0434\u0443\u043d\u0430\u0440\u043e\u0434\u043d\u044b\u0439 \u0441\u0443\u0434\u0435\u0431\u043d\u044b\u0439 \u043f\u0440\u043e\u0446\u0435\u0441\u0441 \u043d\u0430\u0434 \u0433\u043b\u0430\u0432\u043d\u044b\u043c\u0438 \u043d\u0430\u0446\u0438\u0441\u0442\u0441\u043a\u0438\u043c\u0438 \u043f\u0440\u0435\u0441\u0442\u0443\u043f\u043d\u0438\u043a\u0430\u043c\u0438 \u0432 \u041d\u044e\u0440\u043d\u0431\u0435\u0440\u0433\u0435", "\u043f\u0440\u0435\u0441\u0442\u0443\u043f\u043d\u0438\u043a\u0430\u043c\u0438 \u0432 \u041d\u044e\u0440\u043d\u0431\u0435\u0440\u0433\u0435 (\u0413\u0435\u0440\u043c\u0430\u043d\u0438\u044f)"),
    "\u041f\u043e\u043b\u0438\u0442\u0438\u0447\u0435\u0441\u043a\u043e\u0435 \u043f\u0440\u043e\u0442\u0438\u0432\u043e\u0441\u0442\u043e\u044f\u043d\u0438\u0435 \u0432 \u0427\u0435\u0445\u043e\u0441\u043b\u043e\u0432\u0430\u043a\u0438\u0438 (\u041f\u0440\u0430\u0436\u0441\u043a\u0430\u044f": ("\u041f\u043e\u043b\u0438\u0442\u0438\u0447\u0435\u0441\u043a\u043e\u0435 \u043f\u0440\u043e\u0442\u0438\u0432\u043e\u0441\u0442\u043e\u044f\u043d\u0438\u0435 \u0432 \u0427\u0435\u0445\u043e\u0441\u043b\u043e\u0432\u0430\u043a\u0438\u0438 (\u041f\u0440\u0430\u0436\u0441\u043a\u0430\u044f \u0432\u0435\u0441\u043d\u0430)", "\u0432\u0435\u0441\u043d\u0430)"),
    "\u0410\u043d\u0442\u0438\u043a\u043e\u043c\u043c\u0443\u043d\u0438\u0441\u0442\u0438\u0447\u0435\u0441\u043a\u0438\u0435 \u0440\u0435\u0432\u043e\u043b\u044e\u0446\u0438\u0438 \u0432 \u0426\u0435\u043d\u0442\u0440\u0430\u043b\u044c\u043d\u043e\u0439 \u0438 \u0412\u043e\u0441\u0442\u043e\u0447-": ("\u0410\u043d\u0442\u0438\u043a\u043e\u043c\u043c\u0443\u043d\u0438\u0441\u0442\u0438\u0447\u0435\u0441\u043a\u0438\u0435 \u0440\u0435\u0432\u043e\u043b\u044e\u0446\u0438\u0438 \u0432 \u0426\u0435\u043d\u0442\u0440\u0430\u043b\u044c\u043d\u043e\u0439 \u0438 \u0412\u043e\u0441\u0442\u043e\u0447\u043d\u043e\u0439 \u0415\u0432\u0440\u043e\u043f\u0435", "\u043d\u043e\u0439 \u0415\u0432\u0440\u043e\u043f\u0435"),
    "\u041f\u0440\u0435\u0434\u043e\u0441\u0442\u0430\u0432\u043b\u0435\u043d\u0438\u0435 \u043d\u0435\u0437\u0430\u0432\u0438\u0441\u0438\u043c\u043e\u0441\u0442\u0438 \u0411\u0440\u0438\u0442\u0430\u043d\u0441\u043a\u043e\u0439 \u0418\u043d\u0434\u0438\u0438, \u0435\u0435 \u0440\u0430\u0437\u0434\u0435\u043b": ("\u041f\u0440\u0435\u0434\u043e\u0441\u0442\u0430\u0432\u043b\u0435\u043d\u0438\u0435 \u043d\u0435\u0437\u0430\u0432\u0438\u0441\u0438\u043c\u043e\u0441\u0442\u0438 \u0411\u0440\u0438\u0442\u0430\u043d\u0441\u043a\u043e\u0439 \u0418\u043d\u0434\u0438\u0438 \u0438 \u0435\u0451 \u0440\u0430\u0437\u0434\u0435\u043b \u043d\u0430 \u0418\u043d\u0434\u0438\u044e \u0438 \u041f\u0430\u043a\u0438\u0441\u0442\u0430\u043d", "\u043d\u0430 \u0418\u043d\u0434\u0438\u044e \u0438 \u041f\u0430\u043a\u0438\u0441\u0442\u0430\u043d"),
    "\u0418\u0437\u0431\u0440\u0430\u043d\u0438\u0435 \u0425\u0443 \u042f\u043e\u0431\u0430\u043d\u0430 \u0433\u0435\u043d\u0435\u0440\u0430\u043b\u044c\u043d\u044b\u043c \u0441\u0435\u043a\u0440\u0435\u0442\u0430\u0440\u0435\u043c \u0426\u041a \u041a\u041f\u041a (1980\u2014": ("\u0418\u0437\u0431\u0440\u0430\u043d\u0438\u0435 \u0425\u0443 \u042f\u043e\u0431\u0430\u043d\u0430 \u0433\u0435\u043d\u0435\u0440\u0430\u043b\u044c\u043d\u044b\u043c \u0441\u0435\u043a\u0440\u0435\u0442\u0430\u0440\u0435\u043c \u0426\u041a \u041a\u041f\u041a (1980\u20141987)", "1987)"),
    "\u041f\u043e\u0434\u043f\u0438\u0441\u0430\u043d\u0438\u0435 \u0417\u0430\u043a\u043b\u044e\u0447\u0438\u0442\u0435\u043b\u044c\u043d\u043e\u0433\u043e \u0430\u043a\u0442\u0430 \u0421\u043e\u0432\u0435\u0449\u0430\u043d\u0438\u044f \u043f\u043e \u0431\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u043e-": ("\u041f\u043e\u0434\u043f\u0438\u0441\u0430\u043d\u0438\u0435 \u0417\u0430\u043a\u043b\u044e\u0447\u0438\u0442\u0435\u043b\u044c\u043d\u043e\u0433\u043e \u0430\u043a\u0442\u0430 \u0421\u043e\u0432\u0435\u0449\u0430\u043d\u0438\u044f \u043f\u043e \u0431\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u043e\u0441\u0442\u0438 \u0438 \u0441\u043e\u0442\u0440\u0443\u0434\u043d\u0438\u0447\u0435\u0441\u0442\u0432\u0443 \u0432 \u0415\u0432\u0440\u043e\u043f\u0435", "\u0441\u0442\u0438 \u0438 \u0441\u043e\u0442\u0440\u0443\u0434\u043d\u0438\u0447\u0435\u0441\u0442\u0432\u0443 \u0432 \u0415\u0432\u0440\u043e\u043f\u0435 (\u0421\u0411\u0421\u0415)"),
}

COUNTRY_RULES: list[tuple[str, tuple[str, ...]]] = [
    ("germany", ("германи", "германск", "гитлер", "веймар", "фрг", "гдр", "берлин", "рейнск")),
    ("england", ("англи", "великобрит", "британ", "стюарт", "кромвел", "хартия вольностей")),
    ("france", ("франц", "париж", "наполеон", "бастили", "орлеан", "авиньон")),
    ("russia", ("росси", "ссср", "советск", "рсфср", "москв", "ленинград", "петербург", "петр i", "екатерин")),
    ("belarus", ("беларус", "белорус", "бсср", "полоц", "туров", "чернобыл")),
    ("spain", ("испани", "кастили", "арагон", "реконкист", "пиренейск")),
    ("china", ("кита", "кнр", "пекин", "цин", "конфуц", "тяньаньмэнь")),
    ("japan", ("япони", "токуга", "фукусим", "маньчжоу-го")),
    ("usa", ("сша", "соединенн", "американск", "трумэн", "маршалл", "вашингтон")),
    ("italy", ("итали", "римск поход", "муссолини")),
    ("austria", ("австри", "габсбург")),
    ("netherlands", ("нидерланд", "голланд")),
    ("portugal", ("португал")),
    ("poland", ("польш", "польск")),
    ("czechia", ("чехослова", "чехи", "пражск", "богеми")),
    ("slovakia", ("словаки")),
    ("hungary", ("венгр", "будапешт")),
    ("romania", ("румын", "трансильван")),
    ("bulgaria", ("болгар")),
    ("serbia", ("серби", "югослав", "косов")),
    ("croatia", ("хорват")),
    ("greece", ("грец", "греци")),
    ("albania", ("албани")),
    ("finland", ("финлянд", "финск")),
    ("denmark", ("дани")),
    ("estonia", ("эстони")),
    ("latvia", ("латви")),
    ("lithuania", ("литв", "вкл", "кревск")),
    ("ukraine", ("украин")),
    ("turkey", ("турци", "турецк", "кемал", "анкар")),
    ("iran", ("иран", "пехлев", "персидск залив")),
    ("iraq", ("ирак", "багдад")),
    ("israel", ("государства израиль", "с израил", "израильск")),
    ("syria", ("сири")),
    ("lebanon", ("ливан")),
    ("kuwait", ("кувейт")),
    ("egypt", ("суэц", "современн егип", "египет, ирак")),
    ("india", ("инди", "ганди", "амритсар", "британской индии")),
    ("pakistan", ("пакистан")),
    ("bangladesh", ("бангладеш")),
    ("vietnam", ("вьетнам", "дрв", "индокитай")),
    ("korea", ("корей", "коре")),
    ("cambodia", ("камбодж", "кампучи", "пол пот")),
    ("mongolia", ("монгольской народной", "монголи")),
    ("cuba", ("куб", "кастро", "карибский кризис")),
    ("nicaragua", ("никарагу", "сандинист")),
    ("chile", ("чили")),
    ("brazil", ("бразили", "рио-де-жанейро")),
    ("argentina", ("аргентин")),
    ("mexico", ("мексик")),
    ("colombia", ("колумби")),
    ("panama", ("панам")),
    ("peru", ("перу")),
    ("algeria", ("алжир")),
    ("south-africa", ("юар", "южно-африкан", "капской колони")),
    ("congo", ("конго")),
    ("morocco", ("марокк")),
    ("tunisia", ("тунис")),
    ("nigeria", ("нигери")),
    ("cyprus", ("кипр")),
    ("afghanistan", ("афган")),
    ("ethiopia", ("эфиоп", "абиссин")),
]

HISTORICAL_RULES: list[tuple[str, tuple[str, ...]]] = [
    ("ancient-egypt", ("древн егип", "фараон", "нижнего и верхнего егип", "пирамид", "тутмос", "эхнатон", "рамсес", "гиксос")),
    ("mesopotamia", ("месопотам", "шумер", "долине тигра", "междуречь")),
    ("phoenicia", ("финики")),
    ("elam", ("элам")),
    ("hittites", ("хетт")),
    ("ancient-israel", ("царства израиль", "иудейск", "царя соломон")),
    ("assyria", ("ассири", "ниневи")),
    ("babylonia", ("вавилон", "хаммурапи", "навуходонос")),
    ("achaemenid-persia", ("ахеменид", "персидская держава", "дария i")),
    ("ancient-macedonia", ("александр македон", "македонского царя филипп", "македонск царств")),
    ("ancient-rome", ("рима", "римлян", "римской импер", "римск республи", "пуническ", "цезар", "октавиан", "спартак", "ганнибал")),
    ("byzantium", ("византи", "константинопол", "юстиниан")),
    ("frankish-empire", ("франкск импер", "карла велик", "верден")),
    ("arab-caliphate", ("арабск халифат", "мухаммед", "мекки в медину")),
    ("holy-roman-empire", ("священной римской импер")),
    ("kievan-rus", ("древнерус", "на руси", "батыя на русь", "князя владимир", "ярослава мудр", "любечск", "невск")),
    ("mongol-empire", ("чингисхан", "монгольск государ", "монгольск поход", "вторжение монгол")),
    ("khwarezm", ("хорезм")),
    ("delhi-sultanate", ("делийск султанат")),
    ("timurid-empire", ("тимур", "тамерлан")),
    ("ottoman-empire", ("осман", "сулейман великолеп")),
    ("mughal-empire", ("великих могол", "тадж-махал")),
    ("olmec", ("ольмек")),
    ("aztec", ("ацтек")),
    ("inca", ("инк")),
    ("songhai", ("сонгай")),
    ("kingdom-kongo", ("государства конго", "королевство конго")),
]

WORLD_MARKERS = (
    "мировая война",
    "организации объединенных наций",
    "лига наций",
    "международн",
    "мировой экономический кризис",
    "нефтяной кризис",
    "движения неприсоединения",
    "нераспространении ядерного",
    "европейского союза",
    "маастрихт",
    "нато",
    "варшавского договора",
    "европейского объединения",
    "европейского экономического",
    "семь чудес света",
    "великое переселение",
    "крестовый поход",
    "парижская мирная конференция",
    "ялтинская",
    "потсдамская",
    "тегеранская конференция",
)


@dataclass
class ParsedDate:
    year: int
    end_year: int | None = None
    month: int | None = None
    day: int | None = None
    approximate: bool = False


def clean_text(value: str) -> str:
    for old, new in TEXT_REPLACEMENTS.items():
        value = value.replace(old, new)
    value = value.replace("|", "I")
    value = re.sub(r"\s+", " ", value).strip()
    # Some OCR word boundaries become ordinary spaces only after normalization.
    for old, new in TEXT_REPLACEMENTS.items():
        value = value.replace(old, new)
    value = re.sub(r"\s+([,.;:])", r"\1", value)
    return value


def strip_scanned_page_tail(value: str, page: int) -> str:
    """Remove page numbers accidentally captured as the final OCR token."""
    for marker in (f" {page} {page + 1}", f" {page + 1}", f" {page}"):
        if value.endswith(marker):
            return value[: -len(marker)].rstrip()
    return value


def normalize_roman_token(token: str) -> str:
    token = token.upper().replace("І", "I")
    known = {
        "У": "V", "П": "II", "Ш": "III", "ТУ": "IV", "УП": "VII",
        "УПI": "VIII", "УП!": "VIII", "ИХ": "IX", "ХП": "XII",
        "ХИ": "XII", "ХИI": "XIII", "ХИ!": "XIII", "ХУ": "XV",
        "ХУI": "XVI", "ХУП": "XVII", "ХУПI": "XVIII",
    }
    return known.get(token, token.replace("Х", "X").replace("У", "V"))


def roman_to_int(token: str) -> int | None:
    token = normalize_roman_token(token)
    if not token or any(char not in ROMAN_VALUES for char in token):
        return None
    total = 0
    previous = 0
    for char in reversed(token):
        value = ROMAN_VALUES[char]
        total += -value if value < previous else value
        previous = max(previous, value)
    return total or None


def normalize_date_label(label: str) -> str:
    label = clean_text(label)
    label = re.sub(r"(\d{3,4})\s*г$", r"\1 г.", label)
    label = re.sub(r"(?<=\d)(гг?|вв?)\.", r" \1.", label, flags=re.I)
    label = re.sub(r"\s*[—–]\s*", " – ", label)
    label = label.replace("п. до н. э.", "гг. до н. э.").replace("HO H. э.", "до н. э.")
    label = label.replace("VI-—IV", "VI–IV").replace("— ", "–").replace(" —", "–")
    label = re.sub(r"(?i)\brr\.", "гг.", label)

    # OCR often substitutes Cyrillic glyphs in compact Roman numerals.
    roman_ocr = {
        "\u0418\u0425": "IX", "\u0425\u0418": "XII", "\u0425\u041d\u0418": "XIII", "\u0425\u0418!": "XIII", "\u0425\u041f": "XII",
        "\u0423\u041f": "VII", "\u0423\u041f!": "VIII", "\u0425\u0423": "XV", "\u0425\u0418!": "XIII",
    }
    for wrong, right in sorted(roman_ocr.items(), key=lambda pair: len(pair[0]), reverse=True):
        label = label.replace(wrong, right)

    def fix_roman(match: re.Match[str]) -> str:
        left = normalize_roman_token(match.group(1))
        right = normalize_roman_token(match.group(2)) if match.group(2) else None
        return left + (f"–{right}" if right else "") + f" {match.group(3)}."

    return re.sub(r"\b([IVXLCDMХІУПШТ!]+)(?:[–—-]+([IVXLCDMХІУПШТ!]+))?\s+(в|вв)\.", fix_roman, label, flags=re.I)


def century_year(century: int, bce: bool, qualifier: str) -> int:
    if bce:
        if "конец" in qualifier:
            return -(century * 100 - 10)
        if "середин" in qualifier:
            return -(century * 100 - 50)
        return -(century * 100)
    base = (century - 1) * 100 + 1
    if "конец" in qualifier:
        return base + 89
    if "середин" in qualifier:
        return base + 49
    return base


def parse_date(raw: str) -> tuple[str, ParsedDate | None]:
    label = normalize_date_label(raw)
    lower = label.lower()
    lower = re.sub(r"(?<=\d)-?[\u0435e](?=\s+\u0433\u0433\.)", "", lower)
    approximate = any(word in lower for word in ("около", "примерно", "более", "свыше"))

    # A century range that explicitly crosses from BCE to CE.
    match = re.search(
        r"([IVXLCDM]+)\s+в\.\s+до\s+н\.\s+э\.\s*[–—-]+\s*([IVXLCDM]+)\s+в\.\s+н\.\s+э\.",
        label,
        re.I,
    )
    if match:
        first, second = roman_to_int(match.group(1)), roman_to_int(match.group(2))
        if first and second:
            return label, ParsedDate(-first * 100, (second - 1) * 100 + 99, approximate=True)

    # Years ago and explicit thousands/millions BCE.
    match = re.search(r"([\d,]+)\s*(млн|тыс\.)\s*лет(?:\s+назад|\s+до н\.)", lower)
    if match:
        amount = float(match.group(1).replace(",", "."))
        scale = 1_000_000 if match.group(2) == "млн" else 1_000
        return label, ParsedDate(-round(amount * scale), approximate=True)

    match = re.search(r"(\d+)\s*[–—-]\s*(\d+)-?е?\s+тысячелет", lower)
    if match:
        start, end = int(match.group(1)), int(match.group(2))
        return label, ParsedDate(-start * 1000, -end * 1000, approximate=True)

    match = re.search(r"(?:(конец|начало|середина)\s+)?(\d+)-?(?:го|е)?\s+тысячелет", lower)
    if match:
        qualifier, millennium = match.group(1) or "", int(match.group(2))
        # В датах до н. э. начало тысячелетия имеет больший модуль года:
        # начало II тысячелетия ≈ 2000 г. до н. э., конец ≈ 1100 г. до н. э.
        offset = 900 if qualifier == "конец" else 0 if qualifier == "начало" else 500
        return label, ParsedDate(-(millennium * 1000 - offset), approximate=True)

    match = re.search(r"(?:около\s+)?(\d+)\s+тыс\.\s+лет\s+до", lower)
    if match:
        return label, ParsedDate(-int(match.group(1)) * 1000, approximate=True)

    # A range crossing the era boundary.
    match = re.search(r"(\d+)\s*г\.\s*до\s*н\.\s*э\.\s*[–—-]+\s*(\d+)\s*г\.\s*н\.\s*э", lower)
    if match:
        return label, ParsedDate(-int(match.group(1)), int(match.group(2)), approximate=approximate)

    # Numeric year range, with optional BCE suffix.
    match = re.search(r"(\d{1,4})\s*[–—-]+\s*(\d{1,4})\s*(?:гг?|п)\.", lower)
    if match:
        first, second = int(match.group(1)), int(match.group(2))
        bce = "до н. э." in lower
        return label, ParsedDate(-first if bce else first, -second if bce else second, approximate=approximate)

    # Multiple non-contiguous years use the first year as their sortable anchor.
    years = [int(value) for value in re.findall(r"\b(\d{3,4})\b", label)]
    if "," in label and len(years) >= 2 and ("г." in label or "гг." in label):
        bce = "до н. э." in lower
        values = [-value if bce else value for value in years]
        return label, ParsedDate(values[0], values[-1], approximate=approximate)

    # Century ranges may repeat the qualifier on both sides.
    match = re.search(
        r"(?:(\u043a\u043e\u043d\u0435\u0446|\u043d\u0430\u0447\u0430\u043b\u043e|\u0441\u0435\u0440\u0435\u0434\u0438\u043d\u0430)\s+)?([IVXLCDM]+)\s*[\u2013\u2014-]+\s*"
        r"(?:(\u043a\u043e\u043d\u0435\u0446|\u043d\u0430\u0447\u0430\u043b\u043e|\u0441\u0435\u0440\u0435\u0434\u0438\u043d\u0430)\s+)?([IVXLCDM]+)\s+\u0432\.",
        label,
        re.I,
    )
    if match:
        first, second = roman_to_int(match.group(2)), roman_to_int(match.group(4))
        if first and second:
            bce = "\u0434\u043e \u043d. \u044d." in lower
            year = century_year(first, bce, (match.group(1) or "").lower())
            end_year = century_year(second, bce, (match.group(3) or "\u043a\u043e\u043d\u0435\u0446").lower())
            if end_year < year:
                year, end_year = end_year, year
            return label, ParsedDate(year, end_year, approximate=True)

    # Roman century or century range.
    match = re.search(r"(?:(конец|начало|середина|первая половина|вторая половина)\s+)?([IVXLCDM]+)(?:[–—-]+([IVXLCDM]+))?\s+(в|вв)\.", label, re.I)
    if match:
        qualifier = (match.group(1) or "").lower()
        first, second = roman_to_int(match.group(2)), roman_to_int(match.group(3) or "")
        if first:
            bce = "до н. э." in lower
            year = century_year(first, bce, qualifier)
            end_year = century_year(second, bce, "конец") if second else None
            if end_year is not None and end_year < year:
                year, end_year = end_year, year
            return label, ParsedDate(year, end_year, approximate=True)

    # Exact or approximate numeric year. The first plausible year is the anchor.
    match = re.search(r"\b(\d{1,4})\s*(?:гг?|п)\.", lower)
    if match:
        year = int(match.group(1))
        bce = "до н. э." in lower
        month = None
        day = None
        prefix = lower[: match.start()]
        for stem, number in MONTHS.items():
            if stem in prefix:
                month = number
                day_match = re.search(r"(?:^|\D)(\d{1,2})\s+[а-яё]+", prefix)
                day = int(day_match.group(1)) if day_match else None
                break
        return label, ParsedDate(-year if bce else year, month=month, day=day, approximate=approximate)

    return label, None


def normalized_title(value: str) -> str:
    value = unicodedata.normalize("NFKD", clean_text(value).lower().replace("ё", "е"))
    stop = {"в", "на", "и", "с", "из", "к", "по", "о", "об", "для", "г", "гг"}
    return " ".join(word for word in re.findall(r"[а-яa-z0-9]+", value) if word not in stop)


def existing_items() -> list[tuple[str, int, str]]:
    result: list[tuple[str, int, str]] = []
    pattern = re.compile(
        r"id:\s*'([^']+)'[\s\S]*?year:\s*(-?\d+),[\s\S]*?title:\s*'((?:\\'|[^'])+)'",
    )
    for path in sorted((ROOT / "src/data/items").glob("*.ts")):
        if path.name == "reference.ts":
            continue
        for match in pattern.finditer(path.read_text(encoding="utf-8")):
            result.append((match.group(1), int(match.group(2)), match.group(3).replace("\\'", "'")))
    return result


def duplicate_of(title: str, year: int, existing: list[tuple[str, int, str]]) -> str | None:
    candidate = normalized_title(title)
    for item_id, item_year, item_title in existing:
        if abs(item_year - year) > (8 if year < 1700 else 2):
            continue
        known = normalized_title(item_title)
        ratio = SequenceMatcher(None, candidate, known).ratio()
        candidate_words, known_words = set(candidate.split()), set(known.split())
        overlap = len(candidate_words & known_words) / max(1, min(len(candidate_words), len(known_words)))
        common = len(candidate_words & known_words)
        contained = min(len(candidate), len(known)) > 12 and (candidate in known or known in candidate)
        if ratio >= 0.82 or (overlap >= 0.72 and common >= 2) or contained:
            return item_id
    return None


def classify(event: dict[str, object]) -> str:
    page = int(event["page"])
    section = str(event["section"])
    title = clean_text(str(event["title"]))
    comment = clean_text(str(event["comment"]))
    title_key = normalized_title(title)
    text = f"{title} {comment}".lower().replace("ё", "е")

    if page <= 5:
        return "prehistory"
    if any(marker in title_key for marker in WORLD_MARKERS):
        return "world"

    for country, markers in HISTORICAL_RULES:
        if isinstance(markers, str):
            markers = (markers,)
        if any(marker in title_key for marker in markers):
            return country

    if section == "Древний Египет":
        return "ancient-egypt"
    if section == "Древняя Индия":
        return "india"
    if section == "Древний Китай":
        return "china"
    if "Древняя Греция" in section:
        return "ancient-greece"
    if "Древний Рим" in section:
        return "ancient-rome"

    for country, markers in COUNTRY_RULES:
        if isinstance(markers, str):
            markers = (markers,)
        if country == "denmark":
            markers = ("\u0434\u0430\u043d\u0438\u044f", "\u0434\u0430\u0442\u0441\u043a")
        if country == "russia":
            markers += ("\u043b\u0435\u043d\u0438\u043d", "\u0441\u0442\u0430\u043b\u0438\u043d", "\u0433\u043e\u0440\u0431\u0430\u0447\u0435\u0432", "\u043f\u0443\u0442\u0438\u043d", "\u043a\u043f\u0441\u0441")
        if country == "china":
            markers += ("\u043c\u0430\u043e \u0446\u0437\u044d\u0434\u0443\u043d", "\u0445\u0443 \u044f\u043e\u0431\u0430\u043d", "\u0447\u0436\u0430\u043e \u0446\u0437\u044b\u044f\u043d", "\u043a\u043f\u043a")
        if any(marker in title_key for marker in markers):
            return country

    # Page/section fallbacks are narrow enough to be meaningful; broad regional
    # sections intentionally fall back to the international line.
    if 16 <= page <= 20:
        return "ancient-greece"
    if 21 <= page <= 27:
        return "ancient-rome"
    if "Советское государство" in section or "СССР и Российская" in section:
        return "russia"
    if "Вторая мировая" in section or "Международные отношения" in section:
        return "world"
    return "world"


def tags_for(event: dict[str, object], title: str, country: str) -> list[str]:
    section = str(event["section"]).strip()
    text = title.lower()
    tags: list[str] = []
    if section:
        tags.append(section[:45])
    rules = {
        "война": ("война", "битв", "сражен", "восстан", "революц"),
        "государство": ("государ", "импери", "царств", "республик", "объединен"),
        "право": ("закон", "конституц", "договор", "декларац", "харт"),
        "культура": ("культур", "искусств", "литератур", "книг", "университет"),
        "религия": ("религи", "церк", "христиан", "ислам", "будд", "реформац"),
        "экономика": ("эконом", "промышлен", "торгов", "нефт", "кризис"),
        "наука и техника": ("космос", "атом", "ядер", "печат", "изобрет", "аэс"),
        "международные отношения": ("международ", "конференц", "пакт", "союз", "оон", "нато"),
    }
    for tag, markers in rules.items():
        if any(marker in text for marker in markers):
            tags.append(tag)
    if country == "world" and "международные отношения" not in tags:
        tags.append("всемирная история")
    return list(dict.fromkeys(tags))[:4]


def slugify(value: str) -> str:
    translit = str.maketrans({
        "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ё": "e",
        "ж": "zh", "з": "z", "и": "i", "й": "y", "к": "k", "л": "l", "м": "m",
        "н": "n", "о": "o", "п": "p", "р": "r", "с": "s", "т": "t", "у": "u",
        "ф": "f", "х": "h", "ц": "c", "ч": "ch", "ш": "sh", "щ": "sch",
        "ъ": "", "ы": "y", "ь": "", "э": "e", "ю": "yu", "я": "ya",
    })
    value = value.lower().translate(translit)
    return re.sub(r"[^a-z0-9]+", "-", value).strip("-")[:42] or "event"


def first_sentence(text: str, title: str) -> str:
    if not text:
        return f"Справочная дата: {title}."
    parts = re.split(r"(?<=[.!?])\s+", text)
    summary = parts[0]
    if len(summary) < 45 and len(parts) > 1:
        summary = f"{summary} {parts[1]}"
    return summary[:260].rstrip()


def importance_for(title: str) -> int:
    text = title.lower()
    key = ("начало мировой", "революц", "образование", "создание", "падение", "распад", "объединение", "независим", "конституц", "реформац")
    return 3 if any(marker in text for marker in key) else 2


def source_label(page: int) -> str:
    return f"В. С. Кошелев, Н. В. Кошелева. Всемирная история. 5–11 классы. 6-е изд. Минск: Аверсэв, 2025. С. {page}."


def markdown_for(item: dict[str, object], page: int, section: str) -> str:
    # Reference articles are assembled at runtime from the structured fields.
    # Keeping only provenance here avoids duplicating hundreds of paragraphs in
    # both the TypeScript dataset and the eager Markdown manifest.
    identifier = str(item["id"])
    return (
        "---\n"
        f"id: {identifier}\n"
        "sources:\n"
        f"  - label: \"{source_label(page)}\"\n"
        "    kind: reference\n"
        "---\n"
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path, help="reference-events-ocr.json")
    args = parser.parse_args()

    raw_events = json.loads(args.input.read_text(encoding="utf-8"))
    existing = existing_items()
    generated: list[dict[str, object]] = []
    duplicates: list[tuple[dict[str, object], str]] = []
    unparsed: list[dict[str, object]] = []
    ids: set[str] = set()

    for index, event in enumerate(raw_events, start=1):
        title = clean_text(str(event["title"]))
        page = int(event["page"])
        detail = strip_scanned_page_tail(clean_text(str(event["comment"])), page)
        if title in WRAPPED_TITLES:
            title, continuation = WRAPPED_TITLES[title]
            if detail.startswith(continuation):
                detail = detail[len(continuation):].lstrip()
        date_label, parsed = parse_date(str(event["date"]))
        if parsed is None:
            unparsed.append(event)
            continue

        duplicate = duplicate_of(title, parsed.year, existing)
        if duplicate:
            duplicates.append((event, duplicate))
            continue

        base_id = STABLE_REFERENCE_IDS.get(title, f"ref-p{page:03d}-{slugify(title)}")
        identifier = base_id
        suffix = 2
        while identifier in ids:
            identifier = f"{base_id}-{suffix}"
            suffix += 1
        ids.add(identifier)
        country = REFERENCE_COUNTRY_OVERRIDES.get(identifier, classify(event))

        item: dict[str, object] = {
            "id": identifier,
            "country": country,
            "year": parsed.year,
            "dateLabel": date_label,
            "kind": "person" if title.lower().startswith("годы жизни") else "event",
            "title": title,
            "summary": first_sentence(detail, title),
            "detail": detail or f"В справочнике событие отмечено как «{title}».",
            "tags": tags_for(event, title, country),
            "importance": importance_for(title),
            "approximate": parsed.approximate or "в." in date_label or "тысячелет" in date_label,
            "verification": "reference",
            "referencePage": page,
        }
        if parsed.end_year is not None and parsed.end_year >= parsed.year:
            item["endYear"] = parsed.end_year
        if parsed.month:
            item["month"] = parsed.month
        if parsed.day:
            item["day"] = parsed.day
        generated.append(item)

    OUTPUT_CONTENT.mkdir(parents=True, exist_ok=True)
    for old in OUTPUT_CONTENT.glob("*.md"):
        old.unlink()
    for item in generated:
        source_event = next(
            event
            for event in raw_events
            if int(event["page"]) == item["referencePage"]
            and (
                clean_text(str(event["title"])) == item["title"]
                or WRAPPED_TITLES.get(clean_text(str(event["title"])), ("", ""))[0] == item["title"]
            )
        )
        (OUTPUT_CONTENT / f"{item['id']}.md").write_text(
            markdown_for(item, int(item["referencePage"]), str(source_event["section"])),
            encoding="utf-8",
        )

    OUTPUT_TS.write_text(
        "import type { TimelineItem } from '../../types';\n\n"
        "/** Events present in the supplied 2025 reference but absent from the authored base. */\n"
        f"export const referenceItems: TimelineItem[] = {json.dumps(generated, ensure_ascii=False, indent=2)};\n",
        encoding="utf-8",
    )

    by_country: dict[str, int] = {}
    for item in generated:
        country = str(item["country"])
        by_country[country] = by_country.get(country, 0) + 1
    report = [
        "# Отчёт импорта справочника",
        "",
        f"- Распознано датированных записей: **{len(raw_events)}**",
        f"- Добавлено новых объектов: **{len(generated)}**",
        f"- Сопоставлено с существующей авторской базой: **{len(duplicates)}**",
        f"- Не удалось безопасно разобрать дату: **{len(unparsed)}**",
        f"- Редакционно проверено исключений атрибуции: **{len(REFERENCE_COUNTRY_OVERRIDES)}**",
        "",
        "## Распределение новых объектов по линиям",
        "",
        "| Линия | Объектов |",
        "| --- | ---: |",
        *[f"| `{country}` | {count} |" for country, count in sorted(by_country.items(), key=lambda pair: (-pair[1], pair[0]))],
        "",
        "## Сопоставленные дубликаты",
        "",
        *[f"- С. {event['page']}: «{clean_text(str(event['title']))}» → `{item_id}`" for event, item_id in duplicates],
    ]
    if unparsed:
        report.extend(["", "## Неразобранные даты", ""])
        report.extend(f"- С. {event['page']}: {event['date']} — {event['title']}" for event in unparsed)
    REPORT.write_text("\n".join(report) + "\n", encoding="utf-8")

    print(json.dumps({
        "recognized": len(raw_events),
        "generated": len(generated),
        "duplicates": len(duplicates),
        "unparsed": len(unparsed),
        "countries": len(by_country),
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
