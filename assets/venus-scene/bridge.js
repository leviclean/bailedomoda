/* Connect the original Musée scene to the Baile page without nested scrolling. */
(() => {
  'use strict';
  const parentOrigin = location.origin;
  const nativeRAF = window.requestAnimationFrame.bind(window);
  const nativeCancel = window.cancelAnimationFrame.bind(window);
  const started = performance.now();
  const jobs = new Map();
  let sequence = 0, paused = false, active = false, reduced = false, progress = 0, rendered = false;
  // Keep the original mesh and materials; limit the render resolution on phones.
  const ratio = Math.min(devicePixelRatio, matchMedia('(pointer:coarse)').matches ? 1 : 1.5);
  try { Object.defineProperty(window, 'devicePixelRatio', { get: () => ratio }); } catch (_) {}

  function schedule(job) {
    job.native = nativeRAF(time => {
      if (paused) return;
      jobs.delete(job.id);
      job.callback(time);
    });
  }
  window.requestAnimationFrame = callback => {
    const job = { id: ++sequence, callback, native: 0 };
    jobs.set(job.id, job);
    if (!paused) schedule(job);
    return job.id;
  };
  window.cancelAnimationFrame = id => {
    const job = jobs.get(id);
    if (job) { nativeCancel(job.native); jobs.delete(id); }
  };
  function syncRendering() {
    const next = rendered && performance.now() - started > 10000 && (!active || reduced || document.hidden);
    if (next === paused) return;
    paused = next;
    for (const job of jobs.values()) {
      if (paused) nativeCancel(job.native);
      else schedule(job);
    }
  }
  function syncScroll() {
    window.__baileVenusProgress = reduced ? 0 : progress;
  }
  addEventListener('message', event => {
    if (event.source !== parent || event.origin !== parentOrigin) return;
    if(event.data?.type !== 'baile-venus-progress')return;
    progress = Math.max(0, Math.min(1, Number(event.data.progress) || 0));
    active = event.data.active === true;
    reduced = event.data.reduced === true;
    syncRendering();
    syncScroll();
  });
  addEventListener('load', () => {
    syncScroll();
    parent.postMessage({ type: 'baile-venus-ready' }, parentOrigin);
    // The load event precedes Draco decoding and the first rendered model frame.
    // Keep the iframe hidden until the original Venus component has mounted.
    let drawnFrames = 0;
    function waitForModel() {
      const canvas = document.querySelector('canvas');
      if (window.__baileVenusModelMounted && canvas?.width > 0) {
        if (++drawnFrames >= 3) {
          rendered = true;
          parent.postMessage({ type: 'baile-venus-rendered' }, parentOrigin);
          syncRendering();
          return;
        }
      }
      nativeRAF(waitForModel);
    }
    nativeRAF(waitForModel);
  }, { once: true });
  addEventListener('resize', syncScroll, { passive: true });
  document.addEventListener('visibilitychange', syncRendering);
  setTimeout(syncRendering, 10500);
})();
