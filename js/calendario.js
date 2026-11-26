/* Il Nido tra gli Ulivi: calendario della disponibilità e richiesta di prenotazione.
   I dati arrivano da CONFIG.fonte (oggi un file statico di esempio, domani il gestionale: stesso formato).
   Quando ci sarà la prenotazione automatica basta cambiare CONFIG.modo e scrivere invia() per il pagamento. */
(() => {
  const radice = document.querySelector('[data-calendario]'); if (!radice) return;

  const CONFIG = {
    fonte: 'dati/disponibilita.json',
    modo: 'richiesta',                 /* 'richiesta' = WhatsApp/email a Federica; in futuro 'prenotazione' = conferma e pagamento online */
    whatsapp: '393515987323',
    email: 'federica@ilnidotragliulivi.com'
  };

  const q = (s, r = radice) => r.querySelector(s), qa = (s, r = radice) => [...r.querySelectorAll(s)];
  const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
  const GIORNI = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom'];
  const GIORNI_LUNGHI = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];

  /* date "di calendario" senza fusi orari: tutto in UTC a mezzanotte */
  const D = (a, m, g) => new Date(Date.UTC(a, m, g));
  const iso = (d) => d.toISOString().slice(0, 10);
  const daIso = (s) => { const [a, m, g] = s.split('-').map(Number); return D(a, m - 1, g); };
  const piu = (d, n) => D(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + n);
  const oggi = (() => { const n = new Date(); return D(n.getFullYear(), n.getMonth(), n.getDate()); })();
  const breve = (d) => `${GIORNI_LUNGHI[d.getUTCDay()].slice(0, 3)} ${d.getUTCDate()} ${MESI[d.getUTCMonth()]}`;
  const lunga = (d) => `${GIORNI_LUNGHI[d.getUTCDay()]} ${d.getUTCDate()} ${MESI[d.getUTCMonth()]} ${d.getUTCFullYear()}`;

  /* festivi italiani (con la Pasquetta): la notte di un festivo o di un prefestivo costa come il weekend */
  const pasqua = (a) => {
    const f = Math.floor, b = a % 19, c = f(a / 100), d = a % 100, e = f(c / 4), g = c % 4, h = f((c + 8) / 25), i = f((c - h + 1) / 3),
      k = (19 * b + c - e - i + 15) % 30, l = f(d / 4), m = d % 4, n = (32 + 2 * g + 2 * l - k - m) % 7, o = f((b + 11 * k + 22 * n) / 451),
      mese = f((k + n - 7 * o + 114) / 31), giorno = ((k + n - 7 * o + 114) % 31) + 1;
    return D(a, mese - 1, giorno);
  };
  const festivi = new Map();
  const festiviAnno = (a) => {
    if (festivi.has(a)) return festivi.get(a);
    const s = new Set(['01-01', '01-06', '04-25', '05-01', '06-02', '08-15', '11-01', '12-08', '12-25', '12-26'].map((x) => `${a}-${x}`));
    s.add(iso(piu(pasqua(a), 1)));
    festivi.set(a, s); return s;
  };
  const festivo = (d) => festiviAnno(d.getUTCFullYear()).has(iso(d));

  let ultimo = null;
  let DATI = null, nido = 'skyroom', inizio = null, fine = null, primoMese = null, extra = new Set();

  const inStagione = (d) => {
    const md = iso(d).slice(5);
    return md >= DATI.stagione.apertura && md <= DATI.stagione.chiusura;
  };
  const occupata = (d) => DATI.nidi[nido].occupate.includes(iso(d));
  /* una notte si può prenotare se è in stagione, non è passata e non è occupata */
  const notteLibera = (d) => d >= oggi && inStagione(d) && !occupata(d);
  const prezzoNotte = (d) => {
    const g = d.getUTCDay(), m = d.getUTCMonth();
    const alta = g === 5 || g === 6 || g === 0 || m === 6 || m === 7 || festivo(d) || festivo(piu(d, 1));
    return alta ? DATI.prezzi.weekend : DATI.prezzi.feriale;
  };
  const notti = () => { const n = []; if (!inizio || !fine) return n; for (let d = inizio; d < fine; d = piu(d, 1)) n.push(d); return n; };
  /* l'uscita è valida se tutte le notti fra entrata e uscita sono libere */
  const uscitaPossibile = (d) => { if (!inizio || d <= inizio) return false; for (let x = inizio; x < d; x = piu(x, 1)) if (!notteLibera(x)) return false; return true; };

  /* il primo mese da mostrare: oggi, oppure l'apertura della stagione se siamo a stagione chiusa */
  const meseIniziale = () => {
    let d = D(oggi.getUTCFullYear(), oggi.getUTCMonth(), 1);
    for (let i = 0; i < 24; i++) {
      const fineMese = D(d.getUTCFullYear(), d.getUTCMonth() + 1, 0);
      for (let x = d; x <= fineMese; x = piu(x, 1)) if (x >= oggi && inStagione(x)) return d;
      d = D(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
    }
    return D(oggi.getUTCFullYear(), oggi.getUTCMonth(), 1);
  };

  const quantiMesi = () => (window.matchMedia('(max-width: 860px)').matches ? 1 : 2);

  function disegnaMesi() {
    const box = q('.calendario__mesi'); box.innerHTML = '';
    const n = quantiMesi();
    for (let k = 0; k < n; k++) {
      const m0 = D(primoMese.getUTCFullYear(), primoMese.getUTCMonth() + k, 1);
      const mese = document.createElement('div'); mese.className = 'calendario__mese';
      mese.innerHTML = `<p class="calendario__nome-mese">${MESI[m0.getUTCMonth()]} <span>${m0.getUTCFullYear()}</span></p>`;
      const griglia = document.createElement('div'); griglia.className = 'calendario__griglia'; griglia.setAttribute('role', 'grid');
      GIORNI.forEach((g) => { const e = document.createElement('span'); e.className = 'calendario__intestazione'; e.textContent = g; griglia.append(e); });
      const vuoti = (m0.getUTCDay() + 6) % 7;
      for (let i = 0; i < vuoti; i++) griglia.append(document.createElement('span'));
      const ultimo = D(m0.getUTCFullYear(), m0.getUTCMonth() + 1, 0).getUTCDate();
      for (let g = 1; g <= ultimo; g++) {
        const d = D(m0.getUTCFullYear(), m0.getUTCMonth(), g);
        const b = document.createElement('button'); b.type = 'button'; b.className = 'giorno'; b.dataset.data = iso(d);
        b.innerHTML = `<span>${g}</span>`;
        const libera = notteLibera(d);
        const passato = d < oggi, chiuso = !inStagione(d);
        let stato = 'libero';
        if (passato) stato = 'passato'; else if (chiuso) stato = 'chiuso'; else if (occupata(d)) stato = 'occupato';
        b.classList.add('giorno--' + stato);
        /* giorno cliccabile: come entrata se la notte è libera, come uscita se chiude un soggiorno valido */
        const comeUscita = !!(inizio && !fine && uscitaPossibile(d));
        if (!libera && !comeUscita) b.disabled = true;
        if (inizio && !fine && d > inizio && !comeUscita) b.classList.add('giorno--fuori');
        if (comeUscita && !libera) b.classList.add('giorno--solo-uscita');
        if (inizio && iso(d) === iso(inizio)) b.classList.add('giorno--entrata');
        if (fine && iso(d) === iso(fine)) b.classList.add('giorno--uscita');
        if (inizio && fine && d > inizio && d < fine) b.classList.add('giorno--dentro');
        if (!passato && !chiuso) {
          const p = prezzoNotte(d);
          if (libera) b.insertAdjacentHTML('beforeend', `<small>${p} €</small>`);
        }
        const etichetta = `${lunga(d)}, ${passato ? 'passato' : chiuso ? 'struttura chiusa' : occupata(d) ? 'occupato' : 'libero, ' + prezzoNotte(d) + ' euro a notte'}`;
        b.setAttribute('aria-label', etichetta);
        griglia.append(b);
      }
      for (let i = vuoti + ultimo; i < 42; i++) { const e = document.createElement('span'); e.className = 'calendario__vuoto'; griglia.append(e); }
      mese.append(griglia); box.append(mese);
    }
    const prima = D(oggi.getUTCFullYear(), oggi.getUTCMonth(), 1);
    q('[data-cal-prima]').disabled = primoMese <= prima;
  }

  function disegnaRiepilogo() {
    const n = notti(), nd = DATI.nidi[nido];
    q('[data-cal-nido]').textContent = `${nd.nome}`;
    q('[data-cal-entrata]').textContent = inizio ? breve(inizio) : 'arrivo';
    q('[data-cal-uscita]').textContent = fine ? breve(fine) : 'partenza';
    const soggiorno = n.reduce((t, d) => t + prezzoNotte(d), 0);
    const ex = DATI.extra.filter((e) => extra.has(e.id)).reduce((t, e) => t + e.prezzo, 0);
    q('[data-cal-notti]').textContent = n.length ? `${n.length} ${n.length === 1 ? 'notte' : 'notti'} · ${soggiorno} €` : '—';
    q('[data-cal-totale]').textContent = n.length ? `${soggiorno + ex} €` : '—';
    const pronto = n.length > 0;
    q('[data-cal-barra]').textContent = pronto ? `${breve(inizio)} → ${breve(fine)} · ${n.length} ${n.length === 1 ? 'notte' : 'notti'}` : (inizio ? 'Ora scegli la partenza' : 'Scegli arrivo e partenza');
    q('[data-cal-barra-totale]').textContent = pronto ? `${soggiorno + ex} €` : '';
    q('[data-cal-avanti]').setAttribute('aria-disabled', String(!pronto));
    if (!pronto) radice.classList.remove('is-riepilogo');
    q('[data-cal-prenota]').setAttribute('aria-disabled', String(!pronto));
    ultimo = { n: n.length, totale: soggiorno + ex };
    q('.calendario__aiuto').textContent = !inizio ? 'Tocca il giorno di arrivo.' : !fine ? 'Ora tocca il giorno di partenza.' : 'Perfetto! Ora manda la richiesta.';
  }

  function link(canale, n, soggiorno, ex) {
    const nd = DATI.nidi[nido], scelti = DATI.extra.filter((e) => extra.has(e.id)).map((e) => e.nome.toLowerCase());
    const righe = [
      `Ciao Federica! Vorrei prenotare la ${nd.nome} (${nd.sottotitolo}).`,
      `Arrivo: ${lunga(inizio)}`,
      `Partenza: ${lunga(fine)}`,
      `${n.length} ${n.length === 1 ? 'notte' : 'notti'}, per 2 persone`,
      scelti.length ? `Extra: ${scelti.join(', ')}` : 'Extra: nessuno per ora',
      `Totale indicativo dal sito: ${soggiorno + ex} €`,
      'È ancora libero?'
    ];
    if (canale === 'email') return `mailto:${CONFIG.email}?subject=${encodeURIComponent(`Richiesta di prenotazione – ${nd.nome}, ${breve(inizio)}`)}&body=${encodeURIComponent(righe.join('\n'))}`;
    return `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(righe.join('\n'))}`;
  }

  function scegliGiorno(d) {
    if (!inizio || fine || d <= inizio) {
      if (!notteLibera(d)) return;
      inizio = d; fine = null;
    } else if (uscitaPossibile(d)) fine = d;
    else if (notteLibera(d)) { inizio = d; fine = null; }
    disegnaMesi(); disegnaRiepilogo();
    const sel = q(`[data-data="${iso(d)}"]`); sel?.focus({ preventScroll: true });
  }

  function scegliNido(id) {
    if (!DATI.nidi[id]) return;
    nido = id; inizio = fine = null;
    qa('[data-cal-scegli]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.calScegli === id)));
    disegnaMesi(); disegnaRiepilogo();
  }

  function costruisci() {
    /* ogni nido con la sua foto e il link a tutte le sue foto: Skyroom e Starsbox hanno nomi simili, così non ci si confonde */
    q('.calendario__nidi').innerHTML = Object.entries(DATI.nidi).map(([id, n]) => `<div class="calendario__scheda"><button type="button" class="calendario__nido" data-cal-scegli="${id}" aria-pressed="${id === nido}">${n.foto ? `<img src="${n.foto}" alt="" loading="lazy">` : ''}<span class="calendario__nido-testo"><span>${n.sottotitolo}</span>${n.nome}</span></button>${document.querySelector(`[data-cal-foto="${id}"]`) ? `<button type="button" class="calendario__foto-link" data-cal-galleria="${id}">Guarda le foto</button>` : ''}</div>`).join('');
    q('.calendario__extra').innerHTML = DATI.extra.map((e) => `<label class="spunta"><input type="checkbox" value="${e.id}"><span class="spunta__casella" aria-hidden="true"></span><span class="spunta__nome">${e.nome}</span><span class="spunta__prezzo">${e.prezzo} €</span></label>`).join('');
    if (DATI.esempio) q('.calendario__esempio').hidden = false;
    primoMese = meseIniziale();
    radice.addEventListener('click', (e) => {
      const g = e.target.closest('.giorno'); if (g && !g.disabled) { scegliGiorno(daIso(g.dataset.data)); return; }
      const gf = e.target.closest('[data-cal-galleria]'); if (gf) { document.querySelector(`[data-cal-foto="${gf.dataset.calGalleria}"]`)?.click(); return; }
      const n = e.target.closest('[data-cal-scegli]'); if (n) { scegliNido(n.dataset.calScegli); return; }
      const pr = e.target.closest('[data-cal-prenota]');
      if (pr) {
        if (pr.getAttribute('aria-disabled') === 'true') { q('.calendario__aiuto').classList.remove('is-avviso'); void q('.calendario__aiuto').offsetWidth; q('.calendario__aiuto').classList.add('is-avviso'); return; }
        prenota(); return;
      }
    });
    q('[data-cal-prima]').addEventListener('click', () => { primoMese = D(primoMese.getUTCFullYear(), primoMese.getUTCMonth() - 1, 1); disegnaMesi(); });
    q('[data-cal-dopo]').addEventListener('click', () => { primoMese = D(primoMese.getUTCFullYear(), primoMese.getUTCMonth() + 1, 1); disegnaMesi(); });
    q('[data-cal-azzera]').addEventListener('click', () => { inizio = fine = null; disegnaMesi(); disegnaRiepilogo(); });
    /* su telefono: prima le date, poi il riepilogo con le coccole (due schermate, niente scroll) */
    q('[data-cal-avanti]').addEventListener('click', () => { if (q('[data-cal-avanti]').getAttribute('aria-disabled') === 'true') return; radice.classList.add('is-riepilogo'); });
    q('[data-cal-indietro]').addEventListener('click', () => { radice.classList.remove('is-riepilogo'); });
    window.addEventListener('resize', () => adatta());
    q('.calendario__extra').addEventListener('change', (e) => { const c = e.target; if (c.checked) extra.add(c.value); else extra.delete(c.value); disegnaRiepilogo(); });
    window.matchMedia('(max-width: 860px)').addEventListener('change', disegnaMesi);
    /* i bottoni "Prenota la Skyroom / la Starsbox" nelle schede portano qui con il nido già scelto */
    disegnaMesi(); disegnaRiepilogo();
    radice.classList.add('is-pronto'); adatta();
  }

  /* ── per ora la prenotazione è simulata: un'animazione di conferma. Qui arriverà la chiamata al gestionale e il pagamento ── */
  function prenota() {
    const box = document.querySelector('[data-cal-fatto]'); if (!box) return;
    const nd = DATI.nidi[nido];
    box.querySelector('[data-cal-fatto-dettagli]').innerHTML = `<b>${nd.nome}</b> · ${breve(inizio)} → ${breve(fine)} · ${ultimo.n} ${ultimo.n === 1 ? 'notte' : 'notti'} · <b>${ultimo.totale} €</b>`;
    const cielo = box.querySelector('.cal-fatto__cielo');
    cielo.innerHTML = Array.from({ length: 28 }, (_, i) => {
      const a = (i / 28) * Math.PI * 2 + Math.random() * .3, r = 110 + Math.random() * 200;
      const foglia = i % 3 === 0;
      return `<i class="${foglia ? 'cf-foglia' : 'cf-stella'}" style="--x:${(Math.cos(a) * r).toFixed(0)}px;--y:${(Math.sin(a) * r * .75 - 40).toFixed(0)}px;--r:${(Math.random() * 360).toFixed(0)}deg;--d:${(.9 + Math.random() * .5).toFixed(2)}s;--s:${(.6 + Math.random() * .8).toFixed(2)}"></i>`;
    }).join('');
    box.hidden = false; box.classList.remove('is-via'); void box.offsetWidth; box.classList.add('is-via');
    setTimeout(() => box.querySelector('[data-cal-chiudi]')?.focus({ preventScroll: true }), 2200);
  }
  function azzeraFatto() {
    const box = document.querySelector('[data-cal-fatto]'); if (!box || box.hidden) return;
    box.hidden = true; box.classList.remove('is-via');
    inizio = fine = null; extra.clear(); qa('.calendario__extra input').forEach((c) => { c.checked = false; });
    radice.classList.remove('is-riepilogo'); disegnaMesi(); disegnaRiepilogo();
  }

  /* la finestra non scorre mai: se lo schermo è basso il contenuto si rimpicciolisce.
     La misura si fa solo all'apertura e quando cambia lo schermo, sul caso più alto (date e riepilogo),
     così le scritte restano sempre della stessa grandezza mentre si usa il calendario */
  let zoomFissato = null;
  function adatta(forza) {
    const carta = radice.closest('.cal-pop__carta'); if (!carta || carta.closest('[hidden]')) return;
    const chiave = innerWidth + 'x' + innerHeight;
    if (!forza && zoomFissato === chiave) return;
    zoomFissato = chiave;
    /* la finestra entra con un piccolo rimpicciolimento: la misura si corregge per quello */
    const altezza = () => radice.getBoundingClientRect().height * (carta.offsetWidth / (carta.getBoundingClientRect().width || carta.offsetWidth));
    radice.style.zoom = '';
    const cs = getComputedStyle(carta.parentElement), disponibile = carta.parentElement.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const eraRiepilogo = radice.classList.contains('is-riepilogo');
    radice.classList.remove('is-riepilogo'); const h1 = altezza();
    radice.classList.add('is-riepilogo'); const h2 = altezza();
    radice.classList.toggle('is-riepilogo', eraRiepilogo);
    const serve = Math.max(h1, h2);
    if (serve <= disponibile + 1) return;
    /* con lo zoom il testo può andare a capo in modo diverso: si riprova finché ci sta tutto */
    let z = Math.floor(disponibile / serve * 1000) / 1000;
    for (let k = 0; k < 8; k++) {
      radice.style.zoom = String(Math.max(.6, z));
      radice.classList.remove('is-riepilogo'); const a1 = altezza();
      radice.classList.add('is-riepilogo'); const a2 = altezza();
      radice.classList.toggle('is-riepilogo', eraRiepilogo);
      const h = Math.max(a1, a2);
      if (h <= disponibile + 1 || z <= .6) break;
      z = Math.floor(z * disponibile / h * 1000) / 1000 - .005;
    }
  }

  /* ── la finestra: tutti i bottoni "Prenota" la aprono al centro, con il nido già scelto se il bottone lo dice ── */
  const pop = document.getElementById('calPop');
  let origine = null, aperta = false;
  const apri = (idNido) => {
    if (!pop) return;
    if (idNido) { if (DATI) scegliNido(idNido); else nido = idNido; }
    radice.classList.remove('is-riepilogo');
    if (aperta) return; aperta = true;
    origine = document.activeElement;
    pop.hidden = false; document.documentElement.classList.add('is-calendario');
    window.nidoLenis?.stop();
    adatta(); requestAnimationFrame(() => pop.classList.add('is-aperta'));
    setTimeout(() => pop.querySelector('.cal-pop__chiudi')?.focus({ preventScroll: true }), 60);
  };
  const chiudi = () => {
    if (!aperta) return; aperta = false;
    pop.classList.remove('is-aperta'); document.documentElement.classList.remove('is-calendario');
    setTimeout(() => { if (!aperta) { pop.hidden = true; azzeraFatto(); } }, 420);
    window.nidoLenis?.start();
    origine?.focus?.({ preventScroll: true });
  };
  if (pop) {
    /* in fase di cattura: così il salto alla sezione (in main.js) non parte */
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href="#prenota"], a[href="#calendario"], [data-prenota-nido]');
      if (!a || a.hasAttribute('data-no-cal') || a.hasAttribute('data-cal-invia') || pop.contains(a)) return;
      e.preventDefault(); e.stopPropagation();
      /* se il clic viene dal menu, il menu si chiude prima */
      if (document.documentElement.classList.contains('is-menu')) document.getElementById('menuBottone')?.click();
      apri(a.dataset.prenotaNido);
    }, true);
    pop.addEventListener('click', (e) => { if (e.target.closest('[data-cal-chiudi]')) chiudi(); });
    window.addEventListener('keydown', (e) => {
      if (!aperta) return;
      if (e.key === 'Escape') { chiudi(); return; }
      if (e.key === 'Tab') {   /* il fuoco resta dentro la finestra */
        const f = [...pop.querySelectorAll('button:not([disabled]), a[href], input')].filter((x) => x.offsetParent !== null);
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    });
    if (location.hash === '#calendario') setTimeout(() => apri(), 600);
  }

  /* per il futuro: il gestionale potrà aggiornare il calendario senza ricaricare la pagina */
  window.NidoCalendario = { aggiorna: (d) => { DATI = d; costruisci(); }, scegliNido, apri, chiudi };

  fetch(CONFIG.fonte, { cache: 'no-cache' }).then((r) => r.json()).then((d) => { DATI = d; costruisci(); })
    .catch(() => { radice.classList.add('is-errore'); });
})();
