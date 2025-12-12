'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

import { cn } from '@/lib/utils';

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

type DialogIds = {
  titleId: string
  descriptionId: string
}

const DialogContext = React.createContext<DialogIds | null>(null);

type DialogContentProps = React.ComponentPropsWithoutRef<
  typeof DialogPrimitive.Content
> & {
  // optional ref to element that should receive initial focus when dialog opens
  initialFocusRef?: React.RefObject<HTMLElement>
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, children, initialFocusRef, ...props }, ref) => {
  const titleId = React.useId();
  const descriptionId = React.useId();

  const contentRef = React.useRef<HTMLElement | null>(null);

  // combine forwarded ref with our internal ref
  const handleRef = React.useCallback(
    (node: HTMLElement | null) => {
      contentRef.current = node;
      if (!ref) {return;}
      if (typeof ref === 'function') {
        try {
          // cast to the expected HTMLDivElement | null so function refs accept our HTMLElement | null
          (ref as (instance: HTMLDivElement | null) => void)(node as HTMLDivElement | null);
        } catch {}
      } else {
        ;(ref as React.MutableRefObject<any>).current = node;
      }
    },
    [ref],
  );

  // initial focus: prefer explicit initialFocusRef, then [data-autofocus], then first tabbable
  React.useEffect(() => {
    // run after mount
    const id = setTimeout(() => {
      try {
        const root = contentRef.current;
        if (!root) {return;}
        const byRef = initialFocusRef?.current;
        if (byRef && typeof byRef.focus === 'function') {
          byRef.focus();
          return;
        }
        const auto = root.querySelector<HTMLElement>('[data-autofocus]');
        if (auto && typeof auto.focus === 'function') {
          auto.focus();
          return;
        }
        const first = root.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (first && typeof first.focus === 'function') {first.focus();}
      } catch (e) {
        // no-op
      }
    }, 0);
    return () => clearTimeout(id);
  }, [initialFocusRef]);

  // set aria-labelledby/aria-describedby only if the corresponding elements exist
  React.useEffect(() => {
    const root = contentRef.current;
    if (!root) {return;}
    try {
      const titleEl = root.querySelector<HTMLElement>(`#${titleId}`);
      const descEl = root.querySelector<HTMLElement>(`#${descriptionId}`);
      if (titleEl) {root.setAttribute('aria-labelledby', titleId);}
      if (descEl) {root.setAttribute('aria-describedby', descriptionId);}
    } catch (e) {
      // no-op
    }
  }, [titleId, descriptionId]);

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogContext.Provider value={{ titleId, descriptionId }}>
        <DialogPrimitive.Content
          ref={handleRef}
          role="dialog"
          aria-modal="true"
          className={cn(
            'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg',
            className,
          )}
          {...props}
        >
          {children}
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogContext.Provider>
    </DialogPortal>
  );
});
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col space-y-1.5 text-center sm:text-left',
      className,
    )}
    {...props}
  />
);
DialogHeader.displayName = 'DialogHeader';

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2',
      className,
    )}
    {...props}
  />
);
DialogFooter.displayName = 'DialogFooter';

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    id={(props as any).id ?? React.useContext(DialogContext)?.titleId}
    className={cn(
      'text-lg font-semibold leading-none tracking-tight',
      className,
    )}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    id={(props as any).id ?? React.useContext(DialogContext)?.descriptionId}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
