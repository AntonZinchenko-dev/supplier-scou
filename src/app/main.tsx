import '@fontsource-variable/onest';
import './styles/tokens.css';
import './styles/base.css';
import './styles/ui.css';
import './styles/pages.css';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createHashRouter, Link, RouterProvider } from 'react-router';
import { enableMocking } from '../mocks/browser';
import { CompareProvider } from '../features/compare/CompareContext';
import { ComparePage } from '../pages/compare/ComparePage';
import { HomePage } from '../pages/home/HomePage';
import { ResultsPage } from '../pages/results/ResultsPage';
import { ShortlistPage } from '../pages/shortlist/ShortlistPage';
import { SupplierPage } from '../pages/supplier/SupplierPage';
import { Layout } from '../widgets/layout/Layout';
import { SourceViewerProvider } from '../widgets/source-drawer/SourceDrawer';
import { Empty, ToastProvider } from '../shared/ui';

function NotFound() {
  return (
    <div className="wrap page">
      <Empty icon="search" title="Такой страницы нет" action={<Link className="btn btn--primary btn--md" to="/">На главную</Link>} />
    </div>
  );
}

// Хеш-роутинг: GitHub Pages отдаёт только статические файлы, а ссылки вида #/supplier/… работают всегда
const router = createHashRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/search/:id', element: <ResultsPage /> },
      { path: '/supplier/:id', element: <SupplierPage /> },
      { path: '/compare', element: <ComparePage /> },
      { path: '/shortlist', element: <ShortlistPage /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 } },
});

async function boot() {
  const useServer = Boolean(document.querySelector('meta[name="api-base"]'));
  const mode = useServer ? 'server' : await enableMocking();
  document.documentElement.dataset.api = mode;
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <CompareProvider>
            <SourceViewerProvider>
              <RouterProvider router={router} />
            </SourceViewerProvider>
          </CompareProvider>
        </ToastProvider>
      </QueryClientProvider>
    </StrictMode>,
  );
}

boot();
