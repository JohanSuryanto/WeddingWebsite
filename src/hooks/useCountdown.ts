import { useEffect, useState } from 'react'
import { getCountdown, type Countdown } from '../lib/countdown'

export function useCountdown(targetIso: string): Countdown {
  const [value, setValue] = useState(() => getCountdown(targetIso))
  useEffect(() => {
    const id = window.setInterval(() => {
      const next = getCountdown(targetIso)
      setValue(next)
      if (next.isPast) window.clearInterval(id)
    }, 1000)
    return () => window.clearInterval(id)
  }, [targetIso])
  return value
}
