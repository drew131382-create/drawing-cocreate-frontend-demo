const {
  levelCatalog,
  getLevelById,
  clampLevelId,
  loadJourneyState,
  saveJourneyState,
} = window.DrawingDemoData;

const state = loadJourneyState();

const dom = {
  mapCurrentLevelLabel: document.getElementById("mapCurrentLevelLabel"),
  mapCompletedCount: document.getElementById("mapCompletedCount"),
  mapCurrentTheme: document.getElementById("mapCurrentTheme"),
  mapCurrentDescription: document.getElementById("mapCurrentDescription"),
  btnStartCurrentLevel: document.getElementById("btnStartCurrentLevel"),
  levelNodes: Array.from(document.querySelectorAll(".level-node")),
};

function init() {
  bindControls();
  updateMapUI();
}

function bindControls() {
  dom.btnStartCurrentLevel.addEventListener("click", () => {
    openLevel(state.recommendedLevelId);
  });

  dom.levelNodes.forEach((node) => {
    node.addEventListener("click", () => {
      openLevel(Number(node.dataset.levelId));
    });
  });
}

function openLevel(levelId) {
  state.currentLevelId = clampLevelId(levelId);
  saveJourneyState(state);
  window.location.href = `./level.html?level=${state.currentLevelId}`;
}

function updateMapUI() {
  const recommendedLevel = getLevelById(state.recommendedLevelId);
  dom.mapCurrentLevelLabel.textContent = recommendedLevel.title;
  dom.mapCompletedCount.textContent = `${state.completedLevels.length} / ${levelCatalog.length}`;
  dom.mapCurrentTheme.textContent = recommendedLevel.theme;
  dom.mapCurrentDescription.textContent = recommendedLevel.description;
  dom.btnStartCurrentLevel.textContent = `进入${recommendedLevel.title}`;

  dom.levelNodes.forEach((node) => {
    const levelId = clampLevelId(node.dataset.levelId);
    node.classList.toggle("is-completed", state.completedLevels.includes(levelId));
    node.classList.toggle("is-recommended", state.recommendedLevelId === levelId);
    node.classList.toggle("is-selected", state.currentLevelId === levelId);
  });
}

init();
