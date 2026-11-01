/* Il Nido tra gli Ulivi, versione verde: tutte le animazioni, guidate dallo scroll */
(() => {
  const gsap = window.gsap, ST = window.ScrollTrigger;
  if (!gsap || !ST) return;
  gsap.registerPlugin(ST);
  const html = document.documentElement;
  const RIDOTTO = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const QA = new URLSearchParams(location.search).has('qa');
  const TOUCH = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  const q = (s, r = document) => r.querySelector(s);
  const qa = (s, r = document) => [...r.querySelectorAll(s)];
  const gut = () => Math.min(72, Math.max(20, window.innerWidth * .05));
  const vh = () => window.innerHeight;
  const clamp01 = gsap.utils.clamp(0, 1);
  html.classList.add('js');
  if (RIDOTTO || QA) html.classList.add('is-statico');
  if (RIDOTTO) html.classList.add('is-ridotto');

  /* ── scroll morbido ── */
  let lenis = null;
  if (!QA && !RIDOTTO && window.Lenis) {
    lenis = new window.Lenis({ lerp: .1, smoothWheel: true });
    lenis.on('scroll', ST.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  /* i salti da un pulsante a una sezione sono lenti e morbidi: la durata cresce con la distanza (da 2,2 a 4,5 s), con partenza e arrivo dolci */
  const vaiA = (el) => {
    if (!lenis) { el.scrollIntoView({ behavior: RIDOTTO ? 'auto' : 'smooth' }); return; }
    const distanza = Math.abs(el.getBoundingClientRect().top - 72);
    const durata = gsap.utils.clamp(2.2, 4.5, 2.2 + distanza / 2200);
    lenis.scrollTo(el, { offset: -72, duration: durata, easing: (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2) });
  };

  /* ── ricarica: si riparte da dove si era (sessionStorage: dura finché la scheda resta aperta); una visita nuova parte dall'alto ── */
  const NAV = performance.getEntriesByType?.('navigation')[0]?.type || 'navigate';
  let scrollSalvato = 0;
  try { scrollSalvato = parseInt(sessionStorage.getItem('nido:scroll') || '0', 10) || 0; } catch (e) { /* storage negato */ }
  const RIPRISTINO = !location.hash && (NAV === 'reload' || NAV === 'back_forward') && scrollSalvato > 40;
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (!RIPRISTINO) { try { sessionStorage.removeItem('nido:scroll'); } catch (e) { /* niente */ } }
  let ultimoSalvataggio = 0;
  const salvaScroll = (forza) => {
    const ora = Date.now(); if (!forza && ora - ultimoSalvataggio < 150) return; ultimoSalvataggio = ora;
    try { sessionStorage.setItem('nido:scroll', String(Math.round(window.scrollY))); } catch (e) { /* niente */ }
  };
  window.addEventListener('scroll', () => salvaScroll(false), { passive: true });
  window.addEventListener('pagehide', () => salvaScroll(true));

  /* ── menu mobile ── */
  const menu = q('#menu'), menuBottone = q('#menuBottone');
  let menuAperto = false;
  const apriMenu = () => {
    if (menuAperto) return; menuAperto = true;
    menu.hidden = false; html.classList.add('is-menu'); menuBottone.setAttribute('aria-expanded', 'true'); lenis?.stop();
    gsap.fromTo(menu, { clipPath: 'circle(0% at calc(100% - 44px) 42px)' }, { clipPath: 'circle(150% at calc(100% - 44px) 42px)', duration: .8, ease: 'power3.inOut' });
    gsap.fromTo(qa('.menu > a, .menu__contatti', menu), { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: .7, ease: 'power3.out', stagger: .06, delay: .25 });
  };
  const chiudiMenu = () => {
    if (!menuAperto) return; menuAperto = false;
    html.classList.remove('is-menu'); menuBottone.setAttribute('aria-expanded', 'false');
    gsap.to(menu, { clipPath: 'circle(0% at calc(100% - 44px) 42px)', duration: .6, ease: 'power3.inOut', onComplete: () => { menu.hidden = true; lenis?.start(); } });
  };
  menuBottone?.addEventListener('click', () => (menuAperto ? chiudiMenu() : apriMenu()));
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') chiudiMenu(); });

  /* ── ancore ── */
  qa('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
    const id = a.getAttribute('href'); if (id.length < 2) return;
    const el = q(id); if (!el) return;
    e.preventDefault(); chiudiMenu(); setTimeout(() => vaiA(el), menuAperto ? 500 : 0);
  }));

  /* ── testata: si nasconde scendendo, torna salendo, si scurisce sulla notte e sul piede ── */
  const testata = q('#testata');
  /* la testata resta sempre visibile: niente sfondo, cambia solo colore quando passa sulle sezioni scure (classe is-scura) */

  /* ── foglia: il puntatore ── */
  const foglia = q('#foglia');
  if (foglia && !TOUCH && !RIDOTTO) {
    html.classList.add('con-foglia');
    const xTo = gsap.quickTo(foglia, 'x', { duration: .18, ease: 'power3' }), yTo = gsap.quickTo(foglia, 'y', { duration: .18, ease: 'power3' });
    const rotTo = gsap.quickTo(foglia, 'rotation', { duration: .5, ease: 'power2' });
    window.addEventListener('pointermove', (e) => { xTo(e.clientX); yTo(e.clientY); foglia.style.opacity = '1'; }, { passive: true });
    document.addEventListener('pointerleave', () => { foglia.style.opacity = '0'; });
    if (lenis) { lenis.on('scroll', ({ velocity }) => rotTo(gsap.utils.clamp(-40, 40, velocity * .5))); ST.addEventListener('scrollEnd', () => rotTo(0)); }
    qa('a, button').forEach((el) => { el.addEventListener('pointerenter', () => html.classList.add('foglia-grande')); el.addEventListener('pointerleave', () => html.classList.remove('foglia-grande')); });
  }

  /* ── foglie di ulivo sparse: piatte, nei colori del sito, con un filo di parallasse e un dondolio lento ── */
  function foglieUlivo() {
    const FOGLIA = '<svg viewBox="0 0 24 96"><path d="M12 2C4 22 3 60 12 94 21 60 20 22 12 2z" fill="var(--f1)"/><path d="M12 2c8 20 9 58 0 92z" fill="var(--f2)"/><path d="M12 8v84" stroke="var(--f3)" stroke-width="1" fill="none" opacity=".7"/></svg>';
    const RAMETTO = '<svg viewBox="0 0 120 120"><path d="M8 112C40 86 72 50 112 8" stroke="#8B5E3C" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
      [[26, 94, -20], [40, 80, 70], [56, 64, -10], [70, 50, 80], [86, 34, 0], [98, 22, 85]].map(([x, y, r]) =>
        `<g transform="translate(${x} ${y}) rotate(${r})"><path d="M0 0C-5-10-5-26 0-36 5-26 5-10 0 0z" fill="var(--f1)"/><path d="M0 0c5-10 5-26 0-36z" fill="var(--f2)"/></g>`).join('') + '</svg>';
    /* [sezione, x %, y %, dimensione px, rotazione, tipo] — ai margini, lontano dai testi */
    const MAPPA = [
      ['#nidi', 94, 14, 61, 28, 'f'], ['#nidi', 3, 38, 46, -40, 'f'], ['#nidi', 96, 62, 112, -18, 'r'], ['#nidi', 2, 86, 54, 62, 'f'],
      ['#magia', 92, 20, 50, 120, 'f'], ['#magia', 97, 92, 96, 200, 'r'],
      ['#family', 96, 12, 54, -24, 'f'], ['#family', 50, 92, 43, 80, 'f'],
      ['#extra', 4, 8, 54, 36, 'f'], ['#extra', 95, 90, 102, -150, 'r'],
      ['#dintorni', 96, 4, 50, -60, 'f'],
      ['#voucher', 3, 16, 102, 20, 'r'], ['#voucher', 95, 78, 54, -32, 'f'],
      ['#recensioni', 96, 10, 46, 48, 'f'], ['#recensioni', 3, 64, 57, -70, 'f'],
      ['#domande', 6, 22, 112, -10, 'r'], ['#domande', 94, 58, 50, 30, 'f'], ['#domande', 90, 90, 39, -80, 'f'],
      ['#prenota', 96, 16, 54, -46, 'f'], ['#prenota', 2, 88, 92, 160, 'r'],
    ];
    MAPPA.forEach(([sel, x, y, d, r, tipo], i) => {
      const sez = q(sel); if (!sez) return;
      if (getComputedStyle(sez).position === 'static') sez.style.position = 'relative';
      const scuro = /extra|dintorni/.test(sel);
      const el = document.createElement('span');
      el.className = 'ulivo' + (x > 1 && x < 8 && tipo === 'f' ? ' ulivo--largo' : '') + (tipo === 'r' ? ' ulivo--rametto' : '') + (scuro ? ' ulivo--notte' : '');
      el.setAttribute('aria-hidden', 'true');
      el.style.cssText = `left:${x}%;top:${y}%;--d:${d}px;--r:${r}deg;--ritardo:${-(i * 1.7) % 9}s`;
      el.innerHTML = `<span class="ulivo__dondolo">${tipo === 'r' ? RAMETTO : FOGLIA}</span>`;
      sez.appendChild(el);
      if (!RIDOTTO) gsap.fromTo(el, { y: 40 + (i % 3) * 30 }, { y: -40 - (i % 3) * 30, ease: 'none', scrollTrigger: { trigger: sez, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  }

  /* ── righe mascherate e blocchi che salgono ── */
  const rigaHero = qa('.hero .riga i');
  const righe = (root) => qa('.riga i', root).filter((i) => !rigaHero.includes(i));
  function reveal() {
    if (RIDOTTO || QA) return;
    qa('h2, .titolo-l, .titolo-xl').forEach((h) => {
      const ls = righe(h); if (!ls.length) return;
      gsap.fromTo(ls, { yPercent: 110, y: 0 }, { yPercent: 0, y: 0, duration: .95, ease: 'power3.out', stagger: .1, scrollTrigger: { trigger: h, start: 'top 88%', once: true } });
    });
    ST.batch(qa('[data-sale]').filter((el) => !el.closest('.hero')), { start: 'top 90%', once: true, onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: .9, ease: 'power3.out', stagger: .08, overwrite: true }) });
  }

  /* ── contatori ── */
  function contatori() {
    qa('[data-conta]').forEach((el) => {
      const fine = Number(el.dataset.conta);
      if (RIDOTTO || QA) { el.textContent = fine; return; }
      const o = { v: 0 };
      ST.create({ trigger: el, start: 'top 88%', once: true, onEnter: () => gsap.to(o, { v: fine, duration: 1.4, ease: 'power3.out', onUpdate: () => { el.textContent = Math.round(o.v); } }) });
    });
  }

  /* ── velo: il tetto della casetta si apre ── */
  function velo() {
    const v = q('#velo');
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    if (!v || RIDOTTO || QA || RIPRISTINO) { v?.remove(); return tl; }   /* chi ricarica non rivede il velo */
    lenis?.stop(); html.classList.add('is-velato');
    const tratti = qa('.velo__tratto', v);
    tratti.forEach((p) => { const l = p.getTotalLength(); p.style.strokeDasharray = l; p.style.strokeDashoffset = l; });
    /* solo la casetta bianca che si disegna, poi il tetto si apre */
    tl.to(tratti, { strokeDashoffset: 0, duration: 1.1, ease: 'power2.inOut', stagger: .18 }, .15)
      .to(q('.velo__marchio', v), { opacity: 0, duration: .35, ease: 'power2.in' }, 1.7)
      .to(q('.velo__anta--sx', v), { rotateY: -96, duration: 1.2, ease: 'power3.inOut' }, 1.85)
      .to(q('.velo__anta--dx', v), { rotateY: 96, duration: 1.2, ease: 'power3.inOut' }, 1.85)
      .add(() => { v.remove(); html.classList.remove('is-velato'); lenis?.start(); }, 3.1);
    /* rete di sicurezza: se il browser si inceppa, dopo 6 s il velo sparisce comunque */
    setTimeout(() => { if (v.isConnected) { v.remove(); html.classList.remove('is-velato'); lenis?.start(); } }, 6000);
    return tl;
  }

  /* ── hero: la foto a tutto schermo si ritira in una finestra a casetta ── */
  function hero() {
    const sez = q('.hero'); if (!sez) return;
    const foto = q('.hero__foto', sez), testo = q('.hero__testo', sez);
    const intro = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });
    if (!(RIDOTTO || QA)) {
      intro.fromTo(rigaHero, { yPercent: 110, y: 0 }, { yPercent: 0, y: 0, duration: 1.1, stagger: .12 }, 0)
        .to(qa('[data-sale]', sez), { opacity: 1, y: 0, duration: .9, stagger: .1 }, .35);
    }
    /* finché la foto è a tutto schermo la testata è chiara, come il testo dell'hero */
    testata.classList.add('is-scura');
    if (RIDOTTO) { ST.create({ trigger: sez, start: 'top top', end: 'bottom 80px', onToggle: (e) => testata.classList.toggle('is-scura', e.isActive), onRefresh: (e) => testata.classList.toggle('is-scura', e.isActive) }); return intro; }
    const mm = gsap.matchMedia();
    mm.add({ desk: '(min-width: 861px)', mob: '(max-width: 860px)' }, (ctx) => {
      const { desk } = ctx.conditions;
      /* su telefono la foto resta intera a tutto schermo, senza casetta né blocco: solo la testata che si scurisce finché l'hero è in vista */
      if (!desk) { ST.create({ trigger: sez, start: 'top bottom', end: 'bottom 80px', onToggle: (e) => testata.classList.toggle('is-scura', e.isActive), onRefresh: (e) => testata.classList.toggle('is-scura', e.isActive) }); return; }
      const timpano = 'polygon(0 32%, 50% 0, 100% 32%, 100% 100%, 0 100%)';
      const tl = gsap.timeline({ scrollTrigger: { trigger: sez, start: 'top top', end: 'bottom bottom', scrub: .6, invalidateOnRefresh: true, onUpdate: (e) => { const chiara = e.progress > .42; sez.classList.toggle('is-chiara', chiara); testata.classList.toggle('is-scura', !chiara); } } });
      tl.to(foto, { scale: .46, x: () => -gut(), y: () => -vh() * .04, transformOrigin: '100% 50%', clipPath: timpano, ease: 'none' }, 0);
      tl.to(foto, { '--scrim': 0, ease: 'none', duration: .5 }, 0);
      tl.fromTo(testo, { y: 0 }, { y: 0, ease: 'none' }, 0);
    });
    return intro;
  }

  /* ── manifesto: le parole si accendono ── */
  function manifesto() {
    const p = q('[data-parole]'); if (!p) return;
    const gruppi = qa('.frase', p).length ? qa('.frase', p) : [p];
    gruppi.forEach((g) => {
      [...g.childNodes].forEach((n) => {
        if (n.nodeType !== 3) return;
        const parole = n.textContent.trim().split(/\s+/).filter(Boolean);
        if (!parole.length) { n.remove(); return; }
        const frag = document.createDocumentFragment();
        parole.forEach((w) => { const sp = document.createElement('span'); sp.className = 'parola'; sp.textContent = w; frag.appendChild(sp); frag.appendChild(document.createTextNode(' ')); });
        n.replaceWith(frag);
      });
      q('.icona', g)?.addEventListener('click', () => g.classList.toggle('is-luce'));
    });
    if (RIDOTTO) return;
    const parole = qa('.parola', p);
    const totale = .5 + .04 * (parole.length - 1);
    /* ogni icona si sveglia quando l'evidenziazione raggiunge l'ultima parola della sua frase */
    const icone = qa('.icona', p).map((el) => { const ultime = qa('.parola', el.closest('.frase')); const idx = parole.indexOf(ultime[ultime.length - 1]); return { el, soglia: (.04 * idx + .25) / totale }; });
    const tl = gsap.to(parole, { color: '#1B2A1E', ease: 'none', duration: .5, stagger: .04, scrollTrigger: { trigger: '.manifesto', start: 'top top', end: '66% bottom', scrub: true },
      onUpdate: () => { const pr = tl.progress(); icone.forEach(({ el, soglia }) => el.classList.toggle('is-viva', pr >= soglia)); } });
  }

  /* ── i due nidi: le falde del tetto si aprono ── */
  function nidi() {
    if (RIDOTTO) return;
    qa('[data-nido]').forEach((n) => {
      const sx = q('.nido__anta--sx', n), dx = q('.nido__anta--dx', n), img = q('.nido__foto img', n);
      /* le ante si aprono dall’alto verso il basso, ruotando sul punto in basso al centro, fino a sparire: la sinistra cade a sinistra, la destra a destra */
      gsap.timeline({ scrollTrigger: { trigger: n, start: 'top 82%', end: 'top 28%', scrub: .5 } })
        .to(sx, { rotate: -92, ease: 'power1.in' }, 0).to(dx, { rotate: 92, ease: 'power1.in' }, 0);
      gsap.fromTo(img, { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: n, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  }

  /* ── nido family: cornice che si apre e parallasse ── */
  function family() {
    if (RIDOTTO) return;
    qa('[data-cornice]').forEach((f) => {
      const img = q('img', f);
      if (!QA) gsap.fromTo(f, { clipPath: 'inset(0 0 100% 0 round 36px)' }, { clipPath: 'inset(0 0 0% 0 round 36px)', duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: f, start: 'top 85%', once: true } });
      gsap.fromTo(img, { yPercent: -8 }, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: f, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  }

  /* ── le stelle: la pagina si fa notte ── */
  function stelle() {
    const sez = q('.stelle'); if (!sez || RIDOTTO) return;
    const palco = q('.stelle__palco', sez), dentro = q('.stelle__dentro', sez), foto = q('.stelle__foto', sez), canvas = q('.stelle__cielo', sez), occ = q('.occhiello', dentro);
    const ctx = canvas.getContext('2d');
    let stelleArr = [], attivo = false, raf = 0, cadenti = [], prossima = 0, tPrima = 0;
    const dim = () => {
      const r = palco.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
      stelleArr = Array.from({ length: 170 }, () => ({ x: Math.random(), y: Math.random() * .85, r: .5 + Math.random() * 1.3, f: Math.random() * Math.PI * 2, s: .4 + Math.random() * 1.2, lime: Math.random() < .12 }));
    };
    const disegna = (t) => {
      const w = canvas.width, h = canvas.height, dpr = Math.min(2, window.devicePixelRatio || 1);
      ctx.clearRect(0, 0, w, h);
      for (const s of stelleArr) {
        const a = .3 + .7 * Math.abs(Math.sin(t * .0012 * s.s + s.f));
        ctx.globalAlpha = a; ctx.fillStyle = s.lime ? '#A0B028' : '#F7F8F3';
        ctx.beginPath(); ctx.arc(s.x * w, s.y * h, s.r * dpr, 0, Math.PI * 2); ctx.fill();
      }
      /* stelle cadenti: ogni tanto una scia attraversa un pezzo di cielo e si spegne */
      const dt = Math.min(50, tPrima ? t - tPrima : 16); tPrima = t;
      if (t >= prossima) {
        prossima = t + 2200 + Math.random() * 4300;
        const verso = Math.random() < .7 ? 1 : -1, ang = (18 + Math.random() * 20) * Math.PI / 180, v = (.7 + Math.random() * .45) * dpr;
        cadenti.push({ x: (verso > 0 ? .05 + Math.random() * .5 : .45 + Math.random() * .5) * w, y: (.04 + Math.random() * .42) * h, vx: Math.cos(ang) * v * verso, vy: Math.sin(ang) * v, len: (110 + Math.random() * 130) * dpr, vita: 700 + Math.random() * 450, eta: 0 });
      }
      cadenti = cadenti.filter((c) => c.eta < c.vita);
      for (const c of cadenti) {
        c.eta += dt; c.x += c.vx * dt; c.y += c.vy * dt;
        const k = c.eta / c.vita, a = k < .15 ? k / .15 : 1 - (k - .15) / .85;
        const n = Math.hypot(c.vx, c.vy) || 1, tx = c.x - c.vx / n * c.len, ty = c.y - c.vy / n * c.len;
        const g = ctx.createLinearGradient(c.x, c.y, tx, ty);
        g.addColorStop(0, `rgba(247, 248, 243, ${a.toFixed(3)})`); g.addColorStop(1, 'rgba(247, 248, 243, 0)');
        ctx.globalAlpha = 1; ctx.strokeStyle = g; ctx.lineWidth = 1.6 * dpr; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(tx, ty); ctx.stroke();
        ctx.fillStyle = `rgba(255, 255, 255, ${a.toFixed(3)})`; ctx.beginPath(); ctx.arc(c.x, c.y, 1.8 * dpr, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (attivo) raf = requestAnimationFrame(disegna);
    };
    const accendi = (v) => { if (v === attivo) return; attivo = v; if (v) raf = requestAnimationFrame(disegna); else cancelAnimationFrame(raf); };
    dim(); window.addEventListener('resize', dim, { passive: true });
    const tl = gsap.timeline({ scrollTrigger: { trigger: sez, start: 'top top', end: 'bottom bottom', scrub: .5, onToggle: (e) => accendi(e.isActive), onUpdate: (e) => { testata.classList.toggle('is-scura', e.progress > .16 && e.progress < .98); } } });
    tl.to(palco, { backgroundColor: '#0E1A12', ease: 'none', duration: .24 }, 0)
      .to(dentro, { color: '#F7F8F3', ease: 'none', duration: .24 }, 0)
      .to(occ, { color: '#A0B028', ease: 'none', duration: .24 }, 0)
      .to(canvas, { opacity: 1, ease: 'none', duration: .3 }, .1)
      .fromTo(qa('.riga i', dentro), { yPercent: 110, y: 0 }, { yPercent: 0, y: 0, ease: 'power2.out', duration: .2, stagger: .05 }, .05)
      .fromTo(q('.stelle__testo', dentro), { opacity: 0, y: 30 }, { opacity: 1, y: 0, ease: 'power2.out', duration: .18 }, .18)
      .fromTo(foto, { opacity: 0, scale: .82, transformOrigin: '50% 100%' }, { opacity: 1, scale: 1, ease: 'power2.out', duration: .3 }, .2)
      .fromTo(q('img', foto), { yPercent: 6 }, { yPercent: -6, ease: 'none', duration: .78 }, .22);
    if (QA) { /* nello stato qa le righe mascherate del titolo restano visibili quando scrubbate */ }
  }

  /* ── nastro con lo skew dalla velocità ── */
  function nastro() {
    const righeN = qa('[data-nastro]'); if (!righeN.length || RIDOTTO) return;
    /* su telefono il nastro è scuro come le stelle e le coccole: la testata resta chiara anche lì */
    if (window.matchMedia('(max-width: 860px)').matches) ST.create({ trigger: '.nastro', start: 'top 80px', end: 'bottom 80px', onToggle: (e) => testata.classList.toggle('is-scura', e.isActive) });
    righeN.forEach((r) => {
      r.innerHTML += r.innerHTML;
      const contro = r.dataset.nastro === 'contro';
      gsap.fromTo(r, { xPercent: contro ? -50 : 0 }, { xPercent: contro ? 0 : -50, ease: 'none', duration: 36, repeat: -1 });
    });
    if (lenis) {
      const skew = gsap.quickTo(righeN, 'skewX', { duration: .45, ease: 'power2' });
      lenis.on('scroll', ({ velocity }) => skew(gsap.utils.clamp(-14, 14, velocity * .12)));
      ST.addEventListener('scrollEnd', () => skew(0));
    }
  }

  /* ── le coccole: parole di traverso, binari che si allungano, foto sfalsate ── */
  function coccole() {
    const voci = qa('.coccole__voce'); if (!voci.length || RIDOTTO) return;
    voci.forEach((voce, i) => {
      const parola = q('.coccole__parola > span', voce), binario = q('.coccole__binario', voce);
      if (!QA) gsap.fromTo(parola, { xPercent: -16, autoAlpha: 0 }, { xPercent: 0, autoAlpha: 1, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: voce, start: 'top 80%', once: true } });
      gsap.fromTo(binario, { scaleX: 0 }, { scaleX: 1, ease: 'none', scrollTrigger: { trigger: voce, start: 'top 96%', end: 'bottom 50%', scrub: .5 } });
      qa('.coccole__foto', voce).forEach((f, k) => {
        const img = q('img', f);
        if (!QA) gsap.fromTo(img, { clipPath: 'polygon(0% 0%, 0% 0%, -70% 100%, -70% 100%)' }, { clipPath: 'polygon(0% 0%, 170% 0%, 100% 100%, -70% 100%)', duration: 1.5, ease: 'power3.inOut', scrollTrigger: { trigger: f, start: 'top 90%', once: true } });
        const ampiezza = (i + k) % 2 ? 9 : 15;
        gsap.fromTo(f, { yPercent: ampiezza }, { yPercent: -ampiezza, ease: 'none', scrollTrigger: { trigger: voce, start: 'top bottom', end: 'bottom top', scrub: true } });
      });
    });
    ST.create({ trigger: '.coccole', start: 'top 80px', end: 'bottom 80px', onToggle: (e) => testata.classList.toggle('is-scura', e.isActive) });
  }

  /* ── dintorni: la sezione a passi: un passo per volta, l'omino a destra, tappe e barre sotto ── */
  function dintorni() {
    const root = q('[data-passi]'); if (!root) return;
    const passi = qa('[data-passo]', root), tappe = qa('[data-tappa]', root), omini = qa('.passi__omino', root), barre = tappe.map((t) => q('.passi__barra i', t));
    const N = passi.length; let attivo = -1;
    ST.create({ trigger: '.dintorni', start: 'top 80px', end: 'bottom 80px', onToggle: (e) => testata.classList.toggle('is-scura', e.isActive) });
    if (RIDOTTO) { html.classList.add('is-ridotto'); return; }
    /* su telefono il blocco resta fermo per un altro schermo dopo l'ultima tappa, mentre la sezione del voucher sale a coprirlo (margine negativo nel CSS) */
    const mob = window.matchMedia('(max-width: 860px)').matches; let sonda = null;
    if (mob) { sonda = document.createElement('i'); sonda.style.cssText = 'position:absolute;top:0;left:0;width:0;height:100svh;visibility:hidden;pointer-events:none'; root.appendChild(sonda); }
    root.style.height = mob ? `calc(${(N + 1) * 60}svh + 100svh)` : `${(N + 1) * 60}svh`;
    const extra = () => (sonda ? sonda.offsetHeight : 0);
    const fisso = q('.passi__fisso', root), scena = q('.passi__scena', root);
    /* su telefono la testata «Dintorni / Cosa visitare» entra nel blocco fisso e resta a schermo per tutte le tappe; su computer resta sopra e scorre via */
    const testaSez = q('.dintorni__testa');
    if (testaSez) gsap.matchMedia().add('(max-width: 860px)', () => { fisso.prepend(testaSez); ST.refresh(); return () => { root.before(testaSez); ST.refresh(); }; });
    gsap.set(passi[0], { autoAlpha: 1 }); gsap.set(omini[0], { autoAlpha: 1 });
    /* la barra parte da translateX(-100%) nel CSS: GSAP la leggerebbe in pixel, quindi si azzera x e si lavora solo in percentuale */
    gsap.set(barre, { xPercent: -100, x: 0 });
    const attiva = (k) => {
      if (k === attivo) return;
      const prima = attivo; attivo = k;
      if (prima >= 0) gsap.to(passi[prima], { autoAlpha: 0, duration: .3, ease: 'power2.in', overwrite: true });
      gsap.fromTo(passi[k], { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: .55, ease: 'power2.out', delay: prima >= 0 ? .2 : 0, overwrite: true });
      /* a destra: un'animazione per tappa (panchina, a piedi, saluto, bici, barca, auto), nello stesso ordine dei passi */
      const quale = Math.min(k, omini.length - 1);
      omini.forEach((o, i) => gsap.to(o, { autoAlpha: i === quale ? 1 : 0, duration: .45, ease: 'power2.inOut', overwrite: true }));
      tappe.forEach((t, i) => { t.classList.toggle('is-attiva', i === k); t.classList.toggle('is-fatta', i <= k); });
    };
    /* come nel sito copiato: l'animazione a destra parte dal bordo sinistro della scena e scivola verso destra man mano che la sua barra si riempie */
    const frazione = (u, i) => clamp01((u - i) / (i === N - 1 ? 2 : 1));
    const posiziona = (u, k) => {
      const img = q('img', omini[Math.min(k, omini.length - 1)]); if (!img) return;
      const corsa = Math.max(0, scena.clientWidth - img.clientWidth);
      gsap.set(img, { x: frazione(u, k) * corsa });
    };
    gsap.set(q('.passi__omino--cammina img', root), { scaleX: -1 });   /* l'omino a piedi guarda a sinistra nel render: specchiato, cammina nel verso in cui scivola */
    attiva(0); posiziona(0, 0);
    ST.create({
      trigger: root, start: () => `top ${parseFloat(getComputedStyle(fisso).top) || 0}px`, end: () => `+=${Math.max(1, root.offsetHeight - fisso.offsetHeight - extra())}`, invalidateOnRefresh: true,
      onUpdate: (e) => {
        const u = e.progress * (N + 1), k = Math.min(N - 1, Math.floor(u));
        attiva(k);
        barre.forEach((b, i) => gsap.set(b, { xPercent: -100 + frazione(u, i) * 100, x: 0 }));
        posiziona(u, k);
      },
      onRefresh: (e) => { const u = e.progress * (N + 1), k = Math.min(N - 1, Math.floor(u)); attiva(k); posiziona(u, k); },
    });
  }

  /* ── recensioni: le due casette sono due carte da gioco, inclinate in versi opposti, la destra sotto; in scroll cadono sul tavolo; col mouse la carta si solleva e passa sopra ── */
  function carteVoci() {
    const carte = qa('.voci__due .voce'); if (carte.length < 2 || RIDOTTO) return;
    const mm = gsap.matchMedia();
    mm.add({ desk: '(min-width: 861px)', mob: '(max-width: 860px)' }, (ctx) => {
      const base = ctx.conditions.desk ? [-5, 5] : [-1.5, 1.5];
      carte.forEach((n, i) => {
        gsap.set(n, { rotation: base[i], transformOrigin: '50% 50%' });
        if (!QA) gsap.from(n, { y: 90, rotation: base[i] * 3, autoAlpha: 0, duration: 1.2, ease: 'expo.out', delay: i * .15, scrollTrigger: { trigger: '.voci__due', start: 'top 82%', once: true } });
        if (!ctx.conditions.desk || TOUCH) return;
        const ombra = q('.voce__ombra', n);
        const alza = () => {
          carte.forEach((c) => c.classList.remove('is-alzata')); n.classList.add('is-alzata');
          gsap.to(n, { scale: 1.06, rotation: base[i] / 2, duration: .45, ease: 'power3.out', overwrite: 'auto' });
          gsap.to(ombra, { opacity: 1, duration: .45, ease: 'power2.out', overwrite: true });
        };
        const posa = () => {
          n.classList.remove('is-alzata');
          gsap.to(n, { scale: 1, rotation: base[i], duration: .55, ease: 'power3.out', overwrite: 'auto' });
          gsap.to(ombra, { opacity: 0, duration: .5, ease: 'power2.out', overwrite: true });
        };
        n.addEventListener('mouseenter', alza); n.addEventListener('mouseleave', posa);
        n.addEventListener('focusin', alza); n.addEventListener('focusout', posa);
      });
    });
  }

  /* ── mappa: l'iframe di Google entra solo al clic sulla copertina ── */
  function mappa() {
    const box = q('[data-mappa]'), apri = q('[data-mappa-apri]'); if (!box || !apri) return;
    apri.addEventListener('click', () => {
      if (box.classList.contains('is-aperta')) return;
      const f = document.createElement('iframe');
      f.src = 'https://www.google.com/maps?q=' + encodeURIComponent('Via Zimone 43, Viverone BI') + '&z=15&hl=it&output=embed';
      f.title = 'Mappa: Il Nido tra gli Ulivi, Viverone'; f.loading = 'lazy'; f.referrerPolicy = 'no-referrer-when-downgrade'; f.setAttribute('allowfullscreen', '');
      box.appendChild(f); box.classList.add('is-aperta');
    });
  }

  /* ── popup di benvenuto: alla prima visita, poi ogni quattro visite; una sola volta per sessione; mai in QA o con un'ancora nell'indirizzo ── */
  function popup() {
    const box = q('#popup'); if (!box || QA || location.hash) return;
    const OGNI = 4; let visite = 0, mostrato = 0, giaSessione = false;
    try {
      giaSessione = !!sessionStorage.getItem('nido:popup');
      if (!sessionStorage.getItem('nido:visita')) { sessionStorage.setItem('nido:visita', '1'); visite = (parseInt(localStorage.getItem('nido:visite') || '0', 10) || 0) + 1; localStorage.setItem('nido:visite', String(visite)); }
      else visite = parseInt(localStorage.getItem('nido:visite') || '1', 10) || 1;
      mostrato = parseInt(localStorage.getItem('nido:popup_a') || '0', 10) || 0;
    } catch (e) { return; }   /* senza memoria niente popup: meglio zitti che invadenti */
    if (giaSessione || (mostrato > 0 && visite - mostrato < OGNI)) return;
    const velo = q('.popup__velo', box), carta = q('.popup__carta', box), chiudi = q('.popup__chiudi', box);
    let aperto = false;
    const apri = () => {
      if (aperto || menuAperto) return; aperto = true; box.hidden = false; lenis?.stop();
      try { sessionStorage.setItem('nido:popup', '1'); localStorage.setItem('nido:popup_a', String(visite)); } catch (e) { /* niente */ }
      gsap.timeline({ defaults: { ease: 'power3.out' } })
        .to(velo, { opacity: 1, duration: .5 }, 0)
        .fromTo(carta, { opacity: 0, y: 40, scale: .94 }, { opacity: 1, y: 0, scale: 1, duration: .8 }, .1)
        .fromTo(q('img', carta), { scale: 1.12 }, { scale: 1, duration: 1.6, ease: 'power2.out' }, .1)
        .add(() => chiudi.focus({ preventScroll: true }), .5);
    };
    const chiudiPopup = () => {
      if (!aperto) return; aperto = false;
      gsap.timeline({ onComplete: () => { box.hidden = true; lenis?.start(); } })
        .to(carta, { opacity: 0, y: 24, scale: .96, duration: .35, ease: 'power2.in' }, 0)
        .to(velo, { opacity: 0, duration: .4 }, .05);
    };
    qa('[data-popup-chiudi]', box).forEach((el) => el.addEventListener('click', chiudiPopup));
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') chiudiPopup(); });
    const attesa = RIDOTTO ? 800 : 2600;
    const parti = () => setTimeout(apri, attesa);
    if (html.classList.contains('is-pronto')) parti();
    else new MutationObserver((m, oss) => { if (html.classList.contains('is-pronto')) { oss.disconnect(); parti(); } }).observe(html, { attributes: true, attributeFilter: ['class'] });
  }

  /* ── voucher: la carta si inclina con la mano ── */
  function voucher() {
    const c = q('[data-tilt]'); if (!c) return;
    if (!(RIDOTTO || QA)) gsap.fromTo(c, { opacity: 0, rotateY: -28, rotateX: 8, transformPerspective: 1200 }, { opacity: 1, rotateY: 0, rotateX: 0, duration: 1.3, ease: 'power3.out', scrollTrigger: { trigger: c, start: 'top 82%', once: true } });
    if (TOUCH || RIDOTTO) return;
    gsap.set(c, { transformPerspective: 1200 });
    const rx = gsap.quickTo(c, 'rotateX', { duration: .6, ease: 'power3' }), ry = gsap.quickTo(c, 'rotateY', { duration: .6, ease: 'power3' });
    c.addEventListener('pointermove', (e) => {
      const r = c.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      ry((px - .5) * 16); rx(-(py - .5) * 16);
      c.style.setProperty('--mx', `${px * 100}%`); c.style.setProperty('--my', `${py * 100}%`);
    });
    c.addEventListener('pointerleave', () => { rx(0); ry(0); });
  }

  /* ── domande: fisarmonica ── */
  function domande() {
    qa('.fisarmonica__voce').forEach((v) => {
      const b = q('button', v);
      b.addEventListener('click', () => { const aperta = v.classList.toggle('is-aperta'); b.setAttribute('aria-expanded', String(aperta)); });
    });
  }

  /* ── piede: il marchio sale ── */
  function piede() {
    if (RIDOTTO) return;
    ST.create({ trigger: '.piede', start: 'top 80px', end: 'bottom top', onToggle: (e) => testata.classList.toggle('is-scura', e.isActive) });
  }

  /* ── avvio ── */
  const introHero = hero();
  foglieUlivo(); manifesto(); nidi(); family(); stelle(); nastro(); coccole(); dintorni(); voucher(); domande(); piede(); contatori(); carteVoci(); mappa(); popup(); reveal();
  const tlVelo = velo();
  if (RIDOTTO || QA || RIPRISTINO) { html.classList.add('is-pronto'); if (RIPRISTINO) introHero?.progress(1); }
  else { tlVelo.add(() => introHero.play(), 2.0); tlVelo.add(() => html.classList.add('is-pronto'), 3.1); }
  window.addEventListener('load', () => ST.refresh());
  document.fonts?.ready.then(() => ST.refresh());
  if (RIPRISTINO) {
    /* torno al punto salvato appena la pagina ha le sue misure (subito, al load e dopo i font), finché la persona non tocca lo scroll */
    let toccato = false;
    ['wheel', 'touchstart', 'keydown'].forEach((ev) => window.addEventListener(ev, () => { toccato = true; }, { passive: true, once: true }));
    const torna = () => {
      if (toccato) return; ST.refresh();
      if (lenis) lenis.scrollTo(scrollSalvato, { immediate: true, force: true }); else window.scrollTo(0, scrollSalvato);
      ST.update();
    };
    torna();
    window.addEventListener('load', () => { torna(); setTimeout(torna, 250); });
    document.fonts?.ready.then(() => setTimeout(torna, 60));
  }
})();
