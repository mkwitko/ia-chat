import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { PRODUCT_NAME } from '@/copy';
import { BrandMark } from '../brand-mark';

interface AuthFrameProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: { to: string; label: string };
}

/** Signed-out frame shared by sign-in, sign-up and password screens. */
export function AuthFrame({ title, subtitle, children, footer }: Readonly<AuthFrameProps>) {
  return (
    <main className="flex min-h-full items-start justify-center px-4 py-10 sm:items-center">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <div className="flex items-center gap-3">
          <BrandMark size={40} />
          <span className="text-lg">{PRODUCT_NAME}</span>
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="text-xl">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {children}
        {footer && (
          <Link to={footer.to} className="text-sm font-semibold text-primary">
            {footer.label}
          </Link>
        )}
      </div>
    </main>
  );
}

export function FormAlert({ message }: Readonly<{ message: string | null }>) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-foreground">
      {message}
    </p>
  );
}

export function FormNote({ message }: Readonly<{ message: string | null }>) {
  if (!message) return null;
  return (
    <p role="status" className="rounded-lg bg-brand-soft px-3 py-2 text-sm">
      {message}
    </p>
  );
}
