import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { api } from '../../shared/api/client';
import { useShortlist } from '../../shared/api/queries';
import { AddSupplierDialog } from '../../features/add-supplier/AddSupplierDialog';
import { useCompare } from '../../features/compare/CompareContext';
import { Button, Dialog, Icon, IconButton, useToast } from '../../shared/ui';
import { AboutContent } from './About';

function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const set = document.documentElement.dataset.theme;
    if (set === 'dark' || set === 'light') return set;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('scout:theme', next);
    } catch {
      /* не критично */
    }
  };
  return { theme, toggle };
}

export function Layout() {
  const shortlist = useShortlist();
  const qc = useQueryClient();
  const toast = useToast();
  const navigate = useNavigate();
  const compare = useCompare();
  const { theme, toggle } = useTheme();
  const location = useLocation();
  const [addOpen, setAddOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const count = shortlist.data?.length ?? 0;

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  async function reset() {
    await api.reset();
    compare.clear();
    qc.clear();
    setResetOpen(false);
    toast('Демо сброшено: шорт-лист, заметки и свои поставщики очищены', 'good');
    navigate('/');
  }

  return (
    <div className="app">
      <a className="skip" href="#main">
        К содержимому
      </a>
      <div className="demo-strip">
        <div className="wrap demo-strip__in">
          <span>
            <span className="demo-strip__tag">Демо</span> Компании вымышлены, сайты на домене .example.{' '}
            <button type="button" className="linkish" onClick={() => setAboutOpen(true)}>
              Как это устроено
            </button>
          </span>
          <button type="button" className="linkish" onClick={() => setResetOpen(true)}>
            <Icon name="reset" size={14} /> Сбросить демо
          </button>
        </div>
      </div>
      <header className="header">
        <div className="wrap header__in">
          <Link to="/" className="logo" aria-label="Скаут поставщиков — на главную">
            <span className="logo__mark" aria-hidden="true">
              <Icon name="box" size={18} />
            </span>
            <span className="logo__word">
              Скаут<span>поставщиков</span>
            </span>
          </Link>
          <nav className="nav" aria-label="Основное меню">
            <NavLink to="/" end className="nav__link">
              <Icon name="search" size={17} />
              <span>Поиск</span>
            </NavLink>
            <NavLink to="/shortlist" className="nav__link">
              <Icon name="star" size={17} />
              <span>Шорт-лист</span>
              {count > 0 && <span className="nav__count">{count}</span>}
            </NavLink>
            <button type="button" className="nav__link nav__link--btn" onClick={() => setAddOpen(true)}>
              <Icon name="plus" size={17} />
              <span>Добавить своего</span>
            </button>
          </nav>
          <IconButton icon={theme === 'dark' ? 'sun' : 'moon'} label={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'} onClick={toggle} />
        </div>
      </header>
      <main id="main" className="main">
        <Outlet />
      </main>
      <footer className="footer">
        <div className="wrap footer__in">
          <span>Скаут поставщиков · прототип тестового задания для Goulash.Tech</span>
          <button type="button" className="linkish" onClick={() => setAboutOpen(true)}>
            О прототипе и боевой версии
          </button>
        </div>
      </footer>
      <AddSupplierDialog open={addOpen} onClose={() => setAddOpen(false)} />
      <Dialog open={aboutOpen} onClose={() => setAboutOpen(false)} title="Как устроен прототип" wide>
        <AboutContent />
      </Dialog>
      <Dialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Сбросить демо?"
        footer={
          <>
            <Button onClick={() => setResetOpen(false)}>Отмена</Button>
            <Button variant="danger" icon="reset" onClick={reset}>
              Сбросить
            </Button>
          </>
        }
      >
        <p>Удалятся история поисков, шорт-лист, заметки и добавленные вручную поставщики. Каталог останется прежним.</p>
      </Dialog>
    </div>
  );
}
