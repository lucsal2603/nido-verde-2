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
    gsap.set(foglia, { transformOrigin: '50% 6%' });
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
    /* l'ombra è un secondo telo scuro con la stessa forma, spostato un po' più su: nessun filtro sfocato, che rallentava tutto */
    lista.forEach((el) => { if (!q('.telo__ombra', el)) { const o = document.createElement('i'); o.className = 'telo__ombra'; el.prepend(o); } });
    const forma = (el, st) => {
      const W = palco.offsetWidth, H = palco.offsetHeight, Tf = altezzaTetto();
      const T = Tf + (innerHeight * .5 - Tf) * st.t;
      const forma = `path('${profiloTetto(W, T)} L${W} ${H + T} L0 ${H + T} Z')`;
      q('span', el).style.clipPath = forma; q('.telo__ombra', el).style.clipPath = forma;
    };
    gsap.set(lista, { yPercent: 110 });
    lista.forEach((el, i) => forma(el, stati[i]));
    const tl = gsap.timeline({ scrollTrigger: { trigger: f, start: () => 'top bottom+=' + Math.round(innerHeight * .6), end: 'top 80%', scrub: .6, invalidateOnRefresh: true } });
    lista.forEach((el, i) => {
      tl.fromTo(el, { yPercent: 110, y: 0 }, { yPercent: 0, y: () => -(altezzaTetto() + 4), ease: 'power3.inOut', duration: .55 }, i * .12)
        .fromTo(stati[i], { t: 1 }, { t: 0, ease: 'power2.inOut', duration: .55, onUpdate: () => forma(el, stati[i]) }, i * .12);
    });
    window.addEventListener('resize', () => lista.forEach((el, i) => forma(el, stati[i])));
  }

  /* ── il nido 3: col cursore si sbircia dentro la foto oscurata; su telefono (o senza cursore) una luce la attraversa da sola ── */
  function nidoSegreto() {
    const n = q('[data-nido3]'); if (!n) return;
    const tetto = q('.nido__tetto', n), sb = q('.nido__sbircia', n);
    const r = { v: 0 }, pos = { x: 50, y: 50 };
    const metti = () => { sb.style.setProperty('--r', r.v + 'px'); sb.style.setProperty('--mx', pos.x + '%'); sb.style.setProperty('--my', pos.y + '%'); };
    if (RIDOTTO) return;
    if (!TOUCH) {
      tetto.addEventListener('pointerenter', () => { n.classList.add('is-sbirciato'); gsap.to(r, { v: Math.max(80, tetto.offsetWidth * .24), duration: .5, ease: 'power3.out', onUpdate: metti, overwrite: true }); });
      tetto.addEventListener('pointermove', (e) => { const b = tetto.getBoundingClientRect(); gsap.to(pos, { x: (e.clientX - b.left) / b.width * 100, y: (e.clientY - b.top) / b.height * 100, duration: .35, ease: 'power3.out', onUpdate: metti, overwrite: 'auto' }); });
      tetto.addEventListener('pointerleave', () => { n.classList.remove('is-sbirciato'); gsap.to(r, { v: 0, duration: .5, ease: 'power3.out', onUpdate: metti, overwrite: true }); });
    } else {
      /* una piccola luce che vaga dentro la casetta, come una torcia */
      gsap.set(r, { v: Math.max(50, tetto.offsetWidth * .2) }); metti();
      gsap.timeline({ repeat: -1, yoyo: true, defaults: { ease: 'sine.inOut', duration: 2.6, onUpdate: metti } })
        .fromTo(pos, { x: 22, y: 70 }, { x: 70, y: 45 }).to(pos, { x: 40, y: 78 }).to(pos, { x: 78, y: 68 });
    }
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
      ['.busta', .06, .95, 230, 165, 'dentro', 'desk'],
      ['.magia__quattro li:last-child', .98, 0, 170, -14, 'sopra', 'desk'],
      ['.prenota__mappa', .95, .04, 240, -40, 'dietro'],
    ];
    const piazzati = [];
    MAPPA.forEach(([sel, ax, ay, d, rot, dove, solo], i) => {
      const anc = q(sel); if (!anc) return;
      const box = dove === 'sopra' || dove === 'dentro' ? anc : anc.parentElement;
      if (getComputedStyle(box).position === 'static') box.style.position = 'relative';
      if (dove === 'dietro') { if (getComputedStyle(anc).position === 'static') anc.style.position = 'relative'; anc.style.zIndex = anc.style.zIndex || '1'; }
      const el = document.createElement('span');
      el.className = 'ulivo' + (solo === 'desk' ? ' ulivo--desk' : '') + (dove === 'dentro' ? ' ulivo--dentro' : '');
      el.setAttribute('aria-hidden', 'true');
      el.style.setProperty('--d', d + 'px'); el.style.setProperty('--r', rot + 'deg'); el.style.setProperty('--ritardo', -(i * 2.3) + 's');
      el.innerHTML = `<span class="ulivo__dondolo">${rametto(i * 977 + 13)}</span>`;
      box.insertBefore(el, box.firstChild);
      el.ancora = anc;
      piazzati.push({ el, anc, box, ax, ay, dove });
    });
    const metti = () => piazzati.forEach(({ el, anc, box, ax, ay, dove }) => {
      let x = anc.offsetWidth * ax, y = anc.offsetHeight * ay;
      if (dove === 'dietro') { const a = anc.getBoundingClientRect(), b = box.getBoundingClientRect(); x += a.left - b.left; y += a.top - b.top; }
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
      const o = { v: 0 }; el.textContent = '0';
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
    /* ogni lettera in un "posto" (posizione e rotazione lungo l'arco) con dentro la lettera che si accende */
    const posti = [];
    const testoTitolo = titolo.textContent.replace(/\s+/g, ' ').trim();
    titolo.setAttribute('aria-label', testoTitolo); titolo.textContent = '';
    [...testoTitolo].forEach((ch) => {
      const posto = document.createElement('span'); posto.className = 'posto'; posto.setAttribute('aria-hidden', 'true');
      const l = document.createElement('span'); l.className = 'lettera'; l.textContent = ch === ' ' ? '\u00a0' : ch;
      posto.append(l); titolo.append(posto); posti.push(posto); if (ch !== ' ') lettere.push(l);
    });
    /* l'arco: concentrico alla casetta, passa sopra la punta e scende ai lati */
    const arco = () => {
      const pr = palco.getBoundingClientRect(), cr = casa.getBoundingClientRect();
      const cx = cr.left - pr.left + cr.width / 2, casaSu = cr.top - pr.top;
      const largo = innerWidth > 860;
      titolo.style.fontSize = '';
      let fs = parseFloat(getComputedStyle(titolo).fontSize);
      /* desktop: un arcobaleno grande alle spalle della casetta, centrato sulla sua base; telefono: arco stretto intorno al tetto */
      const cy = largo ? casaSu + cr.height : casaSu + cr.height / 2;
      const R = largo ? cr.height * .86 : cr.height / 2 + Math.max(50, fs * .7);
      let larghe = posti.map((p) => p.offsetWidth), tot = larghe.reduce((x, y) => x + y, 0);
      if (largo) {
        const voluto = R * 2.75;   /* circa 158 gradi di arco */
        fs = Math.min(fs * voluto / tot, innerWidth * .085);
        titolo.style.fontSize = fs + 'px';
        larghe = posti.map((p) => p.offsetWidth); tot = larghe.reduce((x, y) => x + y, 0);
      }
      let acc = -tot / 2;
      posti.forEach((p, i) => {
        const ang = -Math.PI / 2 + (acc + larghe[i] / 2) / R; acc += larghe[i];
        const x = cx + Math.cos(ang) * R, y = cy + Math.sin(ang) * R;
        p.style.transform = `translate(${(x - larghe[i] / 2).toFixed(1)}px, ${(y - p.offsetHeight).toFixed(1)}px) rotate(${((ang + Math.PI / 2) * 180 / Math.PI).toFixed(2)}deg) scaleY(1.2)`;
      });
      /* "Look up" appena sopra la punta del tetto */
      if (largo) palco.style.removeProperty('--occ-top'); else palco.style.setProperty('--occ-top', (casaSu - 44) + 'px');
    };
    arco(); document.fonts?.ready.then(arco); window.addEventListener('resize', arco);

    const ctx = canvas.getContext('2d');
    let stelleArr = [], attivo = false, raf = 0, cadenti = [], prossima = 0, tPrima = 0, giro = 0;
    const dim = () => {
      const r = canvas.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
      /* stelle sparse su un disco più grande dello schermo: girando non lasciano angoli vuoti */
      const R = Math.hypot(canvas.width, canvas.height);
      stelleArr = Array.from({ length: 300 }, () => ({ a: Math.random() * Math.PI * 2, d: Math.sqrt(Math.random()) * R, r: .45 + Math.random() * 1.3, f: Math.random() * Math.PI * 2, s: .4 + Math.random() * 1.2, lime: Math.random() < .12 }));
    };
    const disegna = (t) => {
      const w = canvas.width, h = canvas.height, dpr = Math.min(2, window.devicePixelRatio || 1);
      giro = -sez.getBoundingClientRect().top / innerHeight * .85;   /* il cielo gira con lo scroll per tutta la sezione, anche dopo il blocco fermo */
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
    gsap.set(punti, { xPercent: -50, yPercent: -50, scale: 0, opacity: 0, rotate: -90 }); gsap.set(lettere, { opacity: 0, filter: 'blur(10px)', scale: 1.4 }); gsap.set(occ, { opacity: 0, y: 24 });

    const tl = gsap.timeline({ scrollTrigger: { trigger: q('.stelle__pin', sez), start: 'top top', end: 'bottom bottom', scrub: .6,
      onUpdate: (e) => { testata.classList.toggle('is-scura', e.progress > .1 && e.progress < .98); } } });
    ST.create({ trigger: sez, start: 'top bottom', end: 'bottom top', onToggle: (e) => accendi(e.isActive) });
    tl.to(sez, { backgroundColor: '#0E1A12', ease: 'none', duration: .16 }, 0)
      .to(canvas, { opacity: 1, ease: 'none', duration: .2 }, .06)
      .to(occ, { opacity: 1, y: 0, color: '#A0B028', ease: 'power2.out', duration: .1 }, .1)
      /* la costellazione: si accende la prima stella, una scintilla corre lungo il tratto fino alla successiva, che si accende all'arrivo, e così via fino a chiudere la casetta */
      .to(punti[0], { scale: 1.6, opacity: 1, rotate: 0, ease: 'back.out(2.4)', duration: .025 }, .12)
      .to(punti[0], { scale: 1, ease: 'power2.out', duration: .02 }, .145);
    const T0 = .14, SEG = .065, PASSO = .075;   /* ogni tratto un po' più lento */
    tratti.forEach((tr, i) => {
      const t = T0 + i * PASSO, da = POS[i], a = POS[(i + 1) % POS.length], arrivo = punti[(i + 1) % punti.length];
      tl.to(tr, { strokeDashoffset: 0, ease: 'none', duration: SEG }, t)
        .fromTo(scintilla, { left: da[0] + '%', top: da[1] + '%', opacity: 1 }, { left: a[0] + '%', top: a[1] + '%', ease: 'none', duration: SEG, immediateRender: false }, t)
        .to(arrivo, { scale: 1.6, opacity: 1, rotate: 0, ease: 'back.out(2.4)', duration: .02 }, t + SEG)
        .to(arrivo, { scale: 1, ease: 'power2.out', duration: .02 }, t + SEG + .02);
    });
    tl.to(scintilla, { opacity: 0, duration: .01 }, T0 + 5 * PASSO)
      /* dentro la costellazione la casetta prende forma dal centro, poi si accende la luce */
      .to(foto, { clipPath: timpano, ease: 'power2.inOut', duration: .16 }, .55)
      .to(img, { filter: 'brightness(1) saturate(1)', scale: 1.04, ease: 'power1.out', duration: .24 }, .6)
      .to(tratti, { opacity: .35, ease: 'none', duration: .12 }, .64)
      /* il titolo si accende lettera per lettera, ai due lati della casetta */
      .to(lettere, { opacity: 1, filter: 'blur(0px)', scale: 1, color: '#F7F8F3', ease: 'power2.out', duration: .07, stagger: { each: .012, from: 'random' } }, .5)
      /* in fondo la casetta respira e le stelle d'angolo pulsano */
      .to(casa, { scale: 1.05, ease: 'none', duration: .22 }, .78);
    /* la descrizione sotto: le parole si accendono una dopo l'altra, dal buio e dallo sfocato, mentre sale */
    const dopo = q('.stelle__dopo', sez);
    if (testo && dopo) {
      const parole = testo.textContent.trim().split(/\s+/);
      testo.setAttribute('aria-label', testo.textContent.trim());
      testo.innerHTML = parole.map((w) => `<span class="parola-t" aria-hidden="true">${w}</span>`).join(' ');
      const pt = qa('.parola-t', testo);
      gsap.fromTo(pt, { opacity: .08, y: 18, filter: 'blur(8px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', ease: 'power2.out', stagger: .06, scrollTrigger: { trigger: dopo, start: 'top 85%', end: 'bottom 75%', scrub: .5 } });
      ST.create({ trigger: dopo, start: 'top 80px', end: 'bottom 80px', onToggle: (e) => { if (e.isActive) testata.classList.add('is-scura'); } });
    }
  }

  /* ── nastro con lo skew dalla velocità ── */
  function nastro() {
    const righeN = qa('[data-nastro]'); if (!righeN.length || RIDOTTO) return;
    /* il nastro sta nella notte delle stelle: la testata resta chiara anche lì */
    ST.create({ trigger: '.nastro', start: 'top 80px', end: 'bottom 80px', onToggle: (e) => testata.classList.toggle('is-scura', e.isActive) });
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
    /* dopo l'ultima tappa il blocco resta fermo ancora un po': la macchina arriva in fondo e risucchia la pagina, sotto compare il voucher.
       La sezione dopo (voucher) sta sotto i dintorni (margine negativo di uno schermo) e viene tenuta ferma in alto mentre si scopre. */
    const fisso = q('.passi__fisso', root), scena = q('.passi__scena', root);
    const sezione = q('.dintorni'), voucherSez = q('.voucher');
    let EXTRA = innerHeight;
    const misura = () => {
      const H = innerHeight, top = parseFloat(getComputedStyle(fisso).top) || 0;
      EXTRA = Math.max(0, 2 * H - top - fisso.offsetHeight);   /* così il risucchio comincia esattamente quando la macchina è arrivata, e il blocco resta fermo fino alla fine */
      root.style.height = `calc(${(N + 1) * 60}svh + ${Math.round(EXTRA)}px)`;
      if (sezione) sezione.style.marginBottom = `${-H}px`;
    };
    misura(); ST.addEventListener('refreshInit', misura);
    const extra = () => EXTRA;
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
    /* le animazioni a destra si caricano tardi: appena un'immagine arriva si ricalcola la sua corsa, così la macchina non parte da fuori scena */
    let ultimaU = 0, ultimaK = 0;
    qa('img', scena).forEach((im) => im.addEventListener('load', () => posiziona(ultimaU, ultimaK)));
    ST.create({
      trigger: root, start: () => `top ${parseFloat(getComputedStyle(fisso).top) || 0}px`, end: () => `+=${Math.max(1, root.offsetHeight - fisso.offsetHeight - extra())}`, invalidateOnRefresh: true,
      onUpdate: (e) => {
        const u = e.progress * (N + 1), k = Math.min(N - 1, Math.floor(u));
        attiva(k);
        barre.forEach((b, i) => gsap.set(b, { xPercent: -100 + frazione(u, i) * 100, x: 0 }));
        ultimaU = u; ultimaK = k; posiziona(u, k);
      },
      onRefresh: (e) => { const u = e.progress * (N + 1), k = Math.min(N - 1, Math.floor(u)); attiva(k); posiziona(u, k); },
    });

    /* ── la fuga: la macchina scalda il motore, lancia una corda e si aggancia alla pagina, poi scappa a destra e la pagina le va dietro, trascinata fuori dallo schermo; sotto c'è il voucher ── */
    if (!sezione || !voucherSez) return;
    const auto = q('.passi__omino--auto img', root);
    const NS = 'http://www.w3.org/2000/svg';
    const corda = document.createElementNS(NS, 'svg'); corda.setAttribute('class', 'passi__corda'); corda.setAttribute('aria-hidden', 'true');
    corda.innerHTML = '<path class="passi__corda-filo"/><circle class="passi__corda-gancio" r="6"/>';
    fisso.appendChild(corda);
    const filo = q('.passi__corda-filo', corda), gancio = q('.passi__corda-gancio', corda);
    /* gli strati: come i teli sopra i nidi, ma in orizzontale. Il primo (oliva) sta fermo sotto la pagina e si scopre mentre lei se ne va;
       gli altri entrano da sinistra uno dopo l'altro con il bordo ad arco e vanno oltre lo schermo; l'ultimo strato è il voucher stesso */
    const strati = document.createElement('div'); strati.className = 'strati-fuga'; strati.setAttribute('aria-hidden', 'true');
    const COLORI = ['var(--oliva)', '#4E6C50', 'var(--salvia)', 'var(--salvia-chiara)'];
    const fogli = COLORI.map((c) => { const d = document.createElement('div'); d.className = 'strati-fuga__foglio'; const o = document.createElement('i'); const t = document.createElement('span'); t.style.background = c; d.append(o, t); strati.append(d); return d; });
    voucherSez.parentNode.insertBefore(strati, voucherSez);
    /* il bordo destro ad arco, curvato verso sinistra: gli angoli vanno avanti e il centro resta indietro di T */
    const bordoArco = (W, H, T, altezza = H) => (T < .5
      ? `M0 0 L${W} 0 L${W} ${altezza} L0 ${altezza} Z`
      : `M0 0 L${W} 0 Q${(W - 2 * T).toFixed(1)} ${(H / 2).toFixed(1)} ${W} ${H} L${W} ${altezza} L0 ${altezza} Z`);
    const eOut = gsap.parseEase('power3.out'), eIn = gsap.parseEase('power2.in'), eInOut = gsap.parseEase('power2.inOut');
    let ancora = null, ultimo = -1;
    const pulisci = () => {
      if (auto) auto.style.translate = auto.style.rotate = '';
      sezione.style.translate = sezione.style.boxShadow = ''; fisso.style.transform = '';
      corda.style.opacity = '0'; voucherSez.style.translate = voucherSez.style.scale = voucherSez.style.transformOrigin = voucherSez.style.clipPath = '';
      strati.style.display = 'none';
    };
    pulisci();
    /* la posizione esatta della pagina in funzione dello scroll (sv da 0 a 1) */
    const pagina = (sv) => (innerWidth + 260) * eIn(clamp01((sv - .3) / .34));   /* + 260: anche l'ombra della pagina esce dallo schermo */
    const disegna = (sv) => {
      if (sv === ultimo) return; ultimo = sv;
      if (sv <= 0) { pulisci(); ancora = null; return; }
      const W = innerWidth, H = innerHeight;
      if (!ancora && auto) {
        auto.style.translate = auto.style.rotate = ''; sezione.style.translate = ''; fisso.style.transform = '';
        const r = auto.getBoundingClientRect(), f = fisso.getBoundingClientRect();
        ancora = [r.left - f.left + r.width * .1, r.top - f.top + r.height * .64, r.width];
      }
      /* 1. il motore si scalda: la macchina trema e si abbassa sul retro */
      const trema = Math.sin(sv * 140) * 1.6 * clamp01(sv / .05) * (1 - clamp01((sv - .2) / .05));
      /* 2. scatto in avanti: la macchina si stacca di una "corda" e la tende */
      const corsaAuto = W * .2 * eInOut(clamp01((sv - .16) / .26));
      /* 3. la pagina segue: scivola a destra accelerando, con la macchina sempre davanti */
      const tx = pagina(sv);
      const vel = (pagina(Math.min(1, sv + .01)) - tx) / (W * .02);   /* velocità normalizzata, per l'inclinazione */
      if (auto) {
        auto.style.translate = `${(corsaAuto + trema).toFixed(1)}px ${(Math.cos(sv * 120) * .8 * clamp01(sv / .05)).toFixed(1)}px`;
        auto.style.rotate = `${(-3.5 * Math.sin(Math.PI * clamp01((sv - .16) / .26))).toFixed(2)}deg`;   /* impennata allo scatto */
      }
      sezione.style.translate = `${tx.toFixed(1)}px 0`;
      sezione.style.boxShadow = tx > 1 ? `-50px 0 90px -10px rgba(14, 26, 18, ${(.5 * clamp01(tx / 120)).toFixed(3)})` : '';
      fisso.style.transform = `skewX(${(-Math.min(9, vel * 4)).toFixed(2)}deg)`;
      /* la corda: parte dal gancio sul retro della macchina ferma, si allunga allo scatto, prima molle poi tesa */
      if (ancora) {
        const [ax, ay, aw] = ancora;
        const appare = clamp01((sv - .08) / .08);
        const coda = ax + corsaAuto, sag = 26 * (1 - clamp01((sv - .26) / .1)) * appare;
        const x0 = ax - aw * .18 * appare;   /* il gancio cade un po' dietro la macchina */
        filo.setAttribute('d', `M${x0.toFixed(1)} ${ay.toFixed(1)} Q${((x0 + coda) / 2).toFixed(1)} ${(ay + sag).toFixed(1)} ${coda.toFixed(1)} ${ay.toFixed(1)}`);
        gancio.setAttribute('cx', x0.toFixed(1)); gancio.setAttribute('cy', ay.toFixed(1));
        corda.style.opacity = String(appare);
      }
      /* gli strati: il primo è fermo sotto la pagina, gli altri e poi il voucher entrano da sinistra con il bordo ad arco */
      strati.style.display = sv > 0 && sv < 1 ? 'block' : 'none';
      const entra = (i) => eInOut(clamp01((sv - (.5 + i * .1)) / .26));   /* i = 0..2 per gli strati, 3 per il voucher */
      const T = W * .24;
      fogli.forEach((f, i) => {
        if (i === 0) { f.style.translate = '0 0'; return; }
        /* ogni strato entra da sinistra e va oltre il bordo destro: alla fine il suo arco è fuori dallo schermo */
        const p = entra(i - 1), EW = f.offsetWidth;
        f.style.translate = `${(-EW + (EW + T) * p).toFixed(1)}px 0`;
        const arco = `path('${bordoArco(EW, H, T)}')`;
        f.lastChild.style.clipPath = arco; f.firstChild.style.clipPath = arco;
      });
      const pv = entra(3);
      if (sv >= 1) { voucherSez.style.translate = voucherSez.style.clipPath = ''; }
      else {
        /* l'ultimo strato è il voucher: il suo arco si raddrizza mentre arriva, così a fine corsa non se ne vede più niente */
        voucherSez.style.translate = `${(-W * (1 - pv)).toFixed(1)}px ${(-H * (1 - sv)).toFixed(1)}px`;
        voucherSez.style.clipPath = `path('${bordoArco(W, H, T * (1 - pv), voucherSez.offsetHeight)}')`;
      }
      testata.classList.toggle('is-scura', tx < W * .5);
    };
    ST.create({ trigger: voucherSez, start: 'top bottom', end: 'top top', invalidateOnRefresh: true,
      onUpdate: (e) => disegna(e.progress), onRefresh: (e) => { ancora = null; ultimo = -1; disegna(e.progress); },
      onLeave: () => disegna(1), onLeaveBack: () => disegna(0) });
  }

  /* ── recensioni: al passaggio la carta gira su se stessa da sinistra a destra, mostra per un attimo sul retro in quale nido ha dormito chi scrive, poi torna com'era ── */
  function giraRecensioni() {
    const NIDI = {
      skyroom: { nome: 'Skyroom', sotto: 'Nido 1 · due cuori e un nido', foto: 'img/skyroom-fronte.webp' },
      starsbox: { nome: 'Starsbox', sotto: 'Nido 2 · mille stelle e coccole', foto: 'img/starsbox-aperta.webp' },
    };
    qa('.citazione').forEach((c) => {
      const chiave = (q('.nido', c)?.textContent || '').trim().toLowerCase(), n = NIDI[chiave]; if (!n) return;
      const giro = document.createElement('div'); giro.className = 'citazione__giro';
      const fronte = document.createElement('div'); fronte.className = 'citazione__fronte';
      while (c.firstChild) fronte.append(c.firstChild);
      const retro = document.createElement('div'); retro.className = 'citazione__retro'; retro.setAttribute('aria-hidden', 'true');
      retro.innerHTML = `<img src="${n.foto}" alt="" loading="lazy"><span class="citazione__casa"></span><p class="citazione__dove">Ha dormito nella</p><p class="citazione__nome">${n.nome}</p><p class="citazione__sotto">${n.sotto}</p>`;
      giro.append(fronte, retro); c.append(giro); c.classList.add('is-girevole');
      if (RIDOTTO) return;
      let gira = null;
      const via = () => {
        if (gira?.isActive()) return;
        gira = gsap.timeline({ onComplete: () => gsap.set(giro, { rotateY: 0 }) })
          .to(giro, { rotateY: 180, duration: .7, ease: 'power3.inOut' })
          .to(giro, { rotateY: 360, duration: .7, ease: 'power3.inOut' }, '+=0.5');
      };
      c.addEventListener('mouseenter', via);
      if (TOUCH) c.addEventListener('click', via);
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
    const scena = q('[data-voucher]'); if (!scena) return;
    const busta = q('.busta', scena), lembo = q('.busta__lembo', scena), sigillo = q('.busta__sigillo', scena), big = q('.biglietto', scena);
    if (!RIDOTTO) {
      /* la busta arriva, il sigillo salta, il lembo si apre e diventa il tetto, il biglietto esce, passa davanti e si posa */
      gsap.set(big, { transformPerspective: 1200 });
      /* il voucher arriva come ultimo strato; poi resta fermo sullo schermo e lo scroll apre la busta: si va avanti solo quando il biglietto è posato */
      const vSez = q('.voucher');
      /* durante l'apertura la busta (con il lembo aperto sopra e il biglietto che esce) sta al centro dello schermo:
         se è troppo in basso il blocco si ferma un po' dopo, se è troppo in alto si aggiunge spazio sopra */
      let ritardo = 0;
      const testoV = q('.voucher__testo', vSez);
      const centra = () => {
        vSez.style.paddingTop = ''; scena.style.width = '';
        /* telefono: busta sopra e testo sotto devono stare insieme nello schermo mentre la sezione è ferma, quindi la busta si rimpicciolisce quanto serve */
        if (innerWidth <= 860) {
          const cs = getComputedStyle(vSez), libero = innerHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - parseFloat(cs.rowGap || 0) - testoV.offsetHeight;
          scena.style.width = `${Math.round(Math.max(140, Math.min(scena.parentElement.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight), libero / 1.02)))}px`;
          ritardo = 0; return;
        }
        let y = 0, el = busta; while (el && el !== vSez) { y += el.offsetTop; el = el.offsetParent; }
        const bh = busta.offsetHeight, centroGruppo = y + bh * .2;   /* dal lembo aperto al fondo della busta */
        const scarto = centroGruppo - innerHeight * .5;
        if (scarto < 0) { vSez.style.paddingTop = `${parseFloat(getComputedStyle(vSez).paddingTop) - scarto}px`; ritardo = 0; } else ritardo = Math.round(scarto);
      };
      centra(); ST.addEventListener('refreshInit', centra);
      gsap.timeline({ scrollTrigger: { trigger: vSez, start: () => `top -${ritardo}`, end: () => '+=' + Math.round(innerHeight * 1.1), scrub: .6, pin: true, anticipatePin: 1, invalidateOnRefresh: true } })
        .to(sigillo, { scale: 1.25, ease: 'power2.out', duration: .06 }, 0)
        .to(sigillo, { scale: 0, rotate: 140, opacity: 0, ease: 'power2.in', duration: .08 }, .06)
        .to(lembo, { rotateX: 180, ease: 'power2.inOut', duration: .26 }, .1)
        .set(lembo, { zIndex: 1 }, .23)
        .to(big, { yPercent: () => (innerWidth <= 860 ? -58 : -78), rotate: -4, ease: 'power2.inOut', duration: .3 }, .36)
        .set(big, { zIndex: 5 }, .66)
        .to(big, { yPercent: -34, rotate: -2.5, scale: 1.04, ease: 'power3.out', duration: .3 }, .66)
        .to(busta, { y: 18, ease: 'none', duration: .3 }, .66);
    }
    if (TOUCH || RIDOTTO) return;
    const rx = gsap.quickTo(big, 'rotateX', { duration: .6, ease: 'power3' }), ry = gsap.quickTo(big, 'rotateY', { duration: .6, ease: 'power3' });
    big.addEventListener('pointermove', (e) => {
      const r = big.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      ry((px - .5) * 14); rx(-(py - .5) * 14);
      big.style.setProperty('--mx', `${px * 100}%`); big.style.setProperty('--my', `${py * 100}%`);
    });
    big.addEventListener('pointerleave', () => { rx(0); ry(0); });
  }

  /* ── gli ospiti: le casette si alzano dal basso (prima i muri, poi il tetto), le stelle si riempiono ── */
  function ospiti() {
    const lista = qa('.ospite'); if (!lista.length || RIDOTTO || QA) return;
    lista.forEach((o, i) => {
      const casa = q('.ospite__casa', o), img = q('img', casa), dentro = q('.ospite__dentro', o), piene = q('.ospite__piene', o), vai = q('.ospite__vai', o);
      gsap.timeline({ scrollTrigger: { trigger: o, start: 'top 85%', once: true }, delay: i * .15 })
        .fromTo(casa, { clipPath: 'polygon(0% 100%, 50% 100%, 100% 100%, 100% 100%, 0% 100%)' }, { clipPath: 'polygon(0% 24%, 50% 24%, 100% 24%, 100% 100%, 0% 100%)', duration: .9, ease: 'power3.inOut' })
        .to(casa, { clipPath: 'polygon(0% 24%, 50% 0%, 100% 24%, 100% 100%, 0% 100%)', duration: .6, ease: 'back.out(2.2)' })
        .fromTo(img, { scale: 1.35 }, { scale: 1.06, duration: 1.6, ease: 'power3.out', clearProps: 'transform' }, 0)
        .from(qa(':scope > *', dentro), { y: 30, opacity: 0, duration: .7, stagger: .08, ease: 'power3.out' }, .7)
        .fromTo(piene, { width: '0%' }, { width: '98%', duration: 1.2, ease: 'power2.out' }, 1.1)
        .from(vai, { y: 20, opacity: 0, duration: .6, ease: 'power3.out' }, .9);
    });
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
  puntaFoglio(); teli(); nidoSegreto(); ramettiUlivo(); manifesto(); nidi(); family(); stelle(); nastro(); coccole(); dintorni(); voucher(); domande(); piede(); contatori(); giraRecensioni(); ospiti(); mappa(); popup(); reveal();
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
