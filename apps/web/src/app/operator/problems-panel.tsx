import { useProblems } from './operator-api';
import { OperatorCopy as Copy } from './operator-copy';

/** E-26: what the platform flagged recently (dead letters, delivery failures, aborted turns). Ids and codes only. */
export function ProblemsPanel() {
  const problems = useProblems();
  if (!problems.data) return null;
  return (
    <section aria-label={Copy.problems.heading} className="rounded-xl border bg-card p-4">
      <h2 className="mb-1 text-base font-semibold">{Copy.problems.heading}</h2>
      <p className="mb-3 text-sm text-muted-foreground">{Copy.problems.hint}</p>
      {problems.data.length === 0 && <p className="text-sm">{Copy.problems.none}</p>}
      <ul className="grid gap-2 text-sm">
        {problems.data.map((problem) => (
          <li key={problem.id} className="grid gap-0.5 border-b pb-2 last:border-0">
            <span className="font-medium">{Copy.problems.event(problem.event)}</span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {Copy.problems.details(problem)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
