import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import type { CategoryId, CityId } from '../../shared/api/types';
import { useAddSupplier, useSettings } from '../../shared/api/queries';
import { CATEGORIES, CATEGORY_ORDER, CITIES, SEARCH_CITIES } from '../../shared/config/dictionary';
import { Button, Dialog, Field, useToast } from '../../shared/ui';

/** Своего поставщика, которого уже знаете, можно добавить вручную — он попадёт в поиск и сравнение */
export function AddSupplierDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const settings = useSettings();
  const add = useAddSupplier();
  const toast = useToast();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [city, setCity] = useState<CityId>(settings.data?.city ?? 'ekb');
  const [cats, setCats] = useState<CategoryId[]>([]);
  const [inn, setInn] = useState('');
  const [website, setWebsite] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [tried, setTried] = useState(false);
  const [innTouched, setInnTouched] = useState(false);

  const errors = {
    name: name.trim() ? null : 'Укажите название',
    cats: cats.length ? null : 'Выберите хотя бы одну категорию',
    inn: !inn || /^\d{10}(\d{2})?$/.test(inn) ? null : `Нужно 10 цифр для организации или 12 для ИП — сейчас ${inn.length}`,
  };
  const show = (k: keyof typeof errors) => (tried || (k === 'inn' && innTouched) ? errors[k] : null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setTried(true);
    if (errors.name || errors.cats || errors.inn) return;
    const s = await add.mutateAsync({ name, city, categories: cats, inn, website, phone, email, note });
    toast('Поставщик добавлен — он появится в поиске по его категории', 'good');
    onClose();
    setName('');
    setCats([]);
    setInn('');
    setWebsite('');
    setPhone('');
    setEmail('');
    setNote('');
    setTried(false);
    setInnTouched(false);
    navigate(`/supplier/${s.id}`);
  }

  return (
    <Dialog open={open} onClose={onClose} title="Добавить своего поставщика">
      <form className="form" onSubmit={submit} noValidate>
        <p className="muted">
          Поставщик, которого вы уже знаете. В боевой версии по ИНН или ссылке на сайт он пройдёт ту же проверку, что и
          найденные; в демо карточка заполняется вручную и помечается «вручную». Обязательны название, город и категория.
        </p>
        <Field label="Название" htmlFor="add-name" error={show('name')}>
          <input id="add-name" className="input" aria-invalid={!!show('name') || undefined} value={name} onChange={(e) => setName(e.target.value)} placeholder="ООО «Пример»" required />
        </Field>
        <div className="form__row">
          <Field label="Город" htmlFor="add-city">
            <select id="add-city" className="input" value={city} onChange={(e) => setCity(e.target.value as CityId)}>
              {SEARCH_CITIES.map((c) => (
                <option key={c} value={c}>
                  {CITIES[c].name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="ИНН" htmlFor="add-inn" error={show('inn')}>
            <input
              id="add-inn"
              className="input"
              inputMode="numeric"
              placeholder="10 или 12 цифр"
              value={inn}
              aria-invalid={!!show('inn') || undefined}
              onBlur={() => setInnTouched(true)}
              onChange={(e) => setInn(e.target.value.replace(/\D/g, ''))}
              maxLength={12}
            />
          </Field>
        </div>
        <fieldset className="field">
          <legend className="field__label">Категории</legend>
          <div className="chips">
            {CATEGORY_ORDER.map((c) => (
              <label key={c} className={`chip chip--toggle ${cats.includes(c) ? 'is-on' : ''}`}>
                <input type="checkbox" checked={cats.includes(c)} onChange={() => setCats((xs) => (xs.includes(c) ? xs.filter((x) => x !== c) : [...xs, c]))} />
                {CATEGORIES[c].short}
              </label>
            ))}
          </div>
          {show('cats') && (
            <p className="field__hint field__hint--error" role="alert">
              {show('cats')}
            </p>
          )}
        </fieldset>
        <div className="form__row">
          <Field label="Телефон" htmlFor="add-phone">
            <input id="add-phone" className="input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <Field label="Почта" htmlFor="add-email">
            <input id="add-email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
        </div>
        <Field label="Сайт" htmlFor="add-site">
          <input id="add-site" className="input" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="example.ru" />
        </Field>
        <Field label="Заметка" htmlFor="add-note">
          <input id="add-note" className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Откуда знаем, с кем говорили" />
        </Field>
        <div className="form__actions">
          <Button onClick={onClose}>Отмена</Button>
          <Button variant="primary" type="submit" icon="plus" busy={add.isPending}>
            Добавить
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
