import { countryById, defaultCountryIds } from '../data/countries';
import './SiteFooter.css';

type Props = {
  itemCount: number;
};

export function SiteFooter({ itemCount }: Props) {
  return (
    <footer className="site-footer">
      <div className="shell site-footer__inner">
        <div className="site-footer__lines" aria-hidden="true">
          {defaultCountryIds.map((id) => countryById[id]).map((country) => (
            <span key={country.id} style={{ background: `hsl(${country.color})` }} />
          ))}
        </div>

        <div className="site-footer__text">
          <p className="site-footer__brand">Синхрония — атлас параллельной истории</p>
          <p>
            {itemCount} объектов на линиях современных стран, исторических государств и международных процессов — от предыстории до наших дней. Тексты написаны
            для читателя без специальной подготовки: одно предложение сути, несколько предложений контекста.
          </p>
          <p className="site-footer__note">
            Даты и оценки даны в общепринятой историографической трактовке. Ранние периоды привязаны к
            территориям и культурным линиям, а не к современным границам.
          </p>
        </div>
      </div>
    </footer>
  );
}
