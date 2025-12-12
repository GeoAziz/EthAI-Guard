import { DocsHeader } from '@/components/docs/docs-header';
import { DocsSidebar } from '@/components/docs/docs-sidebar';
import { DocsBreadcrumb } from '@/components/docs/docs-breadcrumb';
import { DocsPagination } from '@/components/docs/docs-pagination';

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <DocsHeader />
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          <DocsSidebar />
          <main className="lg:col-span-3">
            <DocsBreadcrumb />
            <div className="prose prose-neutral dark:prose-invert max-w-none">
              {children}
            </div>
            <DocsPagination />
          </main>
        </div>
      </div>
    </div>
  );
}
