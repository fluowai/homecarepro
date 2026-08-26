import express from "express";
import { SupabaseClient } from "@supabase/supabase-js";
import { uploadBuffer } from "../minio";
import { logEvent } from "../app";

export function createWhatsAppRouter(supabaseAdmin: SupabaseClient, requireAuth: any) {
  const router = express.Router();
  const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || "http://evolution-api:8080";
  const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || "homecare-evo-secret-123";

  // Helper for requests to Evolution API
  const fetchEvo = async (path: string, options: RequestInit = {}) => {
    const url = `${EVOLUTION_API_URL}${path}`;
    const headers = {
      "Content-Type": "application/json",
      apikey: EVOLUTION_API_KEY,
      ...(options.headers || {}),
    };
    return fetch(url, { ...options, headers });
  };

  // Webhook for Evolution API (Public)
  router.post("/webhook", async (req, res) => {
    try {
      const payload = req.body;
      const event = payload.event;
      // Evolution API sends events like "messages.upsert", "connection.update", etc.

      if (event === "connection.update") {
        const { instance, state, qrcode, reason } = payload.data;
        // Update instance status
        await supabaseAdmin
          .from("whatsapp_instances")
          .update({ 
            status: state, 
            qr_code: qrcode || null,
            disconnect_reason: reason || null,
            updated_at: new Date().toISOString()
          })
          .eq("instance_name", instance);
          
        return res.json({ success: true });
      }

      if (event === "messages.upsert") {
        const { instance, messages } = payload.data;
        const msg = messages[0];
        
        if (!msg) return res.json({ success: true });

        // Identify tenant from instance name
        const { data: instanceData } = await supabaseAdmin
          .from("whatsapp_instances")
          .select("id, tenant_id")
          .eq("instance_name", instance)
          .single();

        if (!instanceData) {
          return res.status(404).json({ error: "Instance not found" });
        }

        const tenantId = instanceData.tenant_id;
        const remoteJid = msg.key.remoteJid;
        const fromMe = msg.key.fromMe;
        const phone = remoteJid.split("@")[0];

        // Ensure contact exists
        const { data: contact, error: contactErr } = await supabaseAdmin
          .from("whatsapp_contacts")
          .upsert({
            tenant_id: tenantId,
            phone: phone,
            profile_name: msg.pushName || null,
          }, { onConflict: "tenant_id,phone" })
          .select("id")
          .single();

        if (contactErr || !contact) {
          logEvent("ERROR", "Failed to upsert contact", { error: contactErr });
          return res.status(500).json({ error: "DB Error" });
        }

        let messageType = "text";
        let content = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
        let mediaUrl = null;
        let mediaMimetype = null;

        // Extract media if exists
        const mediaMessage = msg.message?.imageMessage || msg.message?.audioMessage || msg.message?.documentMessage || msg.message?.videoMessage;
        
        if (mediaMessage) {
          messageType = msg.message.imageMessage ? "image" 
                      : msg.message.audioMessage ? "audio"
                      : msg.message.videoMessage ? "video"
                      : "document";
          
          mediaMimetype = mediaMessage.mimetype;
          content = mediaMessage.caption || "";

          // Fetch base64 from Evolution API
          try {
            const b64Res = await fetchEvo(`/chat/getBase64/${instance}`, {
              method: "POST",
              body: JSON.stringify({ message: msg })
            });
            const b64Data = await b64Res.json();
            
            if (b64Data && b64Data.base64) {
              const buffer = Buffer.from(b64Data.base64, 'base64');
              const ext = mediaMimetype.split("/")[1]?.split(";")[0] || "bin";
              const fileName = `whatsapp/${tenantId}/${msg.key.id}.${ext}`;
              mediaUrl = await uploadBuffer(fileName, buffer, mediaMimetype);
            }
          } catch (err) {
            logEvent("ERROR", "Failed to fetch/upload media", { error: err });
          }
        }

        // Insert message
        const { data: insertedMsg, error: msgErr } = await supabaseAdmin
          .from("whatsapp_messages")
          .insert({
            tenant_id: tenantId,
            instance_id: instanceData.id,
            contact_id: contact.id,
            message_id: msg.key.id,
            direction: fromMe ? "OUTBOUND" : "INBOUND",
            message_type: messageType,
            content: content,
            media_url: mediaUrl,
            media_mimetype: mediaMimetype,
            status: fromMe ? "SENT" : "DELIVERED"
          })
          .select("id")
          .single();

        if (msgErr) {
          logEvent("ERROR", "Failed to insert message", { error: msgErr });
        } else if (insertedMsg) {
          // Update thread
          await supabaseAdmin
            .from("whatsapp_threads")
            .upsert({
              tenant_id: tenantId,
              contact_id: contact.id,
              last_message_id: insertedMsg.id,
              last_message_time: new Date().toISOString(),
              unread_count: fromMe ? 0 : 1
            }, { onConflict: "tenant_id,contact_id" });
        }

        return res.json({ success: true });
      }

      res.json({ success: true });
    } catch (err: any) {
      logEvent("ERROR", "Webhook error", { error: err.message });
      res.status(500).json({ error: "Webhook Error" });
    }
  });

  // Endpoints for Frontend
  
  // 1. Create Instance
  router.post("/instances", requireAuth, async (req, res) => {
    try {
      const { instanceName } = req.body;
      const userId = (req as any).userId;
      
      const { data: profile } = await supabaseAdmin
        .from("user_profiles")
        .select("tenant_id")
        .eq("id", userId)
        .single();

      if (!profile || !profile.tenant_id) {
        return res.status(403).json({ error: "Tenant not found." });
      }
      
      const tenantId = profile.tenant_id;
      
      // Call Evolution to create instance
      const evoRes = await fetchEvo(`/instance/create`, {
        method: "POST",
        body: JSON.stringify({
          instanceName,
          qrcode: true,
          integration: "WHATSAPP-BAILEYS",
          webhook: `${process.env.APP_URL}/api/whatsapp/webhook`,
          webhookByEvents: true,
          events: ["APPLICATION_STARTUP", "QRCODE_UPDATED", "MESSAGES_UPSERT", "MESSAGES_UPDATE", "CONNECTION_UPDATE"]
        })
      });
      const data = await evoRes.json();

      // Save to DB
      await supabaseAdmin.from("whatsapp_instances").insert({
        tenant_id: tenantId,
        instance_name: instanceName,
        status: data.instance?.status || "connecting",
        qr_code: data.qrcode?.base64 || null
      });

      res.json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Fetch QR Code
  router.get("/instances/:instanceName/qr", requireAuth, async (req, res) => {
    try {
      const evoRes = await fetchEvo(`/instance/connect/${req.params.instanceName}`);
      const data = await evoRes.json();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Send Message
  router.post("/messages", requireAuth, async (req, res) => {
    try {
      const { instanceName, number, text, mediaUrl, mediaMimetype } = req.body;
      
      if (mediaUrl) {
        // Send Media
        const evoRes = await fetchEvo(`/message/sendMedia/${instanceName}`, {
          method: "POST",
          body: JSON.stringify({
            number,
            options: { delay: 1200 },
            mediaMessage: {
              mediatype: mediaMimetype.split("/")[0],
              caption: text || "",
              media: mediaUrl
            }
          })
        });
        const data = await evoRes.json();
        res.json({ success: true, data });
      } else {
        // Send Text
        const evoRes = await fetchEvo(`/message/sendText/${instanceName}`, {
          method: "POST",
          body: JSON.stringify({
            number,
            options: { delay: 1200 },
            textMessage: { text }
          })
        });
        const data = await evoRes.json();
        res.json({ success: true, data });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
