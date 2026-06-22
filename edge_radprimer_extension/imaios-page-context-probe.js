(() => {
  const script = document.currentScript;
  const source = script?.dataset?.source || "imaios-cine-tools:page-context-probe";
  const nonce = script?.dataset?.nonce || "";
  const stage = script?.dataset?.stage || "";
  const mode = script?.dataset?.mode || "generic";
  const options = (() => {
    try {
      return JSON.parse(script?.dataset?.options || "{}");
    } catch (_) {
      return {};
    }
  })();
  const pattern = /imaios|eanatomy|anatomy|viewer|slice|series|label|labels|structure|structures|annotation|annotations|image|images|organ|pin|point|marker|overlay|module|rocher|Head-Neck-CT|store|state|vue|pinia/i;
  const actionPattern = /lock|locked|unlock|isolate|isolated|select|selected|structure|label|annotation|pin|marker|point|target|highlight|show|hide|toggle|search|module/i;
  const cap = (value, max = 500) => {
    const text = String(value == null ? "" : value).replace(/\s+/g, " ").trim();
    return text.length > max ? `${text.slice(0, max)}...` : text;
  };
  const capMultiline = (value, max = 2200) => {
    const text = String(value == null ? "" : value)
      .replace(/\r\n/g, "\n")
      .replace(/[ \t]+/g, " ")
      .trim();
    return text.length > max ? `${text.slice(0, max)}...` : text;
  };
  const typeOf = (value) => {
    if (value === null) return "null";
    if (Array.isArray(value)) return "array";
    return typeof value;
  };
  const summarizeValue = (value, path, depth = 0, seen = new WeakSet()) => {
    const type = typeOf(value);
    const summary = { path, type };
    if (type === "string" || type === "number" || type === "boolean") {
      summary.value = cap(value, 700);
      return summary;
    }
    if (type === "function") {
      summary.name = value.name || "";
      summary.source = cap(Function.prototype.toString.call(value), 350);
      return summary;
    }
    if (!value || (type !== "object" && type !== "array")) return summary;
    if (seen.has(value)) {
      summary.circular = true;
      return summary;
    }
    seen.add(value);
    let keys = [];
    try {
      keys = Object.getOwnPropertyNames(value);
    } catch (_) {
      keys = [];
    }
    summary.keyCount = keys.length;
    summary.keys = keys.filter((key) => pattern.test(key)).slice(0, 80);
    if (!summary.keys.length) summary.keys = keys.slice(0, 30);
    if (Array.isArray(value)) summary.length = value.length;
    if (depth < 3) {
      summary.children = [];
      const selectedKeys = keys
        .filter((key) => pattern.test(key) || /^(0|1|2|3|4|5|data|state|store|props|setupState|ctx|appContext|config|globalProperties|value|items|list|map|children|modules)$/i.test(key))
        .slice(0, 36);
      for (const key of selectedKeys) {
        try {
          const child = value[key];
          const childType = typeOf(child);
          if (childType === "function" && !pattern.test(key)) continue;
          summary.children.push(summarizeValue(child, `${path}.${key}`, depth + 1, seen));
        } catch (error) {
          summary.children.push({ path: `${path}.${key}`, error: cap(error?.message || error) });
        }
      }
    }
    return summary;
  };
  const rectProbe = (rect) => ({
    left: Math.round(rect.left),
    top: Math.round(rect.top),
    width: Math.round(rect.width),
    height: Math.round(rect.height)
  });
  const elementSummary = (element) => {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return null;
    const rect = element.getBoundingClientRect();
    let expandoKeys = [];
    try {
      expandoKeys = Object.getOwnPropertyNames(element)
        .filter((key) => /vue|react|fiber|store|state|anatomy|viewer|label|structure|pinia/i.test(key))
        .slice(0, 60);
    } catch (_) {
      expandoKeys = [];
    }
    return {
      tag: element.tagName?.toLowerCase() || "",
      id: element.id || "",
      className: cap(element.className || "", 220),
      text: cap(element.textContent || "", 260),
      title: cap(element.getAttribute("title") || "", 180),
      role: element.getAttribute("role") || "",
      dataName: element.getAttribute("data-name") || "",
      ariaPressed: element.getAttribute("aria-pressed") || "",
      rect: rectProbe(rect),
      expandoKeys
    };
  };
  const summarizeFunction = (fn, path) => {
    let sourceText = "";
    try {
      sourceText = Function.prototype.toString.call(fn);
    } catch (_) {
      sourceText = "";
    }
    return {
      path,
      name: fn.name || "",
      arity: Number(fn.length || 0),
      source: cap(sourceText, 520),
      sourceHash: hashText(sourceText)
    };
  };
  const hashText = (value) => {
    const text = String(value || "");
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  };
  const uniqueNumericIds = (values) => {
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
  };
  const summarizeCapturedNativeViewer = () => {
    const capture = window.__IMAIOS_CINE_TOOLS_NATIVE_VIEWER__;
    const viewer = capture?.viewer || null;
    if (!viewer) {
      return {
        captured: false,
        hookInstalled: Boolean(capture?.hookInstalled),
        capturedAt: capture?.capturedAt || "",
        hookRestoredAt: capture?.hookRestoredAt || "",
        error: capture?.error || capture?.restoreError || ""
      };
    }
    return {
      captured: true,
      capturedAt: capture?.capturedAt || "",
      hookRestoredAt: capture?.hookRestoredAt || "",
      moduleName: cap(viewer.state?.module?.name || "", 220),
      hasIsolateStructure: typeof viewer.isolateStructure === "function",
      hasCleanIsolate: typeof viewer.cleanIsolate === "function",
      hasGetIsolatedStructureID: typeof viewer.getIsolatedStructureID === "function",
      hasGetSliceWithIsolatedStructure: typeof viewer.getSliceWithIsolatedStructure === "function",
      isolatedIds: (() => {
        try {
          return typeof viewer.getIsolatedStructureID === "function"
            ? Array.from(viewer.getIsolatedStructureID()).slice(0, 80)
            : [];
        } catch (_) {
          return [];
        }
      })()
    };
  };
  const runNativeDirectIsolate = async () => {
    const capture = window.__IMAIOS_CINE_TOOLS_NATIVE_VIEWER__;
    const viewer = capture?.viewer || null;
    const ids = uniqueNumericIds(
      options.ids
      || options.nativeIds
      || (Array.isArray(options.labels) ? options.labels.flatMap((entry) => entry?.nativeIds || entry?.nativeId || entry?.id || []) : [])
    );
    const result = {
      kind: "imaios-native-direct-isolate-page-context",
      version: 1,
      href: location.href,
      title: document.title,
      requestedIds: ids,
      called: [],
      errors: [],
      viewer: summarizeCapturedNativeViewer()
    };
    if (!viewer || typeof viewer.isolateStructure !== "function") {
      return {
        ...result,
        ok: false,
        reason: "Captured IMAIOS viewer with isolateStructure was not available."
      };
    }
    if (!ids.length) {
      return {
        ...result,
        ok: false,
        reason: "No native structure IDs were provided."
      };
    }

    const sourceName = cap(options.source || "codex-live-drill", 80);
    if (options.clearFirst && typeof viewer.cleanIsolate === "function") {
      try {
        viewer.cleanIsolate();
        result.clearedFirst = true;
      } catch (error) {
        result.errors.push({ step: "cleanIsolate", message: cap(error?.message || error, 600) });
      }
    }

    for (const id of ids) {
      try {
        viewer.isolateStructure(sourceName, id, null, null);
        result.called.push(id);
      } catch (error) {
        result.errors.push({ id, message: cap(error?.message || error, 700) });
      }
    }

    await new Promise((resolve) => setTimeout(resolve, Number(options.waitMs || 180)));
    result.viewerAfter = summarizeCapturedNativeViewer();
    result.lockedButtonText = cap(document.querySelector(".number-isolated")?.textContent || "", 80);
    result.ok = result.called.length === ids.length && result.errors.length === 0;
    if (!result.ok && !result.reason) {
      result.reason = `Called ${result.called.length}/${ids.length} native isolate request${ids.length === 1 ? "" : "s"}.`;
    }
    return result;
  };
  const runNativeClearIsolate = async () => {
    const capture = window.__IMAIOS_CINE_TOOLS_NATIVE_VIEWER__;
    const viewer = capture?.viewer || null;
    const result = {
      kind: "imaios-native-clear-isolate-page-context",
      version: 1,
      href: location.href,
      title: document.title,
      called: false,
      errors: [],
      viewer: summarizeCapturedNativeViewer()
    };
    if (!viewer || typeof viewer.cleanIsolate !== "function") {
      return {
        ...result,
        ok: false,
        reason: "Captured IMAIOS viewer with cleanIsolate was not available."
      };
    }
    try {
      viewer.cleanIsolate();
      result.called = true;
    } catch (error) {
      result.errors.push({ step: "cleanIsolate", message: cap(error?.message || error, 600) });
    }
    await new Promise((resolve) => setTimeout(resolve, Number(options.waitMs || 180)));
    result.viewerAfter = summarizeCapturedNativeViewer();
    result.lockedButtonText = cap(document.querySelector(".number-isolated")?.textContent || "", 80);
    result.ok = result.called && result.errors.length === 0;
    if (!result.ok && !result.reason) result.reason = "cleanIsolate call failed.";
    return result;
  };
  const collectFunctionCandidates = (root, rootPath, maxDepth = 4, maxHits = 180) => {
    const hits = [];
    const seen = new WeakSet();
    const visit = (value, path, depth) => {
      if (hits.length >= maxHits || depth > maxDepth || value == null) return;
      const type = typeOf(value);
      if (type === "function") {
        const key = path.split(".").pop() || "";
        let sourceText = "";
        try {
          sourceText = Function.prototype.toString.call(value);
        } catch (_) {
          sourceText = "";
        }
        if (actionPattern.test(key) || actionPattern.test(sourceText.slice(0, 900))) {
          hits.push(summarizeFunction(value, path));
        }
        return;
      }
      if (type !== "object" && type !== "array") return;
      if (seen.has(value)) return;
      seen.add(value);
      let keys = [];
      try {
        keys = Object.getOwnPropertyNames(value);
      } catch (_) {
        return;
      }
      const preferred = keys
        .filter((key) => actionPattern.test(key) || /^(ctx|proxy|setupState|props|state|store|stores|pinia|\$state|\$patch|\$onAction|\$reset|globalProperties|provides|appContext|value|items|list|map|modules|children)$/i.test(key))
        .slice(0, 90);
      const fallback = preferred.length ? [] : keys.slice(0, 30);
      for (const key of [...preferred, ...fallback]) {
        if (/^(parent|ownerDocument|document|window|top|self|frames|location|history|navigator)$/i.test(key)) continue;
        let child;
        try {
          child = value[key];
        } catch (_) {
          continue;
        }
        visit(child, `${path}.${key}`, depth + 1);
        if (hits.length >= maxHits) break;
      }
    };
    visit(root, rootPath, 0);
    return hits;
  };
  const summarizeVueComponent = (component, path) => {
    if (!component || typeof component !== "object") return null;
    const type = component.type || {};
    const appContext = component.appContext || {};
    return {
      path,
      uid: component.uid ?? null,
      typeName: type.name || type.__name || type.displayName || "",
      propsKeys: Object.keys(component.props || {}).filter((key) => actionPattern.test(key)).slice(0, 60),
      setupStateKeys: Object.keys(component.setupState || {}).filter((key) => actionPattern.test(key)).slice(0, 80),
      ctxKeys: Object.keys(component.ctx || {}).filter((key) => actionPattern.test(key)).slice(0, 80),
      proxyKeys: component.proxy ? Object.keys(component.proxy).filter((key) => actionPattern.test(key)).slice(0, 80) : [],
      globalPropertyKeys: Object.keys(appContext.config?.globalProperties || {}).filter((key) => actionPattern.test(key)).slice(0, 80),
      provideKeys: Object.keys(appContext.provides || {}).filter((key) => actionPattern.test(key)).slice(0, 80),
      functions: [
        ...collectFunctionCandidates(component.setupState, `${path}.setupState`, 3, 45),
        ...collectFunctionCandidates(component.ctx, `${path}.ctx`, 3, 45),
        ...collectFunctionCandidates(component.proxy, `${path}.proxy`, 3, 45),
        ...collectFunctionCandidates(component.appContext?.config?.globalProperties, `${path}.appContext.config.globalProperties`, 3, 45),
        ...collectFunctionCandidates(component.appContext?.provides, `${path}.appContext.provides`, 3, 45)
      ].slice(0, 140)
    };
  };
  const collectVueComponentCandidates = () => {
    const selectors = [
      "#app",
      "[data-v-app]",
      ".structure-title-component",
      ".structure-definition",
      ".panel-container",
      ".locked-structures",
      ".clear-isolate",
      "button",
      "input",
      "canvas",
      ".viewer",
      ".menu-viewer",
      "[class*='viewer']",
      "[class*='structure']",
      "[class*='label']",
      "[class*='pin']"
    ];
    const nodes = Array.from(document.querySelectorAll(selectors.join(","))).slice(0, 240);
    const components = [];
    const seen = new WeakSet();
    nodes.forEach((node, nodeIndex) => {
      const expandos = [];
      let keys = [];
      try {
        keys = Object.getOwnPropertyNames(node);
      } catch (_) {
        keys = [];
      }
      keys.filter((key) => /vue|pinia|store|state|app/i.test(key)).slice(0, 20).forEach((key) => {
        try {
          expandos.push({ key, summary: summarizeValue(node[key], `node.${nodeIndex}.${key}`, 0, new WeakSet()) });
        } catch (error) {
          expandos.push({ key, error: cap(error?.message || error) });
        }
      });
      let component = node.__vueParentComponent || node.__vue__ || null;
      let depth = 0;
      while (component && typeof component === "object" && depth < 8) {
        if (seen.has(component)) break;
        seen.add(component);
        components.push({
          node: elementSummary(node),
          nodeIndex,
          depth,
          expandos,
          component: summarizeVueComponent(component, `node.${nodeIndex}.__vueParentComponent${depth ? `.parent${depth}` : ""}`)
        });
        component = component.parent || null;
        depth += 1;
      }
    });
    return components.slice(0, 180);
  };
  const collectLikelyActionElements = () => Array.from(document.querySelectorAll("button,input,[role='button'],[role='option'],.structure-title-component,[class*='structure'],[class*='label'],[class*='pin'],[class*='isolate']"))
    .filter((element) => actionPattern.test(element.textContent || "") || actionPattern.test(element.className || "") || actionPattern.test(element.getAttribute("title") || "") || actionPattern.test(element.getAttribute("aria-label") || ""))
    .slice(0, 180)
    .map(elementSummary);
  const nativeActionDiscoveryProbe = () => {
    const rootNames = ["IMAIOS_ANATOMY", "imaios", "__INITIAL_STATE__", "__NUXT__", "__NEXT_DATA__", "__VUE_DEVTOOLS_GLOBAL_HOOK__", "app"];
    const globalFunctionCandidates = [];
    const globalRootSummaries = {};
    for (const name of rootNames) {
      try {
        if (window[name] !== undefined) {
          globalRootSummaries[name] = summarizeValue(window[name], `window.${name}`, 0, new WeakSet());
          globalFunctionCandidates.push(...collectFunctionCandidates(window[name], `window.${name}`, 4, 120));
        }
      } catch (error) {
        globalRootSummaries[name] = { error: cap(error?.message || error) };
      }
    }
    return {
      kind: "imaios-native-action-discovery-page-context",
      version: 1,
      mode,
      stage,
      href: location.href,
      title: document.title,
      options,
      windowKeys: Object.getOwnPropertyNames(window).filter((key) => pattern.test(key) || actionPattern.test(key)).slice(0, 260),
      globalRootSummaries,
      globalFunctionCandidates: globalFunctionCandidates.slice(0, 220),
      vueComponents: collectVueComponentCandidates(),
      likelyActionElements: collectLikelyActionElements(),
      resources: resourceProbe()
    };
  };
  const collectScriptResources = () => {
    const urls = new Set();
    try {
      Array.from(document.scripts || []).forEach((scriptEl) => {
        if (scriptEl.src) urls.add(scriptEl.src);
      });
    } catch (_) {}
    try {
      performance.getEntriesByType("resource")
        .filter((entry) => entry.initiatorType === "script" || /\.m?js(\?|$)/i.test(entry.name || ""))
        .forEach((entry) => {
          if (entry.name) urls.add(entry.name);
        });
    } catch (_) {}
    return Array.from(urls)
      .filter((url) => /^https?:\/\//i.test(url))
      .filter((url) => /imaios|eanatomy|app|viewer|module|assets|cdn/i.test(url))
      .slice(0, 80);
  };
  const searchTextSnippets = (text, terms) => {
    const hits = [];
    const lower = text.toLowerCase();
    for (const term of terms) {
      const normalized = String(term || "").toLowerCase();
      if (!normalized) continue;
      let index = lower.indexOf(normalized);
      let count = 0;
      const snippets = [];
      while (index >= 0 && count < 8) {
        const start = Math.max(0, index - 220);
        const end = Math.min(text.length, index + normalized.length + 360);
        snippets.push(cap(text.slice(start, end), 900));
        count += 1;
        index = lower.indexOf(normalized, index + normalized.length);
      }
      if (count) hits.push({ term, count, snippets });
    }
    return hits;
  };
  const nativeBundleSearchProbe = async () => {
    const defaultTerms = [
      "im_viewer_locked_structures",
      "im_viewer_last_series_seen",
      "im_viewer_last_slice_seen",
      "number-isolated",
      "clear-isolate",
      "isolate-mode",
      "list-structure",
      "structure-title-component",
      "locked structures",
      "lockedStructures",
      "locked_structures",
      "isolate",
      "isolated",
      "lockStructure",
      "unlockStructure",
      "selectStructure",
      "selectedStructures",
      "structureId",
      "structure_id",
      "pointId",
      "point_id",
      "annotation",
      "annotations",
      "localStorage.setItem"
    ];
    const terms = Array.isArray(options.terms) && options.terms.length
      ? options.terms.map(String)
      : defaultTerms;
    const scriptUrls = collectScriptResources();
    const results = [];
    for (const url of scriptUrls.slice(0, Number(options.maxScripts || 24))) {
      const item = { url, ok: false, status: null, textLength: 0, hits: [], sourceMapUrl: "", error: "" };
      try {
        const response = await fetch(url, { credentials: "include", cache: "force-cache" });
        item.status = response.status;
        if (!response.ok) {
          item.error = `HTTP ${response.status}`;
        } else {
          const text = await response.text();
          item.ok = true;
          item.textLength = text.length;
          const sourceMapMatch = text.match(/sourceMappingURL=([^\s*]+)/);
          if (sourceMapMatch) item.sourceMapUrl = sourceMapMatch[1] || "";
          item.hits = searchTextSnippets(text, terms);
        }
      } catch (error) {
        item.error = cap(error?.message || error, 500);
      }
      if (item.hits.length || item.error || /eanatomy|viewer|module|assets/i.test(url)) results.push(item);
    }
    return {
      kind: "imaios-native-bundle-search-page-context",
      version: 1,
      href: location.href,
      title: document.title,
      terms,
      scriptUrlCount: scriptUrls.length,
      scriptUrls,
      searchedCount: results.length,
      results
    };
  };
  const createTraceRecord = (type, detail = {}) => ({
    at: new Date().toISOString(),
    elapsedMs: window.__IMAIOS_NATIVE_ACTION_TRACE__?.startedAt ? Date.now() - window.__IMAIOS_NATIVE_ACTION_TRACE__.startedAt : 0,
    type,
    ...detail
  });
  const getFocusedStorageState = () => {
    const output = {};
    const keys = [];
    try {
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (key && /viewer|locked|lock|isolate|structure|label|pin|series|slice|module|im_/i.test(key)) keys.push(key);
      }
    } catch (_) {}
    keys.slice(0, 100).forEach((key) => {
      try {
        const raw = localStorage.getItem(key) || "";
        output[key] = { rawLength: raw.length, hash: hashText(raw), preview: cap(raw, 600) };
      } catch (error) {
        output[key] = { error: cap(error?.message || error) };
      }
    });
    return output;
  };
  const startNativeActionTrace = () => {
    if (window.__IMAIOS_NATIVE_ACTION_TRACE__?.stop) {
      try {
        window.__IMAIOS_NATIVE_ACTION_TRACE__.stop();
      } catch (_) {}
    }
    const trace = {
      kind: "imaios-native-action-trace-page-context",
      version: 1,
      startedAt: Date.now(),
      startedAtIso: new Date().toISOString(),
      href: location.href,
      title: document.title,
      options,
      records: [],
      initialStorage: getFocusedStorageState(),
      initialDom: {
        actionElements: collectLikelyActionElements().slice(0, 40)
      }
    };
    const push = (record) => {
      trace.records.push(record);
      if (trace.records.length > 600) trace.records.splice(0, trace.records.length - 600);
    };
    const eventHandler = (event) => {
      const path = typeof event.composedPath === "function" ? event.composedPath() : [];
      push(createTraceRecord(`event:${event.type}`, {
        target: elementSummary(event.target),
        path: path.filter((node) => node && node.nodeType === Node.ELEMENT_NODE).slice(0, 5).map(elementSummary),
        key: event.key || "",
        value: event.target && "value" in event.target ? cap(event.target.value, 180) : ""
      }));
    };
    const mutationObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations.slice(0, 12)) {
        const added = Array.from(mutation.addedNodes || [])
          .filter((node) => node.nodeType === Node.ELEMENT_NODE)
          .map(elementSummary)
          .filter((item) => item && (actionPattern.test(item.text || "") || actionPattern.test(item.className || "")))
          .slice(0, 8);
        if (added.length || (mutation.target && actionPattern.test(mutation.target.textContent || ""))) {
          push(createTraceRecord("mutation", {
            mutationType: mutation.type,
            target: elementSummary(mutation.target),
            added
          }));
        }
      }
    });
    const originalSetItem = Storage.prototype.setItem;
    const originalRemoveItem = Storage.prototype.removeItem;
    const originalClear = Storage.prototype.clear;
    Storage.prototype.setItem = function tracedSetItem(key, value) {
      if (/viewer|locked|lock|isolate|structure|label|pin|series|slice|module|im_/i.test(String(key || ""))) {
        push(createTraceRecord("localStorage.setItem", {
          key: String(key || ""),
          valueHash: hashText(value),
          valuePreview: cap(value, 700),
          stack: capMultiline(new Error().stack || "")
        }));
      }
      return originalSetItem.apply(this, arguments);
    };
    Storage.prototype.removeItem = function tracedRemoveItem(key) {
      if (/viewer|locked|lock|isolate|structure|label|pin|series|slice|module|im_/i.test(String(key || ""))) {
        push(createTraceRecord("localStorage.removeItem", {
          key: String(key || ""),
          stack: capMultiline(new Error().stack || "")
        }));
      }
      return originalRemoveItem.apply(this, arguments);
    };
    Storage.prototype.clear = function tracedClear() {
      push(createTraceRecord("localStorage.clear", { stack: capMultiline(new Error().stack || "") }));
      return originalClear.apply(this, arguments);
    };
    ["click", "pointerdown", "pointerup", "input", "change", "keydown"].forEach((type) => {
      document.addEventListener(type, eventHandler, true);
    });
    mutationObserver.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ["class", "aria-pressed", "aria-selected", "style"] });
    trace.stop = () => {
      ["click", "pointerdown", "pointerup", "input", "change", "keydown"].forEach((type) => {
        document.removeEventListener(type, eventHandler, true);
      });
      mutationObserver.disconnect();
      Storage.prototype.setItem = originalSetItem;
      Storage.prototype.removeItem = originalRemoveItem;
      Storage.prototype.clear = originalClear;
      trace.stoppedAtIso = new Date().toISOString();
    };
    window.__IMAIOS_NATIVE_ACTION_TRACE__ = trace;
    push(createTraceRecord("trace-started", { storage: trace.initialStorage }));
    return { ok: true, startedAt: trace.startedAtIso, href: trace.href };
  };
  const parseStackFrame = (line) => {
    const text = String(line || "").trim();
    const match = text.match(/^at\s+(.+?)\s+\((https?:\/\/[^)]+):(\d+):(\d+)\)$/)
      || text.match(/^at\s+(https?:\/\/\S+):(\d+):(\d+)$/);
    if (!match) return null;
    if (match.length === 5) {
      return {
        functionName: match[1],
        url: match[2],
        line: Number(match[3]),
        column: Number(match[4])
      };
    }
    return {
      functionName: "",
      url: match[1],
      line: Number(match[2]),
      column: Number(match[3])
    };
  };
  const collectStackFramesFromText = (stack) => {
    const text = String(stack || "");
    const frames = [];
    for (const line of text.split(/\n+/)) {
      const frame = parseStackFrame(line);
      if (frame) frames.push(frame);
    }
    if (frames.length) return frames;

    const functionFrameRegex = /\bat\s+([^()]+?)\s+\((https?:\/\/[^)]+):(\d+):(\d+)\)/g;
    let match;
    while ((match = functionFrameRegex.exec(text))) {
      frames.push({
        functionName: String(match[1] || "").trim(),
        url: match[2],
        line: Number(match[3]),
        column: Number(match[4])
      });
      if (frames.length >= 120) return frames;
    }

    const bareFrameRegex = /\bat\s+(https?:\/\/[^\s)]+):(\d+):(\d+)/g;
    while ((match = bareFrameRegex.exec(text))) {
      frames.push({
        functionName: "",
        url: match[1],
        line: Number(match[2]),
        column: Number(match[3])
      });
      if (frames.length >= 120) return frames;
    }
    return frames;
  };
  const collectTraceStackFrames = (records) => {
    const seen = new Set();
    const frames = [];
    for (const record of records || []) {
      const stack = String(record.stack || "");
      if (!stack) continue;
      for (const frame of collectStackFramesFromText(stack)) {
        if (!frame || !/imaios\.com\/build\/assets\/.*\.js/i.test(frame.url)) continue;
        const key = `${frame.url}:${frame.line}:${frame.column}:${frame.functionName}`;
        if (seen.has(key)) continue;
        seen.add(key);
        frames.push(frame);
        if (frames.length >= 60) return frames;
      }
    }
    return frames;
  };
  const fetchTraceStackSourceSnippets = async (records) => {
    const frames = collectTraceStackFrames(records);
    const sourceCache = new Map();
    const snippets = [];
    for (const frame of frames.slice(0, 36)) {
      const item = { ...frame, ok: false, snippet: "", error: "" };
      try {
        let source = sourceCache.get(frame.url);
        if (!source) {
          const response = await fetch(frame.url, { credentials: "include", cache: "force-cache" });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          source = await response.text();
          sourceCache.set(frame.url, source);
        }
        const lines = source.split(/\r?\n/);
        const sourceLine = lines[Math.max(0, frame.line - 1)] || "";
        const column = Number.isFinite(frame.column) ? Math.max(0, frame.column - 1) : 0;
        const start = Math.max(0, column - 360);
        const end = Math.min(sourceLine.length, column + 820);
        item.ok = true;
        item.sourceLineLength = sourceLine.length;
        item.snippetStartColumn = start + 1;
        item.snippetEndColumn = end;
        item.snippet = sourceLine.slice(start, end);
        const sourceMapMatch = source.match(/sourceMappingURL=([^\s*]+)/);
        if (sourceMapMatch) item.sourceMapUrl = sourceMapMatch[1] || "";
      } catch (error) {
        item.error = cap(error?.message || error, 600);
      }
      snippets.push(item);
    }
    return snippets;
  };
  const copyNativeActionTrace = async (shouldStop = false) => {
    const trace = window.__IMAIOS_NATIVE_ACTION_TRACE__;
    if (!trace) return { ok: false, reason: "No native action trace is running on the page." };
    const records = trace.records.slice(-600);
    const result = {
      kind: trace.kind,
      version: trace.version,
      href: location.href,
      title: document.title,
      startedAt: trace.startedAtIso,
      copiedAt: new Date().toISOString(),
      active: !trace.stoppedAtIso,
      recordCount: trace.records.length,
      options: trace.options || {},
      initialStorage: trace.initialStorage,
      finalStorage: getFocusedStorageState(),
      initialDom: trace.initialDom,
      finalDom: {
        actionElements: collectLikelyActionElements().slice(0, 80)
      },
      records,
      stackSourceSnippets: await fetchTraceStackSourceSnippets(records)
    };
    if (shouldStop && trace.stop) trace.stop();
    return result;
  };
  const findMatchingValues = (root, rootName) => {
    const hits = [];
    const seen = new WeakSet();
    const visit = (value, path, depth) => {
      if (hits.length >= 140 || depth > 4 || value == null) return;
      const type = typeOf(value);
      if (type === "string") {
        if (pattern.test(value)) hits.push({ path, type, value: cap(value, 650) });
        return;
      }
      if (type !== "object" && type !== "array") return;
      if (seen.has(value)) return;
      seen.add(value);
      let keys = [];
      try {
        keys = Object.getOwnPropertyNames(value);
      } catch (_) {
        return;
      }
      for (const key of keys.slice(0, 260)) {
        let child;
        try {
          child = value[key];
        } catch (_) {
          continue;
        }
        if (pattern.test(key)) {
          hits.push({ path: `${path}.${key}`, key, summary: summarizeValue(child, `${path}.${key}`, 0, new WeakSet()) });
          if (hits.length >= 140) return;
        }
        if (/^(parent|ownerDocument|document|window|top|self|frames)$/i.test(key)) continue;
        visit(child, `${path}.${key}`, depth + 1);
        if (hits.length >= 140) return;
      }
    };
    visit(root, rootName, 0);
    return hits;
  };
  const domExpandoProbe = () => {
    const nodes = Array.from(document.querySelectorAll("#app,[id*='anatomy-container'],.application-anatomy-container,.viewer,.menu-viewer,canvas")).slice(0, 40);
    return nodes.map((node, index) => {
      let keys = [];
      try {
        keys = Object.getOwnPropertyNames(node).filter((key) => /vue|react|fiber|store|state|anatomy|viewer|label|structure/i.test(key));
      } catch (_) {
        keys = [];
      }
      return {
        index,
        tag: node.tagName?.toLowerCase() || "",
        id: node.id || "",
        className: String(node.className || "").slice(0, 180),
        expandoKeys: keys.slice(0, 40),
        expandos: Object.fromEntries(keys.slice(0, 10).map((key) => {
          try {
            return [key, summarizeValue(node[key], `node.${key}`, 0, new WeakSet())];
          } catch (error) {
            return [key, { error: cap(error?.message || error) }];
          }
        }))
      };
    });
  };
  const resourceProbe = () => {
    try {
      return performance.getEntriesByType("resource")
        .filter((entry) => /api|json|anatom|structure|label|annotation|slice|series|image|viewer|module|rocher|dicom|seg/i.test(entry.name || ""))
        .slice(-240)
        .map((entry) => ({
          name: cap(entry.name, 520),
          initiatorType: entry.initiatorType || "",
          transferSize: entry.transferSize || 0,
          decodedBodySize: entry.decodedBodySize || 0
        }));
    } catch (_) {
      return [];
    }
  };
  try {
    if (mode === "native-action-discovery") {
      window.postMessage({
        source,
        nonce,
        payload: nativeActionDiscoveryProbe()
      }, "*");
      return;
    }
    if (mode === "native-bundle-search") {
      nativeBundleSearchProbe().then((payload) => {
        window.postMessage({ source, nonce, payload }, "*");
      }).catch((error) => {
        window.postMessage({
          source,
          nonce,
          payload: { ok: false, mode, error: cap(error?.stack || error, 1800) }
        }, "*");
      });
      return;
    }
    if (mode === "native-action-trace-start") {
      window.postMessage({
        source,
        nonce,
        payload: startNativeActionTrace()
      }, "*");
      return;
    }
    if (mode === "native-action-trace-copy" || mode === "native-action-trace-stop") {
      copyNativeActionTrace(mode === "native-action-trace-stop").then((payload) => {
        window.postMessage({ source, nonce, payload }, "*");
      }).catch((error) => {
        window.postMessage({
          source,
          nonce,
          payload: { ok: false, mode, error: cap(error?.stack || error, 1800) }
        }, "*");
      });
      return;
    }
    if (mode === "native-direct-isolate") {
      runNativeDirectIsolate().then((payload) => {
        window.postMessage({ source, nonce, payload }, "*");
      }).catch((error) => {
        window.postMessage({
          source,
          nonce,
          payload: { ok: false, mode, error: cap(error?.stack || error, 1800) }
        }, "*");
      });
      return;
    }
    if (mode === "native-clear-isolate") {
      runNativeClearIsolate().then((payload) => {
        window.postMessage({ source, nonce, payload }, "*");
      }).catch((error) => {
        window.postMessage({
          source,
          nonce,
          payload: { ok: false, mode, error: cap(error?.stack || error, 1800) }
        }, "*");
      });
      return;
    }
    let windowKeys = [];
    try {
      windowKeys = Object.getOwnPropertyNames(window).filter((key) => pattern.test(key)).slice(0, 220);
    } catch (_) {
      windowKeys = [];
    }
    const rootNames = ["IMAIOS_ANATOMY", "imaios", "__INITIAL_STATE__", "__NUXT__", "__NEXT_DATA__", "__VUE_DEVTOOLS_GLOBAL_HOOK__", "app"];
    const roots = {};
    for (const name of rootNames) {
      try {
        if (window[name] !== undefined) roots[name] = summarizeValue(window[name], `window.${name}`, 0, new WeakSet());
      } catch (error) {
        roots[name] = { error: cap(error?.message || error) };
      }
    }
    const matchingValues = [];
    for (const name of rootNames) {
      try {
        if (window[name] !== undefined) matchingValues.push(...findMatchingValues(window[name], `window.${name}`));
      } catch (_) {}
    }
    window.postMessage({
      source,
      nonce,
      payload: {
        ok: true,
        stage,
        href: location.href,
        windowKeys,
        roots,
        matchingValues: matchingValues.slice(0, 220),
        domExpandos: domExpandoProbe(),
        resources: resourceProbe()
      }
    }, "*");
  } catch (error) {
    window.postMessage({
      source,
      nonce,
      payload: { ok: false, stage, error: cap(error?.stack || error) }
    }, "*");
  }
})();
