(function (window, document) {
  'use strict';

  var urlBase = 'https://sfiflidnsrdotoidvcmh.supabase.co/rest/v1/rpc/';
  var publicKey = 'sb_publishable_F9QbR2X9iJp62lf3aJnh8w_NXlYl3aD';
  var campaignName = '2026安心周轉專案';
  var category = '貸款引流';

  function getHeaders(json) {
    var headers = { apikey: publicKey, Authorization: 'Bearer ' + publicKey };
    if (json) headers['Content-Type'] = 'application/json';
    return headers;
  }

  function safeLineUrl(value) {
    try {
      var url = new URL(value);
      if (url.protocol === 'https:' && (url.hostname === 'lin.ee' || url.hostname === 'line.me') &&
          !url.username && !url.password && !url.port && url.pathname.length > 1) return url.href;
    } catch (error) { /* Invalid or missing URLs must not fall back to another version. */ }
    return '';
  }

  function validIds(ids, pattern) {
    return (Array.isArray(ids) ? ids : []).map(String).filter(function (id, index, list) {
      return pattern.test(id) && list.indexOf(id) === index;
    });
  }

  function loadScript(source) {
    var script = document.createElement('script');
    script.async = true;
    script.src = source;
    var first = document.getElementsByTagName('script')[0];
    if (first && first.parentNode) first.parentNode.insertBefore(script, first);
    else document.head.appendChild(script);
  }

  function installFacebook() {
    if (typeof window.fbq === 'function') return;
    var fbq = function () {
      if (fbq.callMethod) return fbq.callMethod.apply(fbq, arguments);
      fbq.queue.push(arguments);
    };
    window.fbq = fbq;
    if (!window._fbq) window._fbq = fbq;
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = '2.0';
    fbq.queue = [];
    loadScript('https://connect.facebook.net/en_US/fbevents.js');
  }

  function initializeTikTok(ids) {
    if (!ids.length) return false;
    window.TiktokAnalyticsObject = 'ttq';
    var queue = window.ttq = window.ttq || [];
    if (typeof queue.load !== 'function') {
      queue.methods = ['page','track','identify','instances','debug','on','off','once','ready','alias','group','enableCookie','disableCookie','holdConsent','revokeConsent','grantConsent'];
      queue.setAndDefer = function (target, method) {
        target[method] = function () {
          target.push([method].concat(Array.prototype.slice.call(arguments, 0)));
        };
      };
      queue.methods.forEach(function (method) { queue.setAndDefer(queue, method); });
      queue.instance = function (id) {
        var instance = queue._i[id] || [];
        queue.methods.forEach(function (method) { queue.setAndDefer(instance, method); });
        return instance;
      };
      queue.load = function (id, options) {
        var url = 'https://analytics.tiktok.com/i18n/pixel/events.js';
        queue._i = queue._i || {};
        queue._i[id] = [];
        queue._i[id]._u = url;
        queue._t = queue._t || {};
        queue._t[id] = Date.now();
        queue._o = queue._o || {};
        queue._o[id] = options || {};
        loadScript(url + '?sdkid=' + encodeURIComponent(id) + '&lib=ttq');
      };
    }
    ids.forEach(function (id) { queue.load(id); });
    queue.page();
    return true;
  }

  function detectTrafficSource(localPreview) {
    if (localPreview) return '';
    var params = new URLSearchParams(window.location.search);
    var value = String(params.get('utm_source') || params.get('source') || '').toLowerCase();
    var source = params.get('fbclid') || /facebook|meta|(^|[^a-z])fb([^a-z]|$)/.test(value) ? 'FB' :
      params.get('ttclid') || /tiktok|tik_tok|(^|[^a-z])tk([^a-z]|$)/.test(value) ? 'TikTok' : '';
    try {
      var key = 'traffic_source_x_k';
      if (source) window.localStorage.setItem(key, JSON.stringify({ source: source, saved_at: Date.now() }));
      else {
        var saved = JSON.parse(window.localStorage.getItem(key) || 'null');
        if (saved && Date.now() - saved.saved_at < 86400000) return saved.source;
      }
    } catch (error) { /* Attribution storage is optional. */ }
    return source;
  }

  function create() {
    var localPreview = window.location.protocol === 'file:' || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname);
    var trafficSource = detectTrafficSource(localPreview);
    var fbIds = [];
    var leadId = null;
    var confirmedId = null;
    var submissionPending = null;
    var conversionQueued = false;
    var noConfig = { lineUrl: '', lineId: '', tiktokIds: [] };

    function trackFacebook(name, parameters, custom) {
      if (localPreview || typeof window.fbq !== 'function') return;
      fbIds.forEach(function (id) {
        try { window.fbq(custom ? 'trackSingleCustom' : 'trackSingle', id, name, parameters || {}); }
        catch (error) { console.warn('K Facebook event unavailable:', error); }
      });
    }

    var facebookReady = localPreview ? Promise.resolve() : Promise.resolve().then(function () {
      return window.RepoPixels ? window.RepoPixels.load('K') : [];
    }).then(function (ids) {
      fbIds = validIds(ids, /^\d{8,20}$/);
      if (!fbIds.length) return;
      installFacebook();
      fbIds.forEach(function (id) { window.fbq('init', id); });
      trackFacebook('PageView');
    }).catch(function (error) {
      fbIds = [];
      console.warn('K Facebook configuration unavailable:', error);
    });

    var settingsReady = localPreview ? Promise.resolve(noConfig) : Promise.resolve().then(async function () {
      var response = await fetch(urlBase + 'get_x_loan_k_config', { headers: getHeaders(false) });
      if (!response.ok) throw new Error('K settings unavailable');
      var settings = await response.json();
      if (!settings) return noConfig;
      var lineUrl = safeLineUrl(settings.line_url);
      var tiktokIds = (Array.isArray(settings.pixel_ids) ? settings.pixel_ids : [])
        .filter(function (pixel) { return pixel && pixel.enabled !== false && pixel.platform === 'tiktok'; })
        .map(function (pixel) { return String(pixel.id || ''); });
      return { lineUrl: lineUrl, lineId: lineUrl ? String(settings.line_id || '') : '', tiktokIds: tiktokIds };
    }).catch(function (error) {
      console.warn('K configuration unavailable:', error);
      return noConfig;
    });

    var ready = settingsReady.then(function (settings) { return { lineUrl: settings.lineUrl, lineId: settings.lineId }; });
    var tiktokReady = settingsReady.then(function (settings) {
      return !localPreview && initializeTikTok(validIds(settings.tiktokIds, /^[A-Z0-9]{10,30}$/i));
    }).catch(function (error) {
      console.warn('K TikTok configuration unavailable:', error);
      return false;
    });

    function queueFacebook(name, parameters, custom) {
      if (!localPreview) facebookReady.then(function () { trackFacebook(name, parameters, custom); });
    }

    function trackApply() {
      queueFacebook('ClickFloatCTA', {}, true);
      queueFacebook('InitiateCheckout');
    }

    function trackEligible() { queueFacebook('AddToCart'); }

    function trackSubmitted() {
      if (localPreview || !confirmedId || conversionQueued) return;
      conversionQueued = true;
      queueFacebook('Lead', { content_name: campaignName, content_category: category, value: 0, currency: 'TWD' });
      queueFacebook('CompleteRegistration', { content_name: campaignName, status: 'submitted' });
      tiktokReady.then(function (initialized) {
        if (initialized && window.ttq && typeof window.ttq.track === 'function') {
          window.ttq.track('SubmitApplication', { content_type: 'loan_application' });
        }
      }).catch(function (error) { console.warn('K TikTok event unavailable:', error); });
    }

    function submit(payload) {
      if (localPreview) return Promise.resolve({ ok: true, status: 201 });
      if (confirmedId) return Promise.resolve({ ok: true, status: 201 });
      if (submissionPending) return submissionPending;
      submissionPending = ready.then(async function (config) {
        if (!config.lineUrl) return { ok: false, status: 503, code: 'K_LINE_NOT_CONFIGURED' };
        if (!payload.id || (payload.q2_bank_status !== '非警示戶' && payload.q2_bank_status !== '否')) {
          return { ok: false, status: 400, code: 'INVALID_K_LEAD' };
        }
        leadId = leadId || payload.id;
        var headers = getHeaders(true);
        headers.Prefer = 'return=minimal';
        var response = await fetch(urlBase + 'submit_x_loan_k_lead', {
          method: 'POST',
          headers: headers,
          body: JSON.stringify({ payload: {
            id: leadId,
            name: payload.name,
            age: Number(payload.age),
            phone: payload.phone,
            q2_bank_status: '否',
            q3_amount_needed: payload.q3_amount_needed,
            project_code: 'X貸款',
            landing_version: 'K版本',
            source_url: window.location.href,
            traffic_source: trafficSource || null,
            user_agent: window.navigator.userAgent
          } })
        });
        if (response.ok) confirmedId = leadId;
        return response;
      }).finally(function () { submissionPending = null; });
      return submissionPending;
    }

    function markLineClicked() {
      if (localPreview || !confirmedId) return Promise.resolve();
      queueFacebook('LineAddFriend', { content_name: '企業LINE加好友', content_category: category }, true);
      return fetch(urlBase + 'mark_x_loan_line_clicked', {
        method: 'POST',
        keepalive: true,
        headers: getHeaders(true),
        body: JSON.stringify({ lead_id: confirmedId })
      }).catch(function (error) { console.warn('K LINE click record unavailable:', error); });
    }

    var viewed = false;
    if (!localPreview) window.addEventListener('scroll', function () {
      if (viewed) return;
      var scrollPercent = (window.scrollY + window.innerHeight) / document.documentElement.scrollHeight;
      if (scrollPercent <= 0.5) return;
      viewed = true;
      queueFacebook('ViewContent', { content_name: campaignName, content_category: category });
    }, { passive: true });

    return {
      ready: ready,
      submit: submit,
      markLineClicked: markLineClicked,
      trackApply: trackApply,
      trackEligible: trackEligible,
      trackSubmitted: trackSubmitted,
      getTrafficSource: function () { return trafficSource; }
    };
  }

  window.KCopperTransport = { create: create };
})(window, document);
