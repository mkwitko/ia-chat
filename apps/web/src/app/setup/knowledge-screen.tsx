import { Route } from '@/routes';
import { ListSkeleton, LoadError } from '../inbox/query-states';
import { EditorScreen } from '../screens/editor-screen';
import { AddButton } from './add-button';
import { feedback } from './feedback';
import { RowActions } from './fields';
import { KnowledgeForm } from './knowledge-form';
import {
  useArchiveKnowledge,
  useCreateKnowledge,
  useKnowledge,
  useUpdateKnowledge,
  type KnowledgeItem,
  type KnowledgeView,
} from './setup-api';
import { CommonCopy, KnowledgeCopy as Copy } from './setup-copy';
import { UnansweredList } from './unanswered-list';
import { NEW_ITEM, useEditing } from './use-editing';

/** Spec 10, "Assistente": base, with the questions the assistant could not answer first. */
export function KnowledgeScreen() {
  const knowledge = useKnowledge();
  return (
    <EditorScreen
      title={Copy.title}
      intro={Copy.intro}
      back={{ to: Route.assistant, label: CommonCopy.assistant }}
    >
      <p className="px-4 pb-2 text-muted-foreground md:px-0">{Copy.intro}</p>
      {knowledge.isPending && <ListSkeleton />}
      {knowledge.isError && (
        <LoadError message={CommonCopy.loadFailed} onRetry={() => void knowledge.refetch()} />
      )}
      {knowledge.data && <KnowledgeContent view={knowledge.data} />}
    </EditorScreen>
  );
}

function KnowledgeContent({ view }: Readonly<{ view: KnowledgeView }>) {
  const edit = useEditing();
  const create = useCreateKnowledge();
  return (
    <div className="grid gap-10 pt-4 pb-10">
      <UnansweredList items={view.unanswered} />
      <section className="grid gap-3">
        <h2 className="text-lg">{Copy.baseHeading}</h2>
        {view.items.length === 0 && edit.editing !== NEW_ITEM && (
          <p className="text-sm text-muted-foreground">{Copy.empty}</p>
        )}
        {view.items.map((item) => (
          <KnowledgeRow key={item.id} item={item} edit={edit} />
        ))}
        {edit.editing === NEW_ITEM ? (
          <KnowledgeForm
            pending={create.isPending}
            onCancel={edit.close}
            onSubmit={(body) => {
              create.mutate(body, edit.done);
            }}
          />
        ) : (
          <AddButton
            label={Copy.add}
            onClick={() => {
              edit.open(NEW_ITEM);
            }}
          />
        )}
      </section>
    </div>
  );
}

function KnowledgeRow({
  item,
  edit,
}: Readonly<{ item: KnowledgeItem; edit: ReturnType<typeof useEditing> }>) {
  const update = useUpdateKnowledge();
  const archive = useArchiveKnowledge();
  if (edit.editing === item.id)
    return (
      <KnowledgeForm
        initial={item}
        pending={update.isPending}
        onCancel={edit.close}
        onSubmit={(body) => {
          update.mutate({ id: item.id, body }, edit.done);
        }}
      />
    );
  return (
    <div className="grid gap-1 rounded-xl border bg-card p-4">
      <p className="font-semibold">{item.question}</p>
      <p className="text-sm whitespace-pre-line text-muted-foreground">{item.answer}</p>
      <RowActions
        onEdit={() => {
          edit.open(item.id);
        }}
        onRemove={() => {
          if (window.confirm(Copy.removeConfirm)) archive.mutate(item.id, feedback);
        }}
      />
    </div>
  );
}
