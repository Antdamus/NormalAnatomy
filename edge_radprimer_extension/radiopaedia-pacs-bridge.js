(() => {
  if (window.__radiopaediaPacsBridgeInstalled) return;
  window.__radiopaediaPacsBridgeInstalled = true;

  const REQUEST_EVENT = "radiopaedia-pacs-bridge-request";
  const RESPONSE_EVENT = "radiopaedia-pacs-bridge-response";
  const STATIC_ASSET_ORIGIN = "https://prod-assets-static.radiopaedia.org";

  let apiPromise = null;
  let apiUrl = "";
  let lastApiError = "";

  function unique(values) {
    return Array.from(new Set(values.filter(Boolean)));
  }

  function resourceUrls() {
    const fromDom = Array.from(document.querySelectorAll("script[src], link[href]"))
      .map((el) => el.src || el.href || "");
    const fromPerformance = (() => {
      try {
        return performance.getEntriesByType("resource").map((entry) => entry.name || "");
      } catch {
        return [];
      }
    })();
    return unique([...fromDom, ...fromPerformance]);
  }

  function packOrigins() {
    const origins = resourceUrls()
      .map((raw) => {
        try {
          const url = new URL(raw, location.href);
          return url.pathname.includes("/packs/") ? url.origin : "";
        } catch {
          return "";
        }
      });
    return unique([...origins, STATIC_ASSET_ORIGIN, location.origin]);
  }

  function resolveFromModule(specifier, moduleUrl) {
    try {
      return new URL(specifier, moduleUrl).href;
    } catch {
      return "";
    }
  }

  function resolveFromOrigin(specifier, origin) {
    try {
      if (/^https?:\/\//i.test(specifier)) return specifier;
      if (specifier.startsWith("/")) return `${origin}${specifier}`;
      return new URL(specifier, `${origin}/packs/`).href;
    } catch {
      return "";
    }
  }

  async function fetchText(url) {
    const response = await fetch(url, { credentials: "omit", cache: "force-cache" });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return response.text();
  }

  function fullscreenViewerUrlsFromResources() {
    return resourceUrls().filter((url) => /\/packs\/FullscreenViewer-[A-Z0-9]+\.js(?:[?#].*)?$/i.test(url));
  }

  async function fullscreenViewerUrlsFromAppBundles() {
    const appUrls = resourceUrls()
      .filter((url) => /\/packs\/(?:javascript\/packs\/)?app-[A-Z0-9]+\.js(?:[?#].*)?$/i.test(url));
    const found = [];

    for (const appUrl of appUrls) {
      try {
        const text = await fetchText(appUrl);
        const matches = text.matchAll(/\.FullscreenViewer["']\s*,\s*\(\)\s*=>\s*import\(["']([^"']+)["']\)/g);
        for (const match of matches) {
          const resolved = resolveFromModule(match[1], appUrl);
          if (resolved) found.push(resolved);
        }
      } catch {
        // App bundle discovery is best effort; hardcoded fallbacks below still run.
      }
    }

    return unique(found);
  }

  async function viewportApiUrlsFromFullscreenModule(fullscreenUrl) {
    const text = await fetchText(fullscreenUrl);
    const urls = [];
    const importMatches = text.matchAll(/import\{([^}]+)\}from["']([^"']+)["']/g);
    for (const match of importMatches) {
      if (!/(^|,)\s*R\s+as\s+\w+/.test(match[1])) continue;
      const resolved = resolveFromModule(match[2], fullscreenUrl);
      if (resolved) urls.push(resolved);
    }
    return urls;
  }

  async function apiUrlCandidates() {
    const candidates = [];
    const fullscreenUrls = unique([
      ...fullscreenViewerUrlsFromResources(),
      ...(await fullscreenViewerUrlsFromAppBundles())
    ]);

    for (const fullscreenUrl of fullscreenUrls) {
      try {
        candidates.push(...await viewportApiUrlsFromFullscreenModule(fullscreenUrl));
      } catch {
        // If Radiopaedia renames one bundle while another is already loaded, keep trying.
      }
    }

    for (const origin of packOrigins()) {
      candidates.push(resolveFromOrigin("/packs/chunk-7F4OAYFM.js", origin));
    }

    return unique(candidates);
  }

  function isViewportApi(api) {
    if (typeof api?.R !== "function") return false;
    let viewports = [];
    try {
      viewports = api.R();
    } catch {
      return false;
    }

    return Array.isArray(viewports) && viewports.some((viewport) =>
      typeof viewport?.selectSeriesIdx === "function" &&
      typeof viewport?.setFrameIdx === "function" &&
      Array.isArray(viewport?.props?.allSeries)
    );
  }

  async function loadApi() {
    if (!apiPromise) {
      apiPromise = (async () => {
        const candidates = await apiUrlCandidates();
        const errors = [];
        for (const candidate of candidates) {
          try {
            const api = await import(candidate);
            if (isViewportApi(api)) {
              apiUrl = candidate;
              lastApiError = "";
              return api;
            }
            errors.push(`${candidate}: missing mounted viewport API`);
          } catch (error) {
            errors.push(`${candidate}: ${error?.message || String(error)}`);
          }
        }
        lastApiError = errors.slice(0, 3).join(" | ") || "No viewport API candidates found";
        throw new Error(lastApiError);
      })();
    }

    try {
      return await apiPromise;
    } catch (error) {
      apiPromise = null;
      throw error;
    }
  }

  function imageHost() {
    return document.querySelector('link[rel="image-host"]')?.getAttribute("href") ||
      "https://prod-images-static.radiopaedia.org";
  }

  function firstFile(record) {
    if (!record) return "";
    return record.big_gallery || record.jumbo || record.large || record.medium || record.original ||
      Object.values(record).find((value) => typeof value === "string") ||
      "";
  }

  function frameUrl(series, frameIndex) {
    const frame = series?.frames?.[frameIndex];
    const encoded = series?.encodings?.thumbnailed_files?.[frameIndex];
    const file = firstFile(encoded);
    if (!frame?.id || !file) return "";
    return `${imageHost()}/images/${frame.id}/${file}`;
  }

  function sequenceFromSeries(series, fallbackIndex) {
    const first = firstFile(series?.encodings?.thumbnailed_files?.[0]);
    const match = String(first || "").match(/IMG-(\d+)-/i);
    return match ? parseInt(match[1], 10) : fallbackIndex + 1;
  }

  function getViewports(api) {
    try {
      return typeof api.R === "function" ? api.R() : [];
    } catch {
      return [];
    }
  }

  function activeViewportForSeries(api, seriesId) {
    const wanted = String(seriesId || "");
    const viewports = getViewports(api).filter((viewport) => !viewport.props?.hidden);
    return viewports.find((viewport) => String(viewport.seriesId?.() || "") === wanted) ||
      viewports[0] ||
      getViewports(api)[0] ||
      null;
  }

  function allSeries(api) {
    const viewport = getViewports(api).find((item) => Array.isArray(item.props?.allSeries));
    return viewport?.props?.allSeries || [];
  }

  function seriesFrameIndex(viewport, series) {
    const sameSeries = viewport && String(viewport.seriesId?.() || "") === String(series.series_id);
    if (sameSeries && Number.isFinite(viewport.frameIdx?.value) && viewport.frameIdx.value >= 0) {
      return viewport.frameIdx.value;
    }
    if (sameSeries) {
      const frameId = viewport.frameId?.value;
      const fromId = series.frames?.findIndex((frame) => frame.id === frameId);
      if (fromId >= 0) return fromId;
    }
    const current = series.frames?.findIndex((frame) => frame.current);
    return current >= 0 ? current : 0;
  }

  function buildState(api) {
    const viewports = getViewports(api);
    const seriesList = allSeries(api);
    const modality = api.N?._currentValue || document.querySelector(".FullscreenViewer span")?.textContent?.trim() || "Radiopaedia";

    return {
      bridge: {
        ok: true,
        apiUrl,
        viewportCount: viewports.length,
        seriesCount: seriesList.length
      },
      modality,
      series: seriesList.map((series, index) => {
        const viewport = viewports.find((item) => String(item.seriesId?.() || "") === String(series.series_id));
        const frameIdx = seriesFrameIndex(viewport, series);
        const sequenceNumber = sequenceFromSeries(series, index);
        return {
          key: String(series.series_id),
          seriesId: series.series_id,
          order: index,
          visible: Boolean(viewport && !viewport.props?.hidden),
          viewport: typeof viewport?.props?.slot === "number" ? `Viewport ${viewport.props.slot + 1}` : "",
          label: `Series ${sequenceNumber}`,
          modality,
          sequenceNumber,
          frameIdx,
          totalSlices: series.frames?.length || 0,
          frames: (series.frames || []).map((frame, frameIndex) => ({
            id: frame.id,
            imageId: String(frame.id || ""),
            width: frame.width,
            height: frame.height,
            frameIdx: frameIndex,
            sliceNumber: frameIndex + 1,
            imageUrl: frameUrl(series, frameIndex)
          })).filter((frame) => frame.imageUrl)
        };
      }).filter((series) => series.frames.length)
    };
  }

  function clampFrameIndex(series, frameIdx) {
    const max = Math.max(0, (series?.frames?.length || 1) - 1);
    const parsed = parseInt(frameIdx, 10);
    if (!Number.isFinite(parsed)) return 0;
    return Math.max(0, Math.min(max, parsed));
  }

  function setFrame(api, payload = {}) {
    const seriesList = allSeries(api);
    const seriesIdx = seriesList.findIndex((series) => String(series.series_id) === String(payload.seriesId));
    if (seriesIdx < 0) return false;

    const series = seriesList[seriesIdx];
    const frameIdx = clampFrameIndex(series, payload.frameIdx);
    const viewport = activeViewportForSeries(api, payload.seriesId);
    if (!viewport) return false;

    if (String(viewport.seriesId?.() || "") !== String(payload.seriesId)) {
      viewport.selectSeriesIdx?.(seriesIdx);
    }

    const frameId = series.frames?.[frameIdx]?.id;
    if (frameId && viewport.frameId) viewport.frameId.value = frameId;
    else viewport.setFrameIdx?.(frameIdx);
    return true;
  }

  function nextPaint() {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
  }

  async function handleRequest(event) {
    const detail = event.detail || {};
    const requestId = detail.requestId;
    if (!requestId) return;

    try {
      const api = await loadApi();
      let ok = true;
      if (detail.action === "set-frame") {
        ok = setFrame(api, detail.payload || {});
        await nextPaint();
      }

      document.dispatchEvent(new CustomEvent(RESPONSE_EVENT, {
        detail: {
          requestId,
          ok,
          state: buildState(api)
        }
      }));
    } catch (error) {
      document.dispatchEvent(new CustomEvent(RESPONSE_EVENT, {
        detail: {
          requestId,
          ok: false,
          error: error?.message || String(error),
          state: {
            bridge: {
              ok: false,
              apiUrl,
              error: lastApiError || error?.message || String(error)
            },
            series: []
          }
        }
      }));
    }
  }

  document.addEventListener(REQUEST_EVENT, handleRequest);
})();
