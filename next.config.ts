import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // La validation applicative plafonne les photos à 2 Mo (lib/photo.ts).
      // On laisse ici une marge au-dessus : la limite de Next porte sur le
      // corps HTTP brut, surcoût multipart compris, sinon une photo de
      // presque 2 Mo serait coupée par un 413 avant d'atteindre notre
      // message d'erreur.
      bodySizeLimit: "2.5mb",
    },
  },
};

export default nextConfig;
