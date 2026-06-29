const levelCatalog = [
  {
    id: 1,
    title: "第 1 关",
    theme: "儿童涂鸦",
    description: "从第一张画纸开始，先画出你最想补上的那一笔。",
  },
  {
    id: 2,
    title: "第 2 关",
    theme: "小动物朋友",
    description: "试着帮小动物补上最可爱的表情和轮廓。",
  },
  {
    id: 3,
    title: "第 3 关",
    theme: "云朵小镇",
    description: "在软软的云朵上，画出房子和小路的感觉。",
  },
  {
    id: 4,
    title: "第 4 关",
    theme: "海底冒险",
    description: "让小鱼和泡泡一起出现，画出热闹的海底世界。",
  },
  {
    id: 5,
    title: "第 5 关",
    theme: "魔法花园",
    description: "这一关请用画笔种出会发光的小花和藤蔓。",
  },
  {
    id: 6,
    title: "第 6 关",
    theme: "星空旅行",
    description: "把最后一关画成一场飞向月亮的星空旅行。",
  },
];

const storageKeys = {
  journey: "drawing-demo-journey",
};

function createDefaultJourneyState() {
  return {
    currentLevelId: 1,
    recommendedLevelId: 1,
    completedLevels: [],
  };
}

function clampLevelId(levelId) {
  const safeLevelId = Number(levelId) || 1;
  return Math.min(levelCatalog.length, Math.max(1, safeLevelId));
}

function getLevelById(levelId) {
  return levelCatalog.find((level) => level.id === clampLevelId(levelId)) || levelCatalog[0];
}

function normalizeJourneyState(rawState) {
  const baseState = createDefaultJourneyState();
  if (!rawState || typeof rawState !== "object") {
    return baseState;
  }

  const completedLevels = Array.isArray(rawState.completedLevels)
    ? rawState.completedLevels
      .map((levelId) => clampLevelId(levelId))
      .filter((levelId, index, levels) => levels.indexOf(levelId) === index)
      .sort((a, b) => a - b)
    : [];

  return {
    currentLevelId: clampLevelId(rawState.currentLevelId ?? baseState.currentLevelId),
    recommendedLevelId: clampLevelId(rawState.recommendedLevelId ?? baseState.recommendedLevelId),
    completedLevels,
  };
}

function loadJourneyState() {
  try {
    const saved = window.localStorage.getItem(storageKeys.journey);
    return normalizeJourneyState(saved ? JSON.parse(saved) : null);
  } catch (error) {
    return createDefaultJourneyState();
  }
}

function saveJourneyState(journeyState) {
  const safeState = normalizeJourneyState(journeyState);
  window.localStorage.setItem(storageKeys.journey, JSON.stringify(safeState));
  return safeState;
}

window.DrawingDemoData = {
  levelCatalog,
  createDefaultJourneyState,
  clampLevelId,
  getLevelById,
  loadJourneyState,
  saveJourneyState,
};
