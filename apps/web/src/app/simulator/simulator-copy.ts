import { SourceKind } from './simulator-api';

// Spec 10, "Simulador": pt-BR copy, written for the professional.

export const SimulatorCopy = {
  title: 'Simulador',
  intro: 'Converse com o assistente como se fosse um paciente e veja como ele responde.',
  notice:
    'Nada aqui é enviado a pacientes nem aparece nas suas conversas. Não escreva dados de pacientes reais.',
  limits:
    'Agendar, remarcar e cancelar não são executados no simulador: o assistente só consulta os horários livres.',
  empty:
    'Escreva como um paciente escreveria. Por exemplo: "Oi, quanto custa a primeira consulta?"',
  fieldLabel: 'Mensagem do paciente',
  placeholder: 'Escreva a mensagem do paciente',
  send: 'Enviar',
  sending: 'Pensando…',
  reset: 'Recomeçar conversa',
  patient: 'Paciente (teste)',
  assistant: 'Assistente',
  usedTitle: 'O que o assistente usou',
  usedNothing: 'Não usou nenhuma informação cadastrada.',
  fixed: 'Resposta pronta do sistema, sem IA.',
  handoff: 'Aqui o assistente passaria a conversa para você.',
  chatLabel: 'Conversa de teste',
  failed: 'Não conseguimos simular agora. Tente de novo.',
  tooMany: 'Você chegou ao limite de mensagens de teste por hora. Tente mais tarde.',
  off: 'O simulador não está disponível neste ambiente.',
  sourceKind: {
    [SourceKind.service]: 'Serviço e preço',
    [SourceKind.package]: 'Pacote',
    [SourceKind.address]: 'Endereço',
    [SourceKind.arrival]: 'Como chegar',
    [SourceKind.knowledge]: 'Base de conhecimento',
    [SourceKind.tool]: 'Ação',
  },
} as const;
