(() => {
  const script = document.currentScript;
  const source = script?.dataset?.source || "imaios-cine-tools:page-context-probe";
  const nonce = script?.dataset?.nonce || "";
  const stage = script?.dataset?.stage || "";
  const pattern = /imaios|eanatomy|anatomy|viewer|slice|series|label|labels|structure|structures|annotation|annotations|image|images|organ|pin|point|marker|overlay|module|rocher|Head-Neck-CT|store|state|vue|pinia/i;
  const cap = (value, max = 500) => {
    const text = String(value == null ? "" : value).replace(/\s+/g, " ").trim();
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
