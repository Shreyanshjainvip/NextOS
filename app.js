const WALLPAPERS = [
  {
    id: "aurora",
    name: "NextOS Aurora",
    desktop: "radial-gradient(circle at 18% 18%, rgba(82, 215, 200, 0.34), transparent 24%), radial-gradient(circle at 82% 78%, rgba(255, 183, 77, 0.22), transparent 22%), linear-gradient(160deg, #0d2a55, #102019)",
    glowLeft: "#57e4bc",
    glowRight: "#ff9e6d"
  },
  {
    id: "sunset",
    name: "NextOS Sunset",
    desktop: "radial-gradient(circle at 25% 18%, rgba(255, 222, 153, 0.22), transparent 28%), radial-gradient(circle at 80% 76%, rgba(255, 124, 94, 0.24), transparent 24%), linear-gradient(160deg, #58223a, #102c45)",
    glowLeft: "#f8b86d",
    glowRight: "#ff7c5e"
  },
  {
    id: "forest",
    name: "NextOS Forest",
    desktop: "radial-gradient(circle at 15% 22%, rgba(109, 223, 166, 0.22), transparent 25%), radial-gradient(circle at 80% 74%, rgba(111, 196, 255, 0.2), transparent 20%), linear-gradient(160deg, #11352d, #0d1f35)",
    glowLeft: "#6ddfa6",
    glowRight: "#6fc4ff"
  },
  {
    id: "gallery",
    name: "Gallery Wallpaper",
    desktop: "",
    glowLeft: "#8fd1ff",
    glowRight: "#ffd48f"
  }
];

const THEMES = {
  glass: {
    name: "Glass",
    vars: {
      "--text": "#f4f7fb",
      "--muted": "rgba(244, 247, 251, 0.72)",
      "--panel": "rgba(8, 15, 31, 0.6)",
      "--accent": "#52d7c8"
    }
  },
  graphite: {
    name: "Graphite",
    vars: {
      "--text": "#eef1f6",
      "--muted": "rgba(238, 241, 246, 0.7)",
      "--panel": "rgba(17, 19, 24, 0.72)",
      "--accent": "#8fa2c7"
    }
  },
  daylight: {
    name: "Daylight",
    vars: {
      "--text": "#17243c",
      "--muted": "rgba(23, 36, 60, 0.68)",
      "--panel": "rgba(255, 255, 255, 0.58)",
      "--accent": "#2c8cff"
    }
  }
};

const DEFAULT_PREFERENCES = {
  wallpaperId: "aurora",
  customWallpaper: "",
  theme: "glass",
  dockMode: "dock",
  dockLabels: true,
  dockScale: 1,
  menuBarTransparent: true,
  desktopIcons: true,
  reduceMotion: false,
  accentColor: "#52d7c8",
  showSeconds: false
};

const DEFAULT_NOTE_CONTENT = "Type ideas here.\n\nNextOS stores your notes locally in this browser.";

const state = {
  zIndex: 10,
  activeWindowId: null,
  openWindows: new Map(),
  fileSystem: loadFileSystem(),
  calculator: {
    expression: "",
    current: "0",
    previous: ""
  },
  browser: {
    currentUrl: "https://example.com"
  },
  camera: {
    stream: null,
    snapshots: []
  },
  cards: createSolitaireState(),
  preferences: loadPreferences(),
  settingsView: "appearance",
  editor: {
    fileId: null
  }
};

const appRegistry = {
  finder: { id: "finder", name: "Finder", icon: "🗂", width: 1080, height: 680, singleton: true, render: renderFinder },
  browser: { id: "browser", name: "Explorer", icon: "🌐", width: 980, height: 680, singleton: true, render: renderBrowser },
  calculator: { id: "calculator", name: "Calculator", icon: "🧮", width: 360, height: 560, singleton: true, render: renderCalculator },
  clock: { id: "clock", name: "Time", icon: "🕒", width: 720, height: 480, singleton: true, render: renderClock },
  camera: { id: "camera", name: "Camera", icon: "📷", width: 900, height: 620, singleton: true, render: renderCamera },
  cards: { id: "cards", name: "Cards", icon: "🂡", width: 980, height: 690, singleton: true, render: renderCards },
  settings: { id: "settings", name: "Settings", icon: "⚙️", width: 920, height: 650, singleton: true, render: renderSettings },
  notes: { id: "notes", name: "Notes", icon: "📝", width: 760, height: 560, singleton: true, render: renderNotes },
  bin: { id: "bin", name: "Bin", icon: "🗑", width: 700, height: 480, singleton: true, render: renderBin }
};

const desktopApps = ["finder", "browser", "calculator", "clock", "camera", "cards", "settings", "bin"];
const rootFolderIds = ["desktop", "documents", "downloads", "pictures"];
const desktop = document.getElementById("desktop");
const desktopIcons = document.getElementById("desktopIcons");
const windowLayer = document.getElementById("windowLayer");
const dock = document.getElementById("dock");
const windowTemplate = document.getElementById("windowTemplate");
const activeAppLabel = document.getElementById("activeAppLabel");
const dateTimeLabel = document.getElementById("dateTimeLabel");
const statusMessage = document.getElementById("statusMessage");
const brandLabel = document.getElementById("brandLabel");
const glowLeft = document.querySelector(".wallpaper-glow-left");
const glowRight = document.querySelector(".wallpaper-glow-right");
const wallpaperPicker = document.getElementById("wallpaperPicker");

initDesktop();
applyPreferences();
startClockTicker();
bindGlobalEvents();
openApp("finder");

function initDesktop() {
  desktopIcons.innerHTML = "";
  dock.innerHTML = "";
  brandLabel.textContent = "NextOS";

  desktopApps.forEach((appId) => {
    const app = appRegistry[appId];
    const icon = document.createElement("button");
    icon.className = "desktop-icon";
    icon.innerHTML = `<span class="desktop-icon__glyph">${app.icon}</span><span class="desktop-icon__label">${app.name}</span>`;
    icon.addEventListener("dblclick", () => openApp(appId));
    desktopIcons.appendChild(icon);

    const dockButton = document.createElement("button");
    dockButton.className = "dock-button";
    dockButton.dataset.appId = appId;
    dockButton.innerHTML = `
      <span class="dock-button__icon">${app.icon}</span>
      <span class="dock-button__label">${app.name}</span>
      <span class="dock-button__indicator"></span>
    `;
    dockButton.addEventListener("click", () => openApp(appId));
    dock.appendChild(dockButton);
  });
}

function bindGlobalEvents() {
  document.getElementById("missionControlButton").addEventListener("click", () => {
    state.openWindows.forEach(({ element }) => {
      element.classList.toggle("is-minimized");
      element.style.display = element.classList.contains("is-minimized") ? "none" : "block";
    });
  });

  window.addEventListener("pointerdown", (event) => {
    const win = event.target.closest(".window");
    if (win) focusWindow(win.dataset.windowId);
  });

  wallpaperPicker.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    state.preferences.customWallpaper = dataUrl;
    state.preferences.wallpaperId = "gallery";
    savePreferences();
    applyPreferences();
    renderOpenAppBodies("settings");
    statusMessage.textContent = "NextOS";
    wallpaperPicker.value = "";
  });
}

function startClockTicker() {
  const update = () => {
    const now = new Date();
    dateTimeLabel.textContent = "";
    renderOpenAppBodies("clock");
  };
  update();
  setInterval(update, 1000);
}

function openApp(appId) {
  const app = appRegistry[appId];
  if (!app) return;

  const existing = [...state.openWindows.values()].find((entry) => entry.appId === appId);
  if (existing && app.singleton) {
    existing.element.style.display = "block";
    existing.element.classList.remove("is-minimized");
    focusWindow(existing.id);
    renderOpenAppBodies(appId);
    return;
  }

  const id = `${appId}-${Date.now()}`;
  const fragment = windowTemplate.content.cloneNode(true);
  const win = fragment.querySelector(".window");
  const title = fragment.querySelector(".window__title");
  const body = fragment.querySelector(".window__body");

  win.dataset.windowId = id;
  win.style.width = `${app.width}px`;
  win.style.height = `${app.height}px`;
  win.style.left = `${120 + state.openWindows.size * 28}px`;
  win.style.top = `${60 + state.openWindows.size * 24}px`;
  title.textContent = app.name;
  body.dataset.appId = appId;

  wireWindowControls(win, id);
  windowLayer.appendChild(fragment);

  const element = windowLayer.querySelector(`[data-window-id="${id}"]`);
  const entry = { id, appId, element };
  state.openWindows.set(id, entry);
  focusWindow(id);
  app.render(element.querySelector(".window__body"), entry);
  updateDockIndicators();
}

function wireWindowControls(windowEl, id) {
  const header = windowEl.querySelector(".window__header");
  const resizeHandle = windowEl.querySelector(".window__resize-handle");

  windowEl.querySelectorAll(".traffic").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const action = button.dataset.action;
      if (action === "close") closeWindow(id);
      if (action === "minimize") minimizeWindow(id);
      if (action === "maximize") toggleMaximize(id);
    });
  });

  header.addEventListener("pointerdown", (event) => startDrag(event, windowEl));
  resizeHandle.addEventListener("pointerdown", (event) => startResize(event, windowEl));
}

function focusWindow(id) {
  const entry = state.openWindows.get(id);
  if (!entry) return;
  state.zIndex += 1;
  entry.element.style.zIndex = state.zIndex;
  state.activeWindowId = id;
  activeAppLabel.textContent = appRegistry[entry.appId].name;
  updateDockIndicators();
}

function closeWindow(id) {
  const entry = state.openWindows.get(id);
  if (!entry) return;
  if (entry.appId === "camera") stopCameraStream();
  entry.element.remove();
  state.openWindows.delete(id);
  updateDockIndicators();
  const top = getTopWindow();
  activeAppLabel.textContent = top ? appRegistry[top.appId].name : "Desktop";
}

function minimizeWindow(id) {
  const entry = state.openWindows.get(id);
  if (!entry) return;
  entry.element.classList.add("is-minimized");
  entry.element.style.display = "none";
  updateDockIndicators();
}

function toggleMaximize(id) {
  const entry = state.openWindows.get(id);
  if (!entry) return;
  entry.element.classList.toggle("is-maximized");
}

function startDrag(event, windowEl) {
  if (windowEl.classList.contains("is-maximized")) return;
  focusWindow(windowEl.dataset.windowId);

  const startX = event.clientX;
  const startY = event.clientY;
  const startLeft = parseFloat(windowEl.style.left);
  const startTop = parseFloat(windowEl.style.top);

  const move = (moveEvent) => {
    windowEl.style.left = `${Math.max(110, startLeft + moveEvent.clientX - startX)}px`;
    windowEl.style.top = `${Math.max(8, startTop + moveEvent.clientY - startY)}px`;
  };

  const up = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
  };

  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
}

function startResize(event, windowEl) {
  focusWindow(windowEl.dataset.windowId);
  const startX = event.clientX;
  const startY = event.clientY;
  const startWidth = windowEl.offsetWidth;
  const startHeight = windowEl.offsetHeight;

  const move = (moveEvent) => {
    windowEl.style.width = `${Math.max(320, startWidth + moveEvent.clientX - startX)}px`;
    windowEl.style.height = `${Math.max(240, startHeight + moveEvent.clientY - startY)}px`;
  };

  const up = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
  };

  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
}

function getTopWindow() {
  return [...state.openWindows.values()].sort((a, b) => Number(b.element.style.zIndex || 0) - Number(a.element.style.zIndex || 0))[0];
}

function renderOpenAppBodies(appId) {
  [...state.openWindows.values()]
    .filter((entry) => entry.appId === appId)
    .forEach((entry) => appRegistry[appId].render(entry.element.querySelector(".window__body"), entry));
}

function updateDockIndicators() {
  dock.querySelectorAll(".dock-button").forEach((button) => {
    const hasApp = [...state.openWindows.values()].some((entry) => entry.appId === button.dataset.appId);
    const isActive = state.activeWindowId && state.openWindows.get(state.activeWindowId)?.appId === button.dataset.appId;
    button.classList.toggle("is-open", hasApp);
    button.classList.toggle("is-active", isActive);
  });
}

function applyPreferences() {
  const prefs = state.preferences;
  const theme = THEMES[prefs.theme] || THEMES.glass;
  Object.entries(theme.vars).forEach(([key, value]) => document.documentElement.style.setProperty(key, value));
  document.documentElement.style.setProperty("--accent", prefs.accentColor);
  document.body.classList.toggle("theme-light", prefs.theme === "daylight");
  document.body.classList.toggle("reduce-motion", Boolean(prefs.reduceMotion));
  document.querySelector(".menu-bar").classList.toggle("menu-bar--solid", !prefs.menuBarTransparent);
  desktopIcons.classList.toggle("desktop-icons--hidden", !prefs.desktopIcons);
  dock.classList.toggle("dock--taskbar", prefs.dockMode === "taskbar");
  dock.classList.toggle("dock--compact", prefs.dockMode === "compact");
  dock.classList.toggle("dock--hide-labels", !prefs.dockLabels);
  desktop.classList.toggle("desktop--taskbar", prefs.dockMode !== "dock");
  document.documentElement.style.setProperty("--dock-scale", String(prefs.dockScale || 1));

  const wallpaper = WALLPAPERS.find((item) => item.id === prefs.wallpaperId) || WALLPAPERS[0];
  if (prefs.wallpaperId === "gallery" && prefs.customWallpaper) {
    document.body.style.background = `linear-gradient(rgba(8, 15, 31, 0.18), rgba(8, 15, 31, 0.18)), url("${prefs.customWallpaper}") center / cover no-repeat fixed`;
  } else {
    document.body.style.background = wallpaper.desktop;
  }
  glowLeft.style.background = wallpaper.glowLeft;
  glowRight.style.background = wallpaper.glowRight;
}

function renderFinder(container) {
  const currentFolder = getItemById(state.fileSystem.currentFolderId);
  const items = currentFolder?.children || [];
  const selected = items.find((item) => item.id === state.fileSystem.selectedId) || null;
  const pathItems = getPathToItem(state.fileSystem.currentFolderId);

  container.innerHTML = `
    <div class="split-layout">
      <aside class="sidebar" id="finderSidebar"></aside>
      <section class="stack-layout" style="flex:1">
        <div class="panel toolbar">
          <button class="action-button action-button--accent" id="newFolderButton">New Folder</button>
          <button class="action-button" id="newNoteButton">New Note</button>
          <button class="action-button" id="openItemButton" ${selected ? "" : "disabled"}>Open</button>
          <button class="action-button" id="deleteFileButton" ${selected ? "" : "disabled"}>Move to Bin</button>
          <span class="muted">${renderBreadcrumbs(pathItems)}</span>
        </div>
        <div class="split-layout" style="flex:1; min-height:0">
          <div class="content-grid" id="finderGrid"></div>
          <aside class="preview panel" id="finderPreview"></aside>
        </div>
      </section>
    </div>
  `;

  const sidebar = container.querySelector("#finderSidebar");
  rootFolderIds.forEach((folderId) => {
    const folder = getItemById(folderId);
    if (!folder) return;
    const button = document.createElement("button");
    button.textContent = folder.name;
    button.classList.toggle("is-active", folderId === currentFolder.id);
    button.addEventListener("click", () => {
      state.fileSystem.currentFolderId = folderId;
      state.fileSystem.selectedId = null;
      saveFileSystem();
      renderOpenAppBodies("finder");
    });
    sidebar.appendChild(button);
  });

  if (currentFolder.id !== "desktop") {
    const upButton = document.createElement("button");
    upButton.textContent = "Go Up";
    upButton.addEventListener("click", () => {
      const parent = findParentOfItem(currentFolder.id);
      if (!parent) return;
      state.fileSystem.currentFolderId = parent.id;
      state.fileSystem.selectedId = null;
      saveFileSystem();
      renderOpenAppBodies("finder");
    });
    sidebar.appendChild(upButton);
  }

  const grid = container.querySelector("#finderGrid");
  items.forEach((item) => {
    const card = document.createElement("button");
    card.className = `file-card ${item.id === state.fileSystem.selectedId ? "is-selected" : ""}`;
    card.innerHTML = `
      <div class="file-card__icon">${item.type === "folder" ? "📁" : item.type === "image" ? "🖼" : "📄"}</div>
      <div>${item.name}</div>
      <div class="file-meta">${item.type}</div>
    `;
    card.addEventListener("click", () => {
      state.fileSystem.selectedId = item.id;
      saveFileSystem();
      renderOpenAppBodies("finder");
    });
    card.addEventListener("dblclick", () => openFileSystemItem(item.id));
    grid.appendChild(card);
  });

  if (!items.length) {
    grid.innerHTML = `<div class="status-box">This folder is empty. Create a file or folder here.</div>`;
  }

  const preview = container.querySelector("#finderPreview");
  preview.innerHTML = selected ? renderFinderSelection(selected) : `<div class="status-box">Select an item to see its details. Notes only open when you click Open or double click the file.</div>`;

  container.querySelector("#newFolderButton").addEventListener("click", () => {
    const name = prompt("Folder name", "New Folder");
    if (!name) return;
    currentFolder.children.push(createFolder(name));
    saveFileSystem();
    renderAllFileApps();
  });

  container.querySelector("#newNoteButton").addEventListener("click", () => {
    const name = prompt("Note file name", "Quick Note.txt");
    if (!name) return;
    currentFolder.children.push(createTextFile(name));
    saveFileSystem();
    renderAllFileApps();
  });

  container.querySelector("#openItemButton").addEventListener("click", () => {
    if (!selected) return;
    openFileSystemItem(selected.id);
  });

  container.querySelector("#deleteFileButton").addEventListener("click", () => {
    if (!selected) return;
    moveItemToBin(selected.id);
  });
}

function renderFinderSelection(item) {
  const parent = findParentOfItem(item.id);
  const detailLines = [
    `<h3>${item.name}</h3>`,
    `<p class="muted">Type: ${item.type}</p>`,
    `<p class="muted">Location: ${parent ? parent.name : "Root"}</p>`
  ];
  if (item.type === "folder") {
    detailLines.push(`<div class="status-box">Contains ${item.children.length} item(s). Open it to browse inside.</div>`);
  } else if (item.type === "image" && item.content) {
    detailLines.push(`<img class="preview-image" src="${escapeAttribute(item.content)}" alt="${escapeAttribute(item.name)}">`);
  } else {
    detailLines.push(`<div class="status-box">This note is hidden until you open it.</div>`);
  }
  detailLines.push(`<button class="action-button action-button--accent" id="previewOpenButton">Open</button>`);
  return detailLines.join("");
}

function openFileSystemItem(itemId) {
  const item = getItemById(itemId);
  if (!item) return;
  if (item.type === "folder") {
    state.fileSystem.currentFolderId = item.id;
    state.fileSystem.selectedId = null;
    saveFileSystem();
    renderOpenAppBodies("finder");
    return;
  }
  if (item.type === "text") {
    state.editor.fileId = item.id;
    openApp("notes");
    return;
  }
  if (item.type === "image") {
    state.editor.fileId = item.id;
    openApp("notes");
  }
}

function renderNotes(container) {
  const item = getItemById(state.editor.fileId);
  if (!item) {
    container.innerHTML = `<div class="status-box">Open a note from Finder to edit it here.</div>`;
    return;
  }

  if (item.type === "image") {
    container.innerHTML = `
      <div class="stack-layout">
        <div class="panel toolbar">
          <strong>${item.name}</strong>
          <span class="muted">Image Preview</span>
        </div>
        <img class="preview-image preview-image--full" src="${escapeAttribute(item.content)}" alt="${escapeAttribute(item.name)}">
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="stack-layout">
      <div class="panel toolbar">
        <strong>${item.name}</strong>
        <span class="muted">Notes</span>
        <button class="action-button action-button--accent" id="saveNoteButton">Save</button>
      </div>
      <textarea class="note-editor__field" id="noteEditor" rows="18"></textarea>
    </div>
  `;
  container.querySelector("#noteEditor").value = item.content || "";

  container.querySelector("#saveNoteButton").addEventListener("click", () => {
    const editor = container.querySelector("#noteEditor");
    item.content = editor.value;
    saveFileSystem();
    statusMessage.textContent = `Saved ${item.name}`;
    renderOpenAppBodies("finder");
  });
}

function renderBin(container) {
  const binItems = state.fileSystem.bin;
  container.innerHTML = `
    <div class="stack-layout">
      <div class="panel toolbar">
        <button class="action-button" id="emptyBinButton" ${binItems.length ? "" : "disabled"}>Empty Bin</button>
        <span class="muted">${binItems.length} item(s) in bin</span>
      </div>
      <div class="bin-list" id="binList"></div>
    </div>
  `;

  const list = container.querySelector("#binList");
  if (!binItems.length) {
    list.innerHTML = `<div class="status-box">Bin is empty. Deleted files can be restored here.</div>`;
  } else {
    binItems.forEach((item) => {
      const row = document.createElement("div");
      row.className = "bin-row";
      row.innerHTML = `
        <div>
          <strong>${item.name}</strong>
          <div class="muted">From ${item.parentName || "Unknown"}</div>
        </div>
        <div class="toolbar">
          <button class="action-button" data-action="restore">Restore</button>
          <button class="action-button" data-action="delete">Delete Forever</button>
        </div>
      `;
      row.querySelector('[data-action="restore"]').addEventListener("click", () => restoreFromBin(item.id));
      row.querySelector('[data-action="delete"]').addEventListener("click", () => deleteForever(item.id));
      list.appendChild(row);
    });
  }

  container.querySelector("#emptyBinButton").addEventListener("click", () => {
    if (confirm("Empty the bin permanently?")) {
      state.fileSystem.bin = [];
      saveFileSystem();
      renderAllFileApps();
    }
  });
}

function renderCalculator(container) {
  const { previous, current } = state.calculator;
  container.innerHTML = `
    <div class="calculator">
      <div class="calculator-display">
        <div class="calculator-display__history">${previous || "&nbsp;"}</div>
        <div class="calculator-display__value">${current}</div>
      </div>
      <div class="calculator-grid" id="calculatorGrid"></div>
    </div>
  `;

  const buttons = [
    ["AC", "clear"], ["+/-", "toggle"], ["%", "percent"], ["/", "/"],
    ["7", "7"], ["8", "8"], ["9", "9"], ["*", "*"],
    ["4", "4"], ["5", "5"], ["6", "6"], ["-", "-"],
    ["1", "1"], ["2", "2"], ["3", "3"], ["+", "+"],
    ["0", "0"], [".", "."], ["<-", "backspace"], ["=", "="]
  ];

  const grid = container.querySelector("#calculatorGrid");
  buttons.forEach(([label, value]) => {
    const button = document.createElement("button");
    button.textContent = label;
    if (["/", "*", "-", "+", "="].includes(value)) button.classList.add("operator");
    button.addEventListener("click", () => handleCalculatorInput(value));
    grid.appendChild(button);
  });
}

function handleCalculatorInput(value) {
  const calc = state.calculator;
  if (value === "clear") {
    calc.expression = "";
    calc.current = "0";
    calc.previous = "";
  } else if (value === "toggle") {
    calc.current = String(Number(calc.current) * -1);
  } else if (value === "percent") {
    calc.current = String(Number(calc.current) / 100);
  } else if (value === "backspace") {
    calc.current = calc.current.length > 1 ? calc.current.slice(0, -1) : "0";
  } else if (value === "=") {
    const expression = `${calc.expression}${calc.current}`;
    try {
      const result = Function(`"use strict"; return (${expression})`)();
      calc.previous = `${expression} =`;
      calc.current = Number.isFinite(result) ? String(result) : "Error";
      calc.expression = "";
    } catch {
      calc.previous = expression;
      calc.current = "Error";
      calc.expression = "";
    }
  } else if (["/", "*", "-", "+"].includes(value)) {
    calc.expression = `${calc.expression}${calc.current}${value}`;
    calc.previous = calc.expression;
    calc.current = "0";
  } else {
    calc.current = calc.current === "0" && value !== "." ? value : `${calc.current}${value}`;
  }
  renderOpenAppBodies("calculator");
}

function renderClock(container) {
  const now = new Date();
  const hours = now.getHours() % 12;
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();
  const hourRotation = (hours + minutes / 60) * 30;
  const minuteRotation = minutes * 6;
  const secondRotation = seconds * 6;

  container.innerHTML = `
    <div class="clock-grid">
      <div class="panel">
        <div class="clock-face">
          <div class="clock-face__markers">
            ${Array.from({ length: 12 }, (_, index) => `<span class="clock-marker" style="transform: rotate(${index * 30}deg)"></span>`).join("")}
          </div>
          <div class="clock-face__hand" style="height: 70px; margin-left:-2px; margin-top:-70px; transform: rotate(${hourRotation}deg);"></div>
          <div class="clock-face__hand" style="height: 100px; margin-left:-2px; margin-top:-100px; width:3px; transform: rotate(${minuteRotation}deg);"></div>
          <div class="clock-face__hand" style="height: 118px; margin-left:-1px; margin-top:-118px; width:2px; background:#ff8080; transform: rotate(${secondRotation}deg);"></div>
          <div class="clock-face__center"></div>
        </div>
      </div>
      <div class="stats-grid">
        <div class="stats-card">
          <div class="muted">Local time</div>
          <h2>${now.toLocaleTimeString()}</h2>
          <div>${now.toLocaleDateString()}</div>
        </div>
        <div class="stats-card">
          <div class="muted">New York</div>
          <strong>${new Intl.DateTimeFormat("en-US", { timeStyle: "medium", timeZone: "America/New_York" }).format(now)}</strong>
        </div>
        <div class="stats-card">
          <div class="muted">London</div>
          <strong>${new Intl.DateTimeFormat("en-GB", { timeStyle: "medium", timeZone: "Europe/London" }).format(now)}</strong>
        </div>
        <div class="stats-card">
          <div class="muted">Tokyo</div>
          <strong>${new Intl.DateTimeFormat("en-JP", { timeStyle: "medium", timeZone: "Asia/Tokyo" }).format(now)}</strong>
        </div>
      </div>
    </div>
  `;
}

function renderCamera(container) {
  container.innerHTML = `
    <div class="camera-layout">
      <div class="stack-layout">
        <video class="camera-video" id="cameraVideo" autoplay playsinline muted></video>
        <div class="toolbar">
          <button class="action-button action-button--accent" id="startCameraButton">Start Camera</button>
          <button class="action-button" id="stopCameraButton">Stop</button>
          <button class="action-button" id="capturePhotoButton">Capture</button>
          <button class="action-button" id="saveSnapshotButton" ${state.camera.snapshots.length ? "" : "disabled"}>Save to Pictures</button>
        </div>
      </div>
      <div class="stack-layout">
        <canvas class="camera-canvas" id="cameraCanvas"></canvas>
        <div class="panel">
          <div class="muted">Snapshots</div>
          <div class="snapshot-gallery" id="snapshotGallery"></div>
        </div>
      </div>
    </div>
  `;

  const video = container.querySelector("#cameraVideo");
  const canvas = container.querySelector("#cameraCanvas");
  if (state.camera.stream) video.srcObject = state.camera.stream;

  container.querySelector("#startCameraButton").addEventListener("click", async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("This browser does not support camera access.");
      }
      if (!state.camera.stream) {
        state.camera.stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      video.srcObject = state.camera.stream;
      statusMessage.textContent = "Camera live";
    } catch (error) {
      statusMessage.textContent = `Camera unavailable: ${error.message}`;
    }
  });

  container.querySelector("#stopCameraButton").addEventListener("click", () => {
    stopCameraStream();
    renderOpenAppBodies("camera");
  });

  container.querySelector("#capturePhotoButton").addEventListener("click", () => {
    if (!video.videoWidth) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    const image = canvas.toDataURL("image/png");
    state.camera.snapshots.unshift(image);
    state.camera.snapshots = state.camera.snapshots.slice(0, 6);
    renderOpenAppBodies("camera");
  });

  container.querySelector("#saveSnapshotButton").addEventListener("click", () => {
    const pictures = getItemById("pictures");
    const latest = state.camera.snapshots[0];
    if (!pictures || !latest) return;
    pictures.children.push(createImageFile(`Snapshot ${new Date().toLocaleTimeString().replaceAll(":", "-")}.png`, latest));
    saveFileSystem();
    statusMessage.textContent = "Snapshot saved to Pictures";
    renderAllFileApps();
  });

  const gallery = container.querySelector("#snapshotGallery");
  state.camera.snapshots.forEach((src) => {
    const img = document.createElement("img");
    img.src = src;
    img.alt = "Snapshot";
    gallery.appendChild(img);
  });
}

function stopCameraStream() {
  state.camera.stream?.getTracks().forEach((track) => track.stop());
  state.camera.stream = null;
}

function renderBrowser(container) {
  container.innerHTML = `
    <div class="browser-layout">
      <div class="panel stack-layout">
        <div class="toolbar">
          <input id="browserUrlInput" value="${escapeAttribute(state.browser.currentUrl)}" placeholder="Enter a URL or search">
          <button class="action-button action-button--accent" id="openBrowserButton">Open</button>
          <button class="action-button" id="searchBrowserButton">Search</button>
        </div>
        <div class="browser-shortcuts">
          <button class="chip" data-url="https://example.com">Example</button>
          <button class="chip" data-url="https://developer.mozilla.org">MDN</button>
          <button class="chip" data-url="https://www.wikipedia.org">Wikipedia</button>
          <button class="chip" data-url="https://news.ycombinator.com">Hacker News</button>
        </div>
        <div class="muted">Some sites block iframe embedding. If that happens, use Search to open a live results page in a new browser tab.</div>
      </div>
      <div class="browser-frame">
        <iframe src="${escapeAttribute(state.browser.currentUrl)}" title="Browser frame"></iframe>
      </div>
    </div>
  `;

  const input = container.querySelector("#browserUrlInput");
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      state.browser.currentUrl = normalizeUrl(input.value);
      renderOpenAppBodies("browser");
    }
  });
  container.querySelector("#openBrowserButton").addEventListener("click", () => {
    state.browser.currentUrl = normalizeUrl(input.value);
    renderOpenAppBodies("browser");
  });
  container.querySelector("#searchBrowserButton").addEventListener("click", () => {
    const q = encodeURIComponent(input.value.trim());
    window.open(`https://www.google.com/search?q=${q}`, "_blank", "noopener");
  });
  container.querySelectorAll("[data-url]").forEach((button) => {
    button.addEventListener("click", () => {
      state.browser.currentUrl = button.dataset.url;
      renderOpenAppBodies("browser");
    });
  });
}

function renderCards(container) {
  const { stock, waste, foundations, tableau, score, selected } = state.cards;
  container.innerHTML = `
    <div class="cards-layout">
      <div class="panel cards-toolbar">
        <div>
          <strong>Klondike Solitaire</strong>
          <div class="muted">${selected ? formatCardsSelection(selected) : "Select a visible card or stack, then click where it should move."}</div>
        </div>
        <div class="toolbar">
          <span class="muted">Score: ${score}</span>
          <button class="action-button action-button--accent" id="resetCardsButton">New Game</button>
        </div>
      </div>
      <div class="cards-top">
        <div class="stock-waste">
          <div class="card-slot panel ${selected?.source === "stock" ? "is-highlight" : ""}" id="stockPile">${stock.length ? "Deck" : "Reset"}</div>
          <div class="card-slot panel" id="wastePile"></div>
        </div>
        <div class="foundations" id="foundations"></div>
      </div>
      <div class="tableau" id="tableau"></div>
    </div>
  `;

  const wastePile = container.querySelector("#wastePile");
  if (waste.length) {
    const wasteCard = renderCardElement(waste[waste.length - 1], { selected: selected?.source === "waste" });
    wasteCard.addEventListener("click", (event) => {
      event.stopPropagation();
      selectWasteCard();
    });
    wastePile.appendChild(wasteCard);
  }
  else wastePile.innerHTML = `<span class="muted">Waste</span>`;

  container.querySelector("#stockPile").addEventListener("click", drawFromStock);
  container.querySelector("#resetCardsButton").addEventListener("click", () => {
    state.cards = createSolitaireState();
    renderOpenAppBodies("cards");
  });

  const foundationsEl = container.querySelector("#foundations");
  foundations.forEach((pile, index) => {
    const slot = document.createElement("div");
    slot.className = `foundation ${selected?.source === "foundation" && selected.foundationIndex === index ? "is-highlight" : ""}`;
    slot.innerHTML = pile.length ? "" : `<span class="muted">Foundation</span>`;
    if (pile.length) {
      const cardEl = renderCardElement(pile[pile.length - 1], { compact: true, selected: selected?.source === "foundation" && selected.foundationIndex === index });
      cardEl.addEventListener("click", (event) => {
        event.stopPropagation();
        selectFoundationCard(index);
      });
      slot.appendChild(cardEl);
    }
    slot.addEventListener("click", () => moveSelectedToFoundation(index));
    foundationsEl.appendChild(slot);
  });

  const tableauEl = container.querySelector("#tableau");
  tableau.forEach((column, columnIndex) => {
    const col = document.createElement("div");
    col.className = `tableau-column ${selected?.source === "tableau" && selected.columnIndex === columnIndex ? "is-highlight" : ""}`;
    col.addEventListener("click", () => moveSelectedToTableau(columnIndex));
    if (!column.length) col.innerHTML = `<span class="muted">Empty</span>`;
    column.forEach((card, cardIndex) => {
      const isSelected = selected?.source === "tableau" && selected.columnIndex === columnIndex && cardIndex >= selected.startIndex;
      const cardEl = renderCardElement(card, { selected: isSelected });
      cardEl.addEventListener("click", (event) => {
        event.stopPropagation();
        handleCardSelection(card, columnIndex, cardIndex);
      });
      col.appendChild(cardEl);
    });
    tableauEl.appendChild(col);
  });
}

function renderCardElement(card) {
  const el = document.createElement("div");
  const options = arguments[1] || {};
  const isRed = ["H", "D"].includes(card.suit);
  el.className = `playing-card ${isRed ? "is-red" : ""} ${card.faceUp ? "" : "is-face-down"} ${options.compact ? "playing-card--compact" : ""} ${options.selected ? "playing-card--selected" : ""}`;
  if (!card.faceUp) {
    el.innerHTML = `<div class="playing-card__center">NX</div>`;
    return el;
  }
  const suitGlyph = { S: "♠", H: "♥", D: "♦", C: "♣" }[card.suit] || card.suit;
  el.innerHTML = `
    <div class="playing-card__corner"><span>${card.rank}</span><span>${suitGlyph}</span></div>
    <div class="playing-card__center">${suitGlyph}</div>
  `;
  return el;
}

function handleCardSelection(card, columnIndex, cardIndex) {
  if (!card.faceUp) {
    if (cardIndex === state.cards.tableau[columnIndex].length - 1) {
      card.faceUp = true;
      state.cards.score += 5;
      renderOpenAppBodies("cards");
    }
    return;
  }
  const column = state.cards.tableau[columnIndex];
  const movingStack = column.slice(cardIndex);
  if (!isValidTableauStack(movingStack)) return;
  if (state.cards.selected?.source === "tableau" && state.cards.selected.columnIndex === columnIndex && state.cards.selected.startIndex === cardIndex) {
    state.cards.selected = null;
  } else {
    state.cards.selected = {
      source: "tableau",
      columnIndex,
      startIndex: cardIndex,
      cards: movingStack.map((item) => ({ ...item }))
    };
  }
  renderOpenAppBodies("cards");
}

function drawFromStock() {
  const cards = state.cards;
  if (!cards.stock.length) {
    cards.stock = cards.waste.reverse().map((card) => ({ ...card, faceUp: false }));
    cards.waste = [];
  } else {
    const card = cards.stock.pop();
    card.faceUp = true;
    cards.waste.push(card);
  }
  cards.selected = null;
  renderOpenAppBodies("cards");
}

function moveSelectedToFoundation(index) {
  const selected = state.cards.selected;
  if (!selected) return;
  if (selected.cards.length !== 1) return;
  const pile = state.cards.foundations[index];
  const [card] = selected.cards;
  if (!canMoveToFoundation(card, pile)) return;

  removeSelectedCards(selected);
  state.cards.foundations[index].push({ ...card, faceUp: true });
  state.cards.score += 10;
  state.cards.selected = null;
  revealLastTableauCards();
  renderOpenAppBodies("cards");
}

function moveSelectedToTableau(columnIndex) {
  const selected = state.cards.selected;
  if (!selected) return;
  const column = state.cards.tableau[columnIndex];
  if (!canMoveToTableau(selected.cards[0], column)) return;

  const cardsToMove = selected.cards.map((card) => ({ ...card, faceUp: true }));
  removeSelectedCards(selected);
  state.cards.tableau[columnIndex].push(...cardsToMove);
  state.cards.selected = null;
  revealLastTableauCards();
  renderOpenAppBodies("cards");
}

function removeSelectedCards(selected) {
  if (selected.source === "waste") {
    state.cards.waste.pop();
  }
  if (selected.source === "tableau") {
    state.cards.tableau[selected.columnIndex].splice(selected.startIndex);
  }
  if (selected.source === "foundation") {
    state.cards.foundations[selected.foundationIndex].pop();
  }
}

function revealLastTableauCards() {
  state.cards.tableau.forEach((column) => {
    const last = column[column.length - 1];
    if (last && !last.faceUp) last.faceUp = true;
  });
}

function canMoveToFoundation(card, pile) {
  if (!pile.length) return card.value === 1;
  const top = pile[pile.length - 1];
  return top.suit === card.suit && card.value === top.value + 1;
}

function canMoveToTableau(card, column) {
  if (!column.length) return card.value === 13;
  const top = column[column.length - 1];
  const oppositeColor = ["H", "D"].includes(top.suit) !== ["H", "D"].includes(card.suit);
  return top.faceUp && oppositeColor && card.value === top.value - 1;
}

function selectWasteCard() {
  const card = state.cards.waste[state.cards.waste.length - 1];
  if (!card) return;
  if (state.cards.selected?.source === "waste") {
    state.cards.selected = null;
  } else {
    state.cards.selected = { source: "waste", cards: [{ ...card }] };
  }
  renderOpenAppBodies("cards");
}

function selectFoundationCard(index) {
  const pile = state.cards.foundations[index];
  const card = pile[pile.length - 1];
  if (!card) return;
  if (state.cards.selected?.source === "foundation" && state.cards.selected.foundationIndex === index) {
    state.cards.selected = null;
  } else {
    state.cards.selected = { source: "foundation", foundationIndex: index, cards: [{ ...card }] };
  }
  renderOpenAppBodies("cards");
}

function isValidTableauStack(cards) {
  if (!cards.length || cards.some((card) => !card.faceUp)) return false;
  for (let index = 0; index < cards.length - 1; index += 1) {
    const current = cards[index];
    const next = cards[index + 1];
    const alternating = ["H", "D"].includes(current.suit) !== ["H", "D"].includes(next.suit);
    if (!alternating || current.value !== next.value + 1) return false;
  }
  return true;
}

function formatCardsSelection(selected) {
  const first = selected.cards[0];
  const last = selected.cards[selected.cards.length - 1];
  const suitGlyph = { S: "♠", H: "♥", D: "♦", C: "♣" };
  if (selected.cards.length === 1) return `Selected ${first.rank}${suitGlyph[first.suit]}`;
  return `Selected stack ${first.rank}${suitGlyph[first.suit]} to ${last.rank}${suitGlyph[last.suit]}`;
}

function createSolitaireState() {
  const deck = shuffle(createDeck());
  const tableau = Array.from({ length: 7 }, () => []);
  for (let columnIndex = 0; columnIndex < 7; columnIndex += 1) {
    for (let count = 0; count <= columnIndex; count += 1) {
      const card = deck.pop();
      card.faceUp = count === columnIndex;
      tableau[columnIndex].push(card);
    }
  }
  return {
    stock: deck.map((card) => ({ ...card, faceUp: false })),
    waste: [],
    foundations: [[], [], [], []],
    tableau,
    selected: null,
    score: 0
  };
}

function createDeck() {
  const suits = ["S", "H", "D", "C"];
  const ranks = [
    ["A", 1], ["2", 2], ["3", 3], ["4", 4], ["5", 5], ["6", 6], ["7", 7],
    ["8", 8], ["9", 9], ["10", 10], ["J", 11], ["Q", 12], ["K", 13]
  ];
  return suits.flatMap((suit) => ranks.map(([rank, value]) => ({ suit, rank, value, faceUp: false })));
}

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function renderSettings(container) {
  const prefs = state.preferences;
  const wallpaperCards = WALLPAPERS.map((wallpaper) => {
    const selected = wallpaper.id === prefs.wallpaperId;
    const style = wallpaper.id === "gallery" && prefs.customWallpaper
      ? `background-image: linear-gradient(rgba(8, 15, 31, 0.16), rgba(8, 15, 31, 0.16)), url('${prefs.customWallpaper}'); background-size: cover; background-position: center;`
      : `background: ${wallpaper.desktop};`;
    return `
      <button class="wallpaper-card ${selected ? "is-selected" : ""}" data-wallpaper-id="${wallpaper.id}">
        <span class="wallpaper-card__preview" style="${style}"></span>
        <span>${wallpaper.name}</span>
      </button>
    `;
  }).join("");

  container.innerHTML = `
    <div class="split-layout settings-shell">
      <aside class="sidebar settings-sidebar" id="settingsSidebar">
        <div class="settings-sidebar__hero">
          <div class="settings-sidebar__badge">NX</div>
          <div>
            <strong>NextOS Settings</strong>
            <div class="muted">System preferences</div>
          </div>
        </div>
        <button class="${state.settingsView === "appearance" ? "is-active" : ""}" data-settings-view="appearance">Appearance</button>
        <button class="${state.settingsView === "desktop" ? "is-active" : ""}" data-settings-view="desktop">Desktop & Dock</button>
        <button class="${state.settingsView === "general" ? "is-active" : ""}" data-settings-view="general">Control Center</button>
      </aside>
      <section class="stack-layout" style="flex:1">
        ${renderSettingsPanel(wallpaperCards, prefs)}
      </section>
    </div>
  `;

  container.querySelectorAll("[data-settings-view]").forEach((button) => {
    button.addEventListener("click", () => {
      state.settingsView = button.dataset.settingsView;
      renderOpenAppBodies("settings");
    });
  });

  container.querySelectorAll("[data-wallpaper-id]").forEach((button) => {
    button.addEventListener("click", () => {
      state.preferences.wallpaperId = button.dataset.wallpaperId;
      savePreferences();
      applyPreferences();
      renderOpenAppBodies("settings");
    });
  });

  const themeSelect = container.querySelector("#themeSelect");
  if (themeSelect) {
    themeSelect.addEventListener("change", () => updatePreference("theme", themeSelect.value));
  }

  const dockModeSelect = container.querySelector("#dockModeSelect");
  if (dockModeSelect) {
    dockModeSelect.addEventListener("change", () => updatePreference("dockMode", dockModeSelect.value));
  }

  const dockScaleRange = container.querySelector("#dockScaleRange");
  if (dockScaleRange) {
    dockScaleRange.addEventListener("input", () => updatePreference("dockScale", Number(dockScaleRange.value)));
  }

  const dockLabelsToggle = container.querySelector("#dockLabelsToggle");
  if (dockLabelsToggle) {
    dockLabelsToggle.addEventListener("change", () => updatePreference("dockLabels", dockLabelsToggle.checked));
  }

  const accentInput = container.querySelector("#accentColorInput");
  if (accentInput) {
    accentInput.addEventListener("input", () => updatePreference("accentColor", accentInput.value));
  }

  const menuBarToggle = container.querySelector("#menuBarToggle");
  if (menuBarToggle) {
    menuBarToggle.addEventListener("change", () => updatePreference("menuBarTransparent", menuBarToggle.checked));
  }

  const iconToggle = container.querySelector("#desktopIconsToggle");
  if (iconToggle) {
    iconToggle.addEventListener("change", () => updatePreference("desktopIcons", iconToggle.checked));
  }

  const motionToggle = container.querySelector("#reduceMotionToggle");
  if (motionToggle) {
    motionToggle.addEventListener("change", () => updatePreference("reduceMotion", motionToggle.checked));
  }

  const secondsToggle = container.querySelector("#showSecondsToggle");
  if (secondsToggle) {
    secondsToggle.addEventListener("change", () => updatePreference("showSeconds", secondsToggle.checked));
  }

  const uploadButton = container.querySelector("#uploadWallpaperButton");
  if (uploadButton) {
    uploadButton.addEventListener("click", () => wallpaperPicker.click());
  }

  const resetButton = container.querySelector("#resetPreferencesButton");
  if (resetButton) {
    resetButton.addEventListener("click", () => {
      state.preferences = { ...DEFAULT_PREFERENCES };
      savePreferences();
      applyPreferences();
      renderOpenAppBodies("settings");
    });
  }
}

function renderSettingsPanel(wallpaperCards, prefs) {
  if (state.settingsView === "appearance") {
    return `
      <div class="panel stack-layout settings-panel">
        <div class="settings-header">
          <div>
            <h2>Appearance</h2>
            <p class="muted">Choose the wallpaper, theme, and color language for NextOS.</p>
          </div>
          <div class="settings-device-preview">
            <div class="settings-device-preview__screen"></div>
          </div>
        </div>
        <div class="settings-section">
          <div class="settings-section__title">Wallpapers</div>
          <div class="settings-grid">${wallpaperCards}</div>
          <div class="toolbar">
            <button class="action-button action-button--accent" id="uploadWallpaperButton">Choose From Gallery</button>
          </div>
        </div>
        <div class="settings-dual">
          <div class="settings-card">
            <div class="settings-section__title">Theme</div>
            <label class="settings-row">Window style
              <select id="themeSelect">
                ${Object.entries(THEMES).map(([id, theme]) => `<option value="${id}" ${prefs.theme === id ? "selected" : ""}>${theme.name}</option>`).join("")}
              </select>
            </label>
            <label class="settings-row">Accent Color
              <input id="accentColorInput" type="color" value="${escapeAttribute(prefs.accentColor)}">
            </label>
          </div>
          <div class="settings-card">
            <div class="settings-section__title">Menu Bar</div>
            <label class="settings-row settings-row--toggle">
              <span>Transparent Menu Bar</span>
              <input id="menuBarToggle" type="checkbox" ${prefs.menuBarTransparent ? "checked" : ""}>
            </label>
            <div class="status-box">The active app name and status area stay visible while the bar blends into the wallpaper like macOS.</div>
          </div>
        </div>
      </div>
    `;
  }

  if (state.settingsView === "desktop") {
    return `
      <div class="panel stack-layout settings-panel">
        <div class="settings-header">
          <div>
            <h2>Desktop & Dock</h2>
            <p class="muted">Tune how icons, labels, and the launcher behave across the desktop.</p>
          </div>
        </div>
        <div class="settings-dual">
          <div class="settings-card">
            <div class="settings-section__title">Dock</div>
            <div class="settings-form">
              <label class="settings-row">Style
                <select id="dockModeSelect">
                  <option value="dock" ${prefs.dockMode === "dock" ? "selected" : ""}>Floating Dock</option>
                  <option value="taskbar" ${prefs.dockMode === "taskbar" ? "selected" : ""}>Taskbar</option>
                  <option value="compact" ${prefs.dockMode === "compact" ? "selected" : ""}>Compact Shelf</option>
                </select>
              </label>
              <label class="settings-row">Size
                <input id="dockScaleRange" type="range" min="0.8" max="1.35" step="0.05" value="${prefs.dockScale}">
                <span class="muted">Scale: ${prefs.dockScale.toFixed(2)}x</span>
              </label>
              <label class="settings-row settings-row--toggle">
                <span>Show App Labels</span>
                <input id="dockLabelsToggle" type="checkbox" ${prefs.dockLabels ? "checked" : ""}>
              </label>
            </div>
          </div>
          <div class="settings-card">
            <div class="settings-section__title">Desktop</div>
            <div class="settings-form">
              <label class="settings-row settings-row--toggle">
                <span>Show Desktop Icons</span>
                <input id="desktopIconsToggle" type="checkbox" ${prefs.desktopIcons ? "checked" : ""}>
              </label>
            </div>
            <div class="status-box">Switching to taskbar mode gives you a more traditional launcher while keeping the same app windows and Finder behavior.</div>
          </div>
        </div>
      </div>
    `;
  }

  return `
    <div class="panel stack-layout settings-panel">
      <div class="settings-header">
        <div>
          <h2>Control Center</h2>
          <p class="muted">Small system options that shape motion, clock detail, and day-to-day comfort.</p>
        </div>
      </div>
      <div class="settings-dual">
        <div class="settings-card">
          <div class="settings-section__title">Accessibility</div>
          <div class="settings-form">
            <label class="settings-row settings-row--toggle">
              <span>Reduce Motion</span>
              <input id="reduceMotionToggle" type="checkbox" ${prefs.reduceMotion ? "checked" : ""}>
            </label>
          </div>
        </div>
        <div class="settings-card">
          <div class="settings-section__title">Clock</div>
          <div class="settings-form">
            <label class="settings-row settings-row--toggle">
              <span>Show Seconds In Menu Bar</span>
              <input id="showSecondsToggle" type="checkbox" ${prefs.showSeconds ? "checked" : ""}>
            </label>
          </div>
        </div>
      </div>
      <div class="settings-footer">
        <div class="status-box">NextOS now keeps the same core controls users expect from a polished desktop OS: appearance, dock behavior, visibility, clock detail, and comfort settings.</div>
        <button class="action-button" id="resetPreferencesButton">Reset Defaults</button>
      </div>
    </div>
  `;
}

function updatePreference(key, value) {
  state.preferences[key] = value;
  savePreferences();
  applyPreferences();
  renderOpenAppBodies("settings");
}

function renderBreadcrumbs(pathItems) {
  return pathItems.map((item) => item.name).join(" / ");
}

function loadPreferences() {
  const saved = localStorage.getItem("nextos-preferences");
  if (!saved) return { ...DEFAULT_PREFERENCES };
  return { ...DEFAULT_PREFERENCES, ...JSON.parse(saved) };
}

function savePreferences() {
  localStorage.setItem("nextos-preferences", JSON.stringify(state.preferences));
}

function createFolder(name) {
  return {
    id: crypto.randomUUID(),
    name,
    type: "folder",
    children: []
  };
}

function createTextFile(name) {
  return {
    id: crypto.randomUUID(),
    name,
    type: "text",
    content: DEFAULT_NOTE_CONTENT
  };
}

function createImageFile(name, content) {
  return {
    id: crypto.randomUUID(),
    name,
    type: "image",
    content
  };
}

function moveItemToBin(itemId) {
  const parent = findParentOfItem(itemId);
  if (!parent) return;
  const index = parent.children.findIndex((item) => item.id === itemId);
  if (index === -1) return;
  const [removed] = parent.children.splice(index, 1);
  state.fileSystem.bin.unshift({
    ...removed,
    parentId: parent.id,
    parentName: parent.name,
    deletedAt: Date.now()
  });
  state.fileSystem.selectedId = null;
  saveFileSystem();
  renderAllFileApps();
}

function restoreFromBin(itemId) {
  const index = state.fileSystem.bin.findIndex((item) => item.id === itemId);
  if (index === -1) return;
  const [restored] = state.fileSystem.bin.splice(index, 1);
  const target = getItemById(restored.parentId) || getItemById("documents");
  const { parentId, parentName, deletedAt, ...cleanItem } = restored;
  target.children.push(cleanItem);
  saveFileSystem();
  renderAllFileApps();
}

function deleteForever(itemId) {
  state.fileSystem.bin = state.fileSystem.bin.filter((item) => item.id !== itemId);
  saveFileSystem();
  renderAllFileApps();
}

function renderAllFileApps() {
  renderOpenAppBodies("finder");
  renderOpenAppBodies("bin");
  renderOpenAppBodies("notes");
}

function loadFileSystem() {
  const saved = localStorage.getItem("nextos-files");
  if (saved) {
    const parsed = JSON.parse(saved);
    if (parsed.root && parsed.currentFolderId) return parsed;
  }

  const initial = {
    currentFolderId: "desktop",
    selectedId: null,
    bin: [],
    root: [
      {
        id: "desktop",
        name: "Desktop",
        type: "folder",
        children: [
          createFolder("Projects"),
          {
            id: crypto.randomUUID(),
            name: "Welcome.txt",
            type: "text",
            content: "Welcome to NextOS.\n\nDouble click apps in the dock and manage files in Finder."
          }
        ]
      },
      {
        id: "documents",
        name: "Documents",
        type: "folder",
        children: [
          {
            id: crypto.randomUUID(),
            name: "Ideas.txt",
            type: "text",
            content: "1. Build smooth desktop interactions.\n2. Add working apps.\n3. Keep it fast."
          }
        ]
      },
      {
        id: "downloads",
        name: "Downloads",
        type: "folder",
        children: [
          {
            id: crypto.randomUUID(),
            name: "Wallpaper Notes.txt",
            type: "text",
            content: "Use Settings to swap wallpapers, taskbar style, and theme."
          }
        ]
      },
      {
        id: "pictures",
        name: "Pictures",
        type: "folder",
        children: [
          createFolder("Gallery")
        ]
      }
    ]
  };

  localStorage.setItem("nextos-files", JSON.stringify(initial));
  return initial;
}

function saveFileSystem() {
  localStorage.setItem("nextos-files", JSON.stringify(state.fileSystem));
}

function getItemById(itemId, items = state.fileSystem.root) {
  for (const item of items) {
    if (item.id === itemId) return item;
    if (item.type === "folder") {
      const found = getItemById(itemId, item.children);
      if (found) return found;
    }
  }
  return null;
}

function findParentOfItem(itemId, items = state.fileSystem.root, parent = null) {
  for (const item of items) {
    if (item.id === itemId) return parent;
    if (item.type === "folder") {
      const found = findParentOfItem(itemId, item.children, item);
      if (found) return found;
    }
  }
  return null;
}

function getPathToItem(itemId) {
  const path = [];
  collectPath(state.fileSystem.root, itemId, path);
  return path;
}

function collectPath(items, targetId, path) {
  for (const item of items) {
    path.push(item);
    if (item.id === targetId) return true;
    if (item.type === "folder" && collectPath(item.children, targetId, path)) return true;
    path.pop();
  }
  return false;
}

function normalizeUrl(value) {
  const trimmed = value.trim();
  if (!trimmed) return "https://example.com";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll('"', "&quot;");
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

window.addEventListener("click", (event) => {
  if (event.target.id === "previewOpenButton") {
    const selectedId = state.fileSystem.selectedId;
    if (selectedId) openFileSystemItem(selectedId);
  }
});

window.addEventListener("keydown", (event) => {
  const active = state.activeWindowId ? state.openWindows.get(state.activeWindowId) : null;
  if (!active || active.appId !== "calculator") return;
  const valid = "0123456789/*-+.";
  if (valid.includes(event.key)) {
    handleCalculatorInput(event.key);
  } else if (event.key === "Enter") {
    handleCalculatorInput("=");
  } else if (event.key === "Backspace") {
    handleCalculatorInput("backspace");
  } else if (event.key === "Escape") {
    handleCalculatorInput("clear");
  }
});
