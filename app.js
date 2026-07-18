(function () {
  'use strict';

  var SUPABASE_URL = 'https://sfiflidnsrdotoidvcmh.supabase.co';
  var SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_F9QbR2X9iJp62lf3aJnh8w_NXlYl3aD';
  var VALID_AMOUNTS = ['10萬-20萬', '20萬-30萬', '30萬-50萬', '50萬-100萬'];
  var STORAGE_KEY = 'd_project_c_selected_amount';
  var ENTERPRISE_LINE_ID = '@111tfmeq';
  var ENTERPRISE_LINE_URL = 'https://line.me/R/ti/p/@111tfmeq';
  var FALLBACK_PIXEL_IDS = ['975921495153095', '1033980915864419'];
  var initializedPixelIds = {};

  function safeSessionGet(key) {
    try { return sessionStorage.getItem(key) || ''; } catch (error) { return ''; }
  }

  function safeSessionSet(key, value) {
    try { sessionStorage.setItem(key, value); } catch (error) { /* session storage is optional */ }
  }

  function getTrackingParams() {
    var source = new URLSearchParams(window.location.search);
    var allowed = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'source', 'fbclid', 'ttclid'];
    var target = new URLSearchParams();
    allowed.forEach(function (key) {
      var value = source.get(key);
      if (value) target.set(key, value);
    });
    return target;
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
    var fbq = function () {
      fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : fbq.queue.push(arguments);
    };
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
    installFbPixelBase();
    pixelIds.forEach(function (pixelId) {
      var normalized = String(pixelId || '').trim();
      if (!/^\d{8,20}$/.test(normalized) || initializedPixelIds[normalized]) return;
      window.fbq('init', normalized);
      initializedPixelIds[normalized] = true;
    });
    if (Object.keys(initializedPixelIds).length) window.fbq('track', 'PageView');
  }

  function extractFbPixelIds(pixelSettings) {
    if (!Array.isArray(pixelSettings)) return [];
    return pixelSettings.map(function (item) {
      if (typeof item === 'string' || typeof item === 'number') return String(item);
      if (!item || item.enabled === false) return '';
      var platform = String(item.platform || item.type || '').toLowerCase();
      if (platform.includes('tiktok')) return '';
      return String(item.id || item.pixel_id || item.pixelId || '');
    }).filter(function (id) { return /^\d{8,20}$/.test(id.trim()); });
  }

  function applyLineConfig() {
    var lineButton = document.getElementById('line-add-button');
    var lineIdText = document.getElementById('line-id-text');
    if (lineButton) lineButton.href = ENTERPRISE_LINE_URL;
    if (lineIdText) lineIdText.textContent = ENTERPRISE_LINE_ID;
  }

  async function loadSiteConfig() {
    try {
      var response = await fetch(SUPABASE_URL + '/rest/v1/site_settings?id=eq.1&select=line_url,line_id,pixel_ids', {
        headers: {
          apikey: SUPABASE_PUBLISHABLE_KEY,
          Authorization: 'Bearer ' + SUPABASE_PUBLISHABLE_KEY
        }
      });
      if (!response.ok) throw new Error('Settings unavailable');
      var rows = await response.json();
      var settings = rows && rows[0] ? rows[0] : {};
      if (settings.line_id) ENTERPRISE_LINE_ID = String(settings.line_id).trim();
      if (settings.line_url) ENTERPRISE_LINE_URL = String(settings.line_url).trim();
      var configuredPixelIds = extractFbPixelIds(settings.pixel_ids);
      initializeFbPixels(configuredPixelIds.length ? configuredPixelIds : FALLBACK_PIXEL_IDS);
    } catch (error) {
      initializeFbPixels(FALLBACK_PIXEL_IDS);
    }
    applyLineConfig();
  }

  var siteConfigPromise = loadSiteConfig();

  function initAmountPage() {
    var optionButtons = Array.prototype.slice.call(document.querySelectorAll('.amount-option'));
    var continueButton = document.getElementById('amount-continue');
    var message = document.getElementById('selection-message');
    var selectedAmount = '';

    function renderSelection() {
      optionButtons.forEach(function (button) {
        var isSelected = button.getAttribute('data-amount') === selectedAmount;
        button.classList.toggle('selected', isSelected);
        button.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
      });

      if (selectedAmount) {
        continueButton.disabled = false;
        continueButton.textContent = '我想借 ' + selectedAmount + '，繼續填資料';
        message.textContent = '已選擇 ' + selectedAmount + '，下一步只要填 5 項資料';
        message.classList.add('ready');
      } else {
        continueButton.disabled = true;
        continueButton.textContent = '先選擇你想借的金額';
        message.textContent = '點一個金額，馬上填資料';
        message.classList.remove('ready');
      }
    }

    optionButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        selectedAmount = button.getAttribute('data-amount') || '';
        safeSessionSet(STORAGE_KEY, selectedAmount);
        renderSelection();
      });
    });

    continueButton.addEventListener('click', function () {
      if (!VALID_AMOUNTS.includes(selectedAmount)) return;
      var params = getTrackingParams();
      params.set('amount', selectedAmount);
      window.location.href = 'apply.html?' + params.toString();
    });

    var restored = safeSessionGet(STORAGE_KEY);
    if (VALID_AMOUNTS.includes(restored)) selectedAmount = restored;
    renderSelection();
  }

  function initApplyPage() {
    var params = new URLSearchParams(window.location.search);
    var selectedAmount = params.get('amount') || safeSessionGet(STORAGE_KEY);
    var amountDisplay = document.getElementById('selected-amount');
    var successAmount = document.getElementById('success-amount');
    var form = document.getElementById('lead-form');
    var layout = document.getElementById('application-layout');
    var successPanel = document.getElementById('success-panel');
    var submitButton = document.getElementById('submit-button');
    var formStatus = document.getElementById('form-status');
    var lineButton = document.getElementById('line-add-button');
    var birthInput = document.getElementById('birth-date');
    var editLinks = [document.getElementById('edit-amount-link'), document.getElementById('change-amount-link')];

    var backParams = getTrackingParams();
    var backUrl = 'index.html' + (backParams.toString() ? '?' + backParams.toString() : '');
    editLinks.forEach(function (link) { if (link) link.href = backUrl; });

    birthInput.addEventListener('input', function () {
      var digits = birthInput.value.replace(/\D/g, '').slice(0, 8);
      var formatted = digits.slice(0, 4);
      if (digits.length > 4) formatted += '/' + digits.slice(4, 6);
      if (digits.length > 6) formatted += '/' + digits.slice(6, 8);
      birthInput.value = formatted;
    });

    if (!VALID_AMOUNTS.includes(selectedAmount)) {
      amountDisplay.textContent = '請重新選擇';
      submitButton.disabled = true;
      formStatus.textContent = '尚未選擇需求金額，請返回上一頁選擇。';
    } else {
      safeSessionSet(STORAGE_KEY, selectedAmount);
      amountDisplay.textContent = selectedAmount;
      successAmount.textContent = selectedAmount;
    }

    function clearErrors() {
      Array.prototype.forEach.call(form.querySelectorAll('.field-error'), function (element) { element.textContent = ''; });
      Array.prototype.forEach.call(form.querySelectorAll('input.invalid'), function (element) { element.classList.remove('invalid'); });
      formStatus.textContent = '';
    }

    function showFieldError(name, text) {
      var errorElement = form.querySelector('[data-error-for="' + name + '"]');
      var inputElement = form.elements[name];
      if (errorElement) errorElement.textContent = text;
      if (inputElement && inputElement.classList) inputElement.classList.add('invalid');
    }

    function readAndValidate() {
      clearErrors();
      var data = new FormData(form);
      var values = {
        name: String(data.get('name') || '').trim(),
        phone: String(data.get('phone') || '').trim(),
        birthDate: String(data.get('birth_date') || '').trim(),
        lineId: String(data.get('line_id') || '').trim(),
        warningAccount: String(data.get('warning_account') || '')
      };
      var valid = true;

      if (!values.name) { showFieldError('name', '請填寫姓名。'); valid = false; }
      if (!values.phone) { showFieldError('phone', '請填寫聯絡電話。'); valid = false; }
      if (!values.birthDate) { showFieldError('birth_date', '請填寫出生年月日。'); valid = false; }
      if (!values.lineId) { showFieldError('line_id', '請填寫 LINE 帳號。'); valid = false; }
      if (!values.warningAccount) { showFieldError('warning_account', '請選擇是否為警示戶。'); valid = false; }
      if (!VALID_AMOUNTS.includes(selectedAmount)) { formStatus.textContent = '請先返回上一頁選擇需求金額。'; valid = false; }

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

      var response = await fetch(SUPABASE_URL + '/rest/v1/leads', options);
      if (!response.ok && payload.traffic_source) {
        var errorText = await response.clone().text();
        if (errorText.includes('traffic_source')) {
          var fallback = Object.assign({}, payload);
          delete fallback.traffic_source;
          options.body = JSON.stringify(fallback);
          response = await fetch(SUPABASE_URL + '/rest/v1/leads', options);
        }
      }
      return response;
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
      } catch (error) { /* LINE still opens if click tracking is unavailable */ }
    }

    if (lineButton) lineButton.addEventListener('click', markLineClicked);

    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      if (submitButton.disabled) return;
      var values = readAndValidate();
      if (!values) return;

      submitButton.disabled = true;
      submitButton.textContent = '資料送出中，請稍候';
      formStatus.textContent = '';

      var payload = {
        id: createLeadId(),
        name: values.name,
        age: values.birthDate,
        city: '',
        id_number: '',
        phone: values.phone,
        line_id: values.lineId,
        q1_existing_loan: '',
        q2_bank_status: values.warningAccount,
        q3_amount_needed: selectedAmount,
        q4_foreign_currency_account: '',
        source_url: window.location.href,
        traffic_source: getTrafficSource() || null,
        user_agent: navigator.userAgent
      };

      try {
        var response = await submitLeadPayload(payload);
        if (!response.ok) throw new Error('Submission failed: ' + response.status);
        window.__lastLeadId = payload.id;
        await siteConfigPromise;
        if (typeof window.fbq === 'function' && Object.keys(initializedPixelIds).length) {
          window.fbq('track', 'CompleteRegistration', {
            content_name: 'D項目C版本',
            status: 'submitted'
          });
          window.fbq('track', 'Lead', {
            content_name: 'D項目C版本',
            content_category: '貸款申請',
            value: 0,
            currency: 'TWD'
          });
        }
        layout.hidden = true;
        successPanel.hidden = false;
        successPanel.focus({ preventScroll: true });
        successPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (error) {
        console.warn('Lead submission failed', error);
        formStatus.textContent = '資料暫時無法送出，請稍後再試。你已填寫的內容仍保留在頁面中。';
        submitButton.disabled = false;
        submitButton.textContent = '重新送出資料';
      }
    });
  }

  var page = document.body.getAttribute('data-page');
  if (page === 'amount') initAmountPage();
  if (page === 'apply') initApplyPage();
})();
