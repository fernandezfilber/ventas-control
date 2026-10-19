function getLimaDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

export function getContractStartDate(installationDate: string | null, fallback = new Date()) {
  const dateKey = installationDate || getLimaDateKey(fallback);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) throw new Error('La fecha de instalación no es válida.');

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error('La fecha de instalación no es válida.');
  }
  return date;
}

export function getContractDueDate(startDate: Date, monthNumber: number) {
  const year = startDate.getUTCFullYear();
  const month = startDate.getUTCMonth() + monthNumber - 1;
  const day = startDate.getUTCDate();
  const date = new Date(Date.UTC(year, month, 1));
  date.setUTCDate(Math.min(
    day,
    new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate(),
  ));
  return date;
}

export function getContractEndDate(startDate: Date) {
  return getContractDueDate(startDate, 4);
}
