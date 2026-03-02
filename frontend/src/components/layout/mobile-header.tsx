'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface MobileHeaderMenuItem {
  label: string;
  href: string;
}

interface MobileHeaderProps {
  logo: React.ReactNode;
  menuItems?: MobileHeaderMenuItem[];
  ctaLabel?: string;
  ctaHref?: string;
}

export function MobileHeader({
  logo,
  menuItems = [],
  ctaLabel = 'Sign Up',
  ctaHref = '/register',
}: MobileHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  // Lock body scroll when menu is open
  useEffect(() => {
    if (typeof document === 'undefined') {return;}
    const prev = document.body.style.overflow;
    document.body.style.overflow = menuOpen ? 'hidden' : prev;
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  return (
    <div className="container flex h-14 items-center px-4">
      <Link href="/" className="mr-4 md:mr-6 flex items-center space-x-2">
        {logo}
      </Link>

      {/* Desktop nav */}
      <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="transition-colors hover:text-foreground/80 text-foreground/60"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Mobile hamburger */}
      <button
        className="md:hidden ml-auto flex items-center justify-center rounded p-2 hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((v) => !v)}
      >
        <span className="sr-only">{menuOpen ? 'Close menu' : 'Open menu'}</span>
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-7 w-7 text-foreground"
        >
          {menuOpen ? (
            <line x1="18" y1="6" x2="6" y2="18" />
          ) : (
            <line x1="3" y1="12" x2="21" y2="12" />
          )}
          {menuOpen ? (
            <line x1="6" y1="6" x2="18" y2="18" />
          ) : (
            <line x1="3" y1="6" x2="21" y2="6" />
          )}
          {!menuOpen && <line x1="3" y1="18" x2="21" y2="18" />}
        </svg>
      </button>

      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-md transition-opacity duration-200 ${menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        aria-hidden={!menuOpen}
        onClick={() => setMenuOpen(false)}
      />

      {/* Mobile drawer */}
      <nav
        className={`fixed top-0 right-0 h-full w-72 !bg-background bg-background/100 border-l border-border/10 text-foreground shadow-2xl z-50 transform transition-transform duration-200 ${menuOpen ? 'translate-x-0' : 'translate-x-full'}`}
        aria-label="Main menu"
        aria-hidden={!menuOpen}
        tabIndex={menuOpen ? 0 : -1}
      >
        <div className="flex flex-col h-full p-6 gap-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-lg">Menu</span>
            <button
              className="rounded p-2 hover:bg-muted/60 focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-6 w-6 text-foreground"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div className="flex flex-col gap-1">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="py-3 px-4 rounded text-base font-medium transition-colors text-foreground hover:bg-card/20"
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="mt-auto flex flex-col gap-3">
            <Button variant="ghost" asChild className="w-full">
              <Link href="/login" onClick={() => setMenuOpen(false)} className="w-full text-center">
                Log In
              </Link>
            </Button>
            <Button asChild size="sm" className="w-full">
              <Link href={ctaHref} onClick={() => setMenuOpen(false)} className="w-full inline-flex items-center justify-center gap-2">
                <span>{ctaLabel}</span>
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </nav>
    </div>
  );
}
