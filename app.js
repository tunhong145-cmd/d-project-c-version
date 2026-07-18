(function () {
  'use strict';

  var SUPABASE_URL = 'https://sfiflidnsrdotoidvcmh.supabase.co';
  var SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_F9QbR2X9iJp62lf3aJnh8w_NXlYl3aD';
  var VALID_AMOUNTS = ['10萬-20萬', '20萬-30萬', '30萬-50萬', '50萬-100萬'];
  var STORAGE_KEY = 'd_project_c_selected_amount';

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
        continueButton.textContent = '申請 ' + selectedAmount;
        message.textContent = '已選擇 ' + selectedAmount;
        message.classList.add('ready');
      } else {
        continueButton.disabled = true;
        continueButton.textContent = '選擇金額後繼續';
        message.textContent = '請先選擇一個金額';
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
    var birthInput = document.getElementById('birth-date');
    var editLinks = [document.getElementById('edit-amount-link'), document.getElementById('change-amount-link')];

    var backParams = getTrackingParams();
    var backUrl = 'index.html' + (backParams.toString() ? '?' + backParams.toString() : '');
    editLinks.forEach(function (link) { if (link) link.href = backUrl; });

    birthInput.max = new Date().toISOString().slice(0, 10);

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
        phone: String(data.get('phone') || '').replace(/[\s-]/g, ''),
        birthDate: String(data.get('birth_date') || ''),
        lineId: String(data.get('line_id') || '').trim(),
        warningAccount: String(data.get('warning_account') || '')
      };
      var valid = true;

      if (values.name.length < 2) { showFieldError('name', '請填寫姓名。'); valid = false; }
      if (!/^09\d{8}$/.test(values.phone)) { showFieldError('phone', '請輸入正確的台灣手機號碼。'); valid = false; }
      if (!values.birthDate || values.birthDate > birthInput.max) { showFieldError('birth_date', '請選擇正確的出生年月日。'); valid = false; }
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
