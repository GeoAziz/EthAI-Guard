"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Zap, Terminal, Shield, Database, CheckCircle, FileCode, Code, GitBranch, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export const docsNav = [
  { id: "overview", label: "Overview", href: "/docs", icon: Home },
  { id: "quick-start", label: "Quick Start", href: "/docs/quick-start", icon: Zap },
  { id: "installation", label: "Installation", href: "/docs/installation", icon: Terminal },
  { id: "authentication", label: "Authentication", href: "/docs/authentication", icon: Shield },
  { id: "data-format", label: "Data Format", href: "/docs/data-format", icon: Database },
  { id: "fairness-metrics", label: "Fairness Metrics", href: "/docs/fairness-metrics", icon: CheckCircle },
  { id: "explainability", label: "Explainability", href: "/docs/explainability", icon: FileCode },
  { id: "compliance", label: "Compliance", href: "/docs/compliance", icon: Shield },
  { id: "contributing", label: "Contributing", href: "/docs/contributing", icon: GitBranch },
];

export function DocsSidebar() {
  const pathname = usePathname();

  return (
    <aside className="lg:col-span-1">
      <div className="lg:sticky lg:top-24">
        <h2 className="font-semibold text-lg mb-4">Documentation</h2>
        <nav className="space-y-1">
          {docsNav.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors group",
                  isActive
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <Icon className={cn(
                  "h-4 w-4 transition-colors",
                  isActive ? "text-primary-foreground" : "group-hover:text-primary"
                )} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        
        {/* Quick Links */}
        <div className="mt-8 p-4 bg-card/50 rounded-lg border">
          <h3 className="font-semibold text-sm mb-3">Quick Links</h3>
          <div className="space-y-2 text-sm">
            <Link href="/api-reference" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
              <Code className="h-3 w-3" />
              API Reference
            </Link>
            <Link href="https://github.com" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
              <GitBranch className="h-3 w-3" />
              GitHub Repository
            </Link>
            <Link href="/status" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
              <CheckCircle className="h-3 w-3" />
              System Status
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}
