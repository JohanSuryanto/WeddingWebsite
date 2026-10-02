# Contract: Submission Services (RSVP and Wishes)

This interface stays fixed for the backend phase. This phase ships in-memory implementations; the backend phase adds HTTP implementations **without changing UI components**.

```ts
export interface RsvpService {
  submit(input: RsvpInput): Promise<RsvpResponse>;   // rejects with ValidationError
}

export interface WishService {
  list(): Promise<Wish[]>;                            // newest first
  submit(input: WishInput): Promise<Wish>;            // rejects with ValidationError
}

export type RsvpInput = { name: string; attendance: 'hadir' | 'tidak_hadir'; guestCount: number };
export type WishInput = { name: string; message: string; attendance?: 'hadir' | 'tidak_hadir' };

export class ValidationError extends Error {
  constructor(public fieldErrors: Partial<Record<string, string>>) { super('validation'); }
}
```

## In-memory behavior (this phase)
- The state lives in memory only; **no** localStorage, cookies or network calls. A refresh clears it (FR-016).
- `WishService.list()` starts with `wedding.sampleWishes`.
- Each `submit` waits about 400ms before resolving, so the "Mengirim…" (sending) state is visible and matches how the backend version will behave.
- Validation rules come from [data-model.md](../data-model.md). Error messages are in Indonesian:
  - name missing → "Nama wajib diisi"
  - attendance missing → "Silakan pilih konfirmasi kehadiran"
  - guestCount out of range → "Jumlah tamu 1–5 orang"
  - message too short → "Ucapan minimal 3 karakter"

## Wiring
`src/services/index.ts` exports `rsvpService` and `wishService`. Components import only from there. Switching to the backend later is a one-file change.
