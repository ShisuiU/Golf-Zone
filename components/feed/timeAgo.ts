/** Date relative courte, à la manière d'un fil social. */
export function timeAgo(date: Date | string): string {
  const then = new Date(date).getTime();
  const seconds = Math.max(0, Math.round((Date.now() - then) / 1000));

  if (seconds < 60) return "à l'instant";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `il y a ${days} j`;

  return new Date(date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}
