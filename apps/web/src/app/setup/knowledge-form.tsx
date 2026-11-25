import { useState } from 'react';
import { AreaField, FormActions, TextField } from './fields';
import type { KnowledgeInput } from './setup-api';
import { KnowledgeCopy as Copy } from './setup-copy';

interface KnowledgeFormProps {
  initial?: KnowledgeInput;
  pending: boolean;
  onSubmit: (input: KnowledgeInput) => void;
  onCancel: () => void;
}

export function KnowledgeForm({
  initial,
  pending,
  onSubmit,
  onCancel,
}: Readonly<KnowledgeFormProps>) {
  const [question, setQuestion] = useState(initial?.question ?? '');
  const [answer, setAnswer] = useState(initial?.answer ?? '');
  return (
    <form
      className="grid gap-4 rounded-xl border bg-card p-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({ question, answer });
      }}
    >
      <TextField
        id="knowledge-question"
        label={Copy.question}
        value={question}
        onChange={setQuestion}
        required
        maxLength={300}
        placeholder={Copy.questionPlaceholder}
      />
      <AreaField
        id="knowledge-answer"
        label={Copy.answer}
        value={answer}
        onChange={setAnswer}
        required
        maxLength={2000}
        placeholder={Copy.answerPlaceholder}
      />
      <FormActions pending={pending} onCancel={onCancel} />
    </form>
  );
}
