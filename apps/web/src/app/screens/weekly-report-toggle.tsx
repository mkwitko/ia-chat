import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useId } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

// Research 09 #2: the Monday report (e-mail and notification) is on by default; turned off here.

const PATH = '/api/notifications/weekly-report';
const KEY = ['weekly-report'] as const;
const PUT = 'PUT';

export const WeeklyReportCopy = {
  heading: 'Notificações',
  label: 'Resumo da semana',
  hint: 'Toda segunda, às 8h, por e-mail e notificação: conversas respondidas, agendamentos do assistente, comparecimentos, valor recuperado e perguntas esperando você. Sem nome de paciente.',
  failed: 'Não conseguimos salvar. Tente de novo.',
  on: 'Ligado',
  off: 'Desligado',
} as const;

interface Setting {
  enabled: boolean;
}

/** One switch; the change saves at once and comes back on failure. */
export function WeeklyReportToggle() {
  const id = useId();
  const client = useQueryClient();
  const setting = useQuery({ queryKey: KEY, queryFn: () => api<Setting>(PATH) });
  const save = useMutation({
    mutationFn: (enabled: boolean) => api<Setting>(PATH, { method: PUT, body: { enabled } }),
    onSuccess: (data) => client.setQueryData(KEY, data),
    onError: () => toast.error(WeeklyReportCopy.failed),
  });
  const checked = save.isPending ? save.variables : (setting.data?.enabled ?? true);
  return (
    <div className="grid gap-2">
      <label
        htmlFor={id}
        className="flex min-h-11 cursor-pointer items-start justify-between gap-4 rounded-lg border bg-card px-4 py-3"
      >
        <span className="grid gap-1">
          <span className="text-sm font-medium">{WeeklyReportCopy.label}</span>
          <span className="text-sm text-muted-foreground">{WeeklyReportCopy.hint}</span>
          <span className="text-sm font-medium">
            {checked ? WeeklyReportCopy.on : WeeklyReportCopy.off}
          </span>
        </span>
        <input
          id={id}
          type="checkbox"
          role="switch"
          className="mt-0.5 size-6 shrink-0 cursor-pointer accent-primary"
          checked={checked}
          disabled={!setting.data || save.isPending}
          onChange={(event) => {
            save.mutate(event.target.checked);
          }}
        />
      </label>
    </div>
  );
}
