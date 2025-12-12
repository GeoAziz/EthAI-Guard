import { format } from 'date-fns';

export function formatDate(iso?: string | null) {
  if (!iso) {return '—';}
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {return '—';}
    // PPpp gives a readable date + time, e.g. Jan 1, 2025 at 12:00 AM
    return format(d, 'PPpp');
  } catch (e) {
    return '—';
  }
}

export default formatDate;
