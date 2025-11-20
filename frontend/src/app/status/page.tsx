"use client";

import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Server, Database, Zap, Cloud, Clock } from "lucide-react";

function statusToBadge(status: string) {
  switch (status) {
    case 'operational':
      return { text: 'Operational', className: 'bg-green-500 text-white' };
    case 'degraded':
      return { text: 'Degraded', className: 'bg-yellow-400 text-black' };
    case 'partial_outage':
    case 'major':
      return { text: 'Partial Outage', className: 'bg-amber-600 text-white' };
    case 'down':
      return { text: 'Down', className: 'bg-red-600 text-white' };
    default:
      return { text: status || 'Unknown', className: 'bg-gray-300 text-black' };
  }
}

export default function StatusPage() {
  const [status, setStatus] = useState<any>(null);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastCheckedRef = useRef<string | null>(null);

  async function fetchAll() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/status');
      if (!res.ok) throw new Error('Failed to fetch /api/status');
      const data = await res.json();
      setStatus(data);
      lastCheckedRef.current = data.lastChecked || new Date().toISOString();

      const r2 = await fetch('/api/incidents?limit=10');
      if (r2.ok) {
        const inc = await r2.json();
        setIncidents(inc.incidents || []);
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, 15000);
    return () => clearInterval(id);
  }, []);

  const currentDate = lastCheckedRef.current ? new Date(lastCheckedRef.current).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short', timeZone: 'UTC' }) : '—';

  return (
    <div className="container px-4 py-12 md:py-20">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">System Status</h1>
            <p className="text-lg text-muted-foreground">Real-time status and uptime monitoring for EthixAI services.</p>
            <p className="text-sm text-muted-foreground mt-2">Last checked: {currentDate}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => fetchAll()} className="btn btn-ghost px-3 py-2 border rounded">Refresh</button>
          </div>
        </div>

        {/* Overall Status */}
        <Card className={`mb-8 ${status?.overall?.status === 'operational' ? 'border-green-500/20 bg-green-500/5' : 'border-amber-300/20 bg-amber-300/5'}`}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className={`h-8 w-8 ${status?.overall?.status === 'operational' ? 'text-green-500' : 'text-amber-600'}`} />
              <div>
                <h2 className="text-2xl font-bold">{(status?.overall?.status || 'Unknown').toString().replace('_', ' ')}</h2>
                <p className="text-sm text-muted-foreground">{status?.overall?.status === 'operational' ? 'All services are running normally' : 'Some services may be degraded'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Service Status */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-6">Service Status</h2>
          <div className="space-y-4">
            {(status?.services || []).map((service: any, index: number) => (
              <Card key={service.id || index}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {index === 0 && <Server className="h-5 w-5 text-muted-foreground" />}
                      {index === 1 && <Zap className="h-5 w-5 text-muted-foreground" />}
                      {index === 2 && <Database className="h-5 w-5 text-muted-foreground" />}
                      {index === 3 && <Cloud className="h-5 w-5 text-muted-foreground" />}
                      {index === 4 && <Server className="h-5 w-5 text-muted-foreground" />}
                      <div>
                        <h3 className="font-semibold">{service.name}</h3>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="text-xs text-muted-foreground">Uptime: {service.uptime}</span>
                          <span className="text-xs text-muted-foreground">Latency: {service.latency}</span>
                        </div>
                      </div>
                    </div>
                    <Badge className={statusToBadge(service.status).className}>
                      {statusToBadge(service.status).text}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
            {loading && (
              <div className="text-sm text-muted-foreground">Loading service status…</div>
            )}
            {error && (
              <div className="text-sm text-red-500">{error}</div>
            )}
          </div>
        </div>

        {/* Recent Incidents */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Recent Incidents</h2>
          <div className="space-y-4" aria-live="polite">
            {(incidents || []).length === 0 && (
              <Card>
                <CardContent>
                  <p className="text-sm text-muted-foreground">No recent incidents</p>
                </CardContent>
              </Card>
            )}
            {(incidents || []).map((incident: any) => (
              <Card key={incident.id || incident.title}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{incident.title}</CardTitle>
                      <CardDescription>{new Date(incident.date).toLocaleString()}</CardDescription>
                    </div>
                    {incident.resolved ? (
                      <Badge variant="outline" className="text-green-500 border-green-500">Resolved</Badge>
                    ) : (
                      <Badge className="bg-red-600 text-white">Active</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{incident.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Uptime Stats */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>30-Day Uptime</CardTitle>
            <CardDescription>Overall system availability over the past month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-green-500">{status?.overall?.uptime30d || '—'}</div>
            <p className="text-sm text-muted-foreground mt-2">Average uptime across all services</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
