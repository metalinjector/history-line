import type { CountryId, TimelineItem } from '../types';

/**
 * Поправки к записям печатного справочника (src/data/items/reference.json).
 *
 * Справочник распознан со сканов и разложен по линиям автоматически, поэтому
 * часть записей встала не на своё место: событие русской истории попало
 * в колонку «Мир», Александр Македонский — в Древний Рим, «начало 2-го
 * тысячелетия до н. э.» прочиталось как −1100 год, а «XVI – XI вв. до н. э.» —
 * как один XI век. Сам JSON руками не правят (⚠ КАРКАС — docs/CORE.md,
 * раздел 5): это слепок импорта, который при появлении исходного OCR
 * перегенерируется. Поправки лежат здесь и накладываются при загрузке
 * (data/items/reference.ts) — id записей не меняются, ссылки и заметки
 * читателей продолжают работать.
 *
 * Правила:
 * - поправка меняет только линию, дату или явную опечатку в заголовке, но не смысл записи;
 * - у каждой поправки должно быть основание — оно записано рядом;
 * - поправка, которая ничего не меняет (импорт исправлен и перегенерирован),
 *   считается устаревшей — `dataIntegrity.test.ts` потребует её убрать.
 *
 * Файл без импортов значений: его читает и скрипт импорта, чтобы знать,
 * какие записи уже выправлены редакцией.
 */
export type ReferenceCorrection = Partial<
  Pick<TimelineItem, 'country' | 'year' | 'endYear' | 'month' | 'day' | 'approximate' | 'dateLabel' | 'title'>
> & { country?: CountryId };

export const referenceCorrections: Record<string, ReferenceCorrection> = {
  // ——— Древний Восток: события египетской истории уходили в «Мир» или получали год не того тысячелетия ———

  // Заселение Америки — раздел «Древняя Америка» справочника, а не греческая линия.
  'ref-p016-poyavlenie-cheloveka-v-amerike': { country: 'prehistory' },
  // «Эхнатона» совпало с маркером «НАТО» в классификаторе импорта.
  'ref-p007-pravlenie-ehnatona-amenhotepa-iv': { country: 'ancient-egypt' },
  // «XVI – XI вв. до н. э.» прочиталось как один XI век; Новое царство — ок. 1550–1069 до н. э.
  'ref-p007-novoe-carstvo-v-egipte': { country: 'ancient-egypt', year: -1550, endYear: -1069 },
  // Третий переходный период: «XI – VII вв. до н. э.» → ок. 1069–664 до н. э.
  'ref-p008-period-oslableniya-egipta': { country: 'ancient-egypt', year: -1069, endYear: -664 },
  // Камбиз II занял Египет в 525 году до н. э.; событие египетской линии.
  'ref-p008-zavoevanie-egipta-persiey': { country: 'ancient-egypt', year: -525 },
  'ref-p008-zavoevanie-egipta-aleksandrom-makedonskim': { country: 'ancient-egypt' },
  // «Конец 4-го тысячелетия до н. э.» импорт прочитал как −3900: для дат до н. э. конец тысячелетия — его меньшие числа.
  'ref-p006-vozniknovenie-pervyh-gosudarstv-v-doline-n': { year: -3100 },
  'ref-p008-vozniknovenie-pervyh-gorodov-gosudarstv-v-': { year: -3100 },
  // «Апипур» — распознанное «Ашшур» (так в самом описании записи); начало 2-го тысячелетия до н. э. — ок. 2000 года.
  'ref-p009-vozniknovenie-goroda-gosudarstva-apipur': {
    country: 'assyria',
    year: -2000,
    title: 'Возникновение города-государства Ашшур',
  },
  'ref-p009-vtorzhenie-hettov-v-maluyu-aziyu': { year: -2000 },
  // «Начало 1-го тысячелетия до н. э.» → ок. 1000 года до н. э., а не −100; протоистория персидской державы.
  'ref-p011-vozniknovenie-plemennogo-soyuza-persov': { country: 'achaemenid-persia', year: -1000 },
  // Разделение царства после Соломона (ок. 930 до н. э.) — древняя линия, а не современное государство.
  'ref-p011-razdelenie-izrailskogo-carstva-na-dva-gosu': { country: 'ancient-israel', year: -930 },
  // Навуходоносор II правил в 605–562 годах до н. э.; «конец VII в. до н. э.» импорт прочитал как −690.
  'ref-p012-pravlenie-navuhodonosora-ii-v-vavilone': { year: -605, endYear: -562 },

  // ——— Эгейский мир и Македония ———

  // «Конец 3-го тысячелетия до н. э.» → ок. 2100 года до н. э.
  'ref-p016-vozniknovenie-gorodov-gosudarstv-na-ostrov': { year: -2100 },
  // «XVI – первая половина XV в. до н. э.» и «XVI – XII вв. до н. э.» — отрезки, а не последний век отрезка.
  'ref-p017-rascvet-civilizacii-na-ostrove-krit': { year: -1600, endYear: -1450 },
  'ref-p017-rascvet-aheyskih-carstv-na-peloponnese': { year: -1600, endYear: -1100 },
  // Александр — македонская линия; в римскую записи попали по номеру страницы.
  'ref-p021-pravlenie-aleksandra-makedonskogo': { country: 'ancient-macedonia' },
  'ref-p021-vostochnye-pohody-aleksandra-makedonskogo': { country: 'ancient-macedonia' },

  // ——— Раннее Средневековье ———

  // «IV – VII вв.» — отрезок от прихода гуннов (375) до конца VII века, а не один VII век.
  'ref-p028-velikoe-pereselenie-narodov': { year: 375, endYear: 700 },
  // Халифат — своя линия; «VII – VIII вв.» — от хиджры и первых завоеваний до середины VIII века.
  'ref-p031-obrazovanie-arabskogo-halifata-i-arabskie-': { country: 'arab-caliphate', year: 632, endYear: 750 },
  'ref-p032-rascvet-arabskogo-halifata': { country: 'arab-caliphate' },
  'ref-p032-raspad-arabskogo-halifata': { country: 'arab-caliphate' },
  // Описание записи говорит о принятии Темучином титула Чингисхана — это курултай 1206 года;
  // «начало XII в.» в подписи — ошибка на один век.
  'ref-p037-obrazovanie-mongolskogo-gosudarstva': {
    country: 'mongol-empire',
    year: 1206,
    approximate: false,
    dateLabel: '1206 г.',
  },
  'ref-p038-obrazovanie-deliyskogo-sultanata': { country: 'delhi-sultanate' },
  'ref-p044-upadok-deliyskogo-sultanata': { country: 'delhi-sultanate' },
  'ref-p045-vozvyshenie-songayskogo-gosudarstva': { country: 'songhai' },

  // ——— Русская история, попавшая в «Мир» ———

  // Годы правления стоят в самом заголовке записи.
  'ref-p041-pravlenie-ivana-kality-1325-1340-usilenie-': { country: 'russia', year: 1325, endYear: 1340, approximate: false },
  'ref-p042-pravlenie-ivana-iii': { country: 'russia' },
  'ref-p043-sudebnik-ivana-iii': { country: 'russia' },
  'ref-p052-deyatelnost-izbrannoy-rady': { country: 'russia' },
  'ref-p052-sozyv-zemskogo-sobora': { country: 'russia' },
  'ref-p053-sudebnik-ivana-iv': { country: 'russia' },
  'ref-p053-livonskaya-voyna': { country: 'russia' },
  'ref-p054-pravlenie-borisa-godunova': { country: 'russia' },
  'ref-p054-vosstanie-pod-predvoditelstvom-ivana-bolot': { country: 'russia' },
  'ref-p055-prinyatie-sobornogo-ulozheniya': { country: 'russia' },
  'ref-p055-vosstanie-stepana-razina': { country: 'russia' },
  'ref-p055-severnaya-voyna': { country: 'russia' },
  'ref-p056-ukaz-petra-i-o-edinonasledii': { country: 'russia' },
  'ref-p056-prinyatie-petrom-i-titula-imperatora': { country: 'russia' },
  'ref-p056-vvedenie-tabeli-o-rangah': { country: 'russia' },
  'ref-p067-zagranichnyy-pohod-russkoy-armii': { country: 'russia' },
  'ref-p068-krymskaya-ili-vostochnaya-voyna': { country: 'russia' },
  'ref-p070-i-sezd-rsdrp': { country: 'russia' },
  'ref-p070-ii-sezd-rsdrp': { country: 'russia' },
  'ref-p070-nachalo-russko-yaponskoy-voyny': { country: 'russia' },
  'ref-p070-krovavoe-voskresene': { country: 'russia' },
  'ref-p097-moskovskaya-bitva': { country: 'russia' },
  'ref-p098-kurskaya-bitva': { country: 'russia' },
  'ref-p101-manchzhurskaya-operaciya': { country: 'russia' },

  // ——— Европа Нового времени ———

  'ref-p042-kazn-yana-gusa': { country: 'czechia' },
  'ref-p042-gusitskie-voyny': { country: 'czechia' },
  'ref-p046-izdanie-knigi-t-mora-utopiya': { country: 'england' },
  'ref-p058-pravlenie-suleymana-velikolepnogo': { country: 'ottoman-empire' },
  // Морской путь в Индию — страница португальской истории.
  'ref-p040-otkrytie-vasko-da-gamoy-morskogo-puti-v-in': { country: 'portugal' },
  'ref-p059-osnovanie-gollandcami-kolonii-keyptaun-na-': { country: 'south-africa' },
  // Подпись «1768 – 1774, 1787 – 1791 гг.»: отрезок начинается с первой войны.
  'ref-p056-russko-tureckie-voyny': { country: 'ottoman-empire', year: 1768 },
  'ref-p069-russko-tureckaya-voyna': { country: 'ottoman-empire' },
  'ref-p052-deklaraciya-prav-cheloveka-i-grazhdanina': { country: 'france' },
  'ref-p061-vosstanie-grekov-protiv-osmanskoy-imperii': { country: 'greece' },
  'ref-p068-nachalo-vtorogo-serbskogo-vosstaniya': { country: 'serbia' },
  'ref-p062-gosudarstvennyy-perevorot-lui-bonaparta': { country: 'france' },
  'ref-p062-prinyatie-kongressom-gomsted-akta': { country: 'usa' },
  // Датская война 1864 года — шаг Пруссии к объединению Германии, соседние записи той же страницы — германские.
  'ref-p063-voyna-prussii-i-avstrii-protiv-danii': { country: 'germany' },
  'ref-p063-avstro-vengerskoe-soglashenie': { country: 'austria' },
  // Рентген работал в Вюрцбурге.
  'ref-p066-otkrytie-rentgenovskih-luchey': { country: 'germany' },
  'ref-p071-provozglashenie-nezavisimosti-bolgarii-ot-': { country: 'bulgaria' },
  'ref-p075-zaklyuchitelnyy-protokol-soglashenie-mezhd': { country: 'china' },
  'ref-p075-anglo-burskaya-voyna-v-yuzhnoy-afrike': { country: 'south-africa' },

  // ——— XX век ———

  'ref-p078-obrazovanie-nemeckoy-rabochey-partii': { country: 'germany' },
  'ref-p079-vengerskaya-sovetskaya-respublika': { country: 'hungary' },
  'ref-p079-bavarskaya-sovetskaya-respublika': { country: 'germany' },
  'ref-p084-pobeda-narodnogo-fronta-na-parlamentskih-v': { country: 'france' },
  'ref-p098-podpisanie-italiey-peremiriya-s-anglo-amer': { country: 'italy' },
  'ref-p122-san-francisskiy-mirnyy-dogovor': { country: 'japan' },
  'ref-p104-vengerskoe-vosstanie-1956-g': { country: 'hungary' },
  'ref-p104-vyhod-francii-iz-voennoy-struktury-nato': { country: 'france' },
  'ref-p125-voyna-nato-protiv-yugoslavii': { country: 'serbia' },
};

/** Запись справочника с наложенными поправками; без поправок возвращается та же запись. */
export function correctReferenceItem<T extends { id: string }>(item: T): T {
  const correction = referenceCorrections[item.id];
  return correction ? { ...item, ...correction } : item;
}
