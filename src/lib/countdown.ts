export interface Countdown {
  days: number
  hours: number
  minutes: number
  seconds: number
  isPast: boolean
}

export function getCountdown(targetIso: string, now: Date = new Date()): Countdown {
  const diff = new Date(targetIso).getTime() - now.getTime()
  if (!(diff > 0)) return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true }
  const total = Math.floor(diff / 1000)
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
    isPast: false,
  }
}
