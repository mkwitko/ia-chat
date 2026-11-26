import { contactPackages } from '@app/db';
import { tool } from 'ai';
import * as z from 'zod';
import type { ToolContext } from './tools.ts';

// Research 09 #7: "quantas sessões tenho?" is answered only from the ledger of the contact in this
// conversation (the context's contactId, never the model's). Name and counts; no price, nothing
// clinical. The client's oldest packages drop off after the most recent few.

const SHOWN = 3;

export function packageTool({ db, tenantId, contactId }: ToolContext) {
  return tool({
    description:
      'Consulta o saldo de sessões dos pacotes deste paciente: quantas usou e quantas restam. Use sempre que ele perguntar das sessões do pacote; nunca responda de memória. Lista vazia: não há pacote registrado, diga que o profissional confirma.',
    inputSchema: z.object({}),
    execute: async () => {
      const packages = await db.withTenant(tenantId, (tx) => contactPackages(tx, contactId));
      return {
        pacotes: packages.slice(-SHOWN).map((item) => ({
          nome: item.name,
          sessoes: item.sessions,
          usadas: item.used,
          restantes: item.remaining,
        })),
      };
    },
  });
}
