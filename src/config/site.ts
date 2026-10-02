/**
 * Public site origin (no trailing slash). Couple links always use it, also
 * when copied from the admin site. Set VITE_PUBLIC_SITE_URL in production to
 * https://wedding.johansuryanto.dev.
 */
export function publicSiteUrl(): string {
  const configured = import.meta.env.VITE_PUBLIC_SITE_URL?.trim()
  return (configured || window.location.origin).replace(/\/+$/, '')
}

/** Invitation address, e.g. https://wedding.johansuryanto.dev/anisa-raka */
export function coupleUrl(slug: string): string {
  return `${publicSiteUrl()}/${slug}`
}

/** Guest-link page address, e.g. https://wedding.johansuryanto.dev/anisa-raka/send-invitation */
export function coupleSendUrl(slug: string): string {
  return `${coupleUrl(slug)}/send-invitation`
}
