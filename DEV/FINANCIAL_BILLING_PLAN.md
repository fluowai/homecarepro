# Plano financeiro e de precificação

## Objetivo

Consolidar contratos, faturamento, cobrança e repasses profissionais em um fluxo auditável por clínica (tenant).

## Entrega executada

- Financeiro com subabas de faturamento, contratos/totais e configuração de cobrança.
- Resumo de contratos ativos, valor contratado e custo profissional estimado.
- Configuração persistida por tenant: cobrança manual ou automática, dia de vencimento e flag de geração automática.
- Profissional com regras de preço por paciente/serviço, duração do plantão e valor específico.
- Migration expand-only: `20260917000000_billing_and_professional_pricing.sql`.

## Próximas etapas recomendadas

1. Gerar invoices automaticamente por contrato/serviço, com idempotência por competência e contrato.
2. Criar contas a pagar de profissionais separadas de invoices de clientes.
3. Adicionar trilha de auditoria para geração, edição, cancelamento e baixa de cobranças.
4. Integrar o provedor de cobrança somente depois de estabilizar estados `PENDING`, `PAID`, `FAILED`, `CANCELED`.
5. Criar testes de isolamento por tenant, duplicidade mensal e cálculo de repasse.

## Critérios de aceite

- Trocar o modo de cobrança persiste após recarregar a sessão.
- Totais de contratos ativos batem com a soma dos serviços cadastrados.
- Uma regra de preço específica por paciente prevalece sobre o valor padrão.
- Plantões com durações diferentes não misturam valores.
- Nenhum cálculo ou fatura cruza tenants.
