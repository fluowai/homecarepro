import { supabase } from './supabase';

// ── Audio Notification Engine ──────────────────────────────────────────

const AUDIO_CACHE: Record<string, HTMLAudioElement> = {};

export type NotificationAudioType = 'critical' | 'warning' | 'message' | 'visit' | 'default';

const AUDIO_FILES: Record<NotificationAudioType, string> = {
  critical: '/audio/alert-critical.wav',
  warning: '/audio/alert-warning.wav',
  message: '/audio/message.wav',
  visit: '/audio/visit-start.wav',
  default: '/audio/alert-info.wav',
};

let audioEnabled = true;

export function setAudioEnabled(enabled: boolean) {
  audioEnabled = enabled;
}

export function isAudioEnabled() {
  return audioEnabled;
}

export function playNotificationSound(type: NotificationAudioType = 'default') {
  if (!audioEnabled || typeof window === 'undefined') return;
  try {
    const file = AUDIO_FILES[type] || AUDIO_FILES.default;
    let audio = AUDIO_CACHE[file];
    if (!audio) {
      audio = new Audio(file);
      audio.preload = 'auto';
      AUDIO_CACHE[file] = audio;
    }
    audio.currentTime = 0;
    audio.play().catch(() => {
      // Fallback to speech synthesis if audio fails (e.g., autoplay blocked)
      fallbackSpeech(type);
    });
  } catch {
    fallbackSpeech(type);
  }
}

function fallbackSpeech(type: NotificationAudioType) {
  if (!('speechSynthesis' in window)) return;
  const messages: Record<NotificationAudioType, string> = {
    critical: 'Alerta crítico do HomeCare Pro',
    warning: 'Atenção: novo alerta do HomeCare Pro',
    message: 'Você recebeu uma nova mensagem no HomeCare Pro',
    visit: 'Seu profissional de saúde chegou para a visita',
    default: 'Você tem uma nova notificação do HomeCare Pro',
  };
  const utterance = new SpeechSynthesisUtterance(messages[type]);
  utterance.lang = 'pt-BR';
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

// ── Web Push Registration ──────────────────────────────────────────────

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function getVapidPublicKey(): Promise<string> {
  const response = await fetch('/api/notifications/vapid-key');
  if (!response.ok) {
    throw new Error(`Falha ao obter chave VAPID (${response.status})`);
  }

  const data = (await response.json()) as { publicKey?: unknown };
  return typeof data.publicKey === 'string' ? data.publicKey : '';
}

export async function registerPushNotifications(vapidPublicKey: string): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('[PUSH] Push not supported in this browser');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('[PUSH] Notification permission not granted');
      return false;
    }

    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();

    let subscription = existing;
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
    }

    // Send subscription to backend
    const { data: session } = await supabase.auth.getSession();
    const token = session?.session?.access_token;
    if (!token) return false;

    const res = await fetch('/api/push-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.getKey('p256dh') ? btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')!))) : '',
          auth: subscription.getKey('auth') ? btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')!))) : '',
        },
      }),
    });

    if (!res.ok) {
      console.error('[PUSH] Failed to save subscription');
      return false;
    }

    console.log('[PUSH] Subscription saved successfully');
    return true;
  } catch (err) {
    console.error('[PUSH] Registration failed', err);
    return false;
  }
}

export async function checkPushPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  return Notification.permission;
}

// ── Install Prompt Handler (PWA) ───────────────────────────────────────

let deferredPrompt: BeforeInstallPromptEvent | null = null;

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function setupInstallPrompt(onAvailable?: () => void) {
  if (typeof window === 'undefined') return () => {};

  const handler = (e: Event) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    onAvailable?.();
  };

  window.addEventListener('beforeinstallprompt', handler as EventListener);

  return () => {
    window.removeEventListener('beforeinstallprompt', handler as EventListener);
  };
}

export async function promptInstall(): Promise<boolean> {
  if (!deferredPrompt) return false;
  await deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice;
  deferredPrompt = null;
  return choice.outcome === 'accepted';
}

export function isPWAInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
}

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|IEMobile|Windows Phone|Mobile/i.test(navigator.userAgent)
    || (window.matchMedia?.('(pointer: coarse)').matches === true && window.innerWidth < 900);
}

// ── Supabase Realtime subscription for notifications ────────────────────

export interface RealtimeNotification {
  id: string;
  tenant_id: string;
  user_id: string;
  patient_id?: string;
  title: string;
  body: string;
  type: 'visit' | 'alert' | 'message' | 'clinical' | 'system';
  severity: 'critical' | 'warning' | 'info';
  is_read: boolean;
  is_delivered: boolean;
  created_at: string;
}

export function subscribeToNotifications(
  userId: string,
  onNotification: (n: RealtimeNotification) => void
) {
  if (!isSupabaseConfiguredSafe()) return () => {};

  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const n = payload.new as RealtimeNotification;
        onNotification(n);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

function isSupabaseConfiguredSafe(): boolean {
  try {
    return Boolean((supabase as any).supabaseUrl);
  } catch {
    return false;
  }
}

// ── Mark notification as read ──────────────────────────────────────────

export async function markNotificationRead(notificationId: string): Promise<void> {
  try {
    const { data: session } = await supabase.auth.getSession();
    const token = session?.session?.access_token;
    if (!token) return;
    await fetch(`/api/notifications/${notificationId}/read`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (err) {
    console.error('[NOTIF] Failed to mark as read', err);
  }
}

// ── Trigger notification (for family fan-out) ──────────────────────────

export async function triggerFamilyNotification(
  eventType: 'visit_checkin' | 'visit_checkout' | 'clinical_alert' | 'new_message',
  patientId: string,
  message?: string,
  severity?: string
): Promise<void> {
  try {
    const { data: session } = await supabase.auth.getSession();
    const token = session?.session?.access_token;
    if (!token) return;
    await fetch('/api/notifications/trigger', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ eventType, patientId, message, severity }),
    });
  } catch (err) {
    console.error('[NOTIF] Failed to trigger notification', err);
  }
}
