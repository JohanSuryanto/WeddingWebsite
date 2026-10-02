import { useCountdown } from '../hooks/useCountdown'

export function Countdown({ target }: { target: string }) {
  const { days, hours, minutes, seconds, isPast } = useCountdown(target)

  if (isPast) {
    return (
      <p className="text-center font-script text-4xl text-text sm:text-5xl">
        Hari bahagia telah tiba
      </p>
    )
  }

  const units = [
    { label: 'Hari', value: days },
    { label: 'Jam', value: hours },
    { label: 'Menit', value: minutes },
    { label: 'Detik', value: seconds },
  ]
  return (
    <div aria-live="off" className="mx-auto grid max-w-md grid-cols-4 gap-2 sm:gap-4">
      {units.map((u) => (
        <div key={u.label} className="card flex flex-col items-center px-1 py-3 sm:py-4">
          <span className="font-heading text-3xl font-semibold text-text sm:text-4xl">
            {String(u.value).padStart(2, '0')}
          </span>
          <span className="text-xs text-muted sm:text-sm">{u.label}</span>
        </div>
      ))}
    </div>
  )
}
