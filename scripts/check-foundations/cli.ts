// pnpm check:foundations : vérifie les invariants vérifiables de CLAUDE.md (« Fondations »).
// Lancé aussi par l'intégration continue ; un écart fait échouer la commande.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  checkAmounts,
  checkAppendOnlyTriggers,
  checkCatalog,
  checkComponent,
  checkCss,
  checkIdentifiers,
  type Violation,
} from "./checks";

const I18N_DIR = join("src", "lib", "i18n");

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

const read = (path: string) => readFileSync(path, "utf8");

const schema = read(join("prisma", "schema.prisma"));
const migrations = walk(join("prisma", "migrations"))
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map(read)
  .join("\n");
const sources = walk("src");

const violations: Violation[] = [
  ...checkIdentifiers(schema),
  ...checkAmounts(schema),
  ...checkCatalog(schema),
  ...checkAppendOnlyTriggers(schema, migrations),
  ...sources.filter((f) => f.endsWith(".css")).flatMap((f) => checkCss(f, read(f))),
  ...sources
    .filter((f) => f.endsWith(".tsx") && !f.startsWith(I18N_DIR))
    .flatMap((f) => checkComponent(f, read(f))),
];

if (violations.length === 0) {
  console.log(
    "Fondations : aucun écart (F1 identifiants et montants, F3 ajout seul, F4 catalogue, F5 CSS et textes).",
  );
} else {
  console.error(`Fondations : ${violations.length} écart(s).`);
  for (const v of violations) console.error(`  [${v.rule}] ${v.where} : ${v.message}`);
  process.exitCode = 1;
}
