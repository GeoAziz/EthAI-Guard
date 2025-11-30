'use client';
import React from 'react';
import RoleProtected from '@/components/auth/RoleProtected';

export default function ReviewerProfilePage() {
  return (
    <RoleProtected required={['reviewer','admin']}>
      <div className="p-8">
        <h1 className="text-2xl font-semibold mb-4">Reviewer Profile</h1>
        <p className="text-sm text-muted-foreground">Reviewer profile and contact details (static).</p>
      </div>
    </RoleProtected>
  );
}
