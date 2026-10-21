import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { SourceBlock } from '../../shared/api/types';
import { useSource } from '../../shared/api/queries';
import { date, hostOf } from '../../shared/lib/format';
import { Badge, Dialog, Icon, Skeleton } from '../../shared/ui';

interface Target {
  sourceId: string;
  quote?: string;
}

const Ctx = createContext<(t: Target) => void>(() => {});

/** Открыть страницу-источник с подсвеченной цитатой из любого места интерфейса */
export const useOpenSource = () => useContext(Ctx);

const KIND = {
  site: { label: 'Сайт поставщика', icon: 'globe' as const },
  registry: { label: 'Реестр юрлиц', icon: 'landmark' as const },
  docs: { label: 'Реестр деклараций', icon: 'doc' as const },
};

function Highlight({ text, quote }: { text: string; quote?: string }) {
  if (!quote) return <>{text}</>;
  const i = text.indexOf(quote);
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="quote-mark" data-quote>
        {quote}
      </mark>
      {text.slice(i + quote.length)}
    </>
  );
}

function Block({ b, quote }: { b: SourceBlock; quote?: string }) {
  switch (b.type) {
    case 'h':
      return <h3 className="srcpage__h">{b.text}</h3>;
    case 'p':
      return (
        <p className="srcpage__p">
          <Highlight text={b.text} quote={quote} />
        </p>
      );
    case 'li':
      return (
        <li className="srcpage__li">
          <Highlight text={b.text} quote={quote} />
        </li>
      );
    case 'row':
      return (
        <div className="srcpage__row">
          <dt>{b.label}</dt>
          <dd>
            <Highlight text={b.text} quote={quote} />
          </dd>
        </div>
      );
  }
}

function SourceView({ target }: { target: Target }) {
  const { data: page, isLoading, isError } = useSource(target.sourceId);
  const bodyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = bodyRef.current?.querySelector('[data-quote]');
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [page]);
  if (isLoading) {
    return (
      <div className="srcview">
        <Skeleton h={36} />
        <Skeleton h={18} w="70%" />
        <Skeleton h={18} w="85%" />
      </div>
    );
  }
  if (isError || !page) return <p className="muted">Источник не найден. Попробуйте открыть карточку заново.</p>;
  const kind = KIND[page.kind];
  const lis = page.blocks.filter((b) => b.type === 'li');
  const found = target.quote ? page.blocks.some((b) => ('text' in b ? b.text : '').includes(target.quote!)) : true;
  return (
    <div className="srcview">
      <div className="srcview__meta">
        <Badge tone="brand" icon={kind.icon}>
          {kind.label}
        </Badge>
        <span>Собрано {date(page.fetchedAt)}</span>
      </div>
      <div className="browser">
        <div className="browser__bar">
          <span className="browser__dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span className="browser__url" title={page.url}>
            <Icon name="globe" size={14} />
            {hostOf(page.url)}
          </span>
          <span className="browser__tag">снимок</span>
        </div>
        <div className="browser__body srcpage" ref={bodyRef}>
          {page.blocks.map((b, i) => {
            if (b.type === 'li') {
              if (b !== lis[0]) return null;
              return (
                <ul key={i} className="srcpage__ul">
                  {lis.map((li, j) => (
                    <Block key={j} b={li} quote={target.quote} />
                  ))}
                </ul>
              );
            }
            if (b.type === 'row') {
              const prev = page.blocks[i - 1];
              if (prev?.type === 'row') return null;
              const rows: SourceBlock[] = [];
              for (let j = i; j < page.blocks.length && page.blocks[j]?.type === 'row'; j++) rows.push(page.blocks[j]!);
              return (
                <dl key={i} className="srcpage__dl">
                  {rows.map((r, j) => (
                    <Block key={j} b={r} quote={target.quote} />
                  ))}
                </dl>
              );
            }
            return <Block key={i} b={b} quote={target.quote} />;
          })}
        </div>
      </div>
      {target.quote && (
        <p className="srcview__note">
          <Icon name={found ? 'check' : 'alert'} size={16} />
          {found
            ? 'Цитата найдена на странице дословно — значит, цифра в карточке взята отсюда, а не придумана.'
            : 'Цитаты на странице нет — такой факт в боевой версии был бы отброшен.'}
        </p>
      )}
      <p className="srcview__demo">
        Демо: это снимок вымышленной страницы на домене <code>.example</code>. В боевой версии здесь сохранённая копия
        настоящей страницы и ссылка на оригинал.
      </p>
    </div>
  );
}

export function SourceViewerProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<Target | null>(null);
  const open = useCallback((t: Target) => setTarget(t), []);
  return (
    <Ctx.Provider value={open}>
      {children}
      <Dialog open={Boolean(target)} onClose={() => setTarget(null)} side title="Откуда эта цифра">
        {target && <SourceView target={target} />}
      </Dialog>
    </Ctx.Provider>
  );
}
