import fs from "node:fs/promises";
import path from "node:path";
import { ClassicLevel } from "classic-level";

const cwd = process.cwd();
const PACKAGE_ID = "lipatos-dnd5e-ru-library";
const SOURCE_ID = "laaru-dnd5-hw";
const sourceRoot = process.env.LAARU_SOURCE_ROOT
  ? path.resolve(process.env.LAARU_SOURCE_ROOT)
  : path.join(cwd, "vendor", SOURCE_ID);
const buildRoot = path.join(cwd, "build", PACKAGE_ID);

const rootManifest = JSON.parse(await fs.readFile(path.join(cwd, "module.json"), "utf8"));
const sourceManifest = JSON.parse(await fs.readFile(path.join(sourceRoot, "module.json"), "utf8"));

const customClassIcons = new Map(Object.entries({
  artificer: "artificer.webp",
  barbarian: "barbarian.webp",
  bard: "bard.webp",
  cleric: "cleric.webp",
  druid: "druid.webp",
  fighter: "fighter.webp",
  monk: "monk.webp",
  paladin: "paladin.webp",
  ranger: "ranger.webp",
  rogue: "rogue.webp",
  sorcerer: "sorcerer.webp",
  warlock: "warlock.webp",
  wizard: "wizard.webp"
}));

function rewriteString(value) {
  return String(value).split(SOURCE_ID).join(PACKAGE_ID);
}

function rewriteValue(value) {
  if (typeof value === "string") return rewriteString(value);
  if (Array.isArray(value)) return value.map(rewriteValue);
  if (!value || typeof value !== "object") return value;

  const out = {};
  for (const [key, child] of Object.entries(value)) {
    out[rewriteString(key)] = rewriteValue(child);
  }
  return out;
}

async function flush(db, operations) {
  if (!operations.length) return;
  await db.batch(operations);
  operations.length = 0;
}

await fs.rm(path.join(cwd, "build"), { recursive: true, force: true });
await fs.mkdir(buildRoot, { recursive: true });

await fs.cp(path.join(sourceRoot, "assets"), path.join(buildRoot, "assets"), {
  recursive: true,
  force: true
});

await fs.cp(path.join(cwd, "assets"), path.join(buildRoot, "assets"), {
  recursive: true,
  force: true
});

await fs.mkdir(path.join(buildRoot, "scripts"), { recursive: true });
await fs.copyFile(
  path.join(cwd, "scripts", "source-packs.js"),
  path.join(buildRoot, "scripts", "source-packs.js")
);

const report = {};
for (const pack of sourceManifest.packs ?? []) {
  const srcPath = path.join(sourceRoot, pack.path);
  const dstPath = path.join(buildRoot, pack.path);

  await fs.rm(dstPath, { recursive: true, force: true });
  await fs.mkdir(path.dirname(dstPath), { recursive: true });

  const sourceDb = new ClassicLevel(srcPath, {
    keyEncoding: "utf8",
    valueEncoding: "json",
    readOnly: true
  });
  const targetDb = new ClassicLevel(dstPath, {
    keyEncoding: "utf8",
    valueEncoding: "json",
    createIfMissing: true
  });

  await sourceDb.open();
  await targetDb.open();

  const operations = [];
  let count = 0;

  for await (const [key, sourceValue] of sourceDb.iterator()) {
    const value = rewriteValue(sourceValue);

    if (String(key).startsWith("!items!") && value?.type === "class") {
      const icon = customClassIcons.get(value.system?.identifier);
      if (icon) {
        const rel = `assets/icons/classes/${icon}`;
        await fs.access(path.join(buildRoot, rel));
        value.img = `modules/${PACKAGE_ID}/${rel}`;
      }
    }

    operations.push({
      type: "put",
      key: rewriteString(key),
      value
    });
    count += 1;

    if (operations.length >= 750) await flush(targetDb, operations);
  }
  await flush(targetDb, operations);

  await sourceDb.close();
  await targetDb.close();

  report[pack.name] = { records: count };
  console.log(`[${pack.name}] ${count} записей перенесено из Laaru`);
}

const manifest = rewriteValue(sourceManifest);
manifest.id = PACKAGE_ID;
manifest.title = rootManifest.title;
manifest.description = rootManifest.description;
manifest.version = rootManifest.version;
manifest.authors = rootManifest.authors;
manifest.url = rootManifest.url;
manifest.manifest = rootManifest.manifest;
manifest.download = rootManifest.download;
manifest.compatibility = rootManifest.compatibility;
manifest.relationships = rootManifest.relationships;
manifest.esmodules = ["scripts/source-packs.js"];
manifest.flags = {
  ...(manifest.flags ?? {}),
  lipatos: {
    rules: "2014",
    source: "Laaru DnD14",
    sourceVersion: "3.72.5",
    sourceModuleId: SOURCE_ID,
    buildMode: "full-mirror",
    classUiSet: 13
  }
};

if (Array.isArray(manifest.packFolders) && manifest.packFolders[0]) {
  manifest.packFolders[0].name = "LipatoS — DND5E RU Library";
}

await fs.writeFile(
  path.join(buildRoot, "module.json"),
  JSON.stringify(manifest, null, 2) + "\n",
  "utf8"
);
await fs.writeFile(
  path.join(buildRoot, "build-report.json"),
  JSON.stringify(report, null, 2) + "\n",
  "utf8"
);

const requiredPacks = [
  "classes", "subclasses", "classfeatures", "races", "racesMPMM",
  "backgrounds", "spells", "items", "goods", "monsters", "monsters2",
  "intro", "list", "tables", "tables-extra", "macro", "actions", "conditions"
];
const actualPacks = new Set((manifest.packs ?? []).map(p => p.name));
for (const name of requiredPacks) {
  if (!actualPacks.has(name)) throw new Error(`В сборке отсутствует пакет ${name}`);
}

console.log(`Готово: полная база Laaru ${sourceManifest.version} собрана как ${PACKAGE_ID} ${manifest.version}`);
