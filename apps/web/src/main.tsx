import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router/dom';
import { Toaster } from './components/ui/sonner';
import { queryClient } from './lib/query';
import { initSentry } from './lib/sentry';
import { registerServiceWorker } from './pwa';
import { router } from './router';
import './index.css';

initSentry();
const root = document.getElementById('root');
if (!root) throw new Error('missing #root');

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster />
    </QueryClientProvider>
  </StrictMode>,
);
registerServiceWorker();
