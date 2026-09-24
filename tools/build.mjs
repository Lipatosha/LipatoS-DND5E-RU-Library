import fs from "node:fs/promises";
import path from "node:path";
import { ClassicLevel } from "classic-level";

const cwd = process.cwd();
const sourceDir = path.join(cwd, "source", "classes");
const buildRoot = path.join(cwd, "build", "lipatos-dnd5e-ru-library");
const packDir = path.join(buildRoot, "packs", "classes");

await fs.rm(path.join(cwd, "build"), { recursive: true, force: true });
await fs.mkdir(packDir, { recursive: true });
await fs.copyFile(path.join(cwd, "module.json"), path.join(buildRoot, "module.json"));\nawait fs.cp(path.join(cwd, "assets"), path.join(buildRoot, "assets"), { recursive: true });

const filenames = (await fs.readdir(sourceDir)).filter(f => f.endsWith(".json")).sort();
if (filenames.length !== 13) throw new Error(`Ожидалось 13 классов, найдено ${filenames.length}`);

const documents = [];
const ids = new Set();
const identifiers = new Set();

for (const filename of filenames) {
  const file = path.join(sourceDir, filename);
  const document = JSON.parse(await fs.readFile(file, "utf8"));

  if (document.type !== "class") throw new Error(`${filename}: type должен быть class`);
  if (!document._id || ids.has(document._id)) throw new Error(`${filename}: отсутствует или повторяется _id`);
  if (!document.system?.identifier || identifiers.has(document.system.identifier)) {
    throw new Error(`${filename}: отсутствует или повторяется system.identifier`);
  }
  if (!String(document.img || "").startsWith("modules/lipatos-dnd5e-ru-library/assets/icons/classes/")) throw new Error(`${filename}: отсутствует иконка класса`);
  if (document.system?.source?.rules !== "2014") throw new Error(`${filename}: ожидаются правила 2014`);
  if (document._stats?.systemVersion !== "6.0.5") throw new Error(`${filename}: неверная версия D&D5e`);

  ids.add(document._id);
  identifiers.add(document.system.identifier);
  documents.push(document);
}

const db = new ClassicLevel(packDir, {
  keyEncoding: "utf8",
  valueEncoding: "utf8",
  createIfMissing: true
});
await db.open();
await db.batch(documents.map(document => ({
  type: "put",
  key: `!items!${document._id}`,
  value: JSON.stringify(document)
})));
await db.close();

console.log(`Готово: собрано ${documents.length} классов в packs/classes`);
