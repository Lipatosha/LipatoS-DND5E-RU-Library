Hooks.once("init", () => {
  CONFIG.DND5E.sourcePacks = {
    ...(CONFIG.DND5E.sourcePacks ?? {}),
    BACKGROUNDS: "lipatos-dnd5e-ru-library.backgrounds",
    CLASSES: "lipatos-dnd5e-ru-library.classes",
    ITEMS: "lipatos-dnd5e-ru-library.items",
    RACES: "lipatos-dnd5e-ru-library.races"
  };
});
