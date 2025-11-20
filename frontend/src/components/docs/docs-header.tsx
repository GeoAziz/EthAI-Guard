import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function DocsHeader() {
  return (
    <header className="border-b bg-card/20 sticky top-0 z-40 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Logo />
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/api-reference" className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:inline">
              API Reference
            </Link>
            <Link href="/blog" className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:inline">
              Blog
            </Link>
            <Button size="sm" asChild>
              <Link href="/dashboard">
                Get Started <ArrowRight className="ml-2 h-3 w-3" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
