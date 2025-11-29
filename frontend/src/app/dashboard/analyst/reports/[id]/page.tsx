"use client";
import React from "react";
import RoleProtected from "@/components/auth/RoleProtected";

export default function AnalystReportDetailsPage({ params }: { params: { id: string } }) {
  return (
    <RoleProtected required={["analyst","admin"]}>
      <div className="p-8">
        <h1 className="text-2xl font-semibold mb-4">Report {params.id}</h1>
        <p className="text-sm text-muted-foreground">Static report details placeholder for analysts.</p>
      </div>
    </RoleProtected>
  );
}
