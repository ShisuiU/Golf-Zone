/**
 * Silhouette du fil, affichée pendant que la base répond.
 *
 * La base dort au bout de quelques minutes sans trafic et met parfois deux
 * secondes à se réveiller : montrer la forme de la page vaut mieux qu'un
 * écran vide, et évite que tout saute d'un coup à l'arrivée des données.
 */
function Line({ w }: { w: string }) {
  return <span className="block h-3 rounded-full bg-surface-2" style={{ width: w }} />;
}

export function FeedSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <div aria-hidden="true" className="flex animate-pulse flex-col gap-5">
      {Array.from({ length: cards }, (_, i) => (
        <div key={i} className="surface">
          <div className="flex items-center gap-3 px-4 py-3">
            <span className="h-9 w-9 shrink-0 rounded-full bg-surface-2" />
            <span className="flex flex-col gap-2">
              <Line w="120px" />
              <Line w="76px" />
            </span>
          </div>
          <div className="h-[280px] w-full bg-graphite-deep" />
          <div className="flex flex-col gap-2 px-4 py-4">
            <Line w="70%" />
            <Line w="40%" />
          </div>
        </div>
      ))}
    </div>
  );
}
