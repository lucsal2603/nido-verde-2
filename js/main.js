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

  /* ── la punta del foglio: tetto con la punta arrotondata e bordo nero, ricalcolato quando cambia la misura ── */
  /* il profilo del tetto: falde dritte e punta arrotondata, largo W e alto T */
  const profiloTetto = (W, T) => {
    const L = Math.hypot(W / 2, T), d = Math.min(L * .3, Math.max(34, W * .045));   /* quanto della falda si piega nella curva */
    const k = d / L, ax = W / 2 - (W / 2) * k, ay = T * k, bx = W / 2 + (W / 2) * k;
    return `M0 ${T.toFixed(1)} L${ax.toFixed(1)} ${ay.toFixed(1)} Q${W / 2} 0 ${bx.toFixed(1)} ${ay.toFixed(1)} L${W} ${T.toFixed(1)}`;
  };
  /* il foglio dei nidi è l'ultimo telo: sale con tutto il contenuto, la punta parte alta e si abbassa fino al tetto normale */
  const altezzaTetto = () => { const v = getComputedStyle(document.documentElement).getPropertyValue('--tetto').trim(); const t = document.createElement('div'); t.style.cssText = `position:absolute;visibility:hidden;height:${v}`; document.body.appendChild(t); const h = t.offsetHeight; t.remove(); return h; };
  const statoFoglio = { t: 0 };
  let disegnaFoglio = () => {};
  function puntaFoglio() {
    const f = q('.foglio'); if (!f) return;
    let Tf = altezzaTetto();
    disegnaFoglio = () => {
      const W = f.offsetWidth, H = f.offsetHeight, T = Tf + (innerHeight * .5 - Tf) * statoFoglio.t;
      f.style.clipPath = `path('${profiloTetto(W, T)} L${W} ${H} L0 ${H} Z')`;
    };
    disegnaFoglio();
    const ricalcola = () => { Tf = altezzaTetto(); disegnaFoglio(); };
    if ('ResizeObserver' in window) new ResizeObserver(ricalcola).observe(f); else window.addEventListener('resize', ricalcola);
  }

  /* ── teli: prima che il foglio dei nidi salga, quattro teli a forma di tetto salgono dal basso uno dopo l'altro; la punta parte alta e si abbassa mentre salgono, e alla fine ognuno copre tutto lo schermo ── */
  function teli() {
    const f = q('.foglio'), palco = q('.manifesto__palco'), lista = qa('.telo'); if (!f || !palco || !lista.length || RIDOTTO) return;
    const stati = lista.map(() => ({ t: .5 }));
    const forma = (el, st) => {
      const W = palco.offsetWidth, H = palco.offsetHeight, Tf = altezzaTetto();
      const T = Tf + (innerHeight * .5 - Tf) * st.t;
      q('span', el).style.clipPath = `path('${profiloTetto(W, T)} L${W} ${H + T} L0 ${H + T} Z')`;
    };
    gsap.set(lista, { yPercent: 110 });
    lista.forEach((el, i) => forma(el, stati[i]));
    const tl = gsap.timeline({ scrollTrigger: { trigger: f, start: () => 'top bottom+=' + Math.round(innerHeight * .6), end: 'top 80%', scrub: .6, invalidateOnRefresh: true } });
    lista.forEach((el, i) => {
      tl.fromTo(el, { yPercent: 110, y: 0 }, { yPercent: 0, y: () => -(altezzaTetto() + 4), ease: 'power3.inOut', duration: .55 }, i * .12)
        .fromTo(stati[i], { t: 1 }, { t: 0, ease: 'power2.inOut', duration: .55, onUpdate: () => forma(el, stati[i]) }, i * .12);
    });
    window.addEventListener('resize', () => lista.forEach((el, i) => forma(el, stati[i])));
    /* l'ultimo strato è il foglio stesso: entra subito dopo i teli e la sua punta si abbassa come la loro */
    gsap.fromTo(statoFoglio, { t: 1 }, { t: 0, ease: 'power2.inOut', onUpdate: () => disegnaFoglio(), scrollTrigger: { trigger: f, start: 'top bottom', end: 'top 20%', scrub: .6 } });
  }

  /* ── rametti di ulivo: sempre attaccati a qualcosa (spuntano da dietro foto, carte e righe), mai fluttuanti ── */
  function rametto(seme) {
    /* gambo curvo dalla base (0,100) verso la punta, foglie a coppie sfalsate che si rimpiccioliscono, qualche oliva */
    let r = seme; const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
    const P = (t) => [4 + 86 * t, 96 - 70 * t - 18 * Math.sin(t * Math.PI) ];
    let foglie = '', olive = '';
    const N = 11;
    for (let k = 1; k <= N; k++) {
      const t = k / (N + .6), [x, y] = P(t), [x2, y2] = P(t + .01);
      const dir = Math.atan2(y2 - y, x2 - x) * 180 / Math.PI;
      const lato = k % 2 ? -1 : 1, L = 22 - k * .9 + rnd() * 3, w = L * .19;
      const ang = dir + lato * (38 + rnd() * 16);
      foglie += `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${ang.toFixed(1)})"><path d="M0 0C${L * .3} ${-w} ${L * .75} ${-w} ${L} 0 ${L * .75} ${w} ${L * .3} ${w} 0 0z" fill="var(--f2)"/><path d="M0 0C${L * .3} ${-w} ${L * .75} ${-w} ${L} 0z" fill="var(--f1)"/><path d="M1 0H${L * .92}" stroke="var(--f3)" stroke-width=".5" opacity=".55"/></g>`;
      if (k === 3 || k === 6 || k === 8) {
        const ox = x + lato * 5, oy = y + 6;
        olive += `<path d="M${x.toFixed(1)} ${y.toFixed(1)}Q${(x + lato * 2).toFixed(1)} ${(y + 4).toFixed(1)} ${ox.toFixed(1)} ${(oy - 3).toFixed(1)}" stroke="#8B5E3C" stroke-width=".8" fill="none"/><ellipse cx="${ox.toFixed(1)}" cy="${oy.toFixed(1)}" rx="2.6" ry="3.4" fill="${k === 6 ? '#6E7F3A' : '#3A3550'}"/><ellipse cx="${(ox - .8).toFixed(1)}" cy="${(oy - 1.2).toFixed(1)}" rx=".8" ry="1.1" fill="#fff" opacity=".35"/>`;
      }
    }
    const [tx, ty] = P(1), [px, py] = P(.98);
    const punta = `<g transform="translate(${tx.toFixed(1)} ${ty.toFixed(1)}) rotate(${(Math.atan2(ty - py, tx - px) * 180 / Math.PI).toFixed(1)})"><path d="M0 0C4-3 11-3 15 0 11 3 4 3 0 0z" fill="var(--f1)"/></g>`;
    let gambo = 'M' + P(0).map((v) => v.toFixed(1)).join(' ');
    for (let t = .05; t <= 1.001; t += .05) gambo += ' L' + P(t).map((v) => v.toFixed(1)).join(' ');
    return `<svg viewBox="0 0 110 110"><path d="${gambo}" stroke="#7A5233" stroke-width="2" fill="none" stroke-linecap="round"/>${olive}${foglie}${punta}</svg>`;
  }
  function ramettiUlivo() {
    /* [ancora, x e y del punto d'attacco nell'ancora (0–1), dimensione px, rotazione, dove: 'dietro' spunta da sotto l'ancora, 'sopra' è appoggiato] */
    const MAPPA = [
      ['#skyroom .nido__tetto', .2, .2, 220, -125, 'dietro'],
      ['#starsbox .nido__tetto', .9, .3, 230, -12, 'dietro'],
      ['.family__foto', .9, .04, 250, -50, 'dietro'],
      ['.voucher__carta', .08, .92, 230, 150, 'dietro', 'desk'],
      ['.magia__quattro li:last-child', .98, 0, 170, -14, 'sopra', 'desk'],
      ['.prenota__mappa', .95, .04, 240, -40, 'dietro'],
    ];
    const piazzati = [];
    MAPPA.forEach(([sel, ax, ay, d, rot, dove, solo], i) => {
      const anc = q(sel); if (!anc) return;
      const box = dove === 'sopra' ? anc : anc.parentElement;
      if (getComputedStyle(box).position === 'static') box.style.position = 'relative';
      if (dove === 'dietro') { if (getComputedStyle(anc).position === 'static') anc.style.position = 'relative'; anc.style.zIndex = anc.style.zIndex || '1'; }
      const el = document.createElement('span');
      el.className = 'ulivo' + (solo === 'desk' ? ' ulivo--desk' : '');
      el.setAttribute('aria-hidden', 'true');
      el.style.setProperty('--d', d + 'px'); el.style.setProperty('--r', rot + 'deg'); el.style.setProperty('--ritardo', -(i * 2.3) + 's');
      el.innerHTML = `<span class="ulivo__dondolo">${rametto(i * 977 + 13)}</span>`;
      box.insertBefore(el, box.firstChild);
      el.ancora = anc;
      piazzati.push({ el, anc, box, ax, ay, dove });
    });
    const metti = () => piazzati.forEach(({ el, anc, box, ax, ay, dove }) => {
      let x = anc.offsetWidth * ax, y = anc.offsetHeight * ay;
      if (dove !== 'sopra') { const a = anc.getBoundingClientRect(), b = box.getBoundingClientRect(); x += a.left - b.left; y += a.top - b.top; }
      el.style.left = x + 'px'; el.style.top = y + 'px';
    });
    metti(); window.addEventListener('resize', metti); window.addEventListener('load', metti); ST.addEventListener('refresh', metti);
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
    const tl = gsap.to(parole, { color: '#1B2A1E', ease: 'none', duration: .5, stagger: .04, scrollTrigger: { trigger: '.manifesto', start: 'top top', end: '45% bottom', scrub: true },
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
      /* il rametto attaccato alla foto spunta solo quando la foto è caricata e la cornice si è aperta: mai prima, mai a mezz'aria */
      const rametto = qa('.ulivo', f.parentElement).find((u) => u.ancora === f);
      rametto?.classList.add('is-nascosto');
      const caricata = new Promise((ok) => { if (img.complete && img.naturalWidth) ok(); else { img.addEventListener('load', ok, { once: true }); img.addEventListener('error', ok, { once: true }); } });
      const mostraRametto = () => caricata.then(() => rametto?.classList.remove('is-nascosto'));
      if (QA) mostraRametto();
      else {
        gsap.set(f, { clipPath: 'inset(0 0 100% 0 round 36px)' });
        ST.create({ trigger: f, start: 'top 92%', once: true, onEnter: () => caricata.then(() => gsap.to(f, { clipPath: 'inset(0 0 0% 0 round 36px)', duration: 1.4, ease: 'expo.out', onComplete: mostraRametto })) });
      }
      gsap.fromTo(img, { yPercent: -8 }, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: f, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  }

  /* ── le stelle: la pagina si fa notte, il cielo gira piano, una costellazione disegna la casetta e dentro si accende la luce ── */
  function stelle() {
    const sez = q('.stelle'); if (!sez || RIDOTTO) return;
    const palco = q('.stelle__palco', sez), canvas = q('.stelle__cielo', sez), occ = q('.stelle__occhiello', sez);
    const titolo = q('.stelle__titolo', sez), testo = q('.stelle__testo', sez), casa = q('.stelle__casa', sez), foto = q('.stelle__foto', sez), img = q('img', foto);
    const tratti = qa('.stelle__tratto', sez), punti = qa('.stella', sez), scintilla = q('.stelle__scintilla', sez);
    const POS = punti.map((p) => [parseFloat(p.style.left), parseFloat(p.style.top)]);
    /* il titolo diviso in lettere: si accendono una per una, in ordine sparso, come stelle */
    const lettere = [];
    const spezza = (nodo) => [...nodo.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        [...n.textContent].forEach((ch) => { if (ch === ' ') { frag.append(' '); return; } const sp = document.createElement('span'); sp.className = 'lettera'; sp.textContent = ch; lettere.push(sp); frag.append(sp); });
        n.replaceWith(frag);
      } else spezza(n);
    });
    titolo.setAttribute('aria-label', titolo.textContent.replace(/\s+/g, ' ').trim()); spezza(titolo);
    qa('.lettera', titolo).forEach((l) => l.setAttribute('aria-hidden', 'true'));

    const ctx = canvas.getContext('2d');
    let stelleArr = [], attivo = false, raf = 0, cadenti = [], prossima = 0, tPrima = 0, giro = 0;
    const dim = () => {
      const r = palco.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
      /* stelle sparse su un disco più grande dello schermo: girando non lasciano angoli vuoti */
      const R = Math.hypot(canvas.width, canvas.height);
      stelleArr = Array.from({ length: 300 }, () => ({ a: Math.random() * Math.PI * 2, d: Math.sqrt(Math.random()) * R, r: .45 + Math.random() * 1.3, f: Math.random() * Math.PI * 2, s: .4 + Math.random() * 1.2, lime: Math.random() < .12 }));
    };
    const disegna = (t) => {
      const w = canvas.width, h = canvas.height, dpr = Math.min(2, window.devicePixelRatio || 1);
      ctx.clearRect(0, 0, w, h);
      const cx = w * .5, cy = h * 1.05;
      for (const s of stelleArr) {
        const ang = s.a + giro + t * .00004, x = cx + Math.cos(ang) * s.d, y = cy + Math.sin(ang) * s.d;
        if (x < -4 || x > w + 4 || y < -4 || y > h + 4) continue;
        ctx.globalAlpha = .3 + .7 * Math.abs(Math.sin(t * .0012 * s.s + s.f)); ctx.fillStyle = s.lime ? '#A0B028' : '#F7F8F3';
        ctx.beginPath(); ctx.arc(x, y, s.r * dpr, 0, Math.PI * 2); ctx.fill();
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

    const centro = 'polygon(50% 56%, 50% 56%, 50% 56%, 50% 56%, 50% 56%)';
    const timpano = 'polygon(50% 0%, 100% 32%, 100% 100%, 0% 100%, 0% 32%)';
    gsap.set(foto, { clipPath: centro }); gsap.set(img, { filter: 'brightness(.25) saturate(.6)', scale: 1.18 });
    gsap.set(punti, { xPercent: -50, yPercent: -50, scale: 0, opacity: 0, rotate: -90 }); gsap.set(lettere, { opacity: 0, filter: 'blur(10px)', scale: 1.4 }); gsap.set([testo, occ], { opacity: 0, y: 24 });

    const tl = gsap.timeline({ scrollTrigger: { trigger: sez, start: 'top top', end: 'bottom bottom', scrub: .6, onToggle: (e) => accendi(e.isActive),
      onUpdate: (e) => { giro = e.progress * 1.3; testata.classList.toggle('is-scura', e.progress > .1 && e.progress < .98); } } });
    tl.to(palco, { backgroundColor: '#0E1A12', ease: 'none', duration: .16 }, 0)
      .to(canvas, { opacity: 1, ease: 'none', duration: .2 }, .06)
      .to(occ, { opacity: 1, y: 0, color: '#A0B028', ease: 'power2.out', duration: .1 }, .1)
      /* la costellazione: si accende la prima stella, una scintilla corre lungo il tratto fino alla successiva, che si accende all'arrivo, e così via fino a chiudere la casetta */
      .to(punti[0], { scale: 1.6, opacity: 1, rotate: 0, ease: 'back.out(2.4)', duration: .025 }, .12)
      .to(punti[0], { scale: 1, ease: 'power2.out', duration: .02 }, .145);
    const T0 = .15, SEG = .04;
    tratti.forEach((tr, i) => {
      const t = T0 + i * (SEG + .006), da = POS[i], a = POS[(i + 1) % POS.length], arrivo = punti[(i + 1) % punti.length];
      tl.to(tr, { strokeDashoffset: 0, ease: 'none', duration: SEG }, t)
        .fromTo(scintilla, { left: da[0] + '%', top: da[1] + '%', opacity: 1 }, { left: a[0] + '%', top: a[1] + '%', ease: 'none', duration: SEG, immediateRender: false }, t)
        .to(arrivo, { scale: 1.6, opacity: 1, rotate: 0, ease: 'back.out(2.4)', duration: .02 }, t + SEG)
        .to(arrivo, { scale: 1, ease: 'power2.out', duration: .02 }, t + SEG + .02);
    });
    tl.to(scintilla, { opacity: 0, duration: .01 }, T0 + 5 * (SEG + .006))
      /* dentro la costellazione la casetta prende forma dal centro, poi si accende la luce */
      .to(foto, { clipPath: timpano, ease: 'power2.inOut', duration: .18 }, .4)
      .to(img, { filter: 'brightness(1) saturate(1)', scale: 1.04, ease: 'power1.out', duration: .28 }, .46)
      .to(tratti, { opacity: .35, ease: 'none', duration: .12 }, .5)
      /* il titolo si accende lettera per lettera, ai due lati della casetta */
      .to(lettere, { opacity: 1, filter: 'blur(0px)', scale: 1, color: '#F7F8F3', ease: 'power2.out', duration: .07, stagger: { each: .012, from: 'random' } }, .36)
      .to(testo, { opacity: 1, y: 0, color: '#DCE3D0', ease: 'power2.out', duration: .1 }, .64)
      /* in fondo la casetta respira e le stelle d'angolo pulsano */
      .to(casa, { scale: 1.05, ease: 'none', duration: .3 }, .7);
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
  puntaFoglio(); teli(); ramettiUlivo(); manifesto(); nidi(); family(); stelle(); nastro(); coccole(); dintorni(); voucher(); domande(); piede(); contatori(); carteVoci(); mappa(); popup(); reveal();
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
