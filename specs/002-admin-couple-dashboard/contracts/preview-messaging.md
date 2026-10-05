# Contract: Live Preview Messaging

The editor's phone preview is an iframe of the admin's `/preview-frame` (same origin). Feature 001's invitation components render inside it at a real phone width (375 px), so responsive breakpoints behave as they do on a phone.

## Modes

| URL | Source of content |
|---|---|
| `/preview-frame` | Waits for `preview:update` messages (live, unsaved draft) |
| `/preview-frame?couple=<id>[&inv=…][&t=…]` | Loads the saved couple from the repository, in any status. Used by the send-invitation preview and the full-page preview. |

## Messages

Parent → frame:

```ts
type PreviewUpdate = {
  type: 'preview:update'
  content: WeddingContent      // media already resolved to blob:/http(s) URLs
  themeId: ThemeId             // preview theme (does not change the saved defaultTheme)
  guestName: string | null     // shown on the cover
  openInvitation?: boolean     // true: skip the cover and show the sections
  view?: number                // bumped on every Sampul/Isi press: the frame restarts in that view
}
```

Frame → parent:

```ts
type PreviewReady = { type: 'preview:ready' }   // sent once on load; the parent then posts the latest draft
type PreviewOpened = { type: 'preview:opened' } // \"Buka Undangan\" pressed in the frame; the parent selects Isi
```

## Rules

- **Origin checks.** Both sides ignore messages whose `event.origin !== window.location.origin`, and messages without a known `type`.
- **Debounce.** The parent debounces updates by 250 ms. The frame applies each update in a single render, which meets SC-004 (< 1 s).
- **No side effects.** The frame never writes to the repository and plays no music unless the cover button inside it is clicked.
- **Validation.** Invalid or partial drafts (e.g. an event without a date) still render. `sanitizeForPreview` drops events without a valid date (with a placeholder event when none are left), clears invalid end times and ensures one main event. If rendering still fails, an error boundary shows "Lengkapi data untuk melihat tampilan." until the next update renders.
