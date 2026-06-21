(() => {
  const APP_ID = "imaios-cine-tools";
  const LOCKED_STORAGE_KEY = "im_viewer_locked_structures";
  const PRELOAD_MARKER_KEY = `${APP_ID}:native-preloaded`;
  const VIEWER_CAPTURE_GLOBAL = "__IMAIOS_CINE_TOOLS_NATIVE_VIEWER__";
  const VIEWER_CAPTURE_MARKER_KEY = `${APP_ID}:native-viewer-capture`;

  installNativeViewerCapture();

  try {
    const payload = readLiveDrillPayloadFromHash(location.hash);
    if (!payload) return;
    const plan = getNativeRestorePlan(payload);
    if (!plan.complete) return;

    const store = readObjectStorage(LOCKED_STORAGE_KEY);
    store[plan.moduleSlug] = plan.ids;
    localStorage.setItem(LOCKED_STORAGE_KEY, JSON.stringify(store));
    sessionStorage.setItem(PRELOAD_MARKER_KEY, JSON.stringify({
      at: new Date().toISOString(),
      drillId: String(payload.id || ""),
      moduleSlug: plan.moduleSlug,
      ids: plan.ids
    }));
  } catch (error) {
    try {
      sessionStorage.setItem(`${APP_ID}:native-preload-error`, String(error?.message || error));
    } catch {}
  }

  function installNativeViewerCapture() {
    try {
      const existing = window[VIEWER_CAPTURE_GLOBAL];
      if (existing?.viewer || existing?.hookInstalled) return;

      const capture = existing && typeof existing === "object"
        ? existing
        : {
            kind: "imaios-native-viewer-capture",
            version: 1,
            viewer: null,
            capturedAt: "",
            hookInstalledAt: new Date().toISOString(),
            hookRestoredAt: "",
            assignments: []
          };
      Object.defineProperty(window, VIEWER_CAPTURE_GLOBAL, {
        value: capture,
        configurable: true,
        writable: false
      });

      const previousDescriptor = Object.getOwnPropertyDescriptor(Object.prototype, "isolateStructure");
      if (previousDescriptor && previousDescriptor.configurable === false) {
        capture.error = "Object.prototype.isolateStructure exists and is not configurable.";
        return;
      }

      let restored = false;
      const restoreHook = () => {
        if (restored) return;
        restored = true;
        try {
          const currentDescriptor = Object.getOwnPropertyDescriptor(Object.prototype, "isolateStructure");
          if (currentDescriptor?.set === captureSetter) {
            if (previousDescriptor) {
              Object.defineProperty(Object.prototype, "isolateStructure", previousDescriptor);
            } else {
              delete Object.prototype.isolateStructure;
            }
          }
          capture.hookRestoredAt = new Date().toISOString();
        } catch (error) {
          capture.restoreError = String(error?.message || error);
        }
      };

      function captureSetter(value) {
        try {
          const isViewerCandidate = typeof value === "function"
            && this
            && typeof this === "object"
            && this.services
            && this.state
            && this.ui
            && typeof this.publish === "function";
          if (isViewerCandidate && !capture.viewer) {
            capture.viewer = this;
            capture.capturedAt = new Date().toISOString();
            capture.assignments.push({
              at: capture.capturedAt,
              property: "isolateStructure",
              moduleName: cleanText(this.state?.module?.name || ""),
              hasCleanIsolate: typeof this.cleanIsolate === "function",
              hasGetIsolatedStructureID: typeof this.getIsolatedStructureID === "function"
            });
            try {
              sessionStorage.setItem(VIEWER_CAPTURE_MARKER_KEY, JSON.stringify({
                at: capture.capturedAt,
                moduleName: cleanText(this.state?.module?.name || ""),
                hasViewer: true
              }));
            } catch {}
            setTimeout(restoreHook, 0);
          }
        } catch (error) {
          capture.error = String(error?.message || error);
        }

        Object.defineProperty(this, "isolateStructure", {
          value,
          configurable: true,
          writable: true,
          enumerable: true
        });
      }

      Object.defineProperty(Object.prototype, "isolateStructure", {
        configurable: true,
        enumerable: false,
        get() {
          return undefined;
        },
        set: captureSetter
      });
      capture.hookInstalled = true;
      setTimeout(restoreHook, 45000);
    } catch (error) {
      try {
        sessionStorage.setItem(`${APP_ID}:native-viewer-capture-error`, String(error?.message || error));
      } catch {}
    }
  }

  function readLiveDrillPayloadFromHash(hash) {
    const text = String(hash || "").replace(/^#/, "");
    if (!text) return null;
    const encoded = new URLSearchParams(text).get("imaiosDrill");
    if (!encoded) return null;
    const payload = JSON.parse(base64UrlDecode(encoded));
    return payload?.kind === "imaios-live-drill" ? payload : null;
  }

  function getNativeRestorePlan(payload) {
    const explicitPlan = payload?.nativeRestore && typeof payload.nativeRestore === "object"
      ? payload.nativeRestore
      : {};
    const labels = Array.isArray(payload?.labels) ? payload.labels : [];
    const moduleSlug = cleanText(
      explicitPlan.moduleSlug
      || labels.find((entry) => cleanText(entry?.nativeModuleSlug))?.nativeModuleSlug
      || ""
    );
    const ids = uniqueNativeIds(
      Array.isArray(explicitPlan.ids) && explicitPlan.ids.length
        ? explicitPlan.ids
        : labels.flatMap((entry) => entry?.nativeIds || entry?.nativeId || [])
    );
    const mappedLabelCount = labels.filter((entry) => uniqueNativeIds(entry?.nativeIds || entry?.nativeId || []).length).length;
    const explicitComplete = explicitPlan.complete === true && ids.length > 0;
    const inferredComplete = labels.length > 0 && mappedLabelCount === labels.length && ids.length > 0;
    return {
      moduleSlug,
      ids,
      complete: Boolean(moduleSlug && (explicitComplete || inferredComplete))
    };
  }

  function readObjectStorage(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "{}");
      return value && typeof value === "object" && !Array.isArray(value) ? value : {};
    } catch {
      return {};
    }
  }

  function uniqueNativeIds(values) {
    const rawItems = Array.isArray(values) ? values : [values];
    const ids = [];
    const seen = new Set();
    for (const item of rawItems) {
      const value = item && typeof item === "object"
        ? item.id ?? item.nativeId ?? item.structureId ?? item.value
        : item;
      const id = Number.parseInt(String(value ?? "").trim(), 10);
      if (!Number.isFinite(id) || id <= 0 || seen.has(id)) continue;
      seen.add(id);
      ids.push(id);
    }
    return ids;
  }

  function cleanText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function base64UrlDecode(value) {
    const normalized = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return new TextDecoder().decode(bytes);
  }
})();
