import { useState } from 'react';
import { AreaField, FormActions } from './fields';
import { feedback } from './feedback';
import { useArchiveKnowledge, useUpdateKnowledge, type Unanswered } from './setup-api';
import { KnowledgeCopy as Copy } from './setup-copy';

/** Spec 10: "um toque para escrever a resposta e incluí-la na base". */
export function UnansweredList({ items }: Readonly<{ items: Unanswered[] }>) {
  if (items.length === 0) return null;
  return (
    <section className="grid gap-3 px-4 md:px-0">
      <h2 className="text-lg">{Copy.unansweredHeading}</h2>
      <p className="text-sm text-muted-foreground">{Copy.unansweredHint}</p>
      {items.map((item) => (
        <UnansweredCard key={item.id} item={item} />
      ))}
    </section>
  );
}

function UnansweredCard({ item }: Readonly<{ item: Unanswered }>) {
  const [answer, setAnswer] = useState('');
  const update = useUpdateKnowledge();
  const archive = useArchiveKnowledge();
  const submit = () => {
    update.mutate({ id: item.id, body: { question: item.question, answer } }, feedback);
  };
  return (
    <form
      className="grid gap-3 rounded-xl border border-attention/40 bg-attention-soft p-4"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <p className="font-semibold">{item.question}</p>
      <AreaField
        id={`answer-${item.id}`}
        label={Copy.answerLabel(item.question)}
        value={answer}
        onChange={setAnswer}
        required
        maxLength={2000}
        className="bg-card"
        placeholder={Copy.answerPlaceholder}
      />
      <FormActions
        pending={update.isPending}
        saveLabel={Copy.saveAnswer}
        cancelLabel={Copy.ignore}
        onCancel={() => {
          archive.mutate(item.id, feedback);
        }}
      />
    </form>
  );
}
