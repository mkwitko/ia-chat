import { Toaster as Sonner, type ToasterProps } from 'sonner';

/** Toasts follow the device theme, like the rest of the panel (DESIGN.md). */
function Toaster(props: Readonly<ToasterProps>) {
  return (
    <Sonner
      theme="system"
      position="top-center"
      className="toaster group"
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
