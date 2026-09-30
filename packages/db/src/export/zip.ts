import JSZip from "jszip";
import type { Archive } from "./archive";

/**
 * The archive as one file a person can keep.
 *
 * CSV for every table, because a spreadsheet is the only tool a volunteer
 * certainly has, plus the whole thing as JSON, because CSV cannot hold a nested
 * value and a real migration needs the ids and the types intact. Both, not one
 * or the other: the CSVs are for reading and the JSON is for moving.
 *
 * A README goes in too. An export nobody can interpret in two years is an export
 * that failed, and the person opening it will not have this repository.
 */
export async function zipArchive(archive: Archive): Promise<Buffer> {
  const zip = new JSZip();

  zip.file("hearth-export.json", JSON.stringify({ meta: archive.meta, data: archive.data }, null, 2));

  const csv = zip.folder("csv");
  for (const [table, content] of Object.entries(archive.csv)) {
    csv?.file(`${table}.csv`, content);
  }

  zip.file("README.txt", readme(archive));

  return zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}

function readme(archive: Archive): string {
  const counts = Object.entries(archive.meta.counts)
    .filter(([, n]) => n > 0)
    .map(([table, n]) => `  ${table}: ${n}`)
    .join("\n");

  const withheld = archive.meta.withheld.length
    ? `\nWithheld from this export, because the role that ran it may not read them:\n${archive.meta.withheld.map((w) => `  ${w}`).join("\n")}\n`
    : "";

  return `${archive.meta.church}
Exported ${archive.meta.exportedAt}
Hearth archive format ${archive.meta.format}

This is everything. There is no other copy held back, no paid tier that would
have given you more, and nothing here needs Hearth to read it.

csv/
  One file per table, UTF-8 with a byte order mark so Excel opens it correctly.
  Ids are kept, so the files join back together: people.csv has an id, and
  contact_methods.csv has a person_id pointing at it.

hearth-export.json
  The same data, with types and nesting intact. This is the file to use if you
  are moving to another system or reading it with a program.

What is in it:
${counts}
${withheld}
Licence: Hearth is AGPL-3.0. Your data is yours.
`;
}
