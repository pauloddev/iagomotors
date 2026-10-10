/* ==========================================================================
   IAGO MOTORS RJ — main.js
   Sem dependências. Módulos: config, UTMs, WhatsApp, tracking, consentimento
   (LGPD), carrosséis, abas de ritmo, reveal/parallax, formulário de lead.
   ========================================================================== */
(function () {
  'use strict';

  var CFG = window.IAGO_CONFIG || { whatsapp: '5521993181535', gtmId: '', leadEndpoint: '', thankYouUrl: 'obrigado.html' };
  var DEFAULT_MSG = 'Olá! Vim pelo site da IAGO MOTORS RJ e gostaria de conhecer as motocicletas disponíveis.';
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;

  /* ---------- Armazenamento seguro (pode falhar em aba privada) ---------- */
  var store = {
    get: function (k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* ignora */ } }
  };

  /* ---------- Tracking: dataLayer ---------- */
  window.dataLayer = window.dataLayer || [];
  function track(event, data) {
    var payload = { event: event };
    if (data) for (var k in data) payload[k] = data[k];
    window.dataLayer.push(payload);
  }

  /* ---------- UTMs / click IDs: captura e persistência na sessão ---------- */
  var TRACK_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'fbclid'];
  var params = {};
  (function captureParams() {
    var qs;
    try { qs = new URLSearchParams(window.location.search); } catch (e) { qs = null; }
    var saved = {};
    try { saved = JSON.parse(store.get('iago_utm') || '{}') || {}; } catch (e) { saved = {}; }
    TRACK_KEYS.forEach(function (k) {
      var v = qs && qs.get(k);
      v = v ? String(v).slice(0, 120).replace(/[<>"'`]/g, '') : '';
      params[k] = v || saved[k] || '';
    });
    store.set('iago_utm', JSON.stringify(params));
  })();

  function utmSuffix() {
    var parts = [];
    if (params.utm_source) parts.push('origem: ' + params.utm_source);
    if (params.utm_campaign) parts.push('campanha: ' + params.utm_campaign);
    if (params.utm_content) parts.push('anúncio: ' + params.utm_content);
    if (params.gclid) parts.push('gclid: ' + params.gclid.slice(0, 24));
    if (params.fbclid) parts.push('fbclid: ' + params.fbclid.slice(0, 24));
    return parts.length ? '\n\n[' + parts.join(' | ') + ']' : '';
  }
  function waUrl(msg) {
    return 'https://wa.me/' + CFG.whatsapp + '?text=' + encodeURIComponent((msg || DEFAULT_MSG) + utmSuffix());
  }

  /* ---------- Links de WhatsApp dinâmicos (mensagem + UTMs) ---------- */
  document.querySelectorAll('[data-wa-msg]').forEach(function (a) {
    var m = a.getAttribute('data-wa-msg');
    a.href = waUrl(m === 'default' ? DEFAULT_MSG : m);
  });

  /* ---------- Tracking de cliques (GTM: gatilho por evento) ---------- */
  document.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('[data-track]') : null;
    if (!el) return;
    var id = el.getAttribute('data-track');
    var isWa = (el.getAttribute('href') || '').indexOf('wa.me') > -1;
    track(isWa ? 'whatsapp_click' : 'cta_click', { cta_id: id, cta_text: (el.textContent || '').trim().slice(0, 60) });
  });

  /* ---------- Consentimento (LGPD) + carregamento do GTM ---------- */
  var banner = document.getElementById('cookieBanner');
  function loadGTM() {
    if (!CFG.gtmId || CFG.gtmId.indexOf('XXXX') > -1 || window.__gtmLoaded) return; // ← sem ID real, não carrega
    window.__gtmLoaded = true;
    track('gtm.js', { 'gtm.start': new Date().getTime() });
    var s = document.createElement('script');
    s.async = true; s.src = 'https://www.googletagmanager.com/gtm.js?id=' + encodeURIComponent(CFG.gtmId);
    document.head.appendChild(s);
    /* Meta Pixel: preferencialmente via GTM. Se for instalar direto, faça aqui. */
  }
  function grantConsent() {
    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', { ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted', analytics_storage: 'granted' });
    }
    loadGTM();
  }
  function setConsent(v) {
    store.set('iago_consent', v);
    if (banner) banner.hidden = true;
    track('consent_update', { consent: v });
    if (v === 'granted') grantConsent();
    updateSticky();
  }
  var consent = store.get('iago_consent');
  if (consent === 'granted') grantConsent();
  else if (!consent && banner) banner.hidden = false;
  var acc = document.getElementById('cookieAccept'), rej = document.getElementById('cookieReject'), prefs = document.getElementById('cookiePrefs');
  if (acc) acc.addEventListener('click', function () { setConsent('granted'); });
  if (rej) rej.addEventListener('click', function () { setConsent('denied'); });
  if (prefs) prefs.addEventListener('click', function (e) { e.preventDefault(); if (banner) { banner.hidden = false; acc && acc.focus(); } });

  /* ---------- Barra CTA fixa no mobile (após a primeira dobra) ---------- */
  var sticky = document.getElementById('stickyCta');
  var hero = document.getElementById('inicio');
  var pastHero = false;
  function updateSticky() {
    if (!sticky) return;
    var show = pastHero && (!banner || banner.hidden);
    sticky.classList.toggle('show', show);
    sticky.setAttribute('aria-hidden', show ? 'false' : 'true');
    sticky.querySelectorAll('a').forEach(function (a) { a.tabIndex = show ? 0 : -1; });
  }
  if ('IntersectionObserver' in window && hero && sticky) {
    new IntersectionObserver(function (en) { pastHero = !en[0].isIntersecting; updateSticky(); }, { threshold: 0, rootMargin: '-40% 0px 0px 0px' }).observe(hero);
  }

  /* ---------- Carrossel genérico (scroll-snap + setas + progresso) ---------- */
  function carousel(trackId, prevId, nextId, nowId, barId, total, name) {
    var t = document.getElementById(trackId);
    if (!t) return;
    var prev = document.getElementById(prevId), next = document.getElementById(nextId);
    var now = document.getElementById(nowId), bar = document.getElementById(barId);
    var items = t.children;
    function step() { return items.length > 1 ? items[1].offsetLeft - items[0].offsetLeft : t.clientWidth; }
    function update() {
      var max = t.scrollWidth - t.clientWidth;
      var idx = Math.round(t.scrollLeft / Math.max(1, step()));
      var visible = Math.max(1, Math.round(t.clientWidth / Math.max(1, step())));
      var shown = Math.min(total, idx + 1);
      if (now) now.textContent = (shown < 10 ? '0' : '') + shown;
      if (bar) bar.style.width = (max <= 0 ? 100 : Math.min(100, ((t.scrollLeft / max) * (total - visible) + visible) / total * 100)) + '%';
      if (prev) prev.disabled = t.scrollLeft <= 4;
      if (next) next.disabled = t.scrollLeft >= max - 4;
    }
    function go(dir) {
      t.scrollBy({ left: dir * step(), behavior: reduceMotion ? 'auto' : 'smooth' });
      track('carousel_nav', { carousel: name, direction: dir > 0 ? 'next' : 'prev' });
    }
    prev && prev.addEventListener('click', function () { go(-1); });
    next && next.addEventListener('click', function () { go(1); });
    t.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    });
    var raf; t.addEventListener('scroll', function () { cancelAnimationFrame(raf); raf = requestAnimationFrame(update); }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }
  carousel('showTrack', 'showPrev', 'showNext', 'showNow', 'showBar', 5, 'modelos');
  carousel('cTrack', 'cPrev', 'cNext', 'cNow', 'cBar', 12, 'clientes');

  /* ---------- Abas "Qual é o seu ritmo?" (padrão WAI-ARIA tabs) ---------- */
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.rtab'));
  function selectTab(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      var p = document.getElementById(t.getAttribute('aria-controls'));
      if (p) p.hidden = !on;
    });
    if (focus) tab.focus();
    track('ritmo_select', { ritmo: tab.textContent.trim() });
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { selectTab(t); });
    t.addEventListener('keydown', function (e) {
      var j = null;
      if (e.key === 'ArrowRight') j = (i + 1) % tabs.length;
      if (e.key === 'ArrowLeft') j = (i - 1 + tabs.length) % tabs.length;
      if (e.key === 'Home') j = 0;
      if (e.key === 'End') j = tabs.length - 1;
      if (j !== null) { e.preventDefault(); selectTab(tabs[j], true); }
    });
  });

  /* ---------- FAQ: evento ao abrir ---------- */
  document.querySelectorAll('.faq details').forEach(function (d) {
    d.addEventListener('toggle', function () { if (d.open) track('faq_open', { question: d.querySelector('summary').textContent.trim() }); });
  });

  /* ---------- Copiar número ---------- */
  document.querySelectorAll('[data-copy]').forEach(function (b) {
    b.addEventListener('click', function () {
      var txt = b.getAttribute('data-copy');
      var done = function () { var o = b.lastChild.textContent; b.lastChild.textContent = 'Copiado'; setTimeout(function () { b.lastChild.textContent = o; }, 1800); };
      var fallback = function () {
        var el = document.getElementById('phoneTxt'); if (!el) return;
        var r = document.createRange(); r.selectNodeContents(el);
        var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
      };
      try { navigator.clipboard.writeText(txt).then(done, fallback); } catch (e) { fallback(); }
    });
  });

  /* ---------- Entrada cinematográfica + reveal + parallax ---------- */
  if (!reduceMotion) root.classList.add('intro');
  if (!reduceMotion && 'IntersectionObserver' in window) {
    root.classList.add('anim');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    document.querySelectorAll('.reveal, .clip, .step').forEach(function (el) { io.observe(el); });

    // Moto do manifesto entra pela lateral
    var bike = document.getElementById('manifestoBike');
    if (bike) {
      bike.style.setProperty('--bx', '18%');
      new IntersectionObserver(function (en) { if (en[0].isIntersecting) bike.style.setProperty('--bx', '0%'); }, { threshold: .25 }).observe(bike.parentElement);
    }

    // Parallax muito sutil no hero (desktop)
    var pimg = document.querySelector('[data-parallax] img');
    if (pimg && window.matchMedia('(min-width: 980px)').matches) {
      var ticking = false;
      window.addEventListener('scroll', function () {
        if (ticking) return; ticking = true;
        requestAnimationFrame(function () {
          var y = Math.min(window.scrollY, 900);
          pimg.style.transform = 'translate3d(0,' + (-y * 0.06) + 'px,0)';
          ticking = false;
        });
      }, { passive: true });
    }
  }

  /* ---------- Formulário de lead ---------- */
  var form = document.getElementById('leadForm');
  if (form) {
    var $ = function (id) { return document.getElementById(id); };
    var phone = $('f-whats');

    // Preenche campos ocultos de rastreamento
    TRACK_KEYS.forEach(function (k) { if (form.elements[k]) form.elements[k].value = params[k]; });
    if (form.elements.page_url) form.elements.page_url.value = window.location.href.split('#')[0].slice(0, 300);
    if (form.elements.referrer) form.elements.referrer.value = (document.referrer || '').slice(0, 300);

    // Máscara de telefone BR em tempo real: (21) 99999-9999
    function maskPhone(v) {
      var d = v.replace(/\D/g, '').slice(0, 11);
      if (d.length <= 2) return d.length ? '(' + d : '';
      if (d.length <= 6) return '(' + d.slice(0, 2) + ') ' + d.slice(2);
      if (d.length <= 10) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
      return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
    }
    phone.addEventListener('input', function () { phone.value = maskPhone(phone.value); });

    // Sanitização: remove tags/caracteres de controle e limita tamanho
    function clean(v, max) {
      return String(v || '').replace(/<[^>]*>/g, '').replace(/[\u0000-\u001F\u007F<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
    }
    function setErr(id, fieldEl, msg) {
      var e = $(id); if (e) e.textContent = msg || '';
      var f = fieldEl && fieldEl.closest('.field');
      if (f) { if (msg) f.setAttribute('data-invalid', ''); else f.removeAttribute('data-invalid'); }
      if (fieldEl) fieldEl.setAttribute('aria-invalid', msg ? 'true' : 'false');
      if (fieldEl && e) fieldEl.setAttribute('aria-describedby', id);
    }
    function validate() {
      var ok = true, first = null;
      var nome = clean(form.elements.nome.value, 80);
      var tel = phone.value.replace(/\D/g, '');
      var inter = form.elements.interesse.value;
      if (nome.length < 2) { setErr('e-nome', form.elements.nome, 'Informe seu nome.'); ok = false; first = first || form.elements.nome; } else setErr('e-nome', form.elements.nome, '');
      if (!/^\d{10,11}$/.test(tel)) { setErr('e-whats', phone, 'Digite o WhatsApp com DDD, ex.: (21) 99318-1535.'); ok = false; first = first || phone; } else setErr('e-whats', phone, '');
      if (!inter) { setErr('e-interesse', form.elements.interesse, 'Escolha uma opção.'); ok = false; first = first || form.elements.interesse; } else setErr('e-interesse', form.elements.interesse, '');
      if (!form.elements.lgpd.checked) { $('e-lgpd').textContent = 'Marque a autorização para podermos responder.'; ok = false; first = first || form.elements.lgpd; } else $('e-lgpd').textContent = '';
      if (first) first.focus();
      return ok;
    }
    ['nome', 'interesse'].forEach(function (n) { form.elements[n].addEventListener('change', function () { if (form.elements[n].closest('.field').hasAttribute('data-invalid')) validate(); }); });

    var sending = false;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (sending) return;                         // bloqueia envios duplicados
      if (form.elements.site.value) return;        // honeypot
      if (!validate()) { track('lead_form_error'); return; }

      sending = true;
      var btn = $('leadSubmit'), lbl = btn.querySelector('.lbl');
      btn.setAttribute('aria-busy', 'true'); btn.disabled = true;
      var oldLbl = lbl.textContent; lbl.textContent = 'Enviando…';
      var sp = document.createElement('span'); sp.className = 'spin'; sp.setAttribute('aria-hidden', 'true'); btn.insertBefore(sp, btn.firstChild);
      $('formMsg').textContent = ''; $('formMsg').classList.remove('error');

      var data = {
        nome: clean(form.elements.nome.value, 80),
        whatsapp: phone.value.replace(/\D/g, ''),
        interesse: clean(form.elements.interesse.value, 60),
        cidade: clean(form.elements.cidade.value, 60),
        mensagem: clean(form.elements.mensagem.value, 500),
        consentimento_lgpd: true,
        enviado_em: new Date().toISOString()
      };
      TRACK_KEYS.concat(['page_url', 'referrer']).forEach(function (k) { data[k] = form.elements[k] ? form.elements[k].value : ''; });

      var waMsg = 'Olá! Vim pelo site da IAGO MOTORS RJ. Sou ' + data.nome + ' e tenho interesse em: ' + data.interesse + '.' +
        (data.cidade ? ' Estou em ' + data.cidade + '.' : '') + (data.mensagem ? '\n' + data.mensagem : '');

      function finish(okSend) {
        sending = false;
        btn.removeAttribute('aria-busy'); btn.disabled = false; lbl.textContent = oldLbl; sp.remove();
        if (!okSend) {
          $('formMsg').textContent = 'Não conseguimos enviar agora. Toque em "Falar no WhatsApp" e fale direto com a equipe.';
          $('formMsg').classList.add('error');
          track('lead_form_failed');
          return;
        }
        track('lead_form_submitted', { lead_interest: data.interesse, utm_source: data.utm_source, utm_campaign: data.utm_campaign });
        // Com endpoint configurado em produção, redirecione para a página de obrigado:
        if (CFG.leadEndpoint && CFG.thankYouUrl) {
          try { sessionStorage.setItem('iago_wa', waUrl(waMsg)); } catch (err) { /* ignora */ }
          window.location.href = CFG.thankYouUrl;
          return;
        }
        // Sem endpoint: estado de sucesso com o próximo passo (abrir o WhatsApp)
        $('successWa').href = waUrl(waMsg);
        $('successTitle').textContent = 'Pronto, ' + data.nome.split(' ')[0] + '. Falta só um passo.';
        form.hidden = true;
        var s = $('leadSuccess'); s.hidden = false; s.focus();
      }

      if (CFG.leadEndpoint && /^https:\/\//.test(CFG.leadEndpoint)) {
        // ENDPOINT: POST JSON para o seu receptor (CRM / webhook / serverless)
        fetch(CFG.leadEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
          .then(function (r) { finish(r.ok); })
          .catch(function () { finish(false); });
      } else {
        setTimeout(function () { finish(true); }, 600);
      }
    });
  }

  var y = document.getElementById('year'); if (y) y.textContent = new Date().getFullYear();
})();
