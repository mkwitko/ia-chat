import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router/dom';
import { ConfirmHost } from './components/ui/confirm-dialog';
import { Toaster } from './components/ui/sonner';
import { queryClient } from './lib/query';
import { initSentry } from './lib/sentry';
import { watchSystemTheme } from './lib/theme';
import { locale } from './i18n/locale';
import { registerServiceWorker } from './pwa';
import { router } from './router';
import './index.css';

initSentry();
document.documentElement.lang = locale;
watchSystemTheme();
const root = document.getElementById('root');
if (!root) throw new Error('missing #root');

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster />
      <ConfirmHost />
    </QueryClientProvider>
  </StrictMode>,
);
registerServiceWorker();
