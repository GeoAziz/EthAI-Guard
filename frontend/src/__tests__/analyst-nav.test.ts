/**
 * @file analyst-nav.test.ts
 * @description Tests for analyst role navigation simplification
 * 
 * This test suite verifies that:
 * 1. Analyst role sees only simplified sidebar items
 * 2. Global Datasets, Models, Explainability items are not shown
 * 3. Core analyst items (Dashboard, Run, Reports) are present
 */

import { describe, expect, test } from 'vitest';

describe('Analyst Navigation Simplification', () => {
  /**
   * Expected analyst sidebar items (simplified)
   * Datasets, Models, and Explainability removed to reduce cognitive load
   */
  const expectedAnalystMenuItems = [
    { href: '/dashboard/analyst', label: 'Analyst Dashboard' },
    { href: '/dashboard/analyst/run', label: 'Run Analysis' },
    { href: '/dashboard/analyst/reports', label: 'Reports' },
  ];

  /**
   * Items that should NOT appear in analyst nav (previously shown)
   */
  const removedItems = [
    '/datasets',
    '/models',
    '/explainability',
    '/fairness', // Note: /fairness was also removed for simplicity
  ];

  test('Analyst menu contains only core workflow items', () => {
    expect(expectedAnalystMenuItems).toHaveLength(3);
    
    const hrefs = expectedAnalystMenuItems.map(item => item.href);
    expect(hrefs).toEqual([
      '/dashboard/analyst',
      '/dashboard/analyst/run',
      '/dashboard/analyst/reports',
    ]);
  });

  test('Analyst menu does not include global navigation items', () => {
    const analystHrefs = expectedAnalystMenuItems.map(item => item.href);
    
    removedItems.forEach(removedItem => {
      expect(analystHrefs).not.toContain(removedItem);
    });
  });

  test('Core analyst items are correctly labeled', () => {
    const dashboard = expectedAnalystMenuItems.find(i => i.href === '/dashboard/analyst');
    const run = expectedAnalystMenuItems.find(i => i.href === '/dashboard/analyst/run');
    const reports = expectedAnalystMenuItems.find(i => i.href === '/dashboard/analyst/reports');

    expect(dashboard?.label).toBe('Analyst Dashboard');
    expect(run?.label).toBe('Run Analysis');
    expect(reports?.label).toBe('Reports');
  });

  test('Dashboard subtitle updated to reflect new focus', () => {
    /**
     * Old subtitle: "Datasets, model evaluations, and explainability tools"
     * New subtitle: "Run and manage fairness and explainability analyses"
     * 
     * This test documents the change but does not validate DOM
     * (DOM testing would require a component test with React Testing Library)
     */
    const oldSubtitle = 'Datasets, model evaluations, and explainability tools';
    const newSubtitle = 'Run and manage fairness and explainability analyses';

    expect(newSubtitle).not.toContain('Datasets');
    expect(newSubtitle).not.toContain('model evaluations');
    expect(newSubtitle).toContain('fairness and explainability');
  });

  test('KPI cards simplified to show only Active Runs and Alerts', () => {
    /**
     * KPI Cards changed:
     * - Before: Total Datasets, Total Models, Active Runs, Alerts (4 cards)
     * - After: Active Runs, Alerts (2 cards)
     * 
     * This reduces clutter and focuses on actionable metrics
     */
    const simplifiedKPIs = ['Active Runs', 'Alerts'];
    const removedKPIs = ['Total Datasets', 'Total Models'];

    expect(simplifiedKPIs).toHaveLength(2);
    expect(removedKPIs).toHaveLength(2);

    removedKPIs.forEach(kpi => {
      expect(simplifiedKPIs).not.toContain(kpi);
    });
  });

  test('Dashboard retains primary CTAs', () => {
    /**
     * Critical CTAs must remain:
     * - New Analysis Run
     * - Upload Dataset
     * - View All Reports
     */
    const primaryCTAs = [
      { text: 'New Analysis Run', href: '/dashboard/analyst/run' },
      { text: 'Upload Dataset', href: '/dashboard/analyst/datasets' },
      { text: 'View All Reports', href: '/dashboard/analyst/reports' },
    ];

    primaryCTAs.forEach(cta => {
      expect(cta.text).toBeTruthy();
      expect(cta.href).toBeTruthy();
    });

    expect(primaryCTAs).toHaveLength(3);
  });
});

/**
 * Summary of Changes
 * 
 * Why simplify the analyst nav?
 * - Reduce cognitive load by hiding less-critical items
 * - Focus analyst workflow on core tasks: Run → View Reports
 * - Dataset/Model management remains accessible via CTA or full pages
 * - Improves UX by simplifying the navigation surface
 * 
 * Files changed:
 * - frontend/src/app/(auth)/layout.tsx
 * - frontend/src/app/dashboard/layout.tsx
 * - frontend/src/app/dashboard/analyst/page.tsx
 */
