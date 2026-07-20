'use client';
import React, { useEffect, useState } from 'react';
import { LoadingState } from '@/components/ui/loading-state';
import RoleProtected from '@/components/auth/RoleProtected';
import Breadcrumbs from '@/components/layout/breadcrumbs';
import PageHeader from '@/components/layout/page-header';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface UserProfile {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  department?: string;
  avatar?: string;
  bio?: string;
}

interface Stats {
  reportsReviewed?: number;
  approvalsGiven?: number;
  rejections?: number;
  joinDate?: string;
}

export default function ReviewerProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<Stats>({});
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<UserProfile>({});
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const res = await api.get('/v1/user/profile');
        if (!mounted) return;
        const data = res?.data || {
          name: 'Sarah Johnson',
          email: 'sarah.johnson@example.com',
          role: 'Senior Reviewer',
          department: 'Compliance & Ethics',
          bio: 'Specialized in fairness audits and model governance',
        };
        setProfile(data);
        setFormData(data);
        setStats({
          reportsReviewed: 127,
          approvalsGiven: 89,
          rejections: 12,
          joinDate: '2023-06-15',
        });
      } catch (err) {
        console.error('Failed to load profile', err);
        // Use mock data
        if (!mounted) return;
        setProfile({
          name: 'Sarah Johnson',
          email: 'sarah.johnson@example.com',
          role: 'Senior Reviewer',
          department: 'Compliance & Ethics',
          bio: 'Specialized in fairness audits and model governance',
        });
        setFormData({
          name: 'Sarah Johnson',
          email: 'sarah.johnson@example.com',
          role: 'Senior Reviewer',
          department: 'Compliance & Ethics',
          bio: 'Specialized in fairness audits and model governance',
        });
        setStats({
          reportsReviewed: 127,
          approvalsGiven: 89,
          rejections: 12,
          joinDate: '2023-06-15',
        });
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchProfile();
    return () => { mounted = false; };
  }, []);

  const handleSave = async () => {
    try {
      await api.put('/v1/user/profile', formData);
      setProfile(formData);
      setEditMode(false);
      toast?.({ title: 'Profile updated successfully' });
    } catch (err) {
      console.error('Failed to update profile', err);
      toast?.({ title: 'Failed to update profile', variant: 'destructive' });
    }
  };

  return (
    <RoleProtected required={['reviewer','admin']}>
      <div className="p-4 sm:p-6 lg:p-8 w-full max-w-4xl mx-auto">
        <Breadcrumbs />
        <div className="flex items-center justify-between">
          <PageHeader 
            title="My Profile" 
            subtitle="View and manage your reviewer account" 
          />
          {!editMode && (
            <button
              onClick={() => setEditMode(true)}
              className="btn text-xs sm:text-sm px-3 sm:px-4 py-2"
            >
              Edit Profile
            </button>
          )}
        </div>

        <div className="mt-6">
          <LoadingState loading={loading} onRetry={() => window.location.reload()} loadingText="Loading profile...">
            {profile ? (
              <div className="space-y-6">
              {/* Profile Information */}
              <div className="rounded-lg border bg-white p-4 sm:p-6">
                <h3 className="font-semibold text-sm sm:text-base mb-4">Profile Information</h3>

                {editMode ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium mb-1">Full Name</label>
                      <input
                        type="text"
                        value={formData.name || ''}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full p-2 border rounded text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium mb-1">Email</label>
                      <input
                        type="email"
                        value={formData.email || ''}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full p-2 border rounded text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium mb-1">Bio</label>
                      <textarea
                        value={formData.bio || ''}
                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                        className="w-full p-2 border rounded text-xs sm:text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                        rows={3}
                      />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 pt-4">
                      <button
                        onClick={handleSave}
                        className="btn btn-primary text-xs sm:text-sm px-4 py-2 w-full sm:w-auto"
                      >
                        Save Changes
                      </button>
                      <button
                        onClick={() => {
                          setEditMode(false);
                          setFormData(profile);
                        }}
                        className="btn text-xs sm:text-sm px-4 py-2 w-full sm:w-auto"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Name</p>
                      <p className="text-sm sm:text-base font-medium">{profile.name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="text-sm sm:text-base font-medium">{profile.email || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Role</p>
                      <p className="text-sm sm:text-base font-medium">{profile.role || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Department</p>
                      <p className="text-sm sm:text-base font-medium">{profile.department || 'N/A'}</p>
                    </div>
                    {profile.bio && (
                      <div>
                        <p className="text-xs text-muted-foreground">Bio</p>
                        <p className="text-xs sm:text-sm">{profile.bio}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Activity Statistics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="rounded-lg border bg-white p-4 sm:p-6">
                  <p className="text-xs text-muted-foreground mb-1">Reports Reviewed</p>
                  <p className="text-2xl sm:text-3xl font-bold">{stats.reportsReviewed || 0}</p>
                </div>
                <div className="rounded-lg border bg-white p-4 sm:p-6">
                  <p className="text-xs text-muted-foreground mb-1">Approvals Given</p>
                  <p className="text-2xl sm:text-3xl font-bold text-green-600">{stats.approvalsGiven || 0}</p>
                </div>
                <div className="rounded-lg border bg-white p-4 sm:p-6">
                  <p className="text-xs text-muted-foreground mb-1">Rejections</p>
                  <p className="text-2xl sm:text-3xl font-bold text-red-600">{stats.rejections || 0}</p>
                </div>
                <div className="rounded-lg border bg-white p-4 sm:p-6">
                  <p className="text-xs text-muted-foreground mb-1">Joined</p>
                  <p className="text-sm sm:text-base font-medium">{stats.joinDate || 'N/A'}</p>
                </div>
              </div>

              {/* Permissions & Capabilities */}
              <div className="rounded-lg border bg-white p-4 sm:p-6">
                <h3 className="font-semibold text-sm sm:text-base mb-4">Capabilities</h3>
                <div className="space-y-2 text-xs sm:text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span>Review and approve reports</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span>Add comments and feedback</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span>View fairness metrics</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span>Access audit logs</span>
                  </div>
                </div>
              </div>
              </div>
            ) : (
              <div className="rounded-lg border bg-white p-4 sm:p-6 text-center">
                <p className="text-xs sm:text-sm text-muted-foreground">Profile not available</p>
              </div>
            )}
          </LoadingState>
        </div>
      </div>
    </RoleProtected>
  );
}
