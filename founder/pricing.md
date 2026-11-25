# Preço (proposta, 25/11/2026)

**Não rodei o Van Westendorp:** ele precisa das respostas de preço do painel, e o painel aqui é só qualitativo e simulado (`panel/results.md`). Não há faixa PMC-PME e não invento uma. Preços abaixo vêm de `packages/core/src/plans.ts` e `docs/spec/07`; concorrentes, da pesquisa 04 (24/11/2026). Tudo é hipótese até a validação com donos reais.

## Preços atuais (plans.ts)

Essencial R$ 197 (300 conversas), Agenda R$ 297 (500), Pro R$ 497 (1.000), Clínica R$ 697 (1.000 + por profissional). Excedente R$ 0,40 ou R$ 0,35 por conversa. Implantação R$ 497 uma vez (hipótese).

## Comparação

Botconversa R$ 189 a R$ 199 (genérico, montar sozinho); Clinicorp e Simples Dental R$ 149,90 a R$ 369,90 por sistema, com IA à parte; Cloudia só por contato. Faixa citada na pesquisa 04 para IA focada em clínica: R$ 500 a R$ 800 (evidência fraca).

Margem por plano (estimativa de `docs/spec/07`, franquia cheia): Essencial 83%, Agenda 83%, Pro 81%. Não inclui imposto, suporte nem aquisição.

## Recomendação

1. **O MVP novo inclui Google Agenda, que hoje só existe no plano Agenda.** Para o público de hora marcada, o plano de entrada que faz sentido vender é o **Agenda (R$ 297)**. O Essencial (sem agenda) concorre direto com o Botconversa Pro (R$ 199), que é genérico, e não entrega "conversa vira horário". Proposta: manter Essencial como degrau de entrada, mas apresentar o Agenda como plano principal. Mudar a estrutura (por exemplo, trazer a agenda para o Essencial) é decisão do dono; testar antes.
2. **Escada:** Agenda R$ 297 (principal) → Pro R$ 497 (recuperação de interessados, quando a M-10 existir) → Clínica R$ 697 (vários profissionais). Cada degrau tem um motivo concreto de subir. Não vender no site o que ainda é "em breve" como incluído.
3. **Implantação R$ 497 é a maior barreira provável** para um negócio pequeno (hipótese). Testar: R$ 0 para fundadores e indicados do piloto, com data final, versus R$ 497. Não rotular como "desconto de R$ 497" se esse valor nunca foi cobrado de ninguém (sem preço-âncora falso).
4. **Oferta de abertura:** condição de fundador (vagas limitadas por capacidade de implantação) em troca de feedback e número real. Valor da condição: decisão do dono, ainda não definida.
5. **O que testar com compradores reais:** apresentar R$ 297 com implantação R$ 497 para metade e R$ 297 com implantação inclusa para a outra metade; medir quantos aceitam a demonstração e quantos pagam. Registrar as objeções de preço literais.

## Objeções de preço a responder (simuladas, a confirmar)

"Já uso WhatsApp Business e resolve", "R$ 497 de implantação é muito", "vou pagar uma pessoa se perder cliente".

Se o preço mudar: atualizar `plans.ts` e `docs/spec/07` em outro PR (não neste).
