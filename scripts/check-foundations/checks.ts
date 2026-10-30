import ts from "typescript";

// Contrôles automatiques des fondations (CLAUDE.md, « Fondations »). Chaque contrôle reçoit du texte
// et renvoie la liste des écarts trouvés, pour être testé sans lire le disque.

export type Violation = { rule: string; where: string; message: string };

// ---------------------------------------------------------------- lecture du schéma Prisma

type Field = { name: string; type: string; attributes: string };
type PrismaModel = { name: string; table: string; fields: Field[] };

export function parsePrismaModels(schema: string): PrismaModel[] {
  const models: PrismaModel[] = [];
  const blocks = schema.matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm);
  for (const [, name, body] of blocks) {
    const fields: Field[] = [];
    let table = name!;
    for (const raw of body!.split("\n")) {
      const line = raw.replace(/\/\/.*$/, "").trim();
      if (!line) continue;
      const map = line.match(/^@@map\("([^"]+)"\)/);
      if (map) table = map[1]!;
      if (line.startsWith("@@")) continue;
      const field = line.match(/^(\w+)\s+([\w.()"]+(?:\[\])?\??)\s*(.*)$/);
      if (field) fields.push({ name: field[1]!, type: field[2]!, attributes: field[3]! });
    }
    models.push({ name: name!, table, fields });
  }
  return models;
}

const SCALARS = new Set([
  "String",
  "Int",
  "BigInt",
  "Float",
  "Decimal",
  "Boolean",
  "DateTime",
  "Json",
  "Bytes",
]);
const baseType = (type: string) => type.replace(/[[\]?]/g, "");

// Journaux en UUID version 7 (F1) et tables en ajout seul (F3).
const LOG_TABLES = new Set(["audit_log", "analytics_events"]);
const isAppendOnly = (table: string) => LOG_TABLES.has(table) || table.startsWith("obs_");

// Clés naturelles admises (décision 0017) : le code ISO du pays, repris par chaque countryCode
// (principe 3 de CLAUDE.md), et le nom d'un réglage. Ni l'une ni l'autre n'est un compteur.
const NATURAL_KEYS = new Set(["Country.code", "Setting.key"]);

// F1 : aucun compteur séquentiel, toute clé primaire en UUID, en version 7 pour les journaux.
export function checkIdentifiers(schema: string): Violation[] {
  const out: Violation[] = [];
  for (const model of parsePrismaModels(schema)) {
    for (const f of model.fields) {
      if (/autoincrement\(\)/.test(f.attributes)) {
        out.push({ rule: "F1", where: `${model.name}.${f.name}`, message: "compteur séquentiel" });
      }
    }
    const id = model.fields.find((f) => /@id\b/.test(f.attributes));
    // Clé composée (@@id) : faite d'identifiants déjà contrôlés.
    if (!id || NATURAL_KEYS.has(`${model.name}.${id.name}`)) continue;
    if (baseType(id.type) !== "String" || !/@db\.Uuid/.test(id.attributes)) {
      out.push({
        rule: "F1",
        where: `${model.name}.${id.name}`,
        message: "clé primaire qui n'est pas un UUID",
      });
    } else if (LOG_TABLES.has(model.table) && !/uuid\(7\)/.test(id.attributes)) {
      out.push({
        rule: "F1",
        where: `${model.name}.${id.name}`,
        message: "journal sans UUID version 7",
      });
    }
  }
  return out;
}

// Un montant : nom en …Minor, en micro-unités (…MicroUsd) ou qui commence par amount, price, cost, fee.
const AMOUNT = /(^(amount|price|cost|fee)|[a-z]Minor$|Micro[A-Z])/;

// F1 : une colonne currency dans chaque table qui contient un montant ; aucun montant à virgule.
export function checkAmounts(schema: string): Violation[] {
  const out: Violation[] = [];
  for (const model of parsePrismaModels(schema)) {
    const amounts = model.fields.filter(
      (f) => SCALARS.has(baseType(f.type)) && AMOUNT.test(f.name),
    );
    if (amounts.length === 0) continue;
    for (const f of amounts) {
      if (baseType(f.type) !== "Int") {
        out.push({
          rule: "F1",
          where: `${model.name}.${f.name}`,
          message: "montant qui n'est pas un entier",
        });
      }
    }
    if (!model.fields.some((f) => f.name === "currency")) {
      out.push({
        rule: "F1",
        where: model.name,
        message: `montant sans colonne currency (${amounts.map((f) => f.name).join(", ")})`,
      });
    }
  }
  return out;
}

const PRICE_OR_AVAILABILITY = /price|amount|cost|fee|stock|availab|delay|discount|offer/i;

// F4 : les tables catalog_* ne contiennent ni prix ni disponibilité (les relations vers obs_* sont permises).
export function checkCatalog(schema: string): Violation[] {
  const out: Violation[] = [];
  for (const model of parsePrismaModels(schema)) {
    if (!model.table.startsWith("catalog_")) continue;
    for (const f of model.fields) {
      if (SCALARS.has(baseType(f.type)) && PRICE_OR_AVAILABILITY.test(f.name)) {
        out.push({
          rule: "F4",
          where: `${model.name}.${f.name}`,
          message: "prix ou disponibilité dans le catalogue",
        });
      }
    }
  }
  return out;
}

// F3 : chaque table en ajout seul a ses déclencheurs UPDATE/DELETE et TRUNCATE dans les migrations.
export function checkAppendOnlyTriggers(schema: string, migrationsSql: string): Violation[] {
  const out: Violation[] = [];
  const sql = migrationsSql.replace(/\s+/g, " ");
  for (const model of parsePrismaModels(schema)) {
    if (!isAppendOnly(model.table)) continue;
    const t = model.table;
    const rowTrigger = new RegExp(
      `BEFORE UPDATE OR DELETE ON "?${t}"? FOR EACH ROW EXECUTE FUNCTION "?refuse_append_only_change"?`,
      "i",
    );
    const truncateTrigger = new RegExp(
      `BEFORE TRUNCATE ON "?${t}"? FOR EACH STATEMENT EXECUTE FUNCTION "?refuse_append_only_change"?`,
      "i",
    );
    if (!rowTrigger.test(sql)) {
      out.push({ rule: "F3", where: t, message: "aucun déclencheur qui refuse UPDATE et DELETE" });
    }
    if (!truncateTrigger.test(sql)) {
      out.push({ rule: "F3", where: t, message: "aucun déclencheur qui refuse TRUNCATE" });
    }
  }
  return out;
}

// ---------------------------------------------------------------- CSS et composants

const CSS_PHYSICAL = [
  /(^|[^-\w])(margin|padding|border|scroll-margin|scroll-padding)-(left|right)\b/,
  /(^|[;{\s])(left|right)\s*:/,
  /\b(text-align|float|clear|justify-self|justify-items)\s*:\s*(left|right)\b/,
  /\bborder-(top|bottom)-(left|right)-radius\b/,
];

// F5 : le CSS n'emploie que des propriétés logiques, jamais left ni right.
export function checkCss(file: string, css: string): Violation[] {
  const out: Violation[] = [];
  const lines = css.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, " ")).split("\n");
  lines.forEach((line, i) => {
    if (CSS_PHYSICAL.some((re) => re.test(line))) {
      out.push({
        rule: "F5",
        where: `${file}:${i + 1}`,
        message: `propriété physique : ${line.trim()}`,
      });
    }
  });
  return out;
}

// Lettres accentuées, guillemets et apostrophe typographiques du français, écriture arabe.
const UI_TEXT = /[À-ÖØ-öø-ÿŒœ’«»؀-ۿ]/;
const PHYSICAL_STYLE_KEYS = /^(left|right|(margin|padding|border)(Left|Right)\w*)$/;

// F5 : dans les composants, aucun texte d'interface en dur (chaînes et texte JSX, hors commentaires)
// et aucun style en ligne physique (left, marginLeft…).
export function checkComponent(file: string, source: string): Violation[] {
  const out: Violation[] = [];
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const at = (node: ts.Node) =>
    `${file}:${sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1}`;

  const visit = (node: ts.Node) => {
    let text: string | undefined;
    if (ts.isJsxText(node)) text = node.text;
    else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) text = node.text;
    else if (ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node))
      text = node.text;
    if (text !== undefined && UI_TEXT.test(text)) {
      out.push({
        rule: "F5",
        where: at(node),
        message: `texte en dur : « ${text.trim().slice(0, 40)} »`,
      });
    }
    if (ts.isPropertyAssignment(node) && PHYSICAL_STYLE_KEYS.test(node.name.getText(sf))) {
      out.push({
        rule: "F5",
        where: at(node),
        message: `style physique : ${node.name.getText(sf)}`,
      });
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}
