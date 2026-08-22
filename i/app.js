(function () {
  'use strict';

  var SUPABASE_URL = 'https://sfiflidnsrdotoidvcmh.supabase.co';
  var SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_F9QbR2X9iJp62lf3aJnh8w_NXlYl3aD';
  var LANDING_VARIANT = 'I';
  var STORAGE_KEY = 'd_project_i_selected_amount';
  var ENTERPRISE_LINE_URL = '#';
  var initializedPixelIds = {};
  var pageViewTracked = false;
  var submittedApplicantName = '';
  var amountValues = [5, 10, 20, 30, 50, 80, 100];
  var amountIndex = 1;
  var selectedTerm = 60;
  var selectedAmount = 10;
  var selectedBand = '5萬-10萬';

  function $(selector) { return document.querySelector(selector); }
  function $all(selector) { return Array.prototype.slice.call(document.querySelectorAll(selector)); }

  function safeSessionGet(key) {
    try { return sessionStorage.getItem(key) || ''; } catch (error) { return ''; }
  }

  function safeSessionSet(key, value) {
    try { sessionStorage.setItem(key, value); } catch (error) { /* optional */ }
  }

  function amountBand(value) {
    if (value <= 10) return '5萬-10萬';
    if (value <= 30) return '10萬-30萬';
    if (value <= 50) return '30萬-50萬';
    return '50萬-100萬';
  }

  function formatMoney(value) {
    return 'NT$ ' + Math.max(0, Math.round(value)).toLocaleString('zh-TW');
  }

  function monthlyPayment(principal, annualRate, months) {
    var rate = annualRate / 12;
    if (!rate) return principal / months;
    return principal * rate / (1 - Math.pow(1 + rate, -months));
  }

  function annualRateForTerm(term) {
    var rates = {
      24: .035,
      36: .03,
      60: .025,
      84: .02,
      120: .015
    };
    return rates[term] || .025;
  }

  function renderCalculator() {
    selectedAmount = amountValues[amountIndex];
    selectedBand = amountBand(selectedAmount);
    var amountDisplay = $('#amount-display');
    var amountBandText = $('#amount-band');
    var selectedAmountText = $('#selected-amount');
    var paymentText = $('#monthly-payment');
    var rateText = $('#rate-display');
    var progress = $('#amount-progress-bar');
    var prev = $('#amount-prev');
    var next = $('#amount-next');

    if (amountDisplay) amountDisplay.textContent = selectedAmount + ' 萬';
    if (amountBandText) amountBandText.textContent = '需求區間 ' + selectedBand;
    if (selectedAmountText) selectedAmountText.textContent = selectedBand;
    var annualRate = annualRateForTerm(selectedTerm);
    if (paymentText) paymentText.textContent = formatMoney(monthlyPayment(selectedAmount * 10000, annualRate, selectedTerm));
    if (rateText) rateText.textContent = (annualRate * 100).toFixed(1) + '%';
    if (progress) progress.style.width = ((selectedAmount - 5) / 95 * 100) + '%';
    if (prev) prev.disabled = amountIndex === 0;
    if (next) next.disabled = amountIndex === amountValues.length - 1;

    $all('.term-button').forEach(function (button) {
      var active = Number(button.getAttribute('data-term')) === selectedTerm;
      button.classList.toggle('selected', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    $all('.form-amount-option').forEach(function (button) {
      var active = button.getAttribute('data-band') === selectedBand;
      button.classList.toggle('selected', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    safeSessionSet(STORAGE_KEY, String(selectedAmount));
  }

  function bindCalculator() {
    var restored = Number(safeSessionGet(STORAGE_KEY));
    var restoredIndex = amountValues.indexOf(restored);
    if (restoredIndex >= 0) amountIndex = restoredIndex;

    $('#amount-prev').addEventListener('click', function () {
      amountIndex = Math.max(0, amountIndex - 1);
      renderCalculator();
    });
    $('#amount-next').addEventListener('click', function () {
      amountIndex = Math.min(amountValues.length - 1, amountIndex + 1);
      renderCalculator();
    });
    $all('.term-button').forEach(function (button) {
      button.addEventListener('click', function () {
        selectedTerm = Number(button.getAttribute('data-term')) || 60;
        renderCalculator();
      });
    });
    $all('.form-amount-option').forEach(function (button) {
      button.addEventListener('click', function () {
        amountIndex = Number(button.getAttribute('data-index'));
        renderCalculator();
      });
    });
    renderCalculator();
  }

  function getTrafficSource() {
    var params = new URLSearchParams(window.location.search);
    var explicit = (params.get('utm_source') || params.get('source') || '').trim();
    if (explicit) return explicit.slice(0, 80);
    if (params.get('fbclid')) return 'FB';
    if (params.get('ttclid')) return 'TikTok';
    return '';
  }

  function createLeadId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (char) {
      var random = Math.random() * 16 | 0;
      var value = char === 'x' ? random : (random & 3 | 8);
      return value.toString(16);
    });
  }

  function installFbPixelBase() {
    if (window.fbq) return;
    var fbq = function () { fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : fbq.queue.push(arguments); };
    window.fbq = fbq;
    if (!window._fbq) window._fbq = fbq;
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = '2.0';
    fbq.queue = [];
    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    var firstScript = document.getElementsByTagName('script')[0];
    firstScript.parentNode.insertBefore(script, firstScript);
  }

  function initializeFbPixels(pixelIds) {
    if (!pixelIds.length) return;
    installFbPixelBase();
    var newIds = [];
    pixelIds.slice(0, 5).forEach(function (pixelId) {
      var id = String(pixelId || '').trim();
      if (!/^\d{8,20}$/.test(id) || initializedPixelIds[id]) return;
      window.fbq('init', id);
      initializedPixelIds[id] = true;
      newIds.push(id);
    });
    newIds.forEach(function (id) { window.fbq('trackSingle', id, 'PageView'); });
    if (newIds.length) pageViewTracked = true;
  }

  function trackFbEvent(eventName, parameters) {
    if (!pageViewTracked || typeof window.fbq !== 'function') return;
    Object.keys(initializedPixelIds).forEach(function (id) {
      window.fbq('trackSingle', id, eventName, parameters || {});
    });
  }

  function extractFbPixelIds(settings) {
    if (!Array.isArray(settings)) return [];
    var ids = [];
    settings.forEach(function (item) {
      if (!item || typeof item !== 'object' || item.enabled === false) return;
      var platform = String(item.platform || item.type || '').toLowerCase();
      if (platform.includes('tiktok')) return;
      var variant = String(item.variant || item.landing_variant || item.page_variant || item.version || '').trim().toUpperCase().replace(/版$/, '');
      var id = String(item.id || item.pixel_id || item.pixelId || '').trim();
      if (variant === LANDING_VARIANT && /^\d{8,20}$/.test(id) && ids.indexOf(id) === -1) ids.push(id);
    });
    return ids.slice(0, 5);
  }

  function applyLineConfig() {
    var button = $('#line-add-button');
    if (button) button.href = ENTERPRISE_LINE_URL || '#';
  }

  async function loadSiteConfig() {
    try {
      var response = await fetch(SUPABASE_URL + '/rest/v1/site_settings?id=eq.1&select=line_url,e_line_url,line_id,pixel_ids', {
        headers: {
          apikey: SUPABASE_PUBLISHABLE_KEY,
          Authorization: 'Bearer ' + SUPABASE_PUBLISHABLE_KEY
        }
      });
      if (!response.ok) throw new Error('Settings unavailable');
      var rows = await response.json();
      var settings = rows && rows[0] ? rows[0] : {};
      ENTERPRISE_LINE_URL = String(settings.e_line_url || settings.line_url || '#').trim();
      initializeFbPixels(extractFbPixelIds(settings.pixel_ids));
    } catch (error) {
      console.warn('Site configuration unavailable', error);
    }
    applyLineConfig();
  }

  var siteConfigPromise = loadSiteConfig();

  function detectClientDevice(userAgent) {
    var ua = String(userAgent || '');
    if (/iPad|Tablet/i.test(ua)) return '平板';
    if (/iPhone|iPod/i.test(ua)) return '手機（iPhone）';
    if (/Android/i.test(ua)) return /Mobile/i.test(ua) ? '手機（Android）' : '平板（Android）';
    if (/Windows/i.test(ua)) return '桌機（Windows）';
    if (/Macintosh|Mac OS X/i.test(ua)) return '桌機（macOS）';
    if (/Linux/i.test(ua)) return '桌機（Linux）';
    return '其他設備';
  }

  function detectClientBrowser(userAgent) {
    var ua = String(userAgent || '');
    if (/FBAN|FBAV|FB_IAB/i.test(ua)) return 'Facebook 內建瀏覽器';
    if (/Instagram/i.test(ua)) return 'Instagram 內建瀏覽器';
    if (/Line\//i.test(ua)) return 'LINE 內建瀏覽器';
    if (/Edg\//i.test(ua)) return 'Microsoft Edge';
    if (/CriOS\//i.test(ua)) return 'Google Chrome（iOS）';
    if (/Chrome\//i.test(ua)) return 'Google Chrome';
    if (/FxiOS\//i.test(ua)) return 'Firefox（iOS）';
    if (/Firefox\//i.test(ua)) return 'Firefox';
    if (/Safari\//i.test(ua)) return 'Safari';
    return '其他瀏覽器';
  }

  async function collectClientMetadata() {
    var userAgent = navigator.userAgent || '';
    var metadata = {
      ip_address: '',
      device_type: detectClientDevice(userAgent),
      browser_name: detectClientBrowser(userAgent)
    };
    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, 2500) : null;
    try {
      var response = await fetch('https://api64.ipify.org?format=json', {
        cache: 'no-store',
        signal: controller ? controller.signal : undefined
      });
      if (response.ok) {
        var result = await response.json();
        metadata.ip_address = String(result.ip || '').trim();
      }
    } catch (error) { /* IP is optional */ }
    if (timer) clearTimeout(timer);
    return metadata;
  }

  var clientMetadataPromise = collectClientMetadata();

  function showFieldError(name, text) {
    var error = document.querySelector('[data-error-for="' + name + '"]');
    if (error) error.textContent = text;
    var input = document.forms['lead-form'] ? document.forms['lead-form'].elements[name] : null;
    if (input && input.classList) input.classList.add('invalid');
  }

  function clearErrors() {
    $all('.field-error').forEach(function (item) { item.textContent = ''; });
    $all('input.invalid').forEach(function (item) { item.classList.remove('invalid'); });
    $('#form-status').textContent = '';
  }

  function validateForm(form) {
    clearErrors();
    var data = new FormData(form);
    var values = {
      name: String(data.get('name') || '').trim(),
      age: String(data.get('age') || '').trim(),
      warningAccount: String(data.get('warning_account') || '')
    };
    var valid = true;
    var age = Number(values.age);
    if (!values.name) { showFieldError('name', '請填寫本人真實姓名。'); valid = false; }
    if (!/^\d{1,3}$/.test(values.age) || age < 18 || age > 100) { showFieldError('age', '請填寫正確年齡。'); valid = false; }
    if (!values.warningAccount) { showFieldError('warning_account', '請選擇是否為警示戶。'); valid = false; }
    if (values.warningAccount === '警示戶') {
      showFieldError('warning_account', '警示戶目前無法辦理。');
      $('#form-status').textContent = '此服務目前僅受理非警示戶，資料不會送出。';
      valid = false;
    }
    return valid ? values : null;
  }

  async function submitLeadPayload(payload) {
    var options = {
      method: 'POST',
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: 'Bearer ' + SUPABASE_PUBLISHABLE_KEY,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      },
      body: JSON.stringify(payload)
    };
    var optionalFields = ['traffic_source', 'ip_address', 'device_type', 'browser_name'];
    for (var attempt = 0; attempt <= optionalFields.length; attempt += 1) {
      var response = await fetch(SUPABASE_URL + '/rest/v1/leads', options);
      if (response.ok) return response;
      var errorText = await response.clone().text();
      var fallback = JSON.parse(options.body);
      var removed = false;
      optionalFields.forEach(function (field) {
        if (Object.prototype.hasOwnProperty.call(fallback, field) && errorText.includes(field)) {
          delete fallback[field];
          removed = true;
        }
      });
      if (!removed) return response;
      options.body = JSON.stringify(fallback);
    }
  }

  async function markLineClicked() {
    if (!window.__lastLeadId) return;
    try {
      await fetch(SUPABASE_URL + '/rest/v1/rpc/mark_line_clicked', {
        method: 'POST',
        headers: {
          apikey: SUPABASE_PUBLISHABLE_KEY,
          Authorization: 'Bearer ' + SUPABASE_PUBLISHABLE_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ lead_id: window.__lastLeadId })
      });
    } catch (error) { /* LINE should still open */ }
  }

  async function copyApplicantName() {
    var name = submittedApplicantName || String($('#name').value || '').trim();
    if (!name) return false;
    var copied = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(name);
        copied = true;
      }
    } catch (error) { /* use fallback */ }
    if (!copied) {
      var textarea = document.createElement('textarea');
      textarea.value = name;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try { copied = document.execCommand('copy'); } catch (error) { copied = false; }
      textarea.remove();
    }
    $('#copy-line-name-status').textContent = copied ? '姓名已複製，進入 LINE 後貼上並發送。' : '請進入 LINE 後手動輸入並發送姓名。';
    return copied;
  }

  function smoothScroll(target) {
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function bindPageNavigation() {
    var applyZone = $('#apply-zone');
    var floating = $('#floating-apply');
    $('#go-apply').addEventListener('click', function () { smoothScroll($('.form-card')); });
    if (floating) floating.addEventListener('click', function () { smoothScroll($('.form-card')); });

    if ('IntersectionObserver' in window) {
      var heroButtonVisible = true;
      var formVisible = false;
      function syncFloating() {
        floating.hidden = window.innerWidth > 620 || heroButtonVisible || formVisible || !$('#success-panel').hidden;
      }
      new IntersectionObserver(function (entries) {
        heroButtonVisible = entries[0].isIntersecting;
        syncFloating();
      }, { threshold: .1 }).observe($('#go-apply'));
      new IntersectionObserver(function (entries) {
        formVisible = entries[0].isIntersecting;
        syncFloating();
      }, { threshold: .12 }).observe(applyZone);
      window.addEventListener('resize', syncFloating, { passive: true });
    }
  }

  function bindReviews() {
    var track = $('#review-track');
    var cards = $all('.review-card');
    function shift(direction) {
      var distance = cards.length ? cards[0].getBoundingClientRect().width + 14 : 360;
      track.scrollBy({ left: distance * direction, behavior: 'smooth' });
    }
    $('#review-prev').addEventListener('click', function () { shift(-1); });
    $('#review-next').addEventListener('click', function () { shift(1); });
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      var timer = setInterval(function () {
        var atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 12;
        track.scrollTo({ left: atEnd ? 0 : track.scrollLeft + (cards[0].getBoundingClientRect().width + 14), behavior: 'smooth' });
      }, 5200);
      track.addEventListener('pointerdown', function () { clearInterval(timer); }, { once: true });
    }
  }

  function bindForm() {
    var form = $('#lead-form');
    var ageInput = $('#age');
    var warningHelp = $('#warning-help');
    var submitButton = $('#submit-button');

    ageInput.addEventListener('input', function () { ageInput.value = ageInput.value.replace(/\D/g, '').slice(0, 3); });
    $all('input[name="warning_account"]').forEach(function (input) {
      input.addEventListener('change', function () {
        var rejected = input.checked && input.value === '警示戶';
        warningHelp.textContent = rejected ? '警示戶目前不符合辦理條件，無法送出申請。' : '本服務目前僅受理非警示戶申請。';
        warningHelp.classList.toggle('rejected', rejected);
        submitButton.disabled = rejected;
        if (!rejected) document.querySelector('[data-error-for="warning_account"]').textContent = '';
      });
    });

    $('#copy-line-name-button').addEventListener('click', copyApplicantName);
    $('#line-add-button').addEventListener('click', function (event) {
      if (!ENTERPRISE_LINE_URL || ENTERPRISE_LINE_URL === '#') {
        event.preventDefault();
        $('#copy-line-name-status').textContent = 'LINE 連結載入中，請稍後再試。';
        return;
      }
      copyApplicantName();
      markLineClicked();
    });

    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      var values = validateForm(form);
      if (!values) return;

      submitButton.disabled = true;
      submitButton.textContent = '資料送出中，請稍候';
      var clientMetadata = await clientMetadataPromise;
      var payload = {
        id: createLeadId(),
        name: values.name,
        age: values.age,
        city: '',
        id_number: '',
        phone: '',
        line_id: '',
        q1_existing_loan: '',
        q2_bank_status: values.warningAccount,
        q3_amount_needed: selectedBand,
        q4_foreign_currency_account: '',
        source_url: window.location.href,
        traffic_source: getTrafficSource() || null,
        user_agent: navigator.userAgent,
        ip_address: clientMetadata.ip_address,
        device_type: clientMetadata.device_type,
        browser_name: clientMetadata.browser_name,
        business_type: 'loan',
        landing_variant: LANDING_VARIANT,
        line_clicked: false
      };

      try {
        await siteConfigPromise;
        var response = await submitLeadPayload(payload);
        if (!response || !response.ok) throw new Error('Submission failed');
        window.__lastLeadId = payload.id;
        submittedApplicantName = values.name;
        $('#line-name-to-send').textContent = submittedApplicantName;
        trackFbEvent('CompleteRegistration', { content_name: 'D項目I版本', status: 'submitted' });
        trackFbEvent('Lead', { content_name: 'D項目I版本', content_category: '貸款申請', value: 0, currency: 'TWD' });
        $('#application-layout').hidden = true;
        $('#floating-apply').hidden = true;
        var success = $('#success-panel');
        success.hidden = false;
        success.focus({ preventScroll: true });
        smoothScroll(success);
      } catch (error) {
        console.warn('Lead submission failed', error);
        $('#form-status').textContent = '資料暫時無法送出，請稍後再試。已填寫的內容仍保留。';
        submitButton.disabled = false;
        submitButton.textContent = '重新送出資料';
      }
    });
  }

  bindCalculator();
  bindPageNavigation();
  bindReviews();
  bindForm();
})();
