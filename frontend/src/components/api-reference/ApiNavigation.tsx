'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface NavLink {
  id: string;
  title: string;
  href: string;
  level?: number;
}

interface ApiNavigationProps {
  sections: NavLink[];
  activeSection?: string;
}

export function ApiNavigation({ sections, activeSection }: ApiNavigationProps) {
  const [activeId, setActiveId] = useState(activeSection);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { threshold: 0.5 },
    );

    sections.forEach((section) => {
      const element = document.getElementById(section.id);
      if (element) {observer.observe(element);}
    });

    return () => observer.disconnect();
  }, [sections]);

  const handleClick = (id: string) => {
    setActiveId(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <nav className="space-y-2">
      {sections.map((section) => (
        <button
          key={section.id}
          onClick={() => handleClick(section.id)}
          className={cn(
            'w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors',
            activeId === section.id
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
        >
          {section.title}
        </button>
      ))}
    </nav>
  );
}
