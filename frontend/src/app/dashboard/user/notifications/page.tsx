'use client';
import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import RoleProtected from '@/components/auth/RoleProtected';
import Breadcrumbs from '@/components/layout/breadcrumbs';
import PageHeader from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState, LoadingState } from '@/components/ui/loading-state';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import formatDate from '@/lib/formatDate';
import {
  CheckCircle2,
  AlertCircle,
  Info,
  Clock,
  Eye,
  Trash2,
  Bell,
} from 'lucide-react';

type NotificationType = 'all' | 'success' | 'error' | 'info';

interface Notification {
  id: string;
  title: string;
  body: string;
  type?: NotificationType;
  read: boolean;
  createdAt: string;
  link?: string;
}

export default function NotificationsPage() {
  const [notes, setNotes] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<NotificationType>('all');
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/v1/notifications?userId=me');
      const data = Array.isArray(res?.data)
        ? res.data
        : res?.data?.items || [];
      // Add default type based on content
      const withTypes = data.map((n: any) => ({
        ...n,
        type: n.type ||
          (n.body?.toLowerCase().includes('failed') ||
          n.body?.toLowerCase().includes('error')
            ? 'error'
            : n.body?.toLowerCase().includes('completed') ||
              n.body?.toLowerCase().includes('success')
            ? 'success'
            : 'info'),
      }));
      setNotes(withTypes);
    } catch (err) {
      console.error('Failed to load notifications', err);
      toast?.({
        title: 'Failed to load notifications',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  // Listen for real-time events
  useEffect(() => {
    function onRunCompleted(e: any) {
      const detail = e?.detail || {};
      const newNote: Notification = {
        id: `evt-${Date.now()}`,
        title: 'Run Completed',
        body: `Run ${detail.runId} completed successfully`,
        type: 'success',
        createdAt: new Date().toISOString(),
        read: false,
        link: detail.reportId ? `/dashboard/user/reports/${detail.reportId}` : undefined,
      };
      setNotes((prev) => [newNote, ...prev]);
      toast?.({
        title: 'Run completed',
        description: `Run ${detail.runId} completed`,
      });
    }
    window.addEventListener('analysis:runCompleted', onRunCompleted as EventListener);
    return () =>
      window.removeEventListener('analysis:runCompleted', onRunCompleted as EventListener);
  }, [toast]);

  const markRead = async (id: string) => {
    try {
      await api.post(`/v1/notifications/${id}/mark-read`);
      setNotes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
    } catch (err) {
      console.error('Failed to mark read', err);
      toast?.({
        title: 'Failed to mark read',
        variant: 'destructive',
      });
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await api.delete(`/v1/notifications/${id}`);
      setNotes((prev) => prev.filter((n) => n.id !== id));
      toast?.({ title: 'Notification deleted' });
    } catch (err) {
      console.error('Failed to delete notification', err);
      toast?.({
        title: 'Failed to delete',
        variant: 'destructive',
      });
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = notes.filter((n) => !n.read).map((n) => n.id);
      await Promise.all(
        unreadIds.map((id) => api.post(`/v1/notifications/${id}/mark-read`)),
      );
      setNotes((prev) => prev.map((n) => ({ ...n, read: true })));
      toast?.({ title: 'All notifications marked as read' });
    } catch (err) {
      console.error('Failed to mark all as read', err);
      toast?.({
        title: 'Failed to update',
        variant: 'destructive',
      });
    }
  };

  const filteredNotes = notes.filter((n) =>
    activeFilter === 'all' ? true : n.type === activeFilter,
  );

  const unreadCount = notes.filter((n) => !n.read).length;

  const getNotificationIcon = (type?: NotificationType) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-600" />;
      default:
        return <Bell className="w-5 h-5 text-gray-600" />;
    }
  };

  const getNotificationBadgeColor = (type?: NotificationType) => {
    switch (type) {
      case 'success':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'info':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <RoleProtected required={['user', 'admin']}>
      <div className="p-4 sm:p-6 lg:p-8 w-full max-w-3xl mx-auto">
        <Breadcrumbs />
        <PageHeader
          title="Notifications"
          subtitle="Your activity and system updates"
          hideActions={true}
        />

        {/* Filters and Actions */}
        <div className="mt-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex gap-2 flex-wrap">
              {[
                { id: 'all', label: 'All' },
                { id: 'success', label: '✓ Success' },
                { id: 'error', label: '⚠ Error' },
                { id: 'info', label: 'ℹ Info' },
              ].map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setActiveFilter(filter.id as NotificationType)}
                  className={`px-3 py-2 rounded border transition-all text-sm ${
                    activeFilter === filter.id
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-input hover:bg-muted'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={markAllAsRead}
                className="w-full sm:w-auto"
              >
                Mark all as read
              </Button>
            )}
          </div>
        </div>

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <div className="mt-4 flex items-center gap-2 p-3 rounded bg-blue-50 border border-blue-200">
            <Bell className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-blue-900">
              You have <strong>{unreadCount}</strong> unread notification
              {unreadCount !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Notifications List */}
        <div className="mt-6">
          <LoadingState loading={loading} onRetry={load} loadingText="Loading notifications...">
            {filteredNotes.length === 0 ? (
              <EmptyState
                icon={<div className="text-4xl mb-2">🔔</div>}
                title={
                activeFilter === 'all'
                  ? 'No notifications'
                  : `No ${activeFilter} notifications`
              }
              description={
                activeFilter === 'all'
                  ? "You're all caught up!"
                  : 'Try viewing a different notification type'
              }
            />
          ) : (
            <div className="space-y-3">
              {filteredNotes.map((n) => (
                <Card
                  key={n.id}
                  className={`p-4 transition-all ${
                    n.read
                      ? 'bg-background'
                      : 'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(n.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className={`font-semibold text-sm ${
                              n.read
                                ? 'text-foreground'
                                : 'text-foreground font-bold'
                            }`}>
                              {n.title}
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              {n.body}
                            </p>
                          </div>
                          {!n.read && (
                            <div className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-600 mt-2" />
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {formatDate(n.createdAt)}
                          </div>

                          {n.type && (
                            <Badge
                              className={`text-xs ${getNotificationBadgeColor(
                                n.type,
                              )}`}
                            >
                              {n.type}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2 border-t">
                      {!n.read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markRead(n.id)}
                          className="gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span className="hidden sm:inline">Mark read</span>
                        </Button>
                      )}
                      {n.link && (
                        <Link href={n.link}>
                          <Button variant="ghost" size="sm">
                            View Details
                          </Button>
                        </Link>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteNotification(n.id)}
                        className="gap-1 text-destructive hover:text-destructive ml-auto"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span className="hidden sm:inline">Delete</span>
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            )}
          </LoadingState>
        </div>
      </div>
    </RoleProtected>
  );
}
