import type { Connect, Plugin } from 'vite'

/** True when the Host header targets the admin site (admin.localhost, admin.<domain>). */
export function isAdminHost(host: string | undefined): boolean {
  return !!host && host.toLowerCase().startsWith('admin.')
}

/**
 * Serves `admin.html` to `admin.*` hosts and `index.html` to every other host,
 * for page navigations only, so one dev server mirrors the two production sites
 * (contracts/routes.md, research R2).
 */
export function devHostRouting(): Plugin {
  const middleware: Connect.NextHandleFunction = (req, _res, next) => {
    const accept = req.headers.accept ?? ''
    const path = (req.url ?? '/').split('?')[0]
    const isNavigation =
      req.method === 'GET' &&
      accept.includes('text/html') &&
      !/\.[a-z0-9]+$/i.test(path) &&
      !path.startsWith('/@') &&
      !path.startsWith('/src/') &&
      !path.startsWith('/node_modules/')
    if (isNavigation) {
      const query = req.url?.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''
      req.url = (isAdminHost(req.headers.host) ? '/admin.html' : '/index.html') + query
    }
    next()
  }

  return {
    name: 'dev-host-routing',
    configureServer(server) {
      server.middlewares.use(middleware)
    },
  }
}
