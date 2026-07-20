'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { auth } from '@/lib/firebase';

export interface AnalysisUpdateEvent {
  userId: string;
  reportId: string;
  analysisId: string | null;
  summary: Record<string, unknown>;
  createdAt: string;
}

interface RealtimeMessage {
  type: 'connected' | 'analysis_update';
  data: unknown;
  ts: number;
}

const RECONNECT_DELAY_MS = 3000;

function wsBaseUrl(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  return apiUrl.replace(/^http/, 'ws');
}

/**
 * Subscribes to live analysis/metric updates over the backend's WebSocket
 * endpoint. Reconnects automatically and refreshes the Firebase ID token
 * on every (re)connect since the token is short-lived.
 */
export function useRealtimeAnalysis(onUpdate?: (event: AnalysisUpdateEvent) => void) {
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<AnalysisUpdateEvent | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const connect = useCallback(async () => {
    if (typeof window === 'undefined') {
      return;
    }
    const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
    if (!token) {
      return;
    }

    const ws = new WebSocket(`${wsBaseUrl()}/ws?token=${encodeURIComponent(token)}`);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => {
      setConnected(false);
      if (wsRef.current === ws) {
        setTimeout(connect, RECONNECT_DELAY_MS);
      }
    };
    ws.onerror = () => ws.close();
    ws.onmessage = (event) => {
      try {
        const msg: RealtimeMessage = JSON.parse(event.data);
        if (msg.type === 'analysis_update') {
          const data = msg.data as AnalysisUpdateEvent;
          setLastEvent(data);
          onUpdateRef.current?.(data);
        }
      } catch {
        // ignore malformed messages
      }
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      const ws = wsRef.current;
      wsRef.current = null;
      ws?.close();
    };
  }, [connect]);

  return { connected, lastEvent };
}
