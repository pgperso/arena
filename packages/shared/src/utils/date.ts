const MINUTE = 60;
const HOUR = 3600;
const DAY = 86400;
const WEEK = 604800;
const MONTH = 2592000;
const YEAR = 31536000;

export function timeAgo(dateString: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateString).getTime()) / 1000,
  );

  if (seconds < MINUTE) return 'à l\'instant';
  if (seconds < HOUR) {
    const m = Math.floor(seconds / MINUTE);
    return `il y a ${m} min`;
  }
  if (seconds < DAY) {
    const h = Math.floor(seconds / HOUR);
    return `il y a ${h}h`;
  }
  if (seconds < WEEK) {
    const d = Math.floor(seconds / DAY);
    return `il y a ${d}j`;
  }
  if (seconds < MONTH) {
    const w = Math.floor(seconds / WEEK);
    return `il y a ${w} sem.`;
  }
  if (seconds < YEAR) {
    const m = Math.floor(seconds / MONTH);
    return `il y a ${m} mois`;
  }
  const y = Math.floor(seconds / YEAR);
  return `il y a ${y} an${y > 1 ? 's' : ''}`;
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('fr-CA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString('fr-CA', {
    hour: '2-digit',
    minute: '2-digit',
  });
}
