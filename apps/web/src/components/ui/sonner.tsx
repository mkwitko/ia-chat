import { Toaster as Sonner, type ToasterProps } from 'sonner';

/** Toasts follow the device theme, like the rest of the panel (DESIGN.md). */
function Toaster(props: Readonly<ToasterProps>) {
  return (
    <Sonner
      theme="system"
      position="top-center"
      className="toaster group"
      // Readable at arm's length: body-size text and a full-size "Desfazer" / "Tentar de novo".
      toastOptions={{
        classNames: {
          toast: '!text-base !gap-3',
          description: '!text-sm !text-muted-foreground',
          actionButton: '!h-11 !rounded-lg !px-4 !text-sm !font-semibold',
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
