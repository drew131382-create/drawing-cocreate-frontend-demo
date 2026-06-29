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

const state = {
  view: "map",
  currentLevelId: 1,
  recommendedLevelId: 1,
  completedLevels: [],
  activeModel: levelCatalog[0].theme,
  temperature: 0.25,
  aiStrokeCount: 3,
  smoothingLevel: 2,
  strokes: [],
  currentStroke: null,
  isDrawing: false,
  pointerId: null,
  showLevelModal: false,
  statusMessage: "先在地图上选一关，我们再一起开始画。",
  lastAction: "准备好了",
};

const dom = {
  mapScreen: document.getElementById("mapScreen"),
  levelScreen: document.getElementById("levelScreen"),
  selectModels: document.getElementById("selectModels"),
  btnRandom: document.getElementById("btnRandom"),
  btnClear: document.getElementById("btnClear"),
  btnExport: document.getElementById("btnExport"),
  btnGenerateAI: document.getElementById("btnGenerateAI"),
  btnGenerateFullAI: document.getElementById("btnGenerateFullAI"),
  btnKeepAI: document.getElementById("btnKeepAI"),
  btnRetryAI: document.getElementById("btnRetryAI"),
  btnUndoAI: document.getElementById("btnUndoAI"),
  btnUndoUser: document.getElementById("btnUndoUser"),
  btnBackToMap: document.getElementById("btnBackToMap"),
  btnStartCurrentLevel: document.getElementById("btnStartCurrentLevel"),
  inputTemperature: document.getElementById("inputTemperature"),
  valueTemperature: document.getElementById("valueTemperature"),
  inputAIStrokeCount: document.getElementById("inputAIStrokeCount"),
  valueAIStrokeCount: document.getElementById("valueAIStrokeCount"),
  inputSmoothingLevel: document.getElementById("inputSmoothingLevel"),
  valueSmoothingLevel: document.getElementById("valueSmoothingLevel"),
  textBoardLevel: document.getElementById("textBoardLevel"),
  textCurrentTheme: document.getElementById("textCurrentTheme"),
  textBoardNoteTitle: document.getElementById("textBoardNoteTitle"),
  textBoardNoteDescription: document.getElementById("textBoardNoteDescription"),
  textLastAction: document.getElementById("textLastAction"),
  textStatusMessage: document.getElementById("textStatusMessage"),
  mapCurrentLevelLabel: document.getElementById("mapCurrentLevelLabel"),
  mapCompletedCount: document.getElementById("mapCompletedCount"),
  mapCurrentTheme: document.getElementById("mapCurrentTheme"),
  mapCurrentDescription: document.getElementById("mapCurrentDescription"),
  sketch: document.getElementById("sketch"),
  canvas: document.getElementById("drawCanvas"),
  roleSticker: document.getElementById("roleSticker"),
  btnFinish: document.getElementById("btnFinish"),
  levelModal: document.getElementById("levelModal"),
  btnCloseModal: document.getElementById("btnCloseModal"),
  btnNextLevel: document.getElementById("btnNextLevel"),
  levelNodes: Array.from(document.querySelectorAll(".level-node")),
};

const ctx = dom.canvas.getContext("2d");

function init() {
  buildModelOptions();
  bindControls();
  syncTemperatureControls();
  syncAIStrokeControls();
  syncSmoothingControls();
  syncLevelSelection();
  resizeCanvas();
  render();
  updateStatusUI();
  window.addEventListener("resize", resizeCanvas);
}

function buildModelOptions() {
  dom.selectModels.innerHTML = levelCatalog
    .map((level) => `<option value="${level.theme}">${level.theme}</option>`)
    .join("");
  dom.selectModels.value = state.activeModel;
}

function bindControls() {
  dom.selectModels.addEventListener("change", () => {
    state.activeModel = dom.selectModels.value;
    setStatus(`已经切换到“${state.activeModel}”主题。`, "主题已切换");
  });

  dom.btnRandom.addEventListener("click", () => {
    const nextLevel = levelCatalog[Math.floor(Math.random() * levelCatalog.length)];
    state.activeModel = nextLevel.theme;
    dom.selectModels.value = nextLevel.theme;
    setStatus(`帮你随机换到了“${nextLevel.theme}”主题。`, "随机主题");
  });

  dom.btnClear.addEventListener("click", () => {
    clearCanvasState();
    setStatus("画布已经清空，可以重新开始。", "画布已清空");
  });

  dom.btnUndoUser.addEventListener("click", () => {
    if (state.strokes.length === 0) {
      setStatus("现在还没有可撤回的笔画。", "没有可撤回内容");
      return;
    }
    state.strokes.pop();
    render();
    setStatus(`已撤回最后一笔，现在轮到${getCurrentRoleLabel()}。`, "撤回成功");
  });

  dom.btnExport.addEventListener("click", exportDrawing);
  dom.btnFinish.addEventListener("click", openLevelModal);
  dom.btnCloseModal.addEventListener("click", closeLevelModal);
  dom.btnNextLevel.addEventListener("click", completeLevelAndReturnToMap);
  dom.btnBackToMap.addEventListener("click", returnToMap);
  dom.btnStartCurrentLevel.addEventListener("click", () => enterLevel(state.recommendedLevelId));

  dom.levelModal.addEventListener("click", (event) => {
    if (event.target instanceof HTMLElement && event.target.dataset.closeModal === "true") {
      closeLevelModal();
    }
  });

  dom.levelNodes.forEach((node) => {
    node.addEventListener("click", () => {
      const id = Number(node.dataset.levelId);
      enterLevel(id);
    });
  });

  [
    dom.btnGenerateAI,
    dom.btnGenerateFullAI,
    dom.btnKeepAI,
    dom.btnRetryAI,
    dom.btnUndoAI,
  ].forEach((button) => {
    button.addEventListener("click", () => {
      setStatus("当前版本只保留前端界面，AI 与模型功能未接入。", "界面演示中");
    });
  });

  bindSliderPair(dom.inputTemperature, dom.valueTemperature, (value) => {
    state.temperature = clamp(roundTo(Number(value), 2), 0, 1);
    syncTemperatureControls();
    setStatus(`创意程度已调整到 ${state.temperature.toFixed(2)}。`, "调节已更新");
  });

  bindSliderPair(dom.inputAIStrokeCount, dom.valueAIStrokeCount, (value) => {
    state.aiStrokeCount = clamp(parseInt(value, 10) || 3, 1, 5);
    syncAIStrokeControls();
    render();
    setStatus(`每轮笔数已调整到 ${state.aiStrokeCount}，现在轮到${getCurrentRoleLabel()}。`, "调节已更新");
  });

  bindSliderPair(dom.inputSmoothingLevel, dom.valueSmoothingLevel, (value) => {
    state.smoothingLevel = clamp(parseInt(value, 10) || 2, 0, 4);
    render();
    syncSmoothingControls();
    setStatus(`线条圆滑度已调整到 ${state.smoothingLevel}。`, "调节已更新");
  });

  dom.canvas.addEventListener("pointerdown", handlePointerDown);
  dom.canvas.addEventListener("pointermove", handlePointerMove);
  dom.canvas.addEventListener("pointerup", handlePointerUp);
  dom.canvas.addEventListener("pointerleave", handlePointerUp);
  dom.canvas.addEventListener("pointercancel", handlePointerUp);
}

function bindSliderPair(slider, input, onChange) {
  slider.addEventListener("input", () => onChange(slider.value));
  input.addEventListener("change", () => onChange(input.value));
  input.addEventListener("blur", () => onChange(input.value));
}

function resizeCanvas() {
  const ratio = window.devicePixelRatio || 1;
  const rect = dom.sketch.getBoundingClientRect();
  dom.canvas.width = Math.max(1, Math.floor(rect.width * ratio));
  dom.canvas.height = Math.max(1, Math.floor(rect.height * ratio));
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  render();
}

function handlePointerDown(event) {
  if (state.view !== "level" || state.showLevelModal) {
    return;
  }

  event.preventDefault();
  const point = getCanvasPoint(event);
  if (!point) {
    return;
  }

  state.isDrawing = true;
  state.pointerId = event.pointerId;
  state.currentStroke = {
    id: `stroke-${Date.now()}`,
    index: state.strokes.length + 1,
    role: getRoleForStrokeIndex(state.strokes.length + 1),
    color: getColorForRole(getRoleForStrokeIndex(state.strokes.length + 1)),
    points: [point],
  };

  dom.canvas.setPointerCapture?.(event.pointerId);
  setStatus(`正在绘制第 ${state.strokes.length + 1} 笔，当前是${getCurrentRoleLabel()}。`, "正在绘制");
}

function handlePointerMove(event) {
  if (!state.isDrawing || state.pointerId !== event.pointerId) {
    return;
  }

  event.preventDefault();
  const point = getCanvasPoint(event);
  if (!point) {
    return;
  }

  const previous = state.currentStroke.points[state.currentStroke.points.length - 1];
  if (distance(previous, point) < 1.5) {
    return;
  }

  state.currentStroke.points.push(point);
  render();
}

function handlePointerUp(event) {
  if (!state.isDrawing || state.pointerId !== event.pointerId) {
    return;
  }

  event.preventDefault();
  if (state.currentStroke && state.currentStroke.points.length > 0) {
    state.strokes.push({...state.currentStroke, points: state.currentStroke.points.slice()});
  }

  state.currentStroke = null;
  state.isDrawing = false;
  state.pointerId = null;
  render();
  setStatus(`第 ${state.strokes.length} 笔已经保存，下一笔轮到${getCurrentRoleLabel()}。`, "笔画已保存");
}

function getCanvasPoint(event) {
  const rect = dom.canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) {
    return null;
  }
  return [event.clientX - rect.left, event.clientY - rect.top];
}

function render() {
  const width = dom.canvas.clientWidth;
  const height = dom.canvas.clientHeight;
  ctx.clearRect(0, 0, width, height);

  state.strokes.forEach((stroke) => drawStroke(stroke.points, stroke.color));
  if (state.currentStroke) {
    drawStroke(state.currentStroke.points, state.currentStroke.color);
  }

  updateStatusUI();
}

function drawStroke(points, color) {
  if (!points || points.length === 0) {
    return;
  }

  const smoothed = smoothPoints(points, state.smoothingLevel);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(smoothed[0][0], smoothed[0][1]);
  for (let index = 1; index < smoothed.length; index += 1) {
    ctx.lineTo(smoothed[index][0], smoothed[index][1]);
  }
  ctx.stroke();
  ctx.restore();
}

function smoothPoints(points, level) {
  if (points.length <= 2 || level <= 0) {
    return points;
  }

  const radius = Math.min(4, Math.max(1, level));
  return points.map((point, index) => {
    if (index === 0 || index === points.length - 1) {
      return point;
    }

    let totalX = 0;
    let totalY = 0;
    let count = 0;
    for (let offset = -radius; offset <= radius; offset += 1) {
      const neighbor = points[index + offset];
      if (!neighbor) {
        continue;
      }
      totalX += neighbor[0];
      totalY += neighbor[1];
      count += 1;
    }
    return [totalX / count, totalY / count];
  });
}

function exportDrawing() {
  const level = getCurrentLevel();
  const snapshot = {
    exportedAt: new Date().toISOString(),
    currentView: state.view,
    currentLevelId: state.currentLevelId,
    currentLevelTheme: level.theme,
    completedLevels: state.completedLevels.slice(),
    modelName: state.activeModel,
    temperature: state.temperature,
    strokesPerTurn: state.aiStrokeCount,
    smoothingLevel: state.smoothingLevel,
    currentRole: getCurrentRole(),
    strokes: state.strokes.map((stroke) => ({
      index: stroke.index,
      role: stroke.role,
      color: stroke.color,
      points: stroke.points,
    })),
    mode: "video-prototype-demo",
  };

  const jsonBlob = new Blob([JSON.stringify(snapshot, null, 2)], {
    type: "application/json",
  });
  downloadBlob(jsonBlob, "drawing-demo-session.json");

  dom.canvas.toBlob((blob) => {
    if (blob) {
      downloadBlob(blob, "drawing-demo-canvas.png");
    }
  });

  setStatus("已导出当前画布 PNG 和操作记录 JSON。", "导出完成");
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function syncTemperatureControls() {
  dom.inputTemperature.value = String(state.temperature);
  dom.valueTemperature.value = state.temperature.toFixed(2);
}

function syncAIStrokeControls() {
  dom.inputAIStrokeCount.value = String(state.aiStrokeCount);
  dom.valueAIStrokeCount.value = String(state.aiStrokeCount);
}

function syncSmoothingControls() {
  dom.inputSmoothingLevel.value = String(state.smoothingLevel);
  dom.valueSmoothingLevel.value = String(state.smoothingLevel);
}

function syncLevelSelection() {
  const level = getCurrentLevel();
  state.activeModel = level.theme;
  dom.selectModels.value = level.theme;
}

function setStatus(message, lastAction) {
  state.statusMessage = message;
  state.lastAction = lastAction;
  updateStatusUI();
}

function updateStatusUI() {
  const currentLevel = getCurrentLevel();
  const recommendedLevel = getRecommendedLevel();
  const completedCount = state.completedLevels.length;

  dom.mapScreen.hidden = state.view !== "map";
  dom.levelScreen.hidden = state.view !== "level";
  dom.textBoardLevel.textContent = `${currentLevel.title}`;
  dom.textCurrentTheme.textContent = currentLevel.theme;
  dom.textBoardNoteDescription.textContent = currentLevel.description;
  dom.textLastAction.textContent = state.lastAction;
  dom.textStatusMessage.textContent = state.statusMessage;
  dom.roleSticker.textContent = getCurrentRoleLabel();
  dom.roleSticker.classList.toggle("role-human", getCurrentRole() === "human");
  dom.roleSticker.classList.toggle("role-ai", getCurrentRole() === "ai");
  dom.levelModal.hidden = !state.showLevelModal;
  dom.btnUndoUser.disabled = state.strokes.length === 0;

  dom.mapCurrentLevelLabel.textContent = `${recommendedLevel.title}`;
  dom.mapCompletedCount.textContent = `${completedCount} / ${levelCatalog.length}`;
  dom.mapCurrentTheme.textContent = recommendedLevel.theme;
  dom.mapCurrentDescription.textContent = recommendedLevel.description;
  dom.btnStartCurrentLevel.textContent = `进入${recommendedLevel.title}`;

  dom.levelNodes.forEach((node) => {
    const levelId = Number(node.dataset.levelId);
    const isCompleted = state.completedLevels.includes(levelId);
    const isRecommended = state.recommendedLevelId === levelId;
    const isSelected = state.currentLevelId === levelId;

    node.classList.toggle("is-completed", isCompleted);
    node.classList.toggle("is-recommended", isRecommended);
    node.classList.toggle("is-selected", isSelected);
  });
}

function enterLevel(levelId) {
  state.currentLevelId = levelId;
  state.view = "level";
  state.showLevelModal = false;
  syncLevelSelection();
  clearCanvasState();
  setStatus(`已经进入${getCurrentLevel().title}，从黑色的人工作画开始吧。`, "进入关卡");
}

function returnToMap() {
  state.view = "map";
  state.showLevelModal = false;
  updateStatusUI();
  setStatus("已经回到地图，可以继续选关冒险。", "返回地图");
}

function completeLevelAndReturnToMap() {
  if (!state.completedLevels.includes(state.currentLevelId)) {
    state.completedLevels.push(state.currentLevelId);
    state.completedLevels.sort((a, b) => a - b);
  }

  state.recommendedLevelId = state.currentLevelId < levelCatalog.length
    ? state.currentLevelId + 1
    : levelCatalog.length;

  state.showLevelModal = false;
  clearCanvasState();
  state.view = "map";
  updateStatusUI();
  setStatus(`${getCurrentLevel().title} 已完成，回到地图继续冒险吧。`, "闯关成功");
}

function getCurrentLevel() {
  return levelCatalog.find((level) => level.id === state.currentLevelId) || levelCatalog[0];
}

function getRecommendedLevel() {
  return levelCatalog.find((level) => level.id === state.recommendedLevelId) || levelCatalog[0];
}

function getCurrentRole() {
  return getRoleForStrokeIndex(state.strokes.length + 1);
}

function getCurrentRoleLabel() {
  return getCurrentRole() === "human" ? "人工作画" : "AI 作画";
}

function getRoleForStrokeIndex(strokeIndex) {
  const blockSize = clamp(state.aiStrokeCount, 1, 5);
  const cycleSize = blockSize * 2;
  const cycleIndex = (strokeIndex - 1) % cycleSize;
  return cycleIndex < blockSize ? "human" : "ai";
}

function getColorForRole(role) {
  return role === "human" ? "#171717" : "#3972ff";
}

function clearCanvasState() {
  state.strokes = [];
  state.currentStroke = null;
  state.isDrawing = false;
  state.pointerId = null;
  render();
}

function openLevelModal() {
  state.showLevelModal = true;
  updateStatusUI();
  setStatus("这张画纸已经完成啦，回到地图继续冒险吧。", "等待回到地图");
}

function closeLevelModal() {
  state.showLevelModal = false;
  updateStatusUI();
  setStatus("继续看看这一关的画面吧。", "继续预览");
}

function distance(a, b) {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return Math.sqrt(dx * dx + dy * dy);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function roundTo(value, digits) {
  const base = 10 ** digits;
  return Math.round(value * base) / base;
}

init();
