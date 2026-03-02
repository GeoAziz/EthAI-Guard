'use client';
import React, { useState } from 'react';
import RoleProtected from '@/components/auth/RoleProtected';
import Breadcrumbs from '@/components/layout/breadcrumbs';
import PageHeader from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Check, AlertCircle, Mail, Lock, Bell, Shield } from 'lucide-react';

export default function UserProfilePage() {
  const { toast } = useToast();
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  // Profile state
  const [profile, setProfile] = useState({
    name: 'John Doe',
    email: 'john.doe@example.com',
    emailVerified: true,
  });

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Notification preferences
  const [notifications, setNotifications] = useState({
    emailOnAnalysisComplete: true,
    emailOnErrors: true,
    weeklyDigest: false,
    twoFactorCodeEmail: true,
  });

  const handleProfileSave = async () => {
    setProfileSaving(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast?.({ title: 'Profile updated successfully' });
    } catch (err) {
      toast?.({ title: 'Failed to update profile', variant: 'destructive' });
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast?.({
        title: 'Passwords do not match',
        variant: 'destructive',
      });
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      toast?.({
        title: 'Password must be at least 8 characters',
        variant: 'destructive',
      });
      return;
    }

    setPasswordSaving(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast?.({ title: 'Password changed successfully' });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordForm(false);
    } catch (err) {
      toast?.({ title: 'Failed to change password', variant: 'destructive' });
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleToggle2FA = async () => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setTwoFactorEnabled(!twoFactorEnabled);
      toast?.({
        title: twoFactorEnabled ? 'Two-factor disabled' : 'Two-factor enabled',
      });
    } catch (err) {
      toast?.({ title: 'Failed to update 2FA', variant: 'destructive' });
    }
  };

  const handleNotificationChange = async () => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      toast?.({ title: 'Preferences updated' });
    } catch (err) {
      toast?.({ title: 'Failed to save preferences', variant: 'destructive' });
    }
  };

  return (
    <RoleProtected required={['user', 'admin']}>
      <div className="p-4 sm:p-6 lg:p-8 w-full max-w-2xl mx-auto">
        <Breadcrumbs />
        <PageHeader
          title="Profile & Settings"
          subtitle="Manage your account and preferences"
          hideActions={true}
        />

        <div className="mt-8 space-y-6">
          {/* Account Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Account Information
              </CardTitle>
              <CardDescription>
                Basic profile information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Full Name</label>
                <Input
                  value={profile.name}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="Your full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Email Address</label>
                <div className="flex gap-2">
                  <Input
                    value={profile.email}
                    disabled
                    className="flex-1"
                  />
                  {profile.emailVerified && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded border border-green-200">
                      <Check className="w-4 h-4 text-green-600" />
                      <span className="text-xs font-semibold text-green-700">Verified</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Email address cannot be changed. Contact support for assistance.
                </p>
              </div>

              <Button onClick={handleProfileSave} disabled={profileSaving}>
                {profileSaving ? 'Saving…' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>

          {/* Security Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Security
              </CardTitle>
              <CardDescription>
                Manage your password and security settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!showPasswordForm ? (
                <Button
                  variant="outline"
                  onClick={() => setShowPasswordForm(true)}
                  className="w-full"
                >
                  Change Password
                </Button>
              ) : (
                <div className="space-y-3 p-4 rounded border bg-muted/30">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Current Password
                    </label>
                    <Input
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(e) =>
                        setPasswordForm((p) => ({
                          ...p,
                          currentPassword: e.target.value,
                        }))
                      }
                      placeholder="Enter your current password"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      New Password
                    </label>
                    <Input
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) =>
                        setPasswordForm((p) => ({
                          ...p,
                          newPassword: e.target.value,
                        }))
                      }
                      placeholder="Enter new password (min 8 characters)"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Confirm Password
                    </label>
                    <Input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) =>
                        setPasswordForm((p) => ({
                          ...p,
                          confirmPassword: e.target.value,
                        }))
                      }
                      placeholder="Confirm new password"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handlePasswordChange}
                      disabled={passwordSaving}
                    >
                      {passwordSaving ? 'Updating…' : 'Update Password'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowPasswordForm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    <span className="font-medium">Two-Factor Authentication</span>
                  </div>
                  {twoFactorEnabled && (
                    <Badge className="bg-green-100 text-green-700 border-green-200">
                      Enabled
                    </Badge>
                  )}
                </div>

                <p className="text-sm text-muted-foreground mb-4">
                  {twoFactorEnabled
                    ? 'Your account is protected with two-factor authentication.'
                    : 'Add an extra layer of security to your account.'}
                </p>

                <Button
                  variant={twoFactorEnabled ? 'destructive' : 'default'}
                  onClick={handleToggle2FA}
                >
                  {twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Notification Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Choose how you want to receive updates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                {
                  id: 'emailOnAnalysisComplete',
                  label: 'Analysis Complete',
                  description: 'Get notified when your analysis runs finish',
                },
                {
                  id: 'emailOnErrors',
                  label: 'Analysis Errors',
                  description: 'Receive alerts if an analysis fails',
                },
                {
                  id: 'weeklyDigest',
                  label: 'Weekly Digest',
                  description: 'Summary of your activity every week',
                },
                {
                  id: 'twoFactorCodeEmail',
                  label: 'Two-Factor Codes via Email',
                  description: 'Receive 2FA codes by email (if 2FA enabled)',
                },
              ].map((pref) => (
                <label
                  key={pref.id}
                  className="flex items-start gap-3 p-3 rounded border cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={
                      notifications[pref.id as keyof typeof notifications]
                    }
                    onChange={(e) => {
                      setNotifications((n) => ({
                        ...n,
                        [pref.id]: e.target.checked,
                      }));
                      handleNotificationChange();
                    }}
                    className="w-4 h-4 mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-sm">{pref.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {pref.description}
                    </div>
                  </div>
                </label>
              ))}
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-900 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                Danger Zone
              </CardTitle>
              <CardDescription className="text-red-800">
                Irreversible actions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="destructive" className="w-full">
                Delete Account & Data
              </Button>
              <p className="text-xs text-red-700">
                This action cannot be undone. All your data will be permanently deleted.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </RoleProtected>
  );
}
