import { Toaster as Sonner, type ToasterProps } from 'sonner';

/** Toasts follow the device theme, like the rest of the panel (DESIGN.md). */
function Toaster(props: Readonly<ToasterProps>) {
  return (
    <Sonner
      theme="system"
      position="bottom-center"
      // Clear of the phone's tab bar (56 px + safe area) and of the computer's page edge.
      mobileOffset={{ bottom: 'calc(72px + env(safe-area-inset-bottom))' }}
      className="toaster group"
      // Readable at arm's length: body-size text and a full-size "Desfazer" / "Tentar de novo".
      toastOptions={{
        classNames: {
          // Text gets the full width; the action button sits on its own line under it.
          toast: '!flex-wrap !text-base !gap-x-3 !gap-y-3',
          content: '!flex-1 !basis-[calc(100%-2.5rem)]',
          description: '!text-base !text-muted-foreground',
          actionButton: '!h-11 !rounded-lg !px-4 !text-base !font-semibold',
          closeButton: '!size-7',
        },
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
        } as React.CSSProperties
      }
      {...props}
    />
  );
}

export { Toaster };
