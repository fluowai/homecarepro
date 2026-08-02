-- ============================================================================
-- HomeCare Pro - Seed Data (Development / Demo)
-- Run after: 20260726000000_initial_schema.sql
-- ============================================================================

-- Demo tenants
insert into public.tenants (id, name, logo, cnpj, plan) values
  ('sp', 'HomeCare Pro São Paulo', '🏥', '12.345.678/0001-99', 'Enterprise'),
  ('rj', 'Anjos do Lar Rio de Janeiro', '👼', '98.765.432/0001-11', 'Pro')
on conflict (id) do nothing;

-- Demo patients
insert into public.patients (id, tenant_id, name, birth_date, cpf, phone, email, status, plan_type, avatar, diagnostic, allergies, medications, address, summary_ai) values
  ('pat-1', 'sp', 'Dona Francisca Ribeiro Silva', '1948-04-12', '123.456.789-00', '(11) 98111-2233', 'francisca.silva@demo.com', 'active', 'Bradesco Saúde', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=120', 'Alzheimer Estágio Moderado, Hipertensão Arterial e Osteoporose.', '["Penicilina","Iodo"]'::jsonb, '["Aricept (Donepezila) 10mg - 1x ao dia (noite)","Losartana 50mg - 2x ao dia","Melatonina 3mg - 1x ao dia"]'::jsonb, '{"street":"Rua das Palmeiras","number":"425","city":"São Paulo","state":"SP","zipCode":"01226-010"}'::jsonb, 'Paciente de 78 anos, Alzheimer moderado com comorbidades vasculares. Risco moderado de queda. Alérgica a Penicilina.'),
  ('pat-2', 'sp', 'Seu Geraldo de Souza', '1942-09-28', '234.567.890-11', '(11) 97222-3344', 'geraldo.souza@demo.com', 'active', 'Particular', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=120', 'Pós-Operatório de Artroplastia Total de Quadril Direito, Diabetes Mellitus Tipo 2.', '["Dipirona"]'::jsonb, '["Metformina 850mg - 2x ao dia","Clexane 40mg SC - 1x ao dia","Tramal 50mg - se dor forte"]'::jsonb, '{"street":"Avenida Brigadeiro Luís Antônio","number":"2300","city":"São Paulo","state":"SP","zipCode":"01318-002"}'::jsonb, 'Paciente idoso de 84 anos, pós-artroplastia de quadril. Alérgico a Dipirona.'),
  ('pat-3', 'sp', 'Ana Júlia de Albuquerque', '2016-06-15', '345.678.901-22', '(11) 96333-4455', 'mae.anajulia@demo.com', 'active', 'Unimed', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=120', 'Paralisia Cerebral Espástica GMFCS V, Traqueostomizada e Gastrostomizada.', '["Látex","Sulfa"]'::jsonb, '["Baclofeno 10mg - 1/2 comprimido 3x ao dia","Fenobarbital 100mg - 1x ao dia (noite)","Gaviscon 5ml - após refeições"]'::jsonb, '{"street":"Rua Pamplona","number":"980","city":"São Paulo","state":"SP","zipCode":"01405-001"}'::jsonb, ''),
  ('pat-4', 'rj', 'Seu Moacyr Guimarães', '1939-11-05', '456.789.012-33', '(21) 98222-7788', 'moacyr.guimaraes@demo.com', 'active', 'Particular', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=120', 'DPOC Grave (Sequela de Tabagismo), Cardiopatia Isquêmica Crônica.', '["Nenhuma relatada"]'::jsonb, '["Spiriva Respimat - 2 puffs pela manhã","AAS 100mg - 1x ao dia","Carvedilol 6.25mg - 2x ao dia"]'::jsonb, '{"street":"Avenida Atlântica","number":"1200","city":"Rio de Janeiro","state":"RJ","zipCode":"22021-001"}'::jsonb, '')
on conflict (id) do nothing;

-- Demo professionals
insert into public.professionals (id, tenant_id, name, specialty, registration, status, email, phone, avatar, rating) values
  ('prof-1', 'sp', 'Dra. Mariana Costa', 'Enfermeiro', 'COREN-SP 432.109', 'active', 'mariana.costa@homecarepro.com', '(11) 98765-4321', 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=120', 4.9),
  ('prof-2', 'sp', 'Carlos Santos', 'Fisioterapeuta', 'CREFITO-SP 98.765', 'active', 'carlos.fisioterapeuta@homecarepro.com', '(11) 97654-3210', 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=120', 5.0),
  ('prof-3', 'sp', 'Thiago Silva', 'Técnico de Enfermagem', 'COREN-TE 112.334', 'busy', 'thiago.tecnico@homecarepro.com', '(11) 96543-2109', 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=120', 4.7),
  ('prof-4', 'sp', 'Dr. Roberto Almeida', 'Médico', 'CRM-SP 180.456', 'offline', 'roberto.almeida@homecarepro.com', '(11) 95432-1098', 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=120', 4.9),
  ('prof-5', 'rj', 'Dra. Eliane Pires', 'Enfermeiro', 'COREN-RJ 220.180', 'active', 'eliane.pires@homecarepro.com', '(21) 98777-6655', 'https://images.unsplash.com/photo-1594824813573-246434de83fb?auto=format&fit=crop&q=80&w=120', 4.8)
on conflict (id) do nothing;

-- Demo medicines
insert into public.medicines (id, tenant_id, name, dosage, manufacturer, expiry_date, quantity, min_quantity) values
  ('med-1', 'sp', 'Aricept (Donepezila)', '10mg', 'Pfizer', (current_date + interval '120 days')::text, 45, 10),
  ('med-2', 'sp', 'Losartana Potássica', '50mg', 'Medley', (current_date + interval '240 days')::text, 90, 20),
  ('med-3', 'sp', 'Clexane (Enoxaparina)', '40mg SC', 'Sanofi', (current_date + interval '14 days')::text, 3, 5),
  ('med-4', 'sp', 'Fenobarbital', '100mg', 'Cristália', (current_date + interval '8 days')::text, 30, 5)
on conflict (id) do nothing;

-- Default alert config per tenant
insert into public.alert_config (id, tenant_id) values
  ('default', 'sp'),
  ('default', 'rj')
on conflict (id) do nothing;

-- Default survey config per tenant
insert into public.survey_config (id, tenant_id) values
  ('default', 'sp'),
  ('default', 'rj')
on conflict (id) do nothing;
