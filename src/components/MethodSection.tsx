import { motion } from 'framer-motion';
import './MethodSection.css';

const steps = [
  {
    label: 'Слева — время',
    text: 'Колонка дат идёт сверху вниз, от первого года нашей эры до наших дней. Строка появляется, только если в этот год что-то отмечено, поэтому расстояние между строками не равно числу лет.',
  },
  {
    label: 'Справа — страны',
    text: 'Каждая страна — своя вертикальная линия со своим цветом. Точка на линии означает, что в этот год в этой стране произошло что-то, что стоит запомнить.',
  },
  {
    label: 'По горизонтали — синхронность',
    text: 'Главное чтение этой таблицы — не сверху вниз, а поперёк. Одна строка показывает, что происходило в восьми странах в один и тот же момент.',
  },
  {
    label: 'Клик — объяснение',
    text: 'Карточка отвечает на три вопроса: что произошло, почему это важно и как это связано с параллельной историей. Подробности открываются в панели фокуса справа.',
  },
];

const principles = [
  {
    title: 'Простые формулировки',
    text: 'Мы пишем для тех, кто не помнит школьный курс наизусть. Одно предложение в карточке, два-четыре в подробностях, без энциклопедических абзацев.',
  },
  {
    title: 'Честные оговорки',
    text: 'Ранние века привязаны к территориям и традициям, а не к современным границам. Спорные оценки помечены как спорные, а не поданы как факт.',
  },
  {
    title: 'Вес важности',
    text: 'У каждого объекта есть вес: опорные вехи эпохи отмечены звездой и остаются видны в режиме «только вехи». Так база может расти, не превращаясь в кашу.',
  },
];

const roadmap = [
  {
    title: 'Месяцы и дни',
    text: 'В модели данных уже есть поля месяца и дня — часть событий хранит точную дату. Следующий шаг: переключатель детализации, который дробит строку года на месяцы, а месяц — на дни.',
    status: 'модель готова',
  },
  {
    title: 'Больше стран и линий',
    text: 'Добавить страну — значит добавить один файл с её объектами и одну запись в справочнике. Ширина таблицы и скрытие колонок рассчитаны на два десятка линий.',
    status: 'в один файл',
  },
  {
    title: 'Внешние источники',
    text: 'Данные отделены от интерфейса, поэтому массив объектов можно заменить загрузкой из JSON, CMS или API без изменения компонентов.',
    status: 'в планах',
  },
  {
    title: 'Карта и экспорт',
    text: 'Карта мира для выбранного года, ссылки на источники, пользовательские коллекции и экспорт выбранной хронологии в PDF.',
    status: 'в планах',
  },
];

export function MethodSection() {
  return (
    <section className="method" id="method">
      <div className="shell">
        <header className="method__head">
          <p className="eyebrow">Как устроена эта карта</p>
          <h2 className="method__title">Четыре правила чтения</h2>
        </header>

        <ol className="method__steps">
          {steps.map((step, index) => (
            <motion.li
              key={step.label}
              className="method__step"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.5, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="method__step-num">{index + 1}</span>
              <h3>{step.label}</h3>
              <p>{step.text}</p>
            </motion.li>
          ))}
        </ol>

        <div className="method__split">
          <div>
            <h3 className="method__subtitle">Принципы текстов</h3>
            <div className="method__principles">
              {principles.map((principle) => (
                <article key={principle.title} className="method__principle">
                  <h4>{principle.title}</h4>
                  <p>{principle.text}</p>
                </article>
              ))}
            </div>
          </div>

          <div>
            <h3 className="method__subtitle">Что дальше</h3>
            <div className="method__roadmap">
              {roadmap.map((item) => (
                <article key={item.title} className="method__roadmap-item">
                  <div className="method__roadmap-top">
                    <h4>{item.title}</h4>
                    <span className="tag">{item.status}</span>
                  </div>
                  <p>{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
