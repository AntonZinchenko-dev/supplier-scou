import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react';
import { Icon, type IconName } from './Icon';

export { Icon, type IconName };

/* ─────────── Кнопки ─────────── */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: IconName;
  iconRight?: IconName;
  busy?: boolean;
};

export function Button({ variant = 'secondary', size = 'md', icon, iconRight, busy, children, className, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      {...rest}
      className={['btn', `btn--${variant}`, `btn--${size}`, busy ? 'is-busy' : '', className ?? ''].join(' ')}
      disabled={rest.disabled || busy}
    >
      {icon && <Icon name={icon} size={size === 'sm' ? 16 : 18} />}
      {children && <span>{children}</span>}
      {iconRight && <Icon name={iconRight} size={size === 'sm' ? 16 : 18} />}
    </button>
  );
}

export function IconButton({ icon, label, className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { icon: IconName; label: string }) {
  return (
    <button type="button" aria-label={label} title={label} {...rest} className={`icon-btn ${className ?? ''}`}>
      <Icon name={icon} />
    </button>
  );
}

/* ─────────── Метки ─────────── */

export function Badge({ tone = 'neutral', icon, children }: { tone?: 'neutral' | 'good' | 'amber' | 'red' | 'brand'; icon?: IconName; children: ReactNode }) {
  return (
    <span className={`badge badge--${tone}`}>
      {icon && <Icon name={icon} size={14} />}
      {children}
    </span>
  );
}

/* ─────────── Диалог и боковая панель на <dialog> ─────────── */

export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
  side,
  wide,
  labelledBy,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  side?: boolean;
  wide?: boolean;
  labelledBy?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className={['dialog', side ? 'dialog--side' : '', wide ? 'dialog--wide' : ''].join(' ')}
      aria-labelledby={labelledBy ?? titleId}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      {open && (
        <div className="dialog__inner">
          {title && (
            <header className="dialog__head">
              <h2 id={titleId}>{title}</h2>
              <IconButton icon="x" label="Закрыть" onClick={onClose} />
            </header>
          )}
          <div className="dialog__body">{children}</div>
          {footer && <footer className="dialog__foot">{footer}</footer>}
        </div>
      )}
    </dialog>
  );
}

/* ─────────── Уведомления ─────────── */

interface ToastItem {
  id: number;
  text: string;
  tone: 'info' | 'good';
}

const ToastCtx = createContext<(text: string, tone?: ToastItem['tone']) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((text: string, tone: ToastItem['tone'] = 'info') => {
    const id = Date.now() + Math.random();
    setItems((xs) => [...xs.slice(-2), { id, text, tone }]);
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 3600);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast toast--${t.tone}`}>
            <Icon name={t.tone === 'good' ? 'check' : 'info'} size={16} />
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);

/* ─────────── Поля ─────────── */

export function Field({
  label,
  hint,
  error,
  children,
  htmlFor,
}: {
  label: string;
  hint?: string;
  /** Ошибка заменяет подсказку и показывается под полем */
  error?: string | null;
  children: ReactNode;
  htmlFor?: string;
}) {
  const text = error || hint;
  return (
    <div className="field">
      <label className="field__label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {text && (
        <p className={`field__hint ${error ? 'field__hint--error' : ''}`} id={htmlFor ? `${htmlFor}-hint` : undefined} role={error ? 'alert' : undefined}>
          {text}
        </p>
      )}
    </div>
  );
}

export function Skeleton({ h = 16, w = '100%' }: { h?: number; w?: number | string }) {
  return <span className="skeleton" style={{ height: h, width: w }} aria-hidden="true" />;
}

export function Empty({ icon = 'search', title, children, action }: { icon?: IconName; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <span className="empty__icon">
        <Icon name={icon} size={22} />
      </span>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function useMediaQuery(q: string): boolean {
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const on = () => setM(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [q]);
  return m;
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.append(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}
