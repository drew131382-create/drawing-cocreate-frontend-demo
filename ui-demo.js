(() => {
const demoData = window.DrawingDemoData;
const {
  levelCatalog,
  getLevelById: lookupLevelById,
  clampLevelId: clampLevelIdFromData,
  loadJourneyState,
  saveJourneyState,
} = demoData;

const MIN_POINT_DISTANCE = 1.5;

const journeyState = loadJourneyState();
const requestedLevelId = new URLSearchParams(window.location.search).get("level");
const initialLevelId = clampLevelIdFromData(
  requestedLevelId || journeyState.currentLevelId || journeyState.recommendedLevelId,
);
const initialLevel = lookupLevelById(initialLevelId);

const state = {
  currentLevelId: initialLevelId,
  recommendedLevelId: journeyState.recommendedLevelId,
  completedLevels: journeyState.completedLevels.slice(),
  activeModel: initialLevel.title,
  temperature: 0.25,
  aiStrokeCount: 3,
  smoothingLevel: 2,
  strokes: [],
  currentStroke: null,
  isDrawing: false,
  pointerId: null,
  showLevelModal: false,
  statusMessage: `已经进入${initialLevel.title}，从黑色的人工作画开始吧，手指和 Apple Pencil 都能直接画。`,
  lastAction: "进入关卡",
};

const dom = {
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
  inputTemperature: document.getElementById("inputTemperature"),
  valueTemperature: document.getElementById("valueTemperature"),
  inputAIStrokeCount: document.getElementById("inputAIStrokeCount"),
  valueAIStrokeCount: document.getElementById("valueAIStrokeCount"),
  inputSmoothingLevel: document.getElementById("inputSmoothingLevel"),
  valueSmoothingLevel: document.getElementById("valueSmoothingLevel"),
  textBoardLevel: document.getElementById("textBoardLevel"),
  textCurrentTheme: document.getElementById("textCurrentTheme"),
  textBoardNoteDescription: document.getElementById("textBoardNoteDescription"),
  textLastAction: document.getElementById("textLastAction"),
  textStatusMessage: document.getElementById("textStatusMessage"),
  sketch: document.getElementById("sketch"),
  canvas: document.getElementById("drawCanvas"),
  roleSticker: document.getElementById("roleSticker"),
  btnFinish: document.getElementById("btnFinish"),
  levelModal: document.getElementById("levelModal"),
  btnCloseModal: document.getElementById("btnCloseModal"),
  btnNextLevel: document.getElementById("btnNextLevel"),
};

const ctx = dom.canvas.getContext("2d");
const supportsPointerInput = "PointerEvent" in window;

function init() {
  buildModelOptions();
  bindControls();
  syncTemperatureControls();
  syncAIStrokeControls();
  syncSmoothingControls();
  syncLevelSelection();
  syncJourneyState();
  resizeCanvas();
  render();
  updateStatusUI();
  window.addEventListener("resize", resizeCanvas);
}

function buildModelOptions() {
  dom.selectModels.innerHTML = levelCatalog
    .map((level) => `<option value="${level.title}">${level.title}</option>`)
    .join("");
  dom.selectModels.value = state.activeModel;
}

function bindControls() {
  dom.selectModels.addEventListener("change", () => {
    state.activeModel = getCurrentLevel().title;
    dom.selectModels.value = state.activeModel;
    updateStatusUI();
    setStatus(`当前主题保持为“${state.activeModel}”，和所选关卡一致。`, "关卡主题");
  });

  dom.btnRandom.addEventListener("click", () => {
    state.activeModel = getCurrentLevel().title;
    dom.selectModels.value = state.activeModel;
    updateStatusUI();
    setStatus(`当前主题固定为“${state.activeModel}”，和你进入的关卡保持一致。`, "关卡主题");
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
    setStatus("已撤回最后一笔，可以继续用手指作画。", "撤回成功");
  });

  dom.btnExport.addEventListener("click", exportDrawing);
  dom.btnFinish.addEventListener("click", openLevelModal);
  dom.btnCloseModal.addEventListener("click", closeLevelModal);
  dom.btnNextLevel.addEventListener("click", completeLevelAndReturnToMap);
  dom.btnBackToMap.addEventListener("click", returnToMap);

  dom.levelModal.addEventListener("click", (event) => {
    if (event.target instanceof HTMLElement && event.target.dataset.closeModal === "true") {
      closeLevelModal();
    }
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

  if (!supportsPointerInput) {
    setStatus("当前浏览器太旧，无法开启统一触控作画，请换用新版浏览器。", "浏览器不兼容");
    return;
  }

  dom.canvas.addEventListener("pointerdown", handlePointerDown, { passive: false });
  window.addEventListener("pointermove", handlePointerMove, { passive: false });
  window.addEventListener("pointerup", handlePointerUp, { passive: false });
  window.addEventListener("pointercancel", handlePointerUp, { passive: false });
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
  if (state.showLevelModal || state.isDrawing || !event.isPrimary) {
    return;
  }

  if (event.pointerType === "mouse" && event.button !== 0) {
    return;
  }

  event.preventDefault();
  if (!startStroke(event.clientX, event.clientY, event.pointerId)) {
    return;
  }
  try {
    dom.canvas.setPointerCapture?.(event.pointerId);
  } catch (error) {
    // Synthetic pointer events used in automation do not create an active pointer capture target.
  }
}

function handlePointerMove(event) {
  if (!state.isDrawing || state.pointerId !== event.pointerId || !event.isPrimary) {
    return;
  }

  event.preventDefault();
  moveStroke(event.clientX, event.clientY);
}

function handlePointerUp(event) {
  if (!state.isDrawing || state.pointerId !== event.pointerId || !event.isPrimary) {
    return;
  }

  event.preventDefault();
  finishStroke();
}

function startStroke(clientX, clientY, pointerId) {
  const point = getCanvasPoint(clientX, clientY);
  if (!point) {
    return false;
  }

  const strokeIndex = state.strokes.length + 1;
  const strokeRole = getRoleForStrokeIndex(strokeIndex);

  state.isDrawing = true;
  state.pointerId = pointerId;
  state.currentStroke = {
    id: `stroke-${Date.now()}`,
    index: strokeIndex,
    role: strokeRole,
    color: getColorForRole(strokeRole),
    points: [point],
  };

  render();
  setStatus(`正在绘制第 ${strokeIndex} 笔，当前是${getCurrentRoleLabel()}。`, "正在绘制");
  return true;
}

function moveStroke(clientX, clientY) {
  const point = getCanvasPoint(clientX, clientY);
  if (!point || !state.currentStroke) {
    return;
  }

  const previous = state.currentStroke.points[state.currentStroke.points.length - 1];
  if (distance(previous, point) < MIN_POINT_DISTANCE) {
    return;
  }

  state.currentStroke.points.push(point);
  render();
}

function finishStroke() {
  if (state.currentStroke && state.currentStroke.points.length > 0) {
    state.strokes.push({ ...state.currentStroke, points: state.currentStroke.points.slice() });
  }

  state.currentStroke = null;
  state.isDrawing = false;
  state.pointerId = null;
  render();
  setStatus(`第 ${state.strokes.length} 笔已经保存，下一笔轮到${getCurrentRoleLabel()}。`, "笔画已保存");
}

function getCanvasPoint(clientX, clientY) {
  const rect = dom.canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) {
    return null;
  }

  return [
    clamp(clientX - rect.left, 0, rect.width),
    clamp(clientY - rect.top, 0, rect.height),
  ];
}

function render() {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, dom.canvas.width, dom.canvas.height);
  ctx.restore();

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
  ctx.fillStyle = color;
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (smoothed.length === 1) {
    ctx.beginPath();
    ctx.arc(smoothed[0][0], smoothed[0][1], ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

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
    currentView: "level-page",
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
  state.activeModel = getCurrentLevel().title;
  dom.selectModels.value = state.activeModel;
}

function syncJourneyState() {
  saveJourneyState({
    currentLevelId: state.currentLevelId,
    recommendedLevelId: state.recommendedLevelId,
    completedLevels: state.completedLevels,
  });
}

function setStatus(message, lastAction) {
  state.statusMessage = message;
  state.lastAction = lastAction;
  updateStatusUI();
}

function updateStatusUI() {
  const currentLevel = getCurrentLevel();
  state.activeModel = currentLevel.title;
  dom.selectModels.value = currentLevel.title;
  dom.textBoardLevel.textContent = currentLevel.title;
  dom.textCurrentTheme.textContent = currentLevel.title;
  dom.textBoardNoteDescription.textContent = currentLevel.description;
  dom.textLastAction.textContent = state.lastAction;
  dom.textStatusMessage.textContent = state.statusMessage;
  dom.roleSticker.textContent = getCurrentRoleLabel();
  dom.roleSticker.classList.toggle("role-human", getCurrentRole() === "human");
  dom.roleSticker.classList.toggle("role-ai", getCurrentRole() === "ai");
  dom.levelModal.hidden = !state.showLevelModal;
  dom.btnUndoUser.disabled = state.strokes.length === 0;
}

function returnToMap() {
  syncJourneyState();
  window.location.href = "./index.html";
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
  syncJourneyState();
  clearCanvasState();
  window.location.href = "./index.html";
}

function getCurrentLevel() {
  return lookupLevelById(state.currentLevelId);
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

window.DrawingDemoDebug = {
  getStrokes() {
    return state.strokes.map((stroke) => ({
      index: stroke.index,
      role: stroke.role,
      color: stroke.color,
      points: stroke.points.slice(),
    }));
  },
};

init();
})();
