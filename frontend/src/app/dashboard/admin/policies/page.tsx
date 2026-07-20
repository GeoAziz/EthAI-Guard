'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Plus, Edit2, Trash2, Eye, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';

interface Policy {
  _id: string;
  name: string;
  description?: string;
  version: number;
  status: 'draft' | 'active' | 'archived';
  rules: any;
  createdAt: string;
  updatedAt: string;
}

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPolicy, setNewPolicy] = useState({ name: '', description: '' });
  const { toast } = useToast();

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const res = await api.get('/v1/policies');
      setPolicies(res.data);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load policies',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePolicy = async () => {
    if (!newPolicy.name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Policy name is required',
      });
      return;
    }

    try {
      await api.post('/v1/policies', {
        name: newPolicy.name,
        description: newPolicy.description,
        rules: {
          fairness_metrics: {},
          thresholds: {
            fairness_score_min: 0.7,
            risk_tolerance_max: 0.3,
          },
          enforcement: {
            auto_alert: true,
            block_deployment: false,
            require_review: true,
          },
          protected_attributes: [],
        },
      });

      toast({
        title: 'Success',
        description: 'Policy created successfully',
      });

      setNewPolicy({ name: '', description: '' });
      setShowCreateForm(false);
      fetchPolicies();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create policy',
      });
    }
  };

  const handleActivatePolicy = async (id: string) => {
    try {
      await api.post(`/v1/policies/${id}/activate`);
      toast({
        title: 'Success',
        description: 'Policy activated',
      });
      fetchPolicies();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to activate policy',
      });
    }
  };

  const handleDeletePolicy = async (id: string) => {
    if (!confirm('Are you sure?')) return;

    try {
      await api.delete(`/v1/policies/${id}`);
      toast({
        title: 'Success',
        description: 'Policy deleted',
      });
      fetchPolicies();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete policy',
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Fairness Policies</h1>
          <p className="text-gray-600 mt-1">Create and manage fairness enforcement policies</p>
        </div>
        <Button onClick={() => setShowCreateForm(!showCreateForm)}>
          <Plus className="w-4 h-4 mr-2" />
          New Policy
        </Button>
      </div>

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Policy Name</label>
              <input
                type="text"
                value={newPolicy.name}
                onChange={(e) => setNewPolicy({ ...newPolicy, name: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="e.g., Credit Risk Fairness Policy"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={newPolicy.description}
                onChange={(e) => setNewPolicy({ ...newPolicy, description: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="Describe the policy objectives"
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreatePolicy}>Create</Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4">
        {policies.map((policy) => (
          <Card key={policy._id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <CardTitle>{policy.name}</CardTitle>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(policy.status)}`}>
                      {policy.status.toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-500">v{policy.version}</span>
                  </div>
                  {policy.description && <CardDescription className="mt-2">{policy.description}</CardDescription>}
                </div>
                <div className="flex gap-2">
                  {policy.status !== 'active' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleActivatePolicy(policy._id)}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Activate
                    </Button>
                  )}
                  <Button size="sm" variant="outline">
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeletePolicy(policy._id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Fairness Min Score</p>
                  <p className="font-semibold">
                    {(policy.rules?.thresholds?.fairness_score_min || 0) * 100}%
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Risk Tolerance</p>
                  <p className="font-semibold">
                    {(policy.rules?.thresholds?.risk_tolerance_max || 0) * 100}%
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Auto Alert</p>
                  <p className="font-semibold">{policy.rules?.enforcement?.auto_alert ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <p className="text-gray-600">Block Deployment</p>
                  <p className="font-semibold">{policy.rules?.enforcement?.block_deployment ? 'Yes' : 'No'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {policies.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No policies created yet. Create your first policy to get started.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
