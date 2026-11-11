(function () {
  'use strict';

  var IS_LOCAL_PREVIEW = window.location.protocol === 'file:' || /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
  var STORAGE_KEY = 'd_project_k_copper_selected_amount';
  var transport = window.KCopperTransport.create();
  var ENTERPRISE_LINE_URL = '#';
  var pendingLeadId = '';
  transport.ready.then(function (config) {
    if (config && config.lineUrl) {
      ENTERPRISE_LINE_URL = config.lineUrl;
      var link = document.getElementById('line-add-button');
      if (link) link.href = ENTERPRISE_LINE_URL;
    }
  });
  var submittedApplicantName = '';
  var submissionInFlight = false;
  var submissionCompleted = false;
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
    return '50萬以上';
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
      120: .015,
      144: .015,
      180: .015,
      240: .015,
      300: .015,
      360: .015
    };
    return rates[term] || .025;
  }

  function renderCalculator() {
    selectedAmount = Number($('#amount').value) / 10000;
    selectedBand = amountBand(selectedAmount);
    $('#amount-value').textContent = formatMoney(selectedAmount * 10000);
    var annualRate = annualRateForTerm(selectedTerm);
    var payment = monthlyPayment(selectedAmount * 10000, annualRate, selectedTerm);
    $('#payment').textContent = formatMoney(payment);
    $('#rate').textContent = (annualRate * 100).toFixed(1) + '%';
    $('#interest').textContent = formatMoney(payment * selectedTerm - selectedAmount * 10000);
    $('#total').textContent = formatMoney(payment * selectedTerm);
    syncSelectedBand();

    $all('[data-term]').forEach(function (button) {
      var active = Number(button.getAttribute('data-term')) === selectedTerm;
      button.classList.toggle('selected', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    safeSessionSet(STORAGE_KEY, String(selectedAmount));
  }

  function syncSelectedBand() {
    $('#summary').textContent = selectedBand;
    $all('[data-band]').forEach(function (button) {
      var active = button.getAttribute('data-band') === selectedBand;
      button.classList.toggle('selected', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function bindCalculator() {
    var restored = Number(safeSessionGet(STORAGE_KEY));
    if (!IS_LOCAL_PREVIEW && restored >= 5 && restored <= 300 && restored % 5 === 0) $('#amount').value = String(restored * 10000);
    $('#amount').addEventListener('input', renderCalculator);
    $all('[data-term]').forEach(function (button) {
      button.addEventListener('click', function () {
        selectedTerm = Number(button.getAttribute('data-term')) || 60;
        renderCalculator();
      });
    });
    $all('[data-band]').forEach(function (button) {
      button.addEventListener('click', function () {
        selectedBand = button.getAttribute('data-band');
        syncSelectedBand();
        $('#amount-editor').open = false;
      });
    });
    $all('.purposes button').forEach(function (button) {
      button.addEventListener('click', function () {
        $all('.purposes button').forEach(function (item) {
          item.classList.toggle('selected', item === button);
          item.setAttribute('aria-pressed', item === button ? 'true' : 'false');
        });
      });
    });
    renderCalculator();
  }

  function createLeadId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (char) {
      var random = Math.random() * 16 | 0;
      var value = char === 'x' ? random : (random & 3 | 8);
      return value.toString(16);
    });
  }

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
    $all('input[aria-invalid]').forEach(function (input) { input.removeAttribute('aria-invalid'); });
  }

  function validateForm(form) {
    clearErrors();
    var data = new FormData(form);
    var values = {
      name: String(data.get('name') || '').trim(),
      age: String(data.get('age') || '').trim(),
      phone: String(data.get('phone') || '').trim(),
      warningAccount: String(data.get('warning_account') || '')
    };
    var valid = true;
    var age = Number(values.age);
    if (!values.name) { showFieldError('name', '請填寫本人真實姓名。'); valid = false; }
    if (!values.phone) { showFieldError('phone', '請填寫手機號碼。'); valid = false; }
    if (!/^\d{1,3}$/.test(values.age) || age < 18 || age > 100) { showFieldError('age', '請填寫正確年齡。'); valid = false; }
    if (!values.warningAccount) { showFieldError('warning_account', '請選擇是否為警示戶/告誡戶。'); valid = false; }
    if (values.warningAccount === '警示戶') {
      showFieldError('warning_account', '警示戶或告誡戶目前無法辦理。');
      $('#form-status').textContent = '本服務目前不受理警示戶或告誡戶，資料不會送出。';
      valid = false;
    }
    if (!valid) {
      var firstInvalid = document.querySelector('input.invalid');
      if (firstInvalid) firstInvalid.focus();
    }
    return valid ? values : null;
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
    target.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }

  function setProgressStep(number) {
    $all('.progress-step').forEach(function (item) {
      item.classList.toggle('active', Number(item.getAttribute('data-step')) <= number);
    });
  }

  function bindPageNavigation() {
    var calculator = $('#calculator');
    var applyZone = $('#application');
    var closeButton = $('#back');

    function openApply() {
      window.scrollTo(0, 0);
      calculator.hidden = true;
      applyZone.hidden = false;
      $('#amount-editor').open = true;
    }

    function closeApply() {
      if (!$('#success').hidden) return;
      window.scrollTo(0, 0);
      applyZone.hidden = true;
      calculator.hidden = false;
      calculator.scrollTop = 0;
      $('#apply').focus({ preventScroll: true });
    }

    $('#apply').addEventListener('click', function () {
      transport.trackApply();
      openApply();
    });
    if (window.location.hash === '#quiz-section') openApply();
    if (closeButton) closeButton.addEventListener('click', closeApply);
  }

  function bindReviews() {
    var track = $('#review-track');
    var cards = $all('.review-card');
    if (!track || !cards.length) return;
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
    var submitButton = $('#next');

    ageInput.addEventListener('input', function () { ageInput.value = ageInput.value.replace(/\D/g, '').slice(0, 3); });
    $all('input[name="warning_account"]').forEach(function (input) {
      input.addEventListener('change', function () {
        var rejected = input.checked && input.value === '警示戶';
        warningHelp.textContent = rejected ? '警示戶或告誡戶目前無法送出申請。' : '本服務目前不受理警示戶或告誡戶申請。';
        warningHelp.classList.toggle('rejected', rejected);
        submitButton.disabled = rejected || submissionInFlight;
        if (input.checked && !rejected) transport.trackEligible();
        if (!rejected) document.querySelector('[data-error-for="warning_account"]').textContent = '';
      });
    });

    ['name', 'age', 'phone'].forEach(function (id, index, ids) {
      var input = $('#' + id);
      input.addEventListener('input', function () {
        input.classList.remove('invalid');
        input.removeAttribute('aria-invalid');
        var message = document.querySelector('[data-error-for="' + id + '"]');
        if (message) message.textContent = '';
      });
      input.addEventListener('keydown', function (event) {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        if (index < ids.length - 1) $('#' + ids[index + 1]).focus();
        else input.blur();
      });
    });
    var copyButton = $('#copy-line-name-button');
    if (copyButton) copyButton.addEventListener('click', copyApplicantName);
    $('#line-add-button').addEventListener('click', function (event) {
      if (!ENTERPRISE_LINE_URL || ENTERPRISE_LINE_URL === '#') {
        event.preventDefault();
        $('#copy-line-name-status').textContent = 'LINE 連結載入中，請稍後再試。';
        return;
      }
      copyApplicantName();
      transport.markLineClicked(window.__lastLeadId);
    });

    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      if (submissionInFlight || submissionCompleted) return;
      var values = validateForm(form);
      if (!values) return;

      if (IS_LOCAL_PREVIEW) {
        submittedApplicantName = values.name;
        $('#line-name-to-send').textContent = submittedApplicantName;
        $('#application').hidden = true;
        var localSuccess = $('#success');
        localSuccess.hidden = false;
        localSuccess.focus({ preventScroll: true });
        smoothScroll(localSuccess);
        return;
      }

      submissionInFlight = true;
      submitButton.disabled = true;
      submitButton.textContent = '資料送出中，請稍候';
      if (!pendingLeadId) pendingLeadId = createLeadId();
      var payload = {
        id: pendingLeadId,
        name: values.name,
        age: values.age,
        phone: values.phone,
        q2_bank_status: values.warningAccount,
        q3_amount_needed: selectedBand
      };

      try {
        var response = await transport.submit(payload);
        if (!response || !response.ok) {
          if (response && response.code === 'K_LINE_NOT_CONFIGURED') {
            $('#form-status').textContent = 'LINE 連結暫時無法載入，請稍後再試。已填寫的內容仍保留。';
            submitButton.disabled = false;
            submitButton.textContent = '重新送出資料';
            return;
          }
          throw new Error('Submission failed');
        }
        submissionCompleted = true;
        window.__lastLeadId = payload.id;
        submittedApplicantName = values.name;
        $('#line-name-to-send').textContent = submittedApplicantName;
        $('#application').hidden = true;
        var success = $('#success');
        success.hidden = false;
        success.focus({ preventScroll: true });
        smoothScroll(success);
        transport.trackSubmitted(payload.id);
      } catch (error) {
        console.warn('Lead submission failed', error);
        $('#form-status').textContent = '資料暫時無法送出，請稍後再試。已填寫的內容仍保留。';
        submitButton.disabled = false;
        submitButton.textContent = '重新送出資料';
      } finally {
        submissionInFlight = false;
      }
    });
  }

  bindCalculator();
  bindPageNavigation();
  bindReviews();
  bindForm();
})();
