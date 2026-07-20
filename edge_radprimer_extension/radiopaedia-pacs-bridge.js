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

  function finiteNumber(value, fallback = null) {
    if (Number.isFinite(value)) return value;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
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
    return resourceUrls().filter((url) =>
      /\/packs\/(?:javascript\/)?(?:chunks\/)?FullscreenViewer-[^/?#]+\.js(?:[?#].*)?$/i.test(url)
    );
  }

  async function fullscreenViewerUrlsFromAppBundles() {
    const appUrls = resourceUrls()
      .filter((url) => /\/packs\/(?:javascript\/packs\/)?app-[^/?#]+\.js(?:[?#].*)?$/i.test(url));
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
    const importMatches = text.matchAll(/import\s*\{([^}]+)\}\s*from\s*["']([^"']+)["']/g);
    for (const match of importMatches) {
      const resolved = resolveFromModule(match[2], fullscreenUrl);
      if (!resolved) continue;
      if (/(^|,)\s*R\s+as\s+\w+/.test(match[1])) urls.unshift(resolved);
      else urls.push(resolved);
    }
    const bareImportMatches = text.matchAll(/import\(["']([^"']+)["']\)/g);
    for (const match of bareImportMatches) {
      const resolved = resolveFromModule(match[1], fullscreenUrl);
      if (resolved) urls.push(resolved);
    }
    const sideEffectImportMatches = text.matchAll(/import\s*["']([^"']+)["']/g);
    for (const match of sideEffectImportMatches) {
      const resolved = resolveFromModule(match[1], fullscreenUrl);
      if (resolved) urls.push(resolved);
    }
    return urls;
  }

  function chunkUrlsFromResources() {
    return resourceUrls().filter((url) =>
      /\/packs\/(?:javascript\/)?(?:chunks\/)?chunk-[^/?#]+\.js(?:[?#].*)?$/i.test(url)
    );
  }

  function viewportAllSeries(viewport) {
    return Array.isArray(viewport?.props?.allSeries) ? viewport.props.allSeries : [];
  }

  function signalValue(signal) {
    if (!signal) return undefined;
    try {
      if ("value" in signal) return signal.value;
    } catch {}
    try {
      if (typeof signal.peek === "function") return signal.peek();
    } catch {}
    return signal._currentValue;
  }

  function currentComponent(api) {
    return signalValue(api?.D) || signalValue(api?.currentComponent) || null;
  }

  function currentStudy(api) {
    const component = currentComponent(api);
    if (component?.type === "Study" && component.study) return component.study;
    if (component?.study?.series) return component.study;
    if (api?.study?.series) return api.study;
    return null;
  }

  function studySeries(api) {
    const series = currentStudy(api)?.series;
    return Array.isArray(series) ? series : [];
  }

  function hasFrames(series) {
    return Array.isArray(series?.frames) && series.frames.length > 0;
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
    candidates.push(...chunkUrlsFromResources());

    return unique(candidates);
  }

  function isViewportApi(api) {
    const series = studySeries(api);
    if (series.some(hasFrames)) return true;

    const viewports = getViewports(api);
    return viewports.some((viewport) => viewportAllSeries(viewport).some(hasFrames));
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
            errors.push(`${candidate}: missing readable Radiopaedia study state`);
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
    if (typeof record === "string") return record;
    return record.big_gallery || record.jumbo || record.large || record.medium || record.original ||
      Object.values(record).find((value) => typeof value === "string") ||
      "";
  }

  function frameUrl(series, frameIndex) {
    const frame = series?.frames?.[frameIndex];
    const encoded =
      series?.encodings?.thumbnailed_files?.[frameIndex] ||
      frame?.encodings?.thumbnailed_files ||
      frame?.thumbnailed_files ||
      frame?.files ||
      frame?.file ||
      frame?.image_url ||
      frame?.url;
    const file = firstFile(encoded);
    if (/^https?:\/\//i.test(file)) return file;
    if (!frame?.id || !file) return "";
    return `${imageHost()}/images/${frame.id}/${file}`;
  }

  function sequenceFromSeries(series, fallbackIndex) {
    const first = firstFile(series?.encodings?.thumbnailed_files?.[0]);
    const match = String(first || "").match(/IMG-(\d+)-/i);
    return match ? parseInt(match[1], 10) : fallbackIndex + 1;
  }

  function labelPart(value) {
    return String(value || "")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function seriesLabel(series, sequenceNumber) {
    const parts = [
      labelPart(series?.perspective),
      labelPart(series?.specifics)
    ].filter(Boolean);
    return parts.length ? parts.join(" ") : `Series ${sequenceNumber}`;
  }

  function getViewports(api) {
    const candidates = [
      api?.viewports,
      signalValue(api?.viewports),
      signalValue(api?.visibleViewports),
      window.viewerViewportStore?.visibleViewports
    ];
    return candidates.find((candidate) => Array.isArray(candidate)) || [];
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
    const fromStudy = studySeries(api);
    if (fromStudy.length) return fromStudy;

    const viewport = getViewports(api).find((item) => viewportAllSeries(item).length);
    return viewportAllSeries(viewport);
  }

  function imageIdFromUrl(url) {
    const match = String(url || "").match(/\/images\/(\d+)\//i);
    return match ? match[1] : "";
  }

  function domFrameIdForSeries(seriesId) {
    const wanted = String(seriesId || "");
    const containers = Array.from(document.querySelectorAll("[data-series-id]"))
      .filter((container) => String(container.getAttribute("data-series-id") || "") === wanted);
    for (const container of containers) {
      const images = Array.from(container.querySelectorAll("img[src]"));
      const visibleImage = images.find((img) => img.offsetParent !== null) || images[0];
      const imageId = imageIdFromUrl(visibleImage?.currentSrc || visibleImage?.src || "");
      if (imageId) return imageId;
    }
    return "";
  }

  function seriesFrameIndex(viewport, series) {
    const sameSeries = viewport && String(viewport.seriesId?.() || "") === String(series.series_id);
    const viewportFrameIdx = finiteNumber(viewport?.frameIdx?.value);
    if (sameSeries && viewportFrameIdx !== null && viewportFrameIdx >= 0) {
      return viewportFrameIdx;
    }
    if (sameSeries) {
      const frameId = viewport.frameId?.value;
      const fromId = series.frames?.findIndex((frame) => frame.id === frameId);
      if (fromId >= 0) return fromId;
    }

    const frameIds = [
      domFrameIdForSeries(series.series_id),
      series.current_image_id,
      series.image_id,
      series.stack_root_id
    ].filter(Boolean).map(String);
    for (const frameId of frameIds) {
      const fromId = series.frames?.findIndex((frame) => String(frame.id || "") === frameId);
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
        const label = seriesLabel(series, sequenceNumber);
        return {
          key: String(series.series_id),
          seriesId: series.series_id,
          order: index,
          visible: Boolean(viewport && !viewport.props?.hidden),
          viewport: typeof viewport?.props?.slot === "number" ? `Viewport ${viewport.props.slot + 1}` : "",
          label,
          seriesNumberLabel: `Series ${sequenceNumber}`,
          perspective: labelPart(series.perspective),
          specifics: labelPart(series.specifics),
          contentType: labelPart(series.content_type),
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

  function setFrame() {
    return false;
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
