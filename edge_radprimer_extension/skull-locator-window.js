(() => {
  const STORAGE_KEY = "radiopaediaPacsSkullLocatorState";
  const locator = document.querySelector(".slice-locator");
  const BACKGROUND_MODES = new Set(["green", "magenta", "black", "transparent"]);

  function applyBackgroundMode(mode) {
    const bg = BACKGROUND_MODES.has(mode) ? mode : "green";
    document.documentElement.dataset.bg = bg === "green" ? "" : bg;
    document.body.dataset.bg = bg === "green" ? "" : bg;
    window.localStorage.setItem("radiopaediaSkullLocatorBg", bg);
  }

  function initBackgroundMode() {
    const params = new URLSearchParams(window.location.search);
    const requestedBg = params.get("bg");
    const savedBg = window.localStorage.getItem("radiopaediaSkullLocatorBg");
    applyBackgroundMode(requestedBg || savedBg || "green");
  }

  function placePlane(plane, fraction) {
    if (!locator) return;
    const f = Math.max(0, Math.min(1, Number.isFinite(fraction) ? fraction : 0.5));
    let left = 50;
    let top = 50;
    let width = 64;
    let height = 9;
    let rotate = -3;
    let skew = 0;
    let skewX = 0;
    let yaw = 0;
    let pitch = 0;
    let scale = 1;
    let opacity = 0.9;

    if (plane === "sagittal") {
      left = 24 + f * 43;
      top = 51;
      width = 66;
      height = 118;
      rotate = 0;
      skew = 0;
      skewX = 0;
      yaw = 0;
      pitch = 0;
      scale = 0.98;
      opacity = 0.5 + f * 0.1;
    } else if (plane === "coronal") {
      left = 32 + f * 34;
      top = 52 - f * 5;
      width = 58;
      height = 112;
      rotate = 1;
      skew = 0;
      skewX = -1;
      yaw = 0;
      pitch = 0;
      scale = 0.98;
      opacity = 0.52 + f * 0.14;
    } else {
      left = 50;
      top = 28 + f * 48;
      width = 90;
      height = 30;
      rotate = 0;
      skew = 0;
      opacity = 0.5 + f * 0.12;
    }

    locator.dataset.plane = plane || "axial";
    locator.style.setProperty("--locator-plane-left", `${left}%`);
    locator.style.setProperty("--locator-plane-top", `${top}%`);
    locator.style.setProperty("--locator-plane-width", `${width}%`);
    locator.style.setProperty("--locator-plane-height", `${height}%`);
    locator.style.setProperty("--locator-plane-rotate", `${rotate}deg`);
    locator.style.setProperty("--locator-plane-skew", `${skew}deg`);
    locator.style.setProperty("--locator-plane-skew-x", `${skewX}deg`);
    locator.style.setProperty("--locator-plane-yaw", `${yaw}deg`);
    locator.style.setProperty("--locator-plane-pitch", `${pitch}deg`);
    locator.style.setProperty("--locator-plane-scale", String(scale));
    locator.style.setProperty("--locator-plane-opacity", String(opacity));
  }

  function applyState(state) {
    const plane = ["axial", "coronal", "sagittal"].includes(state?.plane) ? state.plane : "axial";
    const fraction = Number.isFinite(state?.fraction) ? state.fraction : 0.5;
    placePlane(plane, fraction);
  }

  chrome.storage.local.get(STORAGE_KEY).then((items) => {
    applyState(items?.[STORAGE_KEY]);
  }).catch(() => {
    applyState(null);
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local" || !changes[STORAGE_KEY]) return;
    applyState(changes[STORAGE_KEY].newValue);
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "g" || event.key === "G") applyBackgroundMode("green");
    if (event.key === "m" || event.key === "M") applyBackgroundMode("magenta");
    if (event.key === "b" || event.key === "B") applyBackgroundMode("black");
    if (event.key === "t" || event.key === "T") applyBackgroundMode("transparent");
  });

  initBackgroundMode();
})();
