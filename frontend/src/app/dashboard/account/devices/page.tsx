'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import RoleProtected from '@/components/auth/RoleProtected';
import Breadcrumbs from '@/components/layout/breadcrumbs';
import PageHeader from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import formatDate from '@/lib/formatDate';
import { Smartphone, Monitor, Laptop, Shield, Trash2, CheckCircle2, Clock } from 'lucide-react';

interface Device {
  id: string;
  name: string;
  deviceType?: string;
  userAgent?: string;
  ipAddress?: string;
  lastAccessedAt: string;
  createdAt: string;
  current?: boolean;
}

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);
  const { toast } = useToast();

  const loadDevices = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/auth/devices');
      const devicesData = Array.isArray(response?.data?.devices) ? response.data.devices : [];
      setDevices(devicesData);
    } catch (error) {
      console.error('Failed to load devices', error);
      toast({
        title: 'Error',
        description: 'Failed to load your devices',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  const handleRevokeDevice = async (deviceId: string) => {
    if (!confirm('Are you sure you want to revoke access for this device? You will need to log in again.')) {
      return;
    }

    setRevoking(deviceId);
    try {
      await api.delete(`/auth/devices/${deviceId}`);
      setDevices((prev) => prev.filter((d) => d.id !== deviceId));
      toast({
        title: 'Success',
        description: 'Device access revoked',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.response?.data?.error || 'Failed to revoke device',
        variant: 'destructive',
      });
    } finally {
      setRevoking(null);
    }
  };

  const getDeviceIcon = (userAgent?: string) => {
    if (!userAgent) return <Smartphone className="w-5 h-5" />;

    const ua = userAgent.toLowerCase();
    if (ua.includes('ipad') || ua.includes('tablet')) return <Monitor className="w-5 h-5" />;
    if (ua.includes('iphone') || ua.includes('mobile') || ua.includes('android')) return <Smartphone className="w-5 h-5" />;
    if (ua.includes('windows') || ua.includes('mac') || ua.includes('linux')) return <Laptop className="w-5 h-5" />;

    return <Smartphone className="w-5 h-5" />;
  };

  const getDeviceName = (device: Device) => {
    if (device.name) return device.name;
    if (device.userAgent) {
      if (device.userAgent.includes('Mac')) return 'Mac';
      if (device.userAgent.includes('Windows')) return 'Windows';
      if (device.userAgent.includes('iPhone')) return 'iPhone';
      if (device.userAgent.includes('Android')) return 'Android';
    }
    return 'Unknown Device';
  };

  return (
    <RoleProtected required={['user', 'admin']}>
      <div className="p-4 sm:p-6 lg:p-8 w-full max-w-4xl">
        <Breadcrumbs />
        <PageHeader
          title="Devices"
          subtitle="Manage devices that have access to your account"
          hideActions={true}
        />

        <div className="mt-6 space-y-4">
          {loading ? (
            <Card className="p-8">
              <div className="flex items-center justify-center text-muted-foreground">
                <div className="animate-spin">⏳</div>
                <span className="ml-2">Loading devices...</span>
              </div>
            </Card>
          ) : devices.length === 0 ? (
            <Card className="p-8">
              <div className="text-center">
                <Shield className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground">No devices registered</p>
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {devices.map((device) => (
                <Card key={device.id} className="p-4 sm:p-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="flex-shrink-0 mt-0.5 text-muted-foreground">
                          {getDeviceIcon(device.userAgent)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-sm sm:text-base">
                              {getDeviceName(device)}
                            </h3>
                            {device.current && (
                              <Badge className="bg-green-100 text-green-800 border-green-200">
                                Current Device
                              </Badge>
                            )}
                          </div>
                          {device.userAgent && (
                            <p className="text-xs sm:text-sm text-muted-foreground mt-1 truncate">
                              {device.userAgent}
                            </p>
                          )}
                          {device.ipAddress && (
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              IP: {device.ipAddress}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3 flex-shrink-0" />
                        <span>
                          Last accessed:{' '}
                          <time dateTime={device.lastAccessedAt}>
                            {formatDate(device.lastAccessedAt)}
                          </time>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                        <span>
                          Added:{' '}
                          <time dateTime={device.createdAt}>
                            {formatDate(device.createdAt)}
                          </time>
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t flex gap-2">
                      {!device.current && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRevokeDevice(device.id)}
                          disabled={revoking === device.id}
                          className="gap-2"
                        >
                          <Trash2 className="w-3 h-3" />
                          {revoking === device.id ? 'Revoking...' : 'Revoke Access'}
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 p-4 sm:p-6 rounded-lg bg-blue-50 border border-blue-200 dark:bg-blue-950 dark:border-blue-800">
          <h3 className="font-semibold text-sm sm:text-base mb-2">Security Tips</h3>
          <ul className="text-xs sm:text-sm text-muted-foreground space-y-2 list-disc list-inside">
            <li>Review your devices regularly to ensure you recognize them all</li>
            <li>Revoke access for devices you no longer use</li>
            <li>If you see unfamiliar devices, change your password immediately</li>
            <li>You can view your activity logs in the security settings</li>
          </ul>
        </div>
      </div>
    </RoleProtected>
  );
}
