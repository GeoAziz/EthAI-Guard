'use client';
import React, { useEffect, useState } from 'react';
import RoleProtected from '@/components/auth/RoleProtected';
import Breadcrumbs from '@/components/layout/breadcrumbs';
import PageHeader from '@/components/layout/page-header';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export default function ProfilePage() {
  const [user, setUser] = useState<any>({ name: '', email: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [password, setPassword] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get('/v1/users/me');
        if (!mounted) {return;}
        setUser(res?.data || { name: '', email: '' });
      } catch (err) {
        console.error('Failed to load user', err);
        toast?.({ title: 'Failed to load profile', variant: 'destructive' });
      } finally {
        if (mounted) {setLoading(false);}
      }
    };
    load();
    return () => { mounted = false; };
  }, [toast]);

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/v1/users/me', { name: user.name, email: user.email });
      toast?.({ title: 'Profile saved' });
    } catch (err) {
      console.error('Failed to save profile', err);
      toast?.({ title: 'Failed to save profile', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (!password) {return;}
    setPwSaving(true);
    try {
      await api.post('/v1/users/me/password', { password });
      setPassword('');
      toast?.({ title: 'Password changed' });
    } catch (err) {
      console.error('Failed to change password', err);
      toast?.({ title: 'Failed to change password', variant: 'destructive' });
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <RoleProtected required={['user','admin']}>
      <div className="p-8 max-w-4xl mx-auto">
        <Breadcrumbs />
        <PageHeader title="Profile" subtitle="Your account settings" />

        <div className="mt-6 rounded-lg border bg-white p-4">
          {loading && <div className="text-sm text-muted-foreground">Loading…</div>}
          {!loading && (
            <div>
              <div className="mb-3">
                <label htmlFor="profile-name" className="block text-sm">Name</label>
                <input id="profile-name" className="w-full border p-2 rounded" value={user.name || ''} onChange={(e) => setUser({ ...user, name: e.target.value })} />
              </div>
              <div className="mb-3">
                <label htmlFor="profile-email" className="block text-sm">Email</label>
                <input id="profile-email" className="w-full border p-2 rounded" value={user.email || ''} onChange={(e) => setUser({ ...user, email: e.target.value })} />
              </div>
              <div className="flex gap-2 justify-end">
                <button className="btn" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
              </div>

              <hr className="my-4" />

              <h4 className="font-medium mb-2">Change password</h4>
              <div className="mb-3">
                <label htmlFor="new-password" className="block text-sm">New password</label>
                <input id="new-password" type="password" className="w-full border p-2 rounded" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div className="flex gap-2 justify-end">
                <button className="btn" onClick={changePassword} disabled={pwSaving}>{pwSaving ? 'Updating…' : 'Update password'}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </RoleProtected>
  );
}
