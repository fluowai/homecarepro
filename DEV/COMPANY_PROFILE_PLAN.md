# Perfil Empresarial por Revenda e Clínica

## Objetivo
Permitir que cada revenda e cada clínica mantenha os dados oficiais da própria empresa, sem compartilhar ou sobrescrever o cadastro de outra organização.

## Implementação executada
1. A tabela `public.tenants` recebeu campos empresariais independentes por tenant.
2. `CompanyProfileView` reutiliza o mesmo formulário nos dois níveis: `super_admin` edita a revenda e `admin` edita a clínica.
3. `PUT /api/tenant/company-profile` deriva o destino do perfil autenticado e rejeita outros perfis.
4. A migração foi aplicada e registrada em `public.schema_migrations`.

## Aceite
- A revenda acessa `Dados da Revenda`.
- A clínica acessa `Dados da Empresa`.
- O salvamento persiste identificação, contatos e endereço no tenant correto.
- Typecheck e testes passam; o schema contém os 12 campos `company_*`.
