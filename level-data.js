const levelCatalog = [
  {
    id: 1,
    title: "第 1 关",
    theme: "点点和线条",
    description: "先从最简单的点、短线和弯线开始，熟悉轮流作画的节奏。",
  },
  {
    id: 2,
    title: "第 2 关",
    theme: "基础图形",
    description: "接着画圆形、三角形和方形，把简单形状拼成完整小图案。",
  },
  {
    id: 3,
    title: "第 3 关",
    theme: "气球和小房子",
    description: "从基础形状进阶到小物体，试着画出气球、窗户和屋顶这些元素。",
  },
  {
    id: 4,
    title: "第 4 关",
    theme: "小动物朋友",
    description: "现在开始挑战更完整的角色，补上小动物的脸、耳朵和身体轮廓。",
  },
  {
    id: 5,
    title: "第 5 关",
    theme: "魔法花园",
    description: "进入场景组合阶段，把花朵、叶子、草地和装饰一起画进同一张图里。",
  },
  {
    id: 6,
    title: "第 6 关",
    theme: "星空大冒险",
    description: "最后一关挑战完整大场景，把星星、月亮、飞船和远景一起完成。",
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
