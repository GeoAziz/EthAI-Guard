'use client';
import React, { useEffect, useState } from 'react';
import RoleProtected from '@/components/auth/RoleProtected';
import Breadcrumbs from '@/components/layout/breadcrumbs';
import PageHeader from '@/components/layout/page-header';
import ChartPlaceholder from '@/components/ui/chart-placeholder';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export default function AdminBillingPage() {
  const [usageSummary, setUsageSummary] = useState<any>(null);
  const [invoices, setInvoices] = useState<Array<any>>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([api.get('/v1/billing/usage'), api.get('/v1/billing/invoices')])
      .then(([usageRes, invoicesRes]) => {
        if (!mounted) {return;}
        setUsageSummary(usageRes?.data || null);
        setInvoices(Array.isArray(invoicesRes?.data) ? invoicesRes.data : (invoicesRes?.data?.items || []));
      })
      .catch((err) => {
        console.error('Failed to load billing data', err);
        toast?.({ title: 'Failed to load billing data', variant: 'destructive' });
      })
      .finally(() => { if (mounted) {setLoading(false);} });

    return () => { mounted = false; };
  }, []);

  return (
    <RoleProtected required={['admin']}>
      <div className="p-4 sm:p-6 lg:p-8 w-full max-w-6xl">
        <Breadcrumbs />
        <PageHeader title="Billing & usage" subtitle="Summary of costs and analysis usage" />

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="rounded-lg border bg-white p-4 sm:p-6">
            <h4 className="font-medium text-sm sm:text-base">Monthly spend</h4>
            <div className="mt-4">
              {usageSummary ? <ChartPlaceholder title="Monthly spend" height={180} {...({ data: usageSummary.monthly } as any)} /> : <ChartPlaceholder title="Monthly spend" height={180} />}
            </div>
          </div>

          <div className="rounded-lg border bg-white p-4 sm:p-6">
            <h4 className="font-medium text-sm sm:text-base">Recent invoices</h4>
            {loading && <div className="text-xs sm:text-sm text-muted-foreground py-8 text-center">Loading…</div>}
            {!loading && invoices.length === 0 && <div className="text-xs sm:text-sm text-muted-foreground py-8 text-center">No invoices found</div>}
            {!loading && invoices.length > 0 && (
              <ul className="mt-3 text-xs sm:text-sm divide-y max-h-96 overflow-y-auto">
                {invoices.map((inv) => (
                  <li key={inv.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 gap-1 sm:gap-0">
                    <span className="truncate">{new Date(inv.date).toLocaleDateString()} — {inv.description || inv.id}</span>
                    <span className="font-medium whitespace-nowrap">${(inv.amount_cents ? inv.amount_cents / 100 : inv.amount || 0).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </RoleProtected>
  );
}
