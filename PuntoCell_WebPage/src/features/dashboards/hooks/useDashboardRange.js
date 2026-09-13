import { useEffect, useMemo, useState } from 'react'

const pad = (value) => String(value).padStart(2, '0')

const toDateInputValue = (date) => {
  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  return `${year}-${month}-${day}`
}

export const getDefaultDashboardRange = (days = 30) => {
  const to = new Date()
  const from = new Date(to)
  from.setDate(from.getDate() - days)
  return {
    from: toDateInputValue(from),
    to: toDateInputValue(to),
  }
}

export const useDashboardRange = (defaultDays = 30) => {
  const defaultRange = useMemo(() => getDefaultDashboardRange(defaultDays), [defaultDays])
  const [range, setRange] = useState(defaultRange)
  const [seeAll, setSeeAll] = useState(false)

  useEffect(() => {
    if (!seeAll) return
    const today = toDateInputValue(new Date())
    setRange((current) => ({
      from: current.from || defaultRange.from,
      to: today,
    }))
  }, [seeAll, defaultRange.from])

  const updateFrom = (from) => {
    setRange((current) => ({ ...current, from }))
    setSeeAll(false)
  }

  const updateTo = (to) => {
    setRange((current) => ({ ...current, to }))
    setSeeAll(false)
  }

  const toggleSeeAll = (checked) => {
    setSeeAll(checked)
    if (checked) {
      setRange((current) => ({
        from: current.from || defaultRange.from,
        to: toDateInputValue(new Date()),
      }))
    }
  }

  return {
    range,
    seeAll,
    updateFrom,
    updateTo,
    toggleSeeAll,
  }
}

export const toApiRange = (range, seeAll = false, defaultDays = 30) => {
  if (seeAll) return null
  if (!range?.from || !range?.to) return null
  const from = new Date(range.from)
  const to = new Date(range.to)
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null
  return {
    from: from.toISOString(),
    to: to.toISOString(),
  }
}