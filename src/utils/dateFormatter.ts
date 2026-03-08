export function formatAussieDate(dateString: string | Date): string {
  const date = new Date(dateString);
  
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Australia/Sydney', // Handles both AEST and AEDT
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false, // 24-hour time to match HHMM format
  };

  const formatter = new Intl.DateTimeFormat('en-AU', options);
  
  // Format produces something like "08 Mar 2026, 22:30"
  // We need to strip the comma and colon to match "dd Mmm YYYY HHMM"
  const parts = formatter.formatToParts(date);
  
  let day = '', month = '', year = '', hour = '', minute = '';
  
  parts.forEach(part => {
    if (part.type === 'day') day = part.value;
    if (part.type === 'month') month = part.value;
    if (part.type === 'year') year = part.value;
    if (part.type === 'hour') hour = part.value;
    if (part.type === 'minute') minute = part.value;
  });

  return `${day} ${month} ${year} ${hour}${minute}`;
}
