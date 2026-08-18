(function () {
  'use strict';

  var SUPABASE_URL = 'https://sfiflidnsrdotoidvcmh.supabase.co';
  var SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_F9QbR2X9iJp62lf3aJnh8w_NXlYl3aD';
  var VALID_AMOUNTS = ['5萬-10萬', '10萬-30萬', '30萬-50萬', '50萬-100萬'];
  var LANDING_VARIANT = 'I';
  var STORAGE_KEY = 'd_project_i_selected_amount';
  var ENTERPRISE_LINE_URL = 'https://lin.ee/591VM3X';
  var ENTERPRISE_LINE_ID = '';
  var FALLBACK_PIXEL_IDS = ['975921495153095', '1738086803985039'];
  var initializedPixelIds = {};
  var pageViewTracked = false;
  var selectedAmount = '5萬-10萬';
  var selectedTerm = 72;
  var amountNumber = 80000;
  var submittedApplicantName = '';
  var AMOUNT_STEPS = [
    { amount: '5萬-10萬', number: 80000, tag: '小額急用，門檻低' },
    { amount: '10萬-30萬', number: 200000, tag: '資金補足，常見週轉' },
    { amount: '30萬-50萬', number: 400000, tag: '大額需求，優先確認' },
    { amount: '50萬-100萬', number: 700000, tag: '高額週轉，專員核對' }
  ];

  function $(selector) { return document.querySelector(selector); }
  function $all(selector) { return Array.prototype.slice.call(document.querySelectorAll(selector)); }

  function safeSessionGet(key) {
    try { return sessionStorage.getItem(key) || ''; } catch (error) { return ''; }
  }

  function safeSessionSet(key, value) {
    try { sessionStorage.setItem(key, value); } catch (error) { /* optional */ }
  }

  function money(value) {
    return 'NT$ ' + Number(value || 0).toLocaleString('zh-TW');
  }

  function amountChoiceFromNumber(value) {
    if (value < 100000) return '5萬-10萬';
    if (value < 300000) return '10萬-30萬';
    if (value < 500000) return '30萬-50萬';
    return '50萬-100萬';
  }

  function amountNumberFromChoice(choice) {
    if (choice === '5萬-10萬') return 80000;
    if (choice === '10萬-30萬') return 200000;
    if (choice === '30萬-50萬') return 400000;
    if (choice === '50萬-100萬') return 700000;
    return 400000;
  }

  function selectedAmountIndex() {
    var index = AMOUNT_STEPS.findIndex(function (step) { return step.amount === selectedAmount; });
    return index >= 0 ? index : 0;
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
    var newlyInitializedIds = [];
    pixelIds.forEach(function (pixelId) {
      var normalized = String(pixelId || '').trim();
      if (!/^\d{8,20}$/.test(normalized) || initializedPixelIds[normalized]) return;
      window.fbq('init', normalized);
      initializedPixelIds[normalized] = true;
      newlyInitializedIds.push(normalized);
    });
    if (!pageViewTracked && newlyInitializedIds.length) {
      newlyInitializedIds.forEach(function (pixelId) {
        window.fbq('trackSingle', pixelId, 'PageView');
      });
      pageViewTracked = true;
      return;
    }
    if (pageViewTracked) {
      newlyInitializedIds.forEach(function (pixelId) {
        window.fbq('trackSingle', pixelId, 'PageView');
      });
    }
  }

  function trackFbEvent(eventName, parameters) {
    if (typeof window.fbq !== 'function') return;
    Object.keys(initializedPixelIds).forEach(function (pixelId) {
      window.fbq('trackSingle', pixelId, eventName, parameters || {});
    });
  }

  function extractFbPixelIds(pixelSettings, variant) {
    if (!Array.isArray(pixelSettings)) return [];
    var currentVariant = String(variant || LANDING_VARIANT || '').trim().toUpperCase();
    var variantIds = [];
    var legacyIds = [];
    pixelSettings.forEach(function (item) {
      if (typeof item === 'string' || typeof item === 'number') {
        legacyIds.push(String(item));
        return;
      }
      if (!item || item.enabled === false) return '';
      var platform = String(item.platform || item.type || '').toLowerCase();
      if (platform.includes('tiktok')) return '';
      var id = String(item.id || item.pixel_id || item.pixelId || '').trim();
      var itemVariant = String(item.variant || item.landing_variant || item.page_variant || item.version || '').trim().toUpperCase().replace(/版$/, '');
      if (itemVariant && itemVariant === currentVariant) variantIds.push(id);
      if (!itemVariant) legacyIds.push(id);
    });
    var source = variantIds.length ? variantIds : legacyIds;
    return source.filter(function (id, index, list) {
      return /^\d{8,20}$/.test(String(id).trim()) && list.indexOf(id) === index;
    });
  }

  function applyLineConfig() {
    var lineButton = $('#line-add-button');
    if (lineButton) lineButton.href = ENTERPRISE_LINE_URL;
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
      var configuredLineUrl = settings.e_line_url || settings.line_url;
      if (configuredLineUrl) {
        ENTERPRISE_LINE_URL = String(configuredLineUrl).trim();
        ENTERPRISE_LINE_ID = /^https:\/\/lin\.ee\//i.test(ENTERPRISE_LINE_URL)
          ? ''
          : String(settings.line_id || '').trim();
      }
      var configuredPixelIds = extractFbPixelIds(settings.pixel_ids, LANDING_VARIANT);
      initializeFbPixels(configuredPixelIds.length ? configuredPixelIds : FALLBACK_PIXEL_IDS);
    } catch (error) {
      initializeFbPixels(FALLBACK_PIXEL_IDS);
    }
    applyLineConfig();
  }

  var siteConfigPromise = loadSiteConfig();

  function renderAmount() {
    var amountDisplay = $('#amount-display');
    var selectedAmountEl = $('#selected-amount');
    var rangeText = $('#range-text');
    var monthlyPayment = $('#monthly-payment');
    var termText = $('#term-text');
    var goApply = $('#go-apply');
    var dialValue = $('#dial-value');
    var dialTag = $('#dial-tag');
    var prevButton = $('#amount-prev');
    var nextButton = $('#amount-next');
    var currentIndex = selectedAmountIndex();
    var currentStep = AMOUNT_STEPS[currentIndex];
    var monthlyRate = 0.015 / 12;
    var payment = amountNumber * monthlyRate / (1 - Math.pow(1 + monthlyRate, -selectedTerm));

    if (amountDisplay) amountDisplay.textContent = selectedAmount;
    if (dialValue) {
      dialValue.textContent = selectedAmount;
      dialValue.animate([
        { transform: 'translateY(4px)', opacity: .72 },
        { transform: 'translateY(0)', opacity: 1 }
      ], { duration: 180, easing: 'ease-out' });
    }
    if (dialTag) dialTag.textContent = currentStep.tag;
    if (selectedAmountEl) selectedAmountEl.textContent = selectedAmount;
    if (rangeText) rangeText.textContent = selectedAmount;
    if (termText) termText.textContent = selectedTerm + '期';
    if (monthlyPayment) monthlyPayment.textContent = money(Math.round(payment));
    if (goApply) goApply.textContent = '立即申請 ' + selectedAmount;
    if (prevButton) prevButton.disabled = currentIndex === 0;
    if (nextButton) nextButton.disabled = currentIndex === AMOUNT_STEPS.length - 1;

    $all('.amount-choice').forEach(function (button) {
      var active = button.getAttribute('data-amount') === selectedAmount;
      button.classList.toggle('selected', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    $all('.period-btn').forEach(function (button) {
      var active = Number(button.getAttribute('data-term')) === selectedTerm;
      button.classList.toggle('selected', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    safeSessionSet(STORAGE_KEY, selectedAmount);
  }

  function showFieldError(name, text) {
    var errorElement = document.querySelector('[data-error-for="' + name + '"]');
    var inputElement = document.forms['lead-form'] ? document.forms['lead-form'].elements[name] : null;
    if (errorElement) errorElement.textContent = text;
    if (inputElement && inputElement.classList) inputElement.classList.add('invalid');
  }

  function clearErrors(form) {
    $all('.field-error').forEach(function (element) { element.textContent = ''; });
    $all('input.invalid').forEach(function (element) { element.classList.remove('invalid'); });
    var formStatus = $('#form-status');
    if (formStatus) formStatus.textContent = '';
  }

  function readAndValidate(form) {
    clearErrors(form);
    var data = new FormData(form);
    var values = {
      name: String(data.get('name') || '').trim(),
      age: String(data.get('age') || '').trim(),
      warningAccount: String(data.get('warning_account') || '')
    };
    var ageNumber = Number(values.age);
    var valid = true;

    if (!values.name) { showFieldError('name', '請填寫真實姓名。'); valid = false; }
    if (!/^\d{1,3}$/.test(values.age) || ageNumber < 18 || ageNumber > 100) {
      showFieldError('age', '請填寫正確年齡。');
      valid = false;
    }
    if (!values.warningAccount) { showFieldError('warning_account', '請選擇是否為警示戶。'); valid = false; }
    if (values.warningAccount === '警示戶') {
      showFieldError('warning_account', '警示戶目前無法辦理。');
      var formStatus = $('#form-status');
      if (formStatus) formStatus.textContent = '此服務僅受理非警示戶，資料不會送出。';
      valid = false;
    }
    if (!VALID_AMOUNTS.includes(selectedAmount)) {
      var amountStatus = $('#form-status');
      if (amountStatus) amountStatus.textContent = '請先選擇需求金額。';
      valid = false;
    }
    return valid ? values : null;
  }

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
    } catch (error) {
      console.warn('IP lookup unavailable', error);
    } finally {
      if (timer) clearTimeout(timer);
    }
    return metadata;
  }

  var clientMetadataPromise = collectClientMetadata();

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
    var response;
    for (var attempt = 0; attempt <= optionalFields.length; attempt += 1) {
      response = await fetch(SUPABASE_URL + '/rest/v1/leads', options);
      if (response.ok) return response;
      var errorText = await response.clone().text();
      var fallback = JSON.parse(options.body);
      var removedField = false;
      optionalFields.forEach(function (field) {
        if (Object.prototype.hasOwnProperty.call(fallback, field) && errorText.includes(field)) {
          delete fallback[field];
          removedField = true;
        }
      });
      if (!removedField) return response;
      options.body = JSON.stringify(fallback);
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
    } catch (error) { /* LINE still opens */ }
  }

  async function copyApplicantName() {
    var name = submittedApplicantName || String($('#name') ? $('#name').value : '').trim();
    if (!name) return false;
    var copied = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(name);
        copied = true;
      }
    } catch (error) { /* fallback */ }
    if (!copied) {
      try {
        var textarea = document.createElement('textarea');
        textarea.value = name;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        copied = document.execCommand('copy');
        textarea.remove();
      } catch (error) { copied = false; }
    }
    var status = $('#copy-line-name-status');
    if (status) {
      status.textContent = copied
        ? '姓名已複製，進入 LINE 後貼上並發送。'
        : '請進入 LINE 後手動輸入並發送上方姓名。';
    }
    return copied;
  }

  function bindCalculator() {
    var restored = safeSessionGet(STORAGE_KEY);
    if (VALID_AMOUNTS.includes(restored)) {
      selectedAmount = restored;
      amountNumber = amountNumberFromChoice(restored);
    }

    var prevButton = $('#amount-prev');
    var nextButton = $('#amount-next');

    function shiftAmount(delta) {
      var nextIndex = Math.min(AMOUNT_STEPS.length - 1, Math.max(0, selectedAmountIndex() + delta));
      selectedAmount = AMOUNT_STEPS[nextIndex].amount;
      amountNumber = AMOUNT_STEPS[nextIndex].number;
      renderAmount();
    }

    if (prevButton) {
      prevButton.addEventListener('click', function () { shiftAmount(-1); });
    }

    if (nextButton) {
      nextButton.addEventListener('click', function () { shiftAmount(1); });
    }

    $all('.period-btn').forEach(function (button) {
      button.addEventListener('click', function () {
        selectedTerm = Number(button.getAttribute('data-term') || 18);
        renderAmount();
      });
    });

    $all('.amount-choice').forEach(function (button) {
      button.addEventListener('click', function () {
        selectedAmount = button.getAttribute('data-amount') || selectedAmount;
        amountNumber = amountNumberFromChoice(selectedAmount);
        renderAmount();
      });
    });

    renderAmount();
  }

  function bindScrollButtons() {
    var applyZone = $('#apply-zone');
    var floatingApply = $('#floating-apply');
    function scrollToApply() {
      if (applyZone) applyZone.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    var goApply = $('#go-apply');
    var submitButton = $('#submit-button');
    if (goApply) goApply.addEventListener('click', scrollToApply);
    if (floatingApply) floatingApply.addEventListener('click', scrollToApply);
    function syncFloating() {
      if (!floatingApply) return;
      var isMobile = window.matchMedia('(max-width: 560px)').matches;
      if (!isMobile || !applyZone) {
        floatingApply.hidden = true;
        return;
      }
      var applyTop = applyZone.getBoundingClientRect().top;
      var passedHeroAction = window.scrollY > 520;
      var nearForm = applyTop < window.innerHeight * .74;
      floatingApply.hidden = !passedHeroAction || nearForm;
    }
    syncFloating();
    window.addEventListener('scroll', syncFloating, { passive: true });
    window.addEventListener('resize', syncFloating);
  }

  function bindForm() {
    var form = $('#lead-form');
    var submitButton = $('#submit-button');
    var warningHelp = $('#warning-help');
    var successPanel = $('#success-panel');
    var layout = $('#application-layout');
    var lineButton = $('#line-add-button');
    var copyLineNameButton = $('#copy-line-name-button');
    var ageInput = $('#age');

    if (ageInput) {
      ageInput.addEventListener('input', function () {
        ageInput.value = ageInput.value.replace(/\D/g, '').slice(0, 3);
      });
    }

    $all('input[name="warning_account"]').forEach(function (input) {
      input.addEventListener('change', function () {
        var isWarning = input.value === '警示戶' && input.checked;
        if (warningHelp) {
          warningHelp.textContent = isWarning
            ? '警示戶目前不符合辦理條件，無法送出申請。'
            : '本服務僅受理非警示戶申請。';
          warningHelp.classList.toggle('rejected', isWarning);
        }
        var error = $('[data-error-for="warning_account"]');
        if (error && !isWarning) error.textContent = '';
      });
    });

    if (copyLineNameButton) copyLineNameButton.addEventListener('click', copyApplicantName);
    if (lineButton) {
      lineButton.addEventListener('click', function () {
        copyApplicantName();
        markLineClicked();
      });
    }

    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      var values = readAndValidate(form);
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
        q3_amount_needed: selectedAmount,
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
        if (!response.ok) throw new Error('Submission failed: ' + response.status);
        window.__lastLeadId = payload.id;
        submittedApplicantName = values.name;
        var nameToSend = $('#line-name-to-send');
        if (nameToSend) nameToSend.textContent = submittedApplicantName;
        trackFbEvent('CompleteRegistration', {
          content_name: 'D項目I版本',
          status: 'submitted'
        });
        trackFbEvent('Lead', {
          content_name: 'D項目I版本',
          content_category: '貸款申請',
          value: 0,
          currency: 'TWD'
        });
        if (layout) layout.hidden = true;
        if (successPanel) {
          successPanel.hidden = false;
          successPanel.focus({ preventScroll: true });
          successPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      } catch (error) {
        console.warn('Lead submission failed', error);
        var formStatus = $('#form-status');
        if (formStatus) formStatus.textContent = '資料暫時無法送出，請稍後再試。你已填寫的內容仍保留在頁面中。';
        submitButton.disabled = false;
        submitButton.textContent = '重新送出資料';
      }
    });
  }

  bindCalculator();
  bindScrollButtons();
  bindForm();
})();
