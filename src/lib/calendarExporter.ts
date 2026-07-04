import type { Event } from '../types'

/**
 * Generate .ics file content for calendar export
 * Compatible with Google Calendar, Outlook, Apple Calendar
 */
export const generateICS = (event: Event): string => {
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  }

  const escapeText = (text: string): string => {
    return text.replace(/[,;\\]/g, '\\$&').replace(/\n/g, '\\n')
  }

  const dtstart = formatDate(event.date)
  const dtend = event.endDate 
    ? formatDate(event.endDate) 
    : formatDate(new Date(new Date(event.date).getTime() + 2 * 60 * 60 * 1000).toISOString()) // 2h default

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//KAIRÓS MER//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.id}@kairos-mer.com`,
    `DTSTAMP:${formatDate(new Date().toISOString())}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:${escapeText(event.title)}`,
    event.description ? `DESCRIPTION:${escapeText(event.description)}` : '',
    event.location ? `LOCATION:${escapeText(event.location)}` : '',
    event.category ? `CATEGORIES:${escapeText(event.category)}` : '',
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    // Add reminder 24h before
    'BEGIN:VALARM',
    'TRIGGER:-PT24H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Lembrete: Evento amanhã!',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].filter(line => line !== '').join('\r\n')

  return icsContent
}

/**
 * Download .ics file
 */
export const downloadICS = (event: Event): void => {
  const icsContent = generateICS(event)
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${event.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.ics`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Generate Google Calendar URL
 */
export const getGoogleCalendarUrl = (event: Event): string => {
  const formatGoogleDate = (dateString: string): string => {
    return new Date(dateString).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  }

  const startDate = formatGoogleDate(event.date)
  const endDate = event.endDate 
    ? formatGoogleDate(event.endDate)
    : formatGoogleDate(new Date(new Date(event.date).getTime() + 2 * 60 * 60 * 1000).toISOString())

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${startDate}/${endDate}`,
    details: event.description || '',
    location: event.location || '',
  })

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

/**
 * Generate Outlook Web URL
 */
export const getOutlookUrl = (event: Event): string => {
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: event.title,
    body: event.description || '',
    location: event.location || '',
    startdt: new Date(event.date).toISOString(),
    enddt: event.endDate 
      ? new Date(event.endDate).toISOString()
      : new Date(new Date(event.date).getTime() + 2 * 60 * 60 * 1000).toISOString(),
  })

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`
}
