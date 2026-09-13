import { timeAgo } from "@/components/feed/timeAgo";

/**
 * Date relative.
 *
 * `suppressHydrationWarning` est indispensable : le serveur rend « à
 * l'instant », et le navigateur recalcule quelques secondes plus tard, ce que
 * React signale sinon comme une incohérence d'hydratation. La date absolue
 * reste dans `dateTime`, lisible par les machines et au survol.
 */
export function Time({ date, className }: { date: Date | string; className?: string }) {
  const iso = new Date(date).toISOString();
  return (
    <time dateTime={iso} title={new Date(date).toLocaleString("fr-FR")} className={className} suppressHydrationWarning>
      {timeAgo(date)}
    </time>
  );
}
