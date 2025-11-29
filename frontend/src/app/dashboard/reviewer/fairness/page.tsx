"use client";
import React from "react";
import RoleProtected from "@/components/auth/RoleProtected";

export default function ReviewerFairnessPage() {
  return (
    <RoleProtected required={["reviewer","admin"]}>
      <div className="p-8">
        <h1 className="text-2xl font-semibold mb-4">Fairness Thresholds (Viewer)</h1>
        <p className="text-sm text-muted-foreground">Static view of fairness thresholds for reviewers.</p>
      </div>
    </RoleProtected>
  );
}
