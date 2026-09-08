import express from "express";
import { SupabaseClient } from "@supabase/supabase-js";
import { logEvent } from "../app";

export function createWhatsAppRouter(supabaseAdmin: SupabaseClient, requireAuth: any) {
  const router = express.Router();
  const serviceUrl = (process.env.WHATSMEOW_URL || "http://whatsmeow:8080").replace(/\/$/, "");
  const serviceKey = process.env.WHATSMEOW_API_KEY || "";

  async function callService(path: string, options: RequestInit = {}) {
    if (!serviceKey) throw new Error("WhatsMeow não está configurado no servidor.");
    return fetch(`${serviceUrl}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", "X-API-Key": serviceKey, ...(options.headers || {}) },
    });
  }

  router.post("/webhook", async (req, res) => {
    try {
      if (process.env.WHATSMEOW_WEBHOOK_KEY && req.header("X-WhatsMeow-Key") !== process.env.WHATSMEOW_WEBHOOK_KEY) {
        return res.status(401).json({ error: "Webhook não autorizado." });
      }
      const payload = req.body || {};
      if (payload.event !== "messages.upsert") return res.json({ success: true });
      const instanceName = String(payload.data?.instance || "");
      const msg = payload.data?.messages?.[0];
      if (!instanceName || !msg?.key?.id) return res.json({ success: true });
      const { data: instance } = await supabaseAdmin.from("whatsapp_instances").select("id, tenant_id").eq("instance_name", instanceName).maybeSingle();
      if (!instance) return res.status(404).json({ error: "Instância não encontrada." });
      const phone = String(msg.key.remoteJid || "").split("@")[0];
      const { data: contact, error: contactError } = await supabaseAdmin.from("whatsapp_contacts").upsert({ tenant_id: instance.tenant_id, phone, profile_name: msg.pushName || null }, { onConflict: "tenant_id,phone" }).select("id").single();
      if (contactError || !contact) throw contactError || new Error("Contato não criado.");
      const { data: inserted, error: messageError } = await supabaseAdmin.from("whatsapp_messages").insert({ tenant_id: instance.tenant_id, instance_id: instance.id, contact_id: contact.id, message_id: String(msg.key.id), direction: msg.key.fromMe ? "OUTBOUND" : "INBOUND", message_type: "text", content: String(msg.message?.conversation || ""), status: msg.key.fromMe ? "SENT" : "DELIVERED" }).select("id").single();
      if (messageError) throw messageError;
      await supabaseAdmin.from("whatsapp_threads").upsert({ tenant_id: instance.tenant_id, contact_id: contact.id, last_message_id: inserted.id, last_message_time: new Date().toISOString(), unread_count: msg.key.fromMe ? 0 : 1 }, { onConflict: "tenant_id,contact_id" });
      return res.json({ success: true });
    } catch (error: any) {
      logEvent("ERROR", "WhatsMeow webhook failed", { error: error.message });
      return res.status(500).json({ error: "Falha ao processar evento do WhatsApp." });
    }
  });

  router.post("/instances", requireAuth, async (req, res) => {
    try {
      const instanceName = String(req.body?.instanceName || "").trim();
      const userId = (req as any).userId;
      if (!instanceName || !/^[\p{L}\p{N}_ -]{2,80}$/u.test(instanceName)) return res.status(400).json({ error: "Informe um nome de instância válido (2 a 80 caracteres)." });
      const { data: profile } = await supabaseAdmin.from("user_profiles").select("tenant_id").eq("id", userId).single();
      if (!profile?.tenant_id) return res.status(403).json({ error: "Tenant não encontrado." });
      const serviceResponse = await callService("/instances", { method: "POST", body: JSON.stringify({ instanceName }) });
      const serviceData = await serviceResponse.json().catch(() => ({}));
      if (!serviceResponse.ok) return res.status(serviceResponse.status === 401 ? 502 : serviceResponse.status).json({ error: serviceData.error || "Falha ao iniciar a instância WhatsApp." });
      const { error: insertError } = await supabaseAdmin.from("whatsapp_instances").insert({ tenant_id: profile.tenant_id, instance_name: instanceName, status: serviceData.data?.status || "connecting", qr_code: serviceData.data?.qrcode?.base64 || null });
      if (insertError) { if (insertError.code === "23505") return res.status(409).json({ error: "Já existe uma conexão com esse nome." }); throw insertError; }
      return res.json({ success: true, data: serviceData.data || serviceData });
    } catch (error: any) {
      logEvent("ERROR", "WhatsMeow instance creation failed", { error: error.message });
      return res.status(502).json({ error: error.message || "Não foi possível iniciar o serviço WhatsMeow." });
    }
  });

  router.get("/instances/:instanceName/qr", requireAuth, async (req, res) => {
    try {
      const response = await callService(`/instances/${encodeURIComponent(req.params.instanceName)}/qr`);
      const data = await response.json().catch(() => ({}));
      return res.status(response.ok ? 200 : 502).json(data);
    } catch (error: any) { return res.status(502).json({ error: error.message || "WhatsMeow indisponível." }); }
  });

  router.post("/messages", requireAuth, async (req, res) => {
    try {
      const { instanceName, number, text, mediaUrl } = req.body || {};
      if (mediaUrl) return res.status(400).json({ error: "Envio de mídia ainda não está disponível no adaptador WhatsMeow." });
      const response = await callService(`/instances/${encodeURIComponent(String(instanceName || ""))}/messages`, { method: "POST", body: JSON.stringify({ number, text }) });
      const data = await response.json().catch(() => ({}));
      return res.status(response.ok ? 200 : 502).json(data);
    } catch (error: any) { return res.status(502).json({ error: error.message || "WhatsMeow indisponível." }); }
  });

  return router;
}
