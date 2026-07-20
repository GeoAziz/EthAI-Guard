'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Copy, Check, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';

interface MFASetupProps {
  onComplete?: () => void;
  onCancel?: () => void;
}

export function MFASetup({ onComplete, onCancel }: MFASetupProps) {
  const [step, setStep] = useState<'generate' | 'verify' | 'backup' | 'complete'>('generate');
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [token, setToken] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showCodes, setShowCodes] = useState(false);
  const { toast } = useToast();

  const handleGenerateSecret = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.post('/auth/mfa/setup', {});
      if (response.status === 200) {
        setSecret(response.data.secret);
        setQrCode(response.data.qrCode);
        setBackupCodes(response.data.backupCodes || []);
        setStep('verify');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.response?.data?.error || 'Failed to generate MFA secret',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const handleVerifyToken = useCallback(async () => {
    if (!token || token.length !== 6) {
      toast({
        title: 'Invalid token',
        description: 'Please enter a valid 6-digit code',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/mfa/enable', {
        secret,
        token,
        backupCodes: backupCodes.map((code) => ({ code, used: false })),
      });

      if (response.status === 200) {
        setStep('backup');
        toast({
          title: 'Success',
          description: 'MFA has been enabled',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.response?.data?.error || 'Failed to enable MFA',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [secret, token, backupCodes, toast]);

  const handleCopyCode = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {step === 'generate' && (
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Enable Two-Factor Authentication</h2>
          <p className="text-muted-foreground mb-6">
            Add an extra layer of security to your account. You'll need an authenticator app like Google Authenticator or Authy.
          </p>

          <div className="space-y-4">
            <a
              href="https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-sm text-primary hover:underline"
            >
              Get Google Authenticator (Android)
            </a>
            <a
              href="https://apps.apple.com/app/google-authenticator/id388497605"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-sm text-primary hover:underline"
            >
              Get Google Authenticator (iOS)
            </a>

            <Button
              onClick={handleGenerateSecret}
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? 'Generating...' : 'Next'}
            </Button>

            {onCancel && (
              <Button
                variant="outline"
                onClick={onCancel}
                className="w-full"
                size="lg"
              >
                Cancel
              </Button>
            )}
          </div>
        </Card>
      )}

      {step === 'verify' && (
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Scan QR Code</h2>

          <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg border">
              {qrCode && <img src={qrCode} alt="QR Code" className="w-full" />}
            </div>

            <div>
              <label className="text-sm font-medium">Or enter this code manually:</label>
              <code className="block mt-2 p-3 bg-muted rounded text-center font-mono text-sm break-all">
                {secret}
              </code>
            </div>

            <div>
              <label htmlFor="token" className="block text-sm font-medium mb-2">
                Enter 6-digit code from your authenticator app
              </label>
              <Input
                id="token"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
                disabled={loading}
              />
            </div>

            <Button
              onClick={handleVerifyToken}
              disabled={loading || token.length !== 6}
              className="w-full"
              size="lg"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </Button>
          </div>
        </Card>
      )}

      {step === 'backup' && (
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-2">Save Backup Codes</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Store these codes in a safe place. You can use them to access your account if you lose access to your authenticator app.
          </p>

          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950 dark:border-amber-800 flex gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-900 dark:text-amber-100">
                Write down these codes or save them to your password manager. Each code can only be used once.
              </p>
            </div>

            <div className="relative">
              <button
                onClick={() => setShowCodes(!showCodes)}
                className="absolute top-3 right-3 p-2 hover:bg-muted rounded"
              >
                {showCodes ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>

              <div className={`p-4 rounded-lg bg-muted font-mono text-sm space-y-2 ${!showCodes ? 'blur' : ''}`}>
                {backupCodes.map((code, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between hover:bg-background p-2 rounded transition-colors"
                  >
                    <code>{code}</code>
                    <button
                      onClick={() => handleCopyCode(code, index)}
                      className="p-1 hover:bg-background rounded"
                    >
                      {copiedIndex === index ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <Button
              onClick={() => {
                setStep('complete');
                onComplete?.();
              }}
              className="w-full"
              size="lg"
            >
              I've saved my codes
            </Button>
          </div>
        </Card>
      )}

      {step === 'complete' && (
        <Card className="p-6">
          <div className="text-center">
            <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Setup Complete</h2>
            <p className="text-muted-foreground mb-6">
              Two-factor authentication is now enabled on your account. You'll be asked for a code the next time you log in.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}

export default MFASetup;
