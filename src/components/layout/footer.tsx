import Link from 'next/link';
import { Logo } from '@/components/logo';
import { Github, BookOpen, FileText } from 'lucide-react';

export function Footer() {
  return (
    <footer className="relative border-t mt-12 bg-card/20 overflow-hidden">
        <div className="absolute inset-0 h-full w-full bg-gradient-to-br from-primary/10 via-transparent to-blue-700/10 animate-wave bg-[length:200%_200%]" />
        <div className="container relative z-10 py-12">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
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
                        <li><Link href="#" className="text-muted-foreground hover:text-foreground">API Reference</Link></li>
                        <li><Link href="#" className="text-muted-foreground hover:text-foreground">Status</Link></li>
                    </ul>
                </div>
                <div>
                    <h3 className="font-semibold">Company</h3>
                    <ul className="mt-4 space-y-2">
                        <li><Link href="#" className="text-muted-foreground hover:text-foreground">About</Link></li>
                        <li><Link href="#" className="text-muted-foreground hover:text-foreground">Blog</Link></li>
                        <li><Link href="#" className="text-muted-foreground hover:text-foreground">Careers</Link></li>
                    </ul>
                </div>
            </div>
            <div className="mt-12 flex flex-col items-center justify-between border-t pt-8 sm:flex-row">
                <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} EthixAI. All rights reserved.</p>
                <div className="mt-4 flex items-center space-x-4 sm:mt-0">
                    <Link href="#" className="text-muted-foreground hover:text-foreground"><Github className="h-5 w-5" /></Link>
                    <Link href="#" className="text-muted-foreground hover:text-foreground"><BookOpen className="h-5 w-5" /></Link>
                    <Link href="#" className="text-muted-foreground hover:text-foreground"><FileText className="h-5 w-5" /></Link>
                </div>
            </div>
        </div>
    </footer>
  );
}
