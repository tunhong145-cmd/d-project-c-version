(function () {
  'use strict';
  var SITE_ID = 'main';
  var URL_BASE = 'https://sfiflidnsrdotoidvcmh.supabase.co';
  var KEY = 'sb_publishable_F9QbR2X9iJp62lf3aJnh8w_NXlYl3aD';
  var preview = location.protocol === 'file:' || /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  var controller = new AbortController();
  var timer;
  var ready = preview ? Promise.resolve([]) : (async function () {
    timer = setTimeout(function () { controller.abort(); }, 8000);
    try {
      var response = await fetch(URL_BASE + '/rest/v1/repository_fb_pixels?site_id=eq.' + SITE_ID + '&select=variant,pixel_ids', {
        headers: { apikey: KEY, Authorization: 'Bearer ' + KEY }, signal: controller.signal, cache: 'no-store'
      });
      if (!response.ok) throw new Error('FB configuration unavailable');
      var rows = await response.json();
      return Array.isArray(rows) ? rows : [];
    } catch (error) {
      console.warn('Repository FB pixels not loaded; no shared fallback will be used.');
      return [];
    } finally { clearTimeout(timer); }
  })();
  window.RepoPixels = {
    siteId: SITE_ID,
    load: async function (variant) {
      var rows = await ready;
      var row = rows.find(function (item) { return item.variant === variant; });
      var pixels = row && Array.isArray(row.pixel_ids) ? row.pixel_ids : [];
      return pixels.filter(function (p) { return p && p.enabled !== false; })
        .map(function (p) { return String(p.id || '').trim(); })
        .filter(function (id, i, ids) { return /^\d{8,20}$/.test(id) && ids.indexOf(id) === i; }).slice(0, 5);
    }
  };
})();
