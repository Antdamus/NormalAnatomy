(function (root) {
  "use strict";
  let connection;
  function open() {
    if (!connection) connection = new Promise((resolve, reject) => {
      const request = indexedDB.open("radiology-visual-lectures", 2);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains("lessons")) request.result.createObjectStore("lessons", { keyPath: "id" });
        if (!request.result.objectStoreNames.contains("assets")) request.result.createObjectStore("assets", { keyPath: "key" });
        if (!request.result.objectStoreNames.contains("cardReviews")) request.result.createObjectStore("cardReviews", { keyPath: "lessonId" });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => { connection = null; reject(request.error); };
    });
    return connection;
  }
  async function operation(store, method, value, mode = "readonly") {
    const db = await open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(store, mode);
      const request = transaction.objectStore(store)[method](value);
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error || new Error("Local lesson storage failed."));
    });
  }
  root.VisualLectureStore = {
    getReview: id => operation("cardReviews", "get", id),
    putReview: review => operation("cardReviews", "put", review, "readwrite"),
    updateReview: async (lesson, imageId, patch) => {
      const db = await open();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction("cardReviews", "readwrite");
        const reviews = transaction.objectStore("cardReviews");
        const request = reviews.get(lesson.id);
        let updated, error;
        request.onsuccess = () => {
          try { updated = LectureCardReview.update(request.result, lesson, imageId, patch); reviews.put(updated); }
          catch (failure) { error = failure; transaction.abort(); }
        };
        transaction.oncomplete = () => resolve(updated);
        transaction.onerror = transaction.onabort = () => reject(error || transaction.error || new Error("Could not save card selection."));
      });
    },
    get: id => operation("lessons", "get", id),
    put: lesson => operation("lessons", "put", { ...lesson, updatedAt: Date.now() }, "readwrite"),
    list: async () => (await operation("lessons", "getAll")).map(({ id, title, status, updatedAt }) => ({ id, title, status, updatedAt })).sort((a, b) => b.updatedAt - a.updatedAt),
    asset: key => operation("assets", "get", key),
    putAsset: (key, blob) => operation("assets", "put", { key, blob }, "readwrite")
  };
})(globalThis);
