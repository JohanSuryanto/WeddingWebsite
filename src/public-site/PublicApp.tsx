import { createBrowserRouter, RouterProvider } from 'react-router'
import { CouplePage } from './pages/CouplePage'
import { CoupleSendInvitation } from './pages/CoupleSendInvitation'
import { Landing } from './pages/Landing'
import { NotFound } from './pages/NotFound'

const router = createBrowserRouter([
  { path: '/', element: <Landing /> },
  { path: '/:slug', element: <CouplePage /> },
  { path: '/:slug/send-invitation', element: <CoupleSendInvitation /> },
  { path: '*', element: <NotFound /> },
])

export function PublicApp() {
  return <RouterProvider router={router} />
}
