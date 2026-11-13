(function (root) {
  'use strict';
  const messages = Object.freeze({
    aviso: 'A atualização dos dados está atrasada. Contate o Departamento de TI da Globalgen.',
    indisponivel: 'Não foi possível confirmar a atualização dos dados. Contate o Departamento de TI da Globalgen.'
  });
  function classify(data) {
    return data && data.contrato === 'gbg-app-alerts-v1' &&
      typeof data.verificadoEmUtc === 'string' && Number.isFinite(Date.parse(data.verificadoEmUtc)) &&
      ['pronto', 'aviso', 'indisponivel'].includes(data.status)
      ? data.status : 'indisponivel';
  }
  function start(win, doc) {
    if (win.GbgServiceAlert) return win.GbgServiceAlert;
    const style = doc.createElement('style');
    style.textContent = `
      #gbg-service-alert[hidden]{display:none!important}
      #gbg-service-alert{position:fixed;inset:0 0 auto;z-index:2147483000;box-sizing:border-box;
        padding:12px 18px;background:#fff1c2;color:#513900;border-bottom:2px solid #bd8500;
        font:600 14px/1.5 system-ui,sans-serif;text-align:center;overflow-wrap:anywhere}
      #gbg-service-alert[data-state="indisponivel"]{background:#ffe8e5;color:#752315;border-color:#bf4b37}
      body{padding-top:var(--gbg-service-alert-height,0px)!important}
      .hdr{top:var(--gbg-service-alert-height,0px)!important}
      #auth-screen{padding-top:calc(24px + var(--gbg-service-alert-height,0px))!important}
      @media print{#gbg-service-alert{display:none!important}body{padding-top:0!important}.hdr{top:0!important}}
    `;
    doc.head.appendChild(style);
    const banner = doc.createElement('aside');
    banner.id = 'gbg-service-alert';
    banner.hidden = true;
    banner.setAttribute('role', 'alert');
    banner.setAttribute('aria-live', 'assertive');
    banner.setAttribute('aria-atomic', 'true');
    doc.body.prepend(banner);
    let busy = false, timer = null, lastStarted = -Infinity;
    function measure() {
      doc.documentElement.style.setProperty('--gbg-service-alert-height',
        banner.hidden ? '0px' : Math.ceil(banner.getBoundingClientRect().height) + 'px');
    }
    function render(state) {
      const text = messages[state] || '';
      banner.hidden = !text;
      banner.dataset.state = state;
      if (banner.textContent !== text) banner.textContent = text;
      measure();
    }
    async function check() {
      if (busy || doc.hidden) return;
      if (Date.now() - lastStarted < 5000) return;
      busy = true;
      lastStarted = Date.now();
      if (timer !== null) win.clearTimeout(timer);
      const controller = new win.AbortController();
      const timeout = win.setTimeout(() => controller.abort(), 8000);
      try {
        if (win.navigator.onLine === false) throw new Error('offline');
        const response = await win.fetch('https://apisenior.ucbvet.com:8444/api/v5/public/service-status', {
          method: 'GET', cache: 'no-store', credentials: 'omit',
          headers: { Accept: 'application/json' }, signal: controller.signal
        });
        if (!response.ok) throw new Error('unavailable');
        const state = classify(await response.json());
        render(win.navigator.onLine === false ? 'indisponivel' : state);
      } catch (_) {
        render('indisponivel');
      } finally {
        win.clearTimeout(timeout);
        busy = false;
        timer = win.setTimeout(check, 60000);
      }
    }
    function retry() { void check(); }
    win.addEventListener('online', retry);
    win.addEventListener('offline', () => render('indisponivel'));
    win.addEventListener('pageshow', retry);
    win.addEventListener('resize', measure);
    win.addEventListener('gbg-service-unavailable', () => { render('indisponivel'); retry(); });
    doc.addEventListener('visibilitychange', () => { if (!doc.hidden) retry(); });
    if (win.ResizeObserver) new win.ResizeObserver(measure).observe(banner);
    win.GbgServiceAlert = Object.freeze({ check });
    retry();
    return win.GbgServiceAlert;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { classify, messages, start };
  else if (root.document) {
    if (!root.document.body)
      root.document.addEventListener('DOMContentLoaded', () => start(root, root.document), { once: true });
    else start(root, root.document);
  }
})(globalThis);
