/* Presentation only. No network, storage, pixel or form handlers. */
(() => {
  const list = document.querySelector('#calculator .term-list');
  const sync = () => list.style.setProperty('--term-index', [...list.children].findIndex(el => el.classList.contains('selected')));
  new MutationObserver(sync).observe(list, {subtree:true, attributes:true, attributeFilter:['class']});
  sync();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const feedback = (node) => {
    if (!node || reduced.matches) return;
    node.classList.remove('feedback-active');
    void node.offsetWidth;
    node.classList.add('feedback-active');
  };
  const result = document.querySelector('#calculator .result');
  result.addEventListener('animationend', () => result.classList.remove('feedback-active'));
  for (const id of ['amount-display','monthly-payment']) {
    const node = document.getElementById(id);
    new MutationObserver(() => {
      if (reduced.matches) return;
      node.getAnimations().forEach(a => a.cancel());
      node.animate([{opacity:.45,transform:'translateY(3px)'},{opacity:1,transform:'translateY(0)'}], {duration:160,easing:'ease-out'});
      if (id === 'monthly-payment') feedback(result);
    }).observe(node,{childList:true});
  }
  const form = document.getElementById('apply-zone');
  new MutationObserver(() => {
    if (form.hidden) return;
    requestAnimationFrame(() => feedback(form.querySelector('.form-amount-option.selected')));
  }).observe(form, {attributes:true, attributeFilter:['hidden']});
  form.querySelectorAll('.form-amount-option').forEach(option => {
    option.addEventListener('animationend', () => option.classList.remove('feedback-active'));
  });
})();
