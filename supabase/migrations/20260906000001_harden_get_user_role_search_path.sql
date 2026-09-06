-- ============================================================================
-- Migration: restaura search_path em get_user_role
-- A 20260905000000 redefiniu get_user_role() (CREATE OR REPLACE) sem
-- SET search_path, removendo o hardening aplicado em 20260804000002.
-- SECURITY DEFINER sem search_path fixo é vetor de hijack de função/tabela.
-- ============================================================================

ALTER FUNCTION public.get_user_role() SET search_path = public;