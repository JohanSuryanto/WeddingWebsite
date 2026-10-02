import { lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter, Navigate, Outlet, RouterProvider, useParams } from 'react-router'
import { MessagePage } from '../components/MessagePage'
import { ToastProvider } from '../components/Toast'
import { ThemeProvider } from '../themes'
import { AdminLayout } from './AdminLayout'
import { AuthProvider } from './auth/AuthProvider'
import { LoginPage } from './auth/LoginPage'
import { RequireAuth } from './auth/RequireAuth'
import { CoupleListPage } from './couples/CoupleListPage'
import { NewCouplePage } from './couples/NewCouplePage'

const EditorPage = lazy(() => import('./editor/EditorPage'))
const BackupPage = lazy(() => import('./backup/BackupPage'))
const FullPreviewPage = lazy(() => import('./preview/FullPreviewPage'))
const PreviewFrame = lazy(() => import('./preview/PreviewFrame'))
const AdminSendInvitationPage = lazy(() => import('./preview/AdminSendInvitationPage'))

/** The admin chrome uses one fixed theme; couple pages bring their own. */
const ADMIN_THEME = 'elegant-classic'

function Lazy({ children }: { children: ReactNode }) {
  return <Suspense fallback={<p className="p-6 text-muted">Memuat…</p>}>{children}</Suspense>
}

function AdminChrome() {
  return (
    <ThemeProvider themeId={ADMIN_THEME}>
      <Outlet />
    </ThemeProvider>
  )
}

function Protected() {
  return (
    <RequireAuth>
      <Outlet />
    </RequireAuth>
  )
}

function EditorRedirect() {
  const { id } = useParams()
  return <Navigate to={`/couples/${id}/mempelai`} replace />
}

const router = createBrowserRouter([
  {
    element: <AdminChrome />,
    children: [
      { path: '/login', element: <LoginPage /> },
      {
        element: <Protected />,
        children: [
          {
            element: <AdminLayout />,
            children: [
              { path: '/', element: <CoupleListPage /> },
              { path: '/couples/new', element: <NewCouplePage /> },
              { path: '/couples/:id', element: <EditorRedirect /> },
              {
                path: '/couples/:id/:tab',
                element: (
                  <Lazy>
                    <EditorPage />
                  </Lazy>
                ),
              },
              {
                path: '/backup',
                element: (
                  <Lazy>
                    <BackupPage />
                  </Lazy>
                ),
              },
            ],
          },
          {
            path: '/couples/:id/preview',
            element: (
              <Lazy>
                <FullPreviewPage />
              </Lazy>
            ),
          },
        ],
      },
      {
        path: '*',
        element: (
          <MessagePage
            themeId={ADMIN_THEME}
            title="Halaman tidak ditemukan"
            message="Alamat ini tidak ada di admin."
            action={
              <a href="/" className="btn-outline">
                Ke daftar pasangan
              </a>
            }
          />
        ),
      },
    ],
  },
  // Pages that render a couple's own theme stay outside the admin chrome.
  {
    element: <Protected />,
    children: [
      {
        path: '/couples/:id/send-invitation',
        element: (
          <Lazy>
            <AdminSendInvitationPage />
          </Lazy>
        ),
      },
      {
        path: '/preview-frame',
        element: (
          <Lazy>
            <PreviewFrame />
          </Lazy>
        ),
      },
    ],
  },
])

export function AdminApp() {
  return (
    <AuthProvider>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </AuthProvider>
  )
}
