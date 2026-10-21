import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { api } from '../../shared/api/client';
import { useSaveSettings, useSettings, useShortlistActions } from '../../shared/api/queries';
import { Button, copyText, Dialog, Field, Icon, Skeleton, useToast } from '../../shared/ui';

export function LetterDialog({
  supplierId,
  supplierName,
  searchId,
  open,
  onClose,
}: {
  supplierId: string;
  supplierName: string;
  searchId?: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const settings = useSettings();
  const save = useSaveSettings();
  const toast = useToast();
  const { add, update } = useShortlistActions();
  const [company, setCompany] = useState('');
  useEffect(() => setCompany(settings.data?.company ?? ''), [settings.data?.company]);

  const letter = useQuery({
    queryKey: ['letter', supplierId, searchId ?? null, settings.data?.company ?? ''],
    queryFn: () => api.letter(supplierId, searchId),
    enabled: open && settings.isSuccess,
  });
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  useEffect(() => {
    if (letter.data) {
      setSubject(letter.data.subject);
      setBody(letter.data.body);
    }
  }, [letter.data]);

  const mailto = letter.data?.to
    ? `mailto:${letter.data.to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    : null;

  async function markSent() {
    await add.mutateAsync({ id: supplierId, searchId });
    await update.mutateAsync({ id: supplierId, status: 'contacted', note: 'Отправили запрос КП' });
    toast('Отмечено: «Написали». Поставщик в шорт-листе', 'good');
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      wide
      title={`Письмо: ${supplierName}`}
      footer={
        <>
          <Button
            icon="copy"
            onClick={async () => {
              const ok = await copyText(`Тема: ${subject}\n\n${body}`);
              toast(ok ? 'Письмо скопировано' : 'Не получилось скопировать — выделите текст вручную');
            }}
            disabled={!letter.data}
          >
            Скопировать
          </Button>
          {mailto && (
            <a className="btn btn--secondary btn--md" href={mailto}>
              <Icon name="mail" />
              <span>Открыть в почте</span>
            </a>
          )}
          <Button variant="primary" icon="check" onClick={markSent} busy={add.isPending || update.isPending} disabled={!letter.data}>
            Отметить «Написали»
          </Button>
        </>
      }
    >
      <div className="letter">
        <p className="letter__lead">
          Вопросы собраны из пустых и спорных полей карточки: чего не нашли — то и спрашиваем. Сервис ничего не отправляет
          сам — письмо уходит от вас.
        </p>
        <Field label="Ваша компания" hint="Подставится в письмо и запомнится" htmlFor="letter-company">
          <input
            id="letter-company"
            className="input"
            placeholder="Например: сеть кафе «Пример»"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            onBlur={() => company !== (settings.data?.company ?? '') && save.mutate({ company })}
          />
        </Field>
        {letter.isLoading || !letter.data ? (
          <div className="stack">
            <Skeleton h={40} />
            <Skeleton h={220} />
          </div>
        ) : (
          <>
            {letter.data.to && (
              <p className="letter__to">
                Кому: <b>{letter.data.to}</b>
              </p>
            )}
            <Field label="Тема" htmlFor="letter-subject">
              <input id="letter-subject" className="input" value={subject} onChange={(e) => setSubject(e.target.value)} />
            </Field>
            <Field label={`Текст · вопросов к поставщику: ${letter.data.questions.length}`} htmlFor="letter-body">
              <textarea id="letter-body" className="input letter__body" value={body} onChange={(e) => setBody(e.target.value)} rows={16} />
            </Field>
          </>
        )}
      </div>
    </Dialog>
  );
}
