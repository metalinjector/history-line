import type {
  Country,
  CountryId,
  CountryRegion,
  HistoricalLineSpan,
  SourceLink,
} from '../types';

type CountrySeed = Omit<Country, 'color' | 'colorInk'>;

const modern = (
  id: string,
  label: string,
  short: string,
  region: CountryRegion,
  note = `Историческая линия территории и государств, связанных с современной страной «${label}».`,
  aliases: string[] = [],
): CountrySeed => ({ id, label, short, region, note, aliases, kind: 'modern' });

const institution = (label: string, url: string): SourceLink => ({
  label,
  url,
  kind: 'institution',
});

const academic = (label: string, url: string): SourceLink => ({
  label,
  url,
  kind: 'academic',
});

const span = (
  from: number,
  to: number,
  sources: SourceLink[],
  approximate = false,
): HistoricalLineSpan => ({ from, to, sources, ...(approximate ? { approximate: true } : {}) });

const historical = (
  id: string,
  label: string,
  short: string,
  note: string,
  lineSpan: HistoricalLineSpan,
  aliases: string[] = [],
): CountrySeed => ({ id, label, short, region: 'historical', note, lineSpan, aliases, kind: 'historical' });

/**
 * Полный каталог географических линий справочника.
 *
 * Современные страны и исторические политии разведены явно: Византия не
 * маскируется под современную Турцию, а Древний Рим — под Италию. Благодаря
 * этому новые записи добавляются данными, без расширения union-типа и без
 * региональных условий в компонентах.
 */
const seeds: CountrySeed[] = [
  {
    id: 'world',
    label: 'Мир · международные события',
    short: 'МИР',
    note: 'Глобальные процессы, международные организации и события, которые нельзя честно приписать одной стране.',
    aliases: ['международные отношения', 'глобальная история', 'ООН'],
    kind: 'global',
    region: 'global',
  },

  modern('germany', 'Германия', 'DE', 'europe', 'Германские земли, Пруссия, объединённая Германия, ФРГ и ГДР.', ['ФРГ', 'ГДР', 'Пруссия']),
  modern('england', 'Великобритания', 'GB', 'europe', 'Римская Британия, Англия, Великобритания и Соединённое Королевство.', ['Англия', 'Британия', 'Соединённое Королевство']),
  modern('france', 'Франция', 'FR', 'europe', 'Галлия, Франкское и Французское королевства, империи и республики.', ['Галлия']),
  modern('italy', 'Италия', 'IT', 'europe', 'Итальянские государства Средневековья и Нового времени, затем единая Италия.'),
  modern('russia', 'Россия', 'RU', 'europe', 'Древнерусские земли, Московское государство, Российская империя, СССР и Российская Федерация.', ['Русь', 'СССР', 'РСФСР']),
  modern('belarus', 'Беларусь', 'BY', 'europe', 'Полоцкая и Туровская земли, ВКЛ, Речь Посполитая, БССР и Республика Беларусь.', ['Белоруссия', 'БССР']),
  modern('spain', 'Испания', 'ES', 'europe', 'Иберийские земли, христианские королевства, Испанская монархия и современная Испания.', ['Кастилия', 'Арагон']),
  modern('china', 'Китай', 'CN', 'asia', 'Древние царства и имперские династии, Китайская республика и КНР.', ['КНР', 'Поднебесная']),
  modern('japan', 'Япония', 'JP', 'asia', 'Ямато, сёгунаты, империя Мэйдзи и послевоенная Япония.'),

  modern('albania', 'Албания', 'AL', 'europe'),
  modern('algeria', 'Алжир', 'DZ', 'africa'),
  modern('angola', 'Ангола', 'AO', 'africa'),
  modern('argentina', 'Аргентина', 'AR', 'latin-america'),
  modern('austria', 'Австрия', 'AT', 'europe', 'Австрийские земли Габсбургов, Австрийская империя, Австро-Венгрия и республика.', ['Австро-Венгрия']),
  modern('bangladesh', 'Бангладеш', 'BD', 'asia'),
  modern('belgium', 'Бельгия', 'BE', 'europe'),
  modern('bolivia', 'Боливия', 'BO', 'latin-america'),
  modern('brazil', 'Бразилия', 'BR', 'latin-america'),
  modern('bulgaria', 'Болгария', 'BG', 'europe', 'Первое и Второе Болгарские царства, княжество, царство и республика.'),
  modern('bosnia-herzegovina', 'Босния и Герцеговина', 'BA', 'europe', 'Боснийские земли, османский и австро-венгерский периоды, Югославия и независимое государство.', ['Босния']),
  modern('cambodia', 'Камбоджа', 'KH', 'asia', 'Кхмерские государства и современная Камбоджа.', ['Кампучия']),
  modern('canada', 'Канада', 'CA', 'north-america'),
  modern('chile', 'Чили', 'CL', 'latin-america'),
  modern('colombia', 'Колумбия', 'CO', 'latin-america'),
  modern('congo', 'Конго', 'CG', 'africa', 'Государства бассейна Конго и современные Республики Конго и ДР Конго.', ['ДР Конго', 'Заир']),
  modern('croatia', 'Хорватия', 'HR', 'europe'),
  modern('cuba', 'Куба', 'CU', 'latin-america'),
  modern('cyprus', 'Кипр', 'CY', 'europe'),
  modern('czechia', 'Чехия', 'CZ', 'europe', 'Богемские земли, Чехословакия и Чешская Республика.', ['Чехия', 'Чехословакия', 'Богемия']),
  modern('denmark', 'Дания', 'DK', 'europe'),
  modern('ecuador', 'Эквадор', 'EC', 'latin-america'),
  modern('egypt', 'Египет', 'EG', 'africa', 'Египет после античности и современная Арабская Республика Египет.'),
  modern('eritrea', 'Эритрея', 'ER', 'africa', 'Территория на побережье Красного моря, итальянский колониальный период и независимая Эритрея.'),
  modern('estonia', 'Эстония', 'EE', 'europe'),
  modern('finland', 'Финляндия', 'FI', 'europe'),
  modern('greece', 'Греция', 'GR', 'europe', 'Греческие земли после античности и современное государство.'),
  modern('hungary', 'Венгрия', 'HU', 'europe'),
  modern('iceland', 'Исландия', 'IS', 'europe'),
  modern('india', 'Индия', 'IN', 'asia', 'Цивилизации Индостана, колониальная Индия и Республика Индия.'),
  modern('indonesia', 'Индонезия', 'ID', 'asia'),
  modern('iran', 'Иран', 'IR', 'middle-east', 'Иранские государства после Ахеменидов и современный Иран.', ['Персия']),
  modern('iraq', 'Ирак', 'IQ', 'middle-east'),
  modern('israel', 'Израиль', 'IL', 'middle-east', 'Современное Государство Израиль; древние царства вынесены в отдельную линию.'),
  modern('korea', 'Корея', 'KR', 'asia', 'Корейские государства, колониальный период, КНДР и Республика Корея.', ['КНДР', 'Южная Корея', 'Северная Корея']),
  modern('kuwait', 'Кувейт', 'KW', 'middle-east'),
  modern('latvia', 'Латвия', 'LV', 'europe'),
  modern('lebanon', 'Ливан', 'LB', 'middle-east'),
  modern('libya', 'Ливия', 'LY', 'africa'),
  modern('lithuania', 'Литва', 'LT', 'europe', 'Литовские земли, Великое княжество Литовское и современная Литва.', ['ВКЛ']),
  modern('luxembourg', 'Люксембург', 'LU', 'europe'),
  modern('mali', 'Мали', 'ML', 'africa', 'Государства Западного Судана, колониальный период и современная Республика Мали.'),
  modern('malta', 'Мальта', 'MT', 'europe'),
  modern('mexico', 'Мексика', 'MX', 'latin-america'),
  modern('mongolia', 'Монголия', 'MN', 'asia', 'Монголия после распада империи и современное государство.'),
  modern('morocco', 'Марокко', 'MA', 'africa'),
  modern('netherlands', 'Нидерланды', 'NL', 'europe', 'Нидерландские провинции, Республика Соединённых провинций и королевство.', ['Голландия']),
  modern('nicaragua', 'Никарагуа', 'NI', 'latin-america'),
  modern('nigeria', 'Нигерия', 'NG', 'africa'),
  modern('niger', 'Нигер', 'NE', 'africa'),
  modern('north-macedonia', 'Северная Македония', 'MK', 'europe', 'Македонские земли в Османской империи и Югославии, затем независимая Северная Македония.', ['Македония']),
  modern('norway', 'Норвегия', 'NO', 'europe'),
  modern('pakistan', 'Пакистан', 'PK', 'asia'),
  modern('panama', 'Панама', 'PA', 'latin-america'),
  modern('peru', 'Перу', 'PE', 'latin-america'),
  modern('poland', 'Польша', 'PL', 'europe', 'Польское королевство, Речь Посполитая и польские республики.'),
  modern('portugal', 'Португалия', 'PT', 'europe'),
  modern('romania', 'Румыния', 'RO', 'europe'),
  modern('palestine', 'Палестина', 'PS', 'middle-east', 'Палестинские территории и национальное движение; древние царства вынесены в отдельную линию.', ['Палестинские территории']),
  modern('jordan', 'Иордания', 'JO', 'middle-east', 'Трансиордания и современное Иорданское Хашимитское Королевство.', ['Трансиордания']),
  modern('serbia', 'Сербия · Югославия', 'RS', 'europe', 'Сербские государства, королевство и социалистическая Югославия, современная Сербия.', ['Югославия']),
  modern('slovakia', 'Словакия', 'SK', 'europe', 'Словацкие земли, Чехословакия и Словацкая Республика.'),
  modern('slovenia', 'Словения', 'SI', 'europe', 'Словенские земли, югославский период и независимая Словения.'),
  modern('somalia', 'Сомали', 'SO', 'africa', 'Колониальный раздел Сомали и современное государство.'),
  modern('south-africa', 'Южная Африка', 'ZA', 'africa', 'Капская колония, Южно-Африканский Союз и ЮАР.', ['ЮАР']),
  modern('syria', 'Сирия', 'SY', 'middle-east'),
  modern('sri-lanka', 'Шри-Ланка', 'LK', 'asia', 'Цейлон в колониальную эпоху и современная Шри-Ланка.', ['Цейлон']),
  modern('sweden', 'Швеция', 'SE', 'europe'),
  modern('switzerland', 'Швейцария', 'CH', 'europe'),
  modern('taiwan', 'Тайвань', 'TW', 'asia', 'Остров Тайвань в имперской, японской и послевоенной истории.', ['Формоза']),
  modern('tunisia', 'Тунис', 'TN', 'africa'),
  modern('turkey', 'Турция', 'TR', 'middle-east', 'Турецкая республика; Османская империя вынесена в отдельную линию.'),
  modern('ukraine', 'Украина', 'UA', 'europe', 'Украинские земли в составе разных государств, УССР и независимая Украина.', ['УССР']),
  modern('usa', 'США', 'US', 'north-america', 'Североамериканские колонии, Соединённые Штаты и их внешняя политика.', ['Соединённые Штаты', 'Америка']),
  modern('vietnam', 'Вьетнам', 'VN', 'asia', 'Вьетнамские государства, колониальный период, ДРВ и объединённый Вьетнам.', ['ДРВ']),
  modern('venezuela', 'Венесуэла', 'VE', 'latin-america', 'Колониальный период, Великая Колумбия и независимая Венесуэла.'),
  modern('yemen', 'Йемен', 'YE', 'middle-east'),
  modern('ethiopia', 'Эфиопия', 'ET', 'africa', 'Эфиопская империя, итальянское вторжение и современная Эфиопия.', ['Абиссиния']),
  modern('afghanistan', 'Афганистан', 'AF', 'asia', 'Афганские эмираты, войны с Британской империей и современный Афганистан.'),

  historical(
    'prehistory',
    'Первобытное общество',
    'ДО',
    'Общечеловеческая линия антропогенеза, расселения и неолитической революции; условно завершается с появлением ранней письменности.',
    span(
      -3_000_000,
      -3000,
      [institution('Smithsonian Human Origins: хронология эволюции человека', 'https://humanorigins.si.edu/evidence/human-evolution-interactive-timeline')],
      true,
    ),
  ),
  historical(
    'ancient-egypt',
    'Древний Египет',
    'ЕГ',
    'Государства долины Нила от раннединастической эпохи до завоевания Александром Македонским.',
    span(-3100, -332, [institution('The Met: List of Rulers of Ancient Egypt and Nubia', 'https://www.metmuseum.org/toah/hd/phar/hd_phar.htm')], true),
  ),
  historical(
    'mesopotamia',
    'Шумер · ранняя Месопотамия',
    'МЕ',
    'Ранние города и государства Междуречья до падения III династии Ура.',
    span(-4500, -2004, [institution('The Met: Mesopotamia, 8000–2000 B.C.', 'https://www.metmuseum.org/toah/ht/02/wam.html')], true),
    ['Месопотамия', 'Шумер', 'Аккад'],
  ),
  historical(
    'phoenicia',
    'Финикия',
    'ФН',
    'Финикийские города-государства Восточного Средиземноморья до включения последних центров в римскую державу.',
    span(-3000, -117, [institution('The Met: Eastern Mediterranean, 1000 B.C.–1 A.D.', 'https://www.metmuseum.org/toah/ht/04/wae.html')], true),
  ),
  historical(
    'elam',
    'Элам',
    'ЭЛ',
    'Государства Элама на юго-западе Иранского нагорья до включения области в державу Ахеменидов.',
    span(-2700, -539, [academic('Encyclopaedia Iranica: Elam', 'https://www.iranicaonline.org/articles/elam-i/')], true),
  ),
  historical(
    'hittites',
    'Хетты · Хеттская держава',
    'ХТ',
    'Хеттские общности и государство в Малой Азии бронзового века до гибели столицы около 1200 года до н. э.',
    span(-2000, -1200, [institution('The Met: The Hittites', 'https://www.metmuseum.org/essays/the-hittites')], true),
  ),
  historical(
    'ancient-israel',
    'Древний Израиль · Иудея',
    'ИУ',
    'Древнеизраильские объединения, Израильское и Иудейское царства до падения Иерусалима.',
    span(-1300, -586, [institution('The Met: Eastern Mediterranean, 1000 B.C.–1 A.D.', 'https://www.metmuseum.org/toah/ht/04/wae.html')], true),
  ),
  historical(
    'assyria',
    'Древняя Ассирия',
    'АС',
    'Ассирийские государства Северной Месопотамии до падения Ниневии и распада империи.',
    span(-2000, -612, [institution('The Met: Mesopotamia, 1000 B.C.–1 A.D.', 'https://www.metmuseum.org/toah/ht/04/wam.html')], true),
    ['Ассирия'],
  ),
  historical(
    'babylonia',
    'Вавилония',
    'ВА',
    'Вавилонские царства и Нововавилонская держава до завоевания Киром Великим.',
    span(-1900, -539, [institution('British Museum: Mesopotamia 1500–539 BC', 'https://www.britishmuseum.org/collection/galleries/mesopotamia-1500-539-bc')], true),
  ),
  historical(
    'achaemenid-persia',
    'Древняя Персия · Ахемениды',
    'ПЕ',
    'Ранние объединения персов и империя Ахеменидов VI–IV веков до н. э.',
    span(-1000, -331, [institution('The Met: Mesopotamia, 1000 B.C.–1 A.D.', 'https://www.metmuseum.org/toah/ht/04/wam.html')], true),
    ['Персия', 'Ахемениды'],
  ),
  historical(
    'ancient-greece',
    'Древняя Греция',
    'ЭЛЛ',
    'Минойский и микенский мир, греческие полисы и эллинистические государства до римского завоевания.',
    span(-2100, -31, [institution('The Met: Europe, 1000 B.C.–1 A.D.', 'https://www.metmuseum.org/toah/ht/04/eusb.html')], true),
  ),
  historical(
    'ancient-macedonia',
    'Древняя Македония',
    'МАК',
    'Македонское царство от ранней династии Аргеадов до превращения в римскую провинцию.',
    span(-496, -168, [institution('The Met: List of Rulers of the Ancient Greek World', 'https://www.metmuseum.org/toah/hd/gkru/hd_gkru.htm')]),
  ),
  historical(
    'ancient-rome',
    'Древний Рим',
    'РИМ',
    'Римское царство, республика и Западная Римская империя; восточная традиция после 476 года продолжается отдельной линией Византии.',
    span(
      -753,
      476,
      [
        institution('British Museum: Roman Empire', 'https://www.britishmuseum.org/collection/galleries/roman-empire'),
        institution('British Museum: Introduction to ancient Rome', 'https://www.britishmuseum.org/exhibitions/nero-man-behind-myth/introduction-to-ancient-rome'),
      ],
      true,
    ),
  ),
  historical(
    'byzantium',
    'Византия',
    'ВИЗ',
    'Восточная Римская империя со столицей в Константинополе — от основания новой столицы до её завоевания османами.',
    span(330, 1453, [institution('The Met: List of Byzantine Rulers', 'https://www.metmuseum.org/toah/hd/byru/hd_byru.htm')]),
  ),
  historical(
    'frankish-empire',
    'Франкская империя',
    'ФРК',
    'Империя Карла Великого от императорской коронации до раздела по Верденскому договору.',
    span(800, 843, [institution('The Met: Western Europe, 500–1000 A.D.', 'https://www.metmuseum.org/toah/ht/06/euwf.html')]),
  ),
  historical(
    'arab-caliphate',
    'Ранний ислам · Арабский халифат',
    'ХАЛ',
    'От хиджры и мединской общины до Праведного, Омейядского и Аббасидского халифатов; линия завершается падением Багдада.',
    span(622, 1258, [institution('The Met: List of Rulers of the Islamic World', 'https://www.metmuseum.org/toah/hd/isru/hd_isru.htm')], true),
    ['Арабский халифат', 'Праведный халифат', 'Омейяды', 'Аббасиды'],
  ),
  historical(
    'holy-roman-empire',
    'Священная Римская империя',
    'СРИ',
    'Надгосударственное объединение Центральной Европы от коронации Оттона I до отречения Франца II.',
    span(962, 1806, [institution('Deutsches Historisches Museum: Heiliges Römisches Reich 962–1806', 'https://www.dhm.de/archiv/ausstellungen/heiliges-roemisches-reich/index_3.html')]),
  ),
  historical(
    'kievan-rus',
    'Древняя Русь',
    'РУС',
    'Древнерусское государство и земли-княжества IX — середины XIII века; это историографическая, а не современная национальная линия.',
    span(882, 1242, [academic('Институт истории Украины НАН Украины: Киевская Русь', 'https://history.org.ua/?termin=Kyivska_Rus')], true),
  ),
  historical(
    'mongol-empire',
    'Монгольская империя',
    'МОН',
    'Империя, основанная провозглашением Темучина Чингисханом, и её улусы до падения монгольской династии Юань в Китае.',
    span(1206, 1368, [institution('The Met: China, 1000–1400 A.D.', 'https://www.metmuseum.org/toah/ht/07/eac.html')]),
  ),
  historical(
    'khwarezm',
    'Держава хорезмшахов',
    'ХОР',
    'Держава хорезмшахов из династии Ануштегинидов до гибели последнего правителя Джелал ад-Дина.',
    span(1077, 1231, [academic('Encyclopaedia Iranica: Khwarazmshahs, the line of Anuštigin', 'https://www.iranicaonline.org/articles/khwarazmshah/iii-the-line-of-anustigin/')]),
    ['Хорезм', 'Хорезмшахи'],
  ),
  historical(
    'delhi-sultanate',
    'Делийский султанат',
    'ДС',
    'Сменявшие друг друга мусульманские династии Северной Индии от основания султаната до победы Бабура.',
    span(1206, 1526, [institution('The Met: South Asia, 1000–1400 A.D.', 'https://www.metmuseum.org/toah/ht/07/ssn.html')]),
  ),
  historical(
    'timurid-empire',
    'Держава Тимуридов',
    'ТИМ',
    'Государство Тимура и его преемников в Средней Азии и Иране до падения тимуридского Герата.',
    span(1370, 1507, [institution('The Met: Central and North Asia, 1400–1600 A.D.', 'https://www.metmuseum.org/toah/ht/08/nc.html')]),
    ['Держава Тимура', 'Тимуриды'],
  ),
  historical(
    'ottoman-empire',
    'Османская империя',
    'ОСМ',
    'Многонациональная империя Османов от традиционной даты основания династии до упразднения султаната.',
    span(1299, 1922, [institution('The Met: West Asia, 1400–1600 A.D.', 'https://www.metmuseum.org/toah/ht/08/waa.html')], true),
  ),
  historical(
    'mughal-empire',
    'Империя Великих Моголов',
    'МОГ',
    'Государство Великих Моголов от завоеваний Бабура до низложения последнего падишаха Бахадур-шаха II.',
    span(1526, 1858, [institution('The Met: List of Rulers of South Asia', 'https://www.metmuseum.org/toah/hd/ssar/hd_ssar.htm')]),
  ),
  historical(
    'olmec',
    'Цивилизация ольмеков',
    'ОЛЬ',
    'Ранняя цивилизация Мезоамерики, периодизация которой задаётся археологическими культурами.',
    span(-1500, -400, [institution('The Met: Mesoamerica, 2000–1000 B.C.', 'https://www.metmuseum.org/toah/ht/03/ca.html')], true),
  ),
  historical(
    'aztec',
    'Государство ацтеков',
    'АЦТ',
    'Держава Мешикского тройственного союза с центром в Теночтитлане до испанского завоевания.',
    span(1428, 1521, [institution('INAH: El origen del Estado mexica', 'https://inah.gob.mx/boletines/analizaran-el-origen-del-estado-mexica-en-el-museo-nacional-de-antropologia')]),
  ),
  historical(
    'inca',
    'Государство инков',
    'ИНК',
    'Андская империя Тауантинсуйу от экспансии Пачакутека до испанского завоевания центральной власти.',
    span(1438, 1532, [institution('The Met: South America, 1400–1600 A.D.', 'https://www.metmuseum.org/toah/ht/08/sanc.html')]),
  ),
  historical(
    'songhai',
    'Сонгайская империя',
    'СОН',
    'Западноафриканская империя от возвышения при Сонни Али до марокканского завоевания.',
    span(1465, 1591, [institution('The Met: Western and Central Sudan, 1400–1600 A.D.', 'https://www.metmuseum.org/toah/ht/08/afu.html')]),
  ),
  historical(
    'kingdom-kongo',
    'Королевство Конго',
    'КОН',
    'Историческое государство в нижнем течении реки Конго от конца XIV века до окончательной ликвидации Португалией.',
    span(
      1390,
      1914,
      [
        institution('Royal Museum for Central Africa: Kongo kingdom', 'https://www.africamuseum.be/en/discover/history_articles/kongo-kingdom'),
        institution('South African History Online: Kingdom of Kongo 1390–1914', 'https://sahistory.org.za/article/kingdom-kongo-1390-1914'),
      ],
      true,
    ),
  ),
];

/**
 * Исторический контекст современных линий.
 *
 * Каталог разводит Древний Рим и Италию сознательно: это разные государства,
 * и подписывать римское событие словом «Италия» было бы неправдой. Но читателю,
 * который выбрал Италию, античность нужна — иначе колонка начинается с VI века,
 * а переключатель «до н. э.» ничего не показывает.
 *
 * Решение — уже существующий механизм колонки на несколько дорожек: историческая
 * линия подселяется в современную колонку отдельной дорожкой,
 * со своим цветом и своей подписью. Ничего не переименовывается и не сливается.
 *
 * Одна историческая линия получает ровно одну колонку-хозяина только по
 * технической причине: иначе одна карточка одновременно попала бы в несколько
 * колонок. Это **не** утверждение об исключительном правопреемстве. Например,
 * Древняя Русь важна также для истории Украины и Беларуси, а СРИ охватывала
 * земли нескольких современных стран. Если историческая линия выбрана
 * отдельно, современная колонка её не забирает.
 */
const predecessors: Record<CountryId, CountryId[]> = {
  italy: ['ancient-rome'],
  greece: ['ancient-greece', 'ancient-macedonia'],
  egypt: ['ancient-egypt'],
  iraq: ['mesopotamia', 'assyria', 'babylonia'],
  iran: ['elam', 'achaemenid-persia'],
  israel: ['ancient-israel'],
  lebanon: ['phoenicia'],
  turkey: ['hittites', 'byzantium', 'ottoman-empire'],
  russia: ['kievan-rus'],
  germany: ['holy-roman-empire'],
  france: ['frankish-empire'],
  mongolia: ['mongol-empire'],
  india: ['delhi-sultanate', 'mughal-empire'],
  mexico: ['olmec', 'aztec'],
  peru: ['inca'],
  mali: ['songhai'],
  congo: ['kingdom-kongo'],
};

const originalColors: Record<string, [string, string]> = {
  germany: ['38 92% 58%', '32 78% 38%'],
  england: ['350 82% 64%', '350 70% 42%'],
  france: ['214 90% 66%', '218 75% 44%'],
  russia: ['265 78% 70%', '265 60% 48%'],
  belarus: ['160 66% 50%', '166 62% 30%'],
  spain: ['18 88% 60%', '14 76% 42%'],
  china: ['0 72% 58%', '2 66% 40%'],
  japan: ['188 72% 52%', '196 70% 32%'],
};

export const countries: Country[] = seeds.map((country, index) => {
  const hue = (index * 47 + 205) % 360;
  const [color, colorInk] = originalColors[country.id] ?? [
    `${hue} 68% 58%`,
    `${hue} 60% 36%`,
  ];
  return { ...country, color, colorInk, ...(predecessors[country.id] ? { ancestors: predecessors[country.id] } : {}) };
});

export const countryById: Record<CountryId, Country> = Object.fromEntries(
  countries.map((country) => [country.id, country]),
);

export const allCountryIds = countries.map((country) => country.id);

/**
 * Набор, с которого открывается шкала: семь европейских линий.
 *
 * Их достаточно, чтобы строка читалась поперёк, и мало настолько, чтобы колонки
 * помещались без прокрутки. Всё остальное читатель добирает сам — каталогом
 * или наборами (data/countrySets.ts).
 */
export const defaultCountryIds: CountryId[] = [
  'england',
  'france',
  'germany',
  'italy',
  'spain',
  'russia',
  'belarus',
];

export const countryRegionLabels: Record<CountryRegion, string> = {
  global: 'Международные',
  europe: 'Европа',
  asia: 'Азия',
  africa: 'Африка',
  'middle-east': 'Ближний Восток',
  'north-america': 'Северная Америка',
  'latin-america': 'Латинская Америка',
  oceania: 'Океания',
  historical: 'Исторические государства',
};
