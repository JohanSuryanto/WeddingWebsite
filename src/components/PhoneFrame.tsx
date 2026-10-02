import type { Ref } from 'react'

const PHONE = { width: 375, height: 760 }

/**
 * A page rendered inside a phone-sized iframe (375 px wide, so the layout's
 * responsive breakpoints behave as on a real phone), scaled to fit.
 */
export function PhoneFrame({
  src,
  title,
  testId,
  scale = 0.84,
  iframeRef,
  reloadKey,
}: {
  src: string
  title: string
  testId?: string
  scale?: number
  iframeRef?: Ref<HTMLIFrameElement>
  /** Changing this forces a reload; defaults to src. */
  reloadKey?: string
}) {
  return (
    <div
      className="mx-auto overflow-hidden rounded-[2.25rem] border-8 border-text/80 bg-bg shadow-card"
      style={{ width: PHONE.width * scale + 16, height: PHONE.height * scale + 16 }}
    >
      <iframe
        key={reloadKey ?? src}
        ref={iframeRef}
        src={src}
        title={title}
        data-testid={testId}
        className="origin-top-left border-0"
        style={{ width: PHONE.width, height: PHONE.height, transform: `scale(${scale})` }}
      />
    </div>
  )
}
