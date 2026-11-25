import { cn } from '@/lib/utils';
import { SimRole, type ChatLine, type SimulationReply } from './simulator-api';
import { SimulatorCopy as Copy } from './simulator-copy';

// Bubbles as in the conversation screen (DESIGN.md): patient left, assistant right, tinted.
// Authorship is a label, never color alone (RN-55).

export function Chat({ lines }: Readonly<{ lines: ChatLine[] }>) {
  if (lines.length === 0)
    return <p className="px-4 py-6 text-sm text-muted-foreground md:px-0">{Copy.empty}</p>;
  return (
    <ol aria-label={Copy.chatLabel} className="grid gap-3 px-4 py-4 md:px-0">
      {lines.map((line, index) => (
        <li key={`${line.role}-${String(index)}`} className="grid gap-1">
          <Bubble line={line} />
          {line.reply && <Used reply={line.reply} />}
        </li>
      ))}
    </ol>
  );
}

function Bubble({ line }: Readonly<{ line: ChatLine }>) {
  const patient = line.role === SimRole.patient;
  return (
    <div
      className={cn(
        'max-w-[85%] rounded-2xl px-3 py-2',
        patient ? 'justify-self-start border bg-card' : 'justify-self-end bg-jade-soft',
      )}
    >
      <p className="text-xs font-semibold text-muted-foreground">
        {patient ? Copy.patient : Copy.assistant}
      </p>
      <p className="text-base break-words whitespace-pre-wrap">{line.text}</p>
    </div>
  );
}

/** What the answer used: tool calls and registered facts, derived by the server. */
function Used({ reply }: Readonly<{ reply: SimulationReply }>) {
  return (
    <div className="max-w-[85%] justify-self-end text-sm text-muted-foreground">
      <p className="font-semibold">{Copy.usedTitle}</p>
      {reply.fixed && <p>{Copy.fixed}</p>}
      {!reply.fixed && reply.sources.length === 0 && <p>{Copy.usedNothing}</p>}
      <ul className="grid gap-0.5">
        {reply.sources.map((source, index) => (
          <li key={`${source.kind}-${source.label}-${String(index)}`}>
            <span className="font-medium">{Copy.sourceKind[source.kind]}:</span> {source.label}
            {source.detail ? ` (${source.detail})` : ''}
          </li>
        ))}
      </ul>
      {reply.handoff && <p className="font-medium text-attention">{Copy.handoff}</p>}
    </div>
  );
}
