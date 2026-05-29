const QUOTES = [
  '"The secret of getting ahead is getting started." — Mark Twain',
  '"Done is better than perfect." — Sheryl Sandberg',
  '"Focus on being productive instead of busy." — Tim Ferriss',
  '"Small progress is still progress."',
  '"Ship it, then iterate."',
];

export function getQuote(): string {
  return QUOTES[new Date().getDate() % QUOTES.length]!;
}

export function getTimeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}
