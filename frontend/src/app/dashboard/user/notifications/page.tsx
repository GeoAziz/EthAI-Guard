'use client';
import React, { useEffect, useState, useCallback } from 'react';
import RoleProtected from '@/components/auth/RoleProtected';
import Breadcrumbs from '@/components/layout/breadcrumbs';
import PageHeader from '@/components/layout/page-header';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import formatDate from '@/lib/formatDate';

export default function NotificationsPage() {
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/v1/notifications?userId=me');
      setNotes(Array.isArray(res?.data) ? res.data : (res?.data?.items || []));
    } catch (err) {
      console.error('Failed to load notifications', err);
      toast?.({ title: 'Failed to load notifications', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    function onRunCompleted(e: any) {
      const detail = e?.detail || {};
      const n = { id: `evt-${Date.now()}`, title: 'Run completed', body: `Run ${detail.runId} completed`, createdAt: new Date().toISOString(), read: false, link: detail.reportId ? `/dashboard/user/reports/${detail.reportId}` : undefined };
      setNotes((prev) => [n, ...prev]);
      toast?.({ title: 'Run completed', description: `Run ${detail.runId} completed`, variant: 'default' });
    }
    window.addEventListener('analysis:runCompleted', onRunCompleted as EventListener);
    return () => window.removeEventListener('analysis:runCompleted', onRunCompleted as EventListener);
  }, [toast]);

  const markRead = async (id: string) => {
    try {
      await api.post(`/v1/notifications/${id}/mark-read`);
      setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch (err) {
      console.error('Failed to mark read', err);
      toast?.({ title: 'Failed to mark read', variant: 'destructive' });
    }
  };

  return (
    <RoleProtected required={['user','admin']}>
      <div className="p-8 max-w-4xl mx-auto">
        <Breadcrumbs />
        <PageHeader title="Notifications" subtitle="Your recent activity" />

        <div className="mt-6 rounded-lg border bg-white p-4">
          {loading && <div className="text-sm text-muted-foreground">Loading…</div>}
          {!loading && notes.length === 0 && <div className="text-sm text-muted-foreground">No notifications</div>}
          {!loading && notes.length > 0 && (
            <ul className="space-y-2">
              {notes.map((n) => (
                <li key={n.id} className={`p-3 border rounded ${n.read ? 'opacity-70' : ''}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{n.title}</div>
                      <div className="text-xs text-muted-foreground">{n.body}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">{formatDate(n.createdAt)}</div>
                  </div>
                  <div className="mt-2 flex gap-2">
                    {!n.read && <button className="btn" onClick={() => markRead(n.id)}>Mark read</button>}
                    {n.link && <a className="text-primary" href={n.link}>View</a>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </RoleProtected>
  );
}
