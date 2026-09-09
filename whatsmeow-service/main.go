package main

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	_ "github.com/mattn/go-sqlite3"
	"github.com/skip2/go-qrcode"
	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/proto/waE2E"
	"go.mau.fi/whatsmeow/store/sqlstore"
	"go.mau.fi/whatsmeow/types"
	"go.mau.fi/whatsmeow/types/events"
	waLog "go.mau.fi/whatsmeow/util/log"
	"google.golang.org/protobuf/proto"
)

type session struct {
	name   string
	client *whatsmeow.Client
	mu     sync.RWMutex
	status string
	qrCode string
}

type manager struct {
	dataDir    string
	webhook    string
	webhookKey string
	mu         sync.RWMutex
	sessions   map[string]*session
}

func newManager() *manager {
	dataDir := getenv("WHATSMEOW_DATA_DIR", "/data")
	_ = os.MkdirAll(dataDir, 0o700)
	return &manager{
		dataDir: dataDir, webhook: os.Getenv("WHATSMEOW_WEBHOOK_URL"),
		webhookKey: os.Getenv("WHATSMEOW_WEBHOOK_KEY"), sessions: make(map[string]*session),
	}
}

func getenv(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}

func safeName(name string) string {
	name = strings.TrimSpace(name)
	var b strings.Builder
	for _, r := range name {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '-' || r == '_' {
			b.WriteRune(r)
		} else {
			b.WriteByte('_')
		}
	}
	return b.String()
}

func (m *manager) get(name string) *session {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.sessions[name]
}

func (m *manager) create(name string) (*session, error) {
	if name == "" {
		return nil, errors.New("instance name is required")
	}
	m.mu.Lock()
	if existing := m.sessions[name]; existing != nil {
		m.mu.Unlock()
		return existing, nil
	}
	m.mu.Unlock()

	path := filepath.Join(m.dataDir, safeName(name)+".db")
	dbLog := waLog.Stdout("Database", "WARN", false)
	container, err := sqlstore.New(context.Background(), "sqlite3", "file:"+path+"?_foreign_keys=on", dbLog)
	if err != nil {
		return nil, fmt.Errorf("open session store: %w", err)
	}
	device, err := container.GetFirstDevice(context.Background())
	if err != nil {
		return nil, fmt.Errorf("load device store: %w", err)
	}
	client := whatsmeow.NewClient(device, waLog.Stdout("WhatsApp", "WARN", false))
	s := &session{name: name, client: client, status: "disconnected"}
	client.AddEventHandler(func(evt any) { m.handleEvent(s, evt) })

	m.mu.Lock()
	m.sessions[name] = s
	m.mu.Unlock()

	if client.Store.GetJID().IsEmpty() {
		qrChan, qrErr := client.GetQRChannel(context.Background())
		if qrErr != nil {
			return s, fmt.Errorf("create QR channel: %w", qrErr)
		}
		go func() {
			for item := range qrChan {
				if item.Event == "code" {
					png, err := qrcode.Encode(item.Code, qrcode.Medium, 320)
					if err == nil {
						s.mu.Lock()
						s.qrCode = "data:image/png;base64," + base64.StdEncoding.EncodeToString(png)
						s.status = "connecting"
						s.mu.Unlock()
					}
				} else {
					s.mu.Lock()
					s.status = item.Event
					s.mu.Unlock()
				}
			}
		}()
	}
	s.mu.Lock()
	s.status = "connecting"
	s.mu.Unlock()
	if err := client.Connect(); err != nil {
		s.mu.Lock()
		s.status = "error"
		s.mu.Unlock()
		return s, fmt.Errorf("connect: %w", err)
	}
	_ = os.WriteFile(filepath.Join(m.dataDir, safeName(name)+".name"), []byte(name), 0o600)
	return s, nil
}

func (m *manager) loadExisting() {
	files, err := filepath.Glob(filepath.Join(m.dataDir, "*.name"))
	if err != nil { return }
	for _, file := range files {
		name, readErr := os.ReadFile(file)
		if readErr == nil && strings.TrimSpace(string(name)) != "" {
			if _, createErr := m.create(strings.TrimSpace(string(name))); createErr != nil { log.Printf("failed to restore WhatsMeow session: %v", createErr) }
		}
	}
}

func (m *manager) handleEvent(s *session, evt any) {
	switch event := evt.(type) {
	case *events.Connected:
		s.mu.Lock()
		s.status = "open"
		s.qrCode = ""
		s.mu.Unlock()
	case *events.Disconnected:
		s.mu.Lock()
		s.status = "disconnected"
		s.mu.Unlock()
	case *events.LoggedOut:
		s.mu.Lock()
		s.status = "logged_out"
		s.mu.Unlock()
	case *events.Message:
		m.sendWebhook(map[string]any{"event": "messages.upsert", "data": map[string]any{
			"instance": s.name, "messages": []map[string]any{{
				"key":      map[string]any{"id": string(event.Info.ID), "remoteJid": event.Info.MessageSource.Chat.String(), "fromMe": event.Info.MessageSource.IsFromMe},
				"message":  map[string]any{"conversation": event.Message.GetConversation()},
				"pushName": event.Info.PushName,
			}},
		}})
	}
}

func (m *manager) sendWebhook(payload any) {
	if m.webhook == "" {
		return
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return
	}
	req, err := http.NewRequest(http.MethodPost, m.webhook, strings.NewReader(string(body)))
	if err != nil {
		return
	}
	req.Header.Set("Content-Type", "application/json")
	if m.webhookKey != "" {
		req.Header.Set("X-WhatsMeow-Key", m.webhookKey)
	}
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err == nil {
		_ = resp.Body.Close()
	}
}

func (m *manager) status(name string) map[string]any {
	s := m.get(name)
	if s == nil {
		return map[string]any{"status": "disconnected"}
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	return map[string]any{"instanceName": s.name, "status": s.status, "qrcode": map[string]string{"base64": s.qrCode}}
}

func normalizePhone(number string) string {
	return strings.TrimLeft(strings.Map(func(r rune) rune {
		if r >= '0' && r <= '9' {
			return r
		}
		return -1
	}, number), "0")
}

func (m *manager) send(name, number, text string) (map[string]any, error) {
	s := m.get(name)
	if s == nil {
		return nil, errors.New("instance not found")
	}
	if !s.client.IsLoggedIn() {
		return nil, errors.New("instance is not connected")
	}
	phone := normalizePhone(number)
	if len(phone) < 8 {
		return nil, errors.New("invalid phone number")
	}
	jid := types.NewJID(phone, "s.whatsapp.net")
	resp, err := s.client.SendMessage(context.Background(), jid, &waE2E.Message{Conversation: proto.String(text)})
	if err != nil {
		return nil, err
	}
	return map[string]any{"id": string(resp.ID), "timestamp": resp.Timestamp}, nil
}

func authorized(next http.Handler, key string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if key == "" || r.Header.Get("X-API-Key") != key {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func jsonResponse(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}

func main() {
	m := newManager()
	m.loadExisting()
	key := getenv("WHATSMEOW_API_KEY", "")
	mux := http.NewServeMux()
	mux.HandleFunc("/health", func(w http.ResponseWriter, _ *http.Request) {
		jsonResponse(w, http.StatusOK, map[string]string{"status": "ok", "provider": "whatsmeow"})
	})
	mux.Handle("/instances", authorized(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		var body struct {
			InstanceName string `json:"instanceName"`
		}
		if json.NewDecoder(r.Body).Decode(&body) != nil {
			http.Error(w, "invalid json", http.StatusBadRequest)
			return
		}
		s, err := m.create(strings.TrimSpace(body.InstanceName))
		if err != nil {
			jsonResponse(w, http.StatusBadGateway, map[string]string{"error": err.Error()})
			return
		}
		jsonResponse(w, http.StatusOK, map[string]any{"success": true, "data": m.status(s.name)})
	}), key))
	mux.Handle("/instances/", authorized(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		name := strings.TrimPrefix(r.URL.Path, "/instances/")
		name = strings.TrimSuffix(name, "/qr")
		if r.Method == http.MethodGet && strings.HasSuffix(r.URL.Path, "/qr") {
			jsonResponse(w, http.StatusOK, m.status(name))
			return
		}
		if r.Method != http.MethodPost || !strings.HasSuffix(r.URL.Path, "/messages") {
			http.Error(w, "not found", http.StatusNotFound)
			return
		}
		var body struct {
			Number string `json:"number"`
			Text   string `json:"text"`
		}
		if json.NewDecoder(r.Body).Decode(&body) != nil {
			http.Error(w, "invalid json", http.StatusBadRequest)
			return
		}
		result, err := m.send(name, body.Number, body.Text)
		if err != nil {
			jsonResponse(w, http.StatusBadGateway, map[string]string{"error": err.Error()})
			return
		}
		jsonResponse(w, http.StatusOK, map[string]any{"success": true, "data": result})
	}), key))
	port := getenv("PORT", "8080")
	log.Printf("WhatsMeow service listening on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, mux))
}
