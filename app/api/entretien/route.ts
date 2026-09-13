import { purgeExpired } from "@/lib/db";

/**
 * Ménage quotidien, appelé par la tâche planifiée de Vercel (`vercel.json`).
 *
 * Sessions périmées, jetons consommés, compteurs dormants : rien de tout cela
 * n'est encore lu par le site, mais les lignes s'accumulaient sans fin — et
 * deux de ces tables portent une adresse IP, qu'on ne garde pas sans raison.
 *
 * `CRON_SECRET` verrouille l'accès quand la variable est posée : Vercel
 * l'envoie alors dans l'en-tête `Authorization`. Sans elle, la route reste
 * ouverte, ce qui ne prête pas à conséquence — elle ne supprime que ce qui
 * est déjà expiré, et l'appeler dix fois ne fait pas plus que l'appeler une.
 */
export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Non autorisé", { status: 401 });
  }

  try {
    const efface = await purgeExpired();
    return Response.json({ efface });
  } catch (error) {
    console.error("Entretien impossible :", error);
    return new Response("Entretien impossible", { status: 500 });
  }
}
