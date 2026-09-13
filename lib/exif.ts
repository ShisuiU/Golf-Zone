import "server-only";

/**
 * Retrait des métadonnées d'une image.
 *
 * Un téléphone enregistre dans le fichier la date, le modèle de l'appareil et
 * — c'est le point qui compte — les **coordonnées GPS** de la prise de vue.
 * Publier une photo de sa voiture garée devant chez soi reviendrait à publier
 * son adresse.
 *
 * Le navigateur réencode déjà l'image avant l'envoi, ce qui suffit à effacer
 * ces données, mais une Server Action accepte n'importe quel corps de requête :
 * la garantie doit être ici, sur des octets qu'on a lus soi-même.
 *
 * On ne redécode pas l'image — pas de bibliothèque de traitement d'image à
 * installer, et aucune perte de qualité : on retire les segments qui portent
 * les métadonnées et on recopie le reste tel quel.
 */

/* ------------------------------------------------------------------- JPEG */

/** Segments à jeter : EXIF/XMP (APP1), IPTC et profils Photoshop (APP13), commentaires. */
const JPEG_DROP = new Set([0xe1, 0xed, 0xfe]);

function stripJpeg(data: Buffer): Buffer {
  const keep: Buffer[] = [data.subarray(0, 2)]; // SOI
  let i = 2;

  while (i < data.length) {
    // Un flux peut contenir des octets de bourrage 0xFF entre deux segments.
    if (data[i] !== 0xff) break;
    let marker = data[i + 1];
    let start = i;
    while (marker === 0xff) {
      start += 1;
      marker = data[start + 1];
    }

    // Début des données compressées : tout ce qui suit est recopié tel quel.
    if (marker === 0xda) {
      keep.push(data.subarray(start));
      return Buffer.concat(keep);
    }
    // Marqueurs sans charge utile.
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
      keep.push(data.subarray(start, start + 2));
      i = start + 2;
      continue;
    }

    const length = data.readUInt16BE(start + 2);
    const end = start + 2 + length;
    if (length < 2 || end > data.length) break; // fichier tronqué : on s'arrête là
    if (!JPEG_DROP.has(marker)) keep.push(data.subarray(start, end));
    i = end;
  }

  return Buffer.concat(keep);
}

/* -------------------------------------------------------------------- PNG */

/**
 * Blocs conservés : ceux dont dépend le rendu. Tout le reste — `eXIf`, les
 * blocs de texte, l'horodatage — s'en va.
 */
const PNG_KEEP = new Set([
  "IHDR", "PLTE", "IDAT", "IEND", "tRNS",
  "gAMA", "cHRM", "sRGB", "iCCP", "pHYs", "sBIT", "bKGD",
]);

function stripPng(data: Buffer): Buffer {
  const keep: Buffer[] = [data.subarray(0, 8)]; // signature
  let i = 8;

  while (i + 8 <= data.length) {
    const length = data.readUInt32BE(i);
    const type = data.toString("ascii", i + 4, i + 8);
    const end = i + 12 + length; // longueur + type + données + CRC
    if (end > data.length) break;
    if (PNG_KEEP.has(type)) keep.push(data.subarray(i, end));
    i = end;
    if (type === "IEND") break;
  }

  return Buffer.concat(keep);
}

/* ------------------------------------------------------------------- WebP */

/** Dans l'en-tête VP8X, deux bits annoncent la présence d'EXIF et de XMP. */
const VP8X_EXIF = 0x08;
const VP8X_XMP = 0x04;

function stripWebp(data: Buffer): Buffer {
  const chunks: Buffer[] = [];
  let i = 12; // 'RIFF' + taille + 'WEBP'

  while (i + 8 <= data.length) {
    const fourcc = data.toString("ascii", i, i + 4);
    const size = data.readUInt32LE(i + 4);
    // Chaque bloc est aligné sur un nombre pair d'octets.
    const end = i + 8 + size + (size % 2);
    if (end > data.length) break;

    if (fourcc !== "EXIF" && fourcc !== "XMP ") {
      const chunk = Buffer.from(data.subarray(i, Math.min(end, data.length)));
      // Les blocs retirés ne doivent plus être annoncés dans les drapeaux.
      if (fourcc === "VP8X" && chunk.length > 8) {
        chunk[8] &= ~(VP8X_EXIF | VP8X_XMP);
      }
      chunks.push(chunk);
    }
    i = end;
  }

  const body = Buffer.concat(chunks);
  const header = Buffer.alloc(12);
  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(body.length + 4, 4); // taille = 'WEBP' + blocs
  header.write("WEBP", 8, "ascii");
  return Buffer.concat([header, body]);
}

/**
 * Retire les métadonnées selon le format. En cas de fichier inattendu, on
 * renvoie les octets d'origine : mieux vaut une image intacte qu'une image
 * cassée par un nettoyage approximatif — la validation du format a déjà eu
 * lieu en amont.
 */
export function stripMetadata(data: Buffer, mime: string): Buffer {
  try {
    if (mime === "image/jpeg") return stripJpeg(data);
    if (mime === "image/png") return stripPng(data);
    if (mime === "image/webp") return stripWebp(data);
  } catch (error) {
    console.error("Nettoyage des métadonnées impossible :", error);
  }
  return data;
}
