"use client";
import React from "react";
import RoleProtected from "@/components/auth/RoleProtected";

export default function AdminDatasetsPage() {
  return (
    <RoleProtected required={["admin"]}>
      <div className="p-8">
        <h1 className="text-2xl font-semibold mb-4">Datasets (Admin)</h1>
        <p className="text-sm text-muted-foreground">Admin datasets management (static).</p>
      </div>
    </RoleProtected>
  );
}
