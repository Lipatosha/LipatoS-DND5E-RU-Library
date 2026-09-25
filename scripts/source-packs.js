const MODULE_ID = "lipatos-dnd5e-ru-library";

const CLASS_ASSETS = {
  artificer: { image: "assets/images/classes/artificer.webp", icon: "assets/icons/classes/artificer-icon.png" },
  barbarian: { image: "assets/images/classes/barbarian.webp", icon: "assets/icons/classes/barbarian-icon.png" },
  bard: { image: "assets/images/classes/bard.webp", icon: "assets/icons/classes/bard-icon.png" },
  cleric: { image: "assets/images/classes/cleric.webp", icon: "assets/icons/classes/cleric-icon.png" },
  druid: { image: "assets/images/classes/druid.webp", icon: "assets/icons/classes/druid-icon.png" },
  fighter: { image: "assets/images/classes/fighter.webp", icon: "assets/icons/classes/fighter-icon.png" },
  monk: { image: "assets/images/classes/monk.webp", icon: "assets/icons/classes/monk-icon.png" },
  paladin: { image: "assets/images/classes/paladin.webp", icon: "assets/icons/classes/paladin-icon.png" },
  ranger: { image: "assets/images/classes/ranger.webp", icon: "assets/icons/classes/ranger-icon.png" },
  rogue: { image: "assets/images/classes/rogue.webp", icon: "assets/icons/classes/rogue-icon.png" },
  sorcerer: { image: "assets/images/classes/sorcerer.webp", icon: "assets/icons/classes/sorcerer-icon.png" },
  warlock: { image: "assets/images/classes/warlock.webp", icon: "assets/icons/classes/warlock-icon.png" },
  wizard: { image: "assets/images/classes/wizard.webp", icon: "assets/icons/classes/wizard-icon.png" }
};

const CLASS_NAMES = {
  "изобретатель": "artificer", "artificer": "artificer",
  "варвар": "barbarian", "barbarian": "barbarian",
  "бард": "bard", "bard": "bard",
  "жрец": "cleric", "cleric": "cleric",
  "друид": "druid", "druid": "druid",
  "воин": "fighter", "fighter": "fighter",
  "монах": "monk", "monk": "monk",
  "паладин": "paladin", "paladin": "paladin",
  "следопыт": "ranger", "ranger": "ranger",
  "плут": "rogue", "rogue": "rogue",
  "чародей": "sorcerer", "sorcerer": "sorcerer",
  "колдун": "warlock", "warlock": "warlock",
  "волшебник": "wizard", "wizard": "wizard"
};

function modulePath(path) {
  return `modules/${MODULE_ID}/${path}`;
}

Hooks.once("init", () => {
  CONFIG.DND5E.sourcePacks = {
    ...(CONFIG.DND5E.sourcePacks ?? {}),
    BACKGROUNDS: `${MODULE_ID}.backgrounds`,
    CLASSES: `${MODULE_ID}.classes`,
    ITEMS: `${MODULE_ID}.items`,
    RACES: `${MODULE_ID}.races`
  };

  const mod = game.modules.get(MODULE_ID);
  if (mod) {
    mod.api = {
      ...(mod.api ?? {}),
      classAssets: Object.fromEntries(
        Object.entries(CLASS_ASSETS).map(([key, value]) => [
          key,
          { image: modulePath(value.image), icon: modulePath(value.icon) }
        ])
      )
    };
  }
});

Hooks.once("ready", async () => {
  if (!game.user?.isGM) return;

  const pack = game.packs.get(`${MODULE_ID}.classes`);
  if (!pack) return;

  try {
    const docs = await pack.getDocuments();
    const updates = [];

    for (const doc of docs) {
      const slug = CLASS_NAMES[String(doc.name ?? "").trim().toLowerCase()];
      if (!slug) continue;

      const img = modulePath(CLASS_ASSETS[slug].image);
      if (doc.img !== img) updates.push({ _id: doc.id, img });
    }

    if (!updates.length) return;

    const wasLocked = pack.locked;
    if (wasLocked) await pack.configure({ locked: false });
    await pack.documentClass.updateDocuments(updates, { pack: pack.collection });
    if (wasLocked) await pack.configure({ locked: true });

    console.info(`${MODULE_ID} | Updated ${updates.length} class images`);
  } catch (error) {
    console.error(`${MODULE_ID} | Failed to update class images`, error);
  }
});
