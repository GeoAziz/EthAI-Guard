import Link from 'next/link';
import { Logo } from '@/components/logo';
import { Github, BookOpen, FileText } from 'lucide-react';

export function Footer() {
  return (
    <footer className="relative border-t mt-12 bg-card/20 overflow-hidden">
        <div className="absolute inset-0 h-full w-full bg-gradient-to-br from-primary/10 via-transparent to-blue-700/10 animate-wave bg-[length:200%_200%]" />
        <div className="container relative z-10 py-8 md:py-12 px-4">
            <div className="grid grid-cols-1 gap-6 md:gap-8 md:grid-cols-4">
                <div className="col-span-1 md:col-span-2">
                    <Logo />
                    <p className="mt-4 text-muted-foreground max-w-xs">
                        AI ethics and explainability engine for financial institutions.
                    </p>
                </div>
                <div>
                    <h3 className="font-semibold">Resources</h3>
                    <ul className="mt-4 space-y-2">
                        <li><Link href="/docs" className="text-muted-foreground hover:text-foreground">Docs</Link></li>
                        <li><Link href="/api-reference" className="text-muted-foreground hover:text-foreground">API Reference</Link></li>
                        <li><Link href="/status" className="text-muted-foreground hover:text-foreground">Status</Link></li>
                    </ul>
                </div>
                <div>
                    <h3 className="font-semibold">Company</h3>
                    <ul className="mt-4 space-y-2">
                        <li><Link href="/about" className="text-muted-foreground hover:text-foreground">About</Link></li>
                        <li><Link href="/blog" className="text-muted-foreground hover:text-foreground">Blog</Link></li>
                        <li><Link href="/careers" className="text-muted-foreground hover:text-foreground">Careers</Link></li>
                    </ul>
                </div>
            </div>
            <div className="mt-8 md:mt-12 flex flex-col items-center justify-between border-t pt-6 md:pt-8 sm:flex-row gap-4">
                <p className="text-xs md:text-sm text-muted-foreground text-center sm:text-left">&copy; {new Date().getFullYear()} EthixAI. All rights reserved.</p>
                <div className="flex items-center space-x-4">
                    <a href="https://github.com/GeoAziz/EthAI-Guard" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors" title="GitHub Repository">
                      <Github className="h-4 w-4 md:h-5 md:w-5" />
                    </a>
                    <Link href="/docs" className="text-muted-foreground hover:text-foreground transition-colors" title="Documentation">
                      <BookOpen className="h-4 w-4 md:h-5 md:w-5" />
                    </Link>
                    <Link href="/blog" className="text-muted-foreground hover:text-foreground transition-colors" title="Blog">
                      <FileText className="h-4 w-4 md:h-5 md:w-5" />
                    </Link>
                </div>
            </div>
        </div>
    </footer>
  );
}
