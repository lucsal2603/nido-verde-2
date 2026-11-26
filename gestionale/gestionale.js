/* Gestionale del Nido tra gli Ulivi — ANTEPRIMA DIMOSTRATIVA.
   Legge testi, foto, prezzi e domande dal sito vero (../index.html e ../dati/disponibilita.json)
   e permette di modificarli con l'anteprima accanto. Le modifiche restano in questa pagina:
   il sito non cambia. Quando sarà collegato al dominio vero, "Salva" scriverà sul server. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
  const GIORNI = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];
  const CREDENZIALI = { utente: 'federica', password: 'ulivi2027' };   /* solo per la demo: sul server vero l'accesso sarà protetto */
  const CHIAVE_TOUR = 'nidoGestionale:tutorialVisto', CHIAVE_DENTRO = 'nidoGestionale:dentro';

  /* ── stato ── */
  let SITO = null, DATI = null;            /* documento del sito (letto una volta) e dati del calendario */
  const modifiche = new Map();             /* chiave → descrizione: quante cose sono da salvare */
  let pagina = 'panoramica';

  const avviso = (testo) => {
    const a = $('#avviso'); a.textContent = testo; a.classList.remove('is-via'); void a.offsetWidth; a.classList.add('is-via');
    clearTimeout(avviso.t); avviso.t = setTimeout(() => a.classList.remove('is-via'), 3200);
  };
  const segna = (chiave, descr) => { modifiche.set(chiave, descr); aggiornaBarra(); };
  function aggiornaBarra() {
    const n = modifiche.size;
    $('#salva').disabled = !n; $('#annulla').hidden = !n;
    const c = $('#contaModifiche'); c.hidden = !n; c.textContent = n === 1 ? '1 modifica da salvare' : `${n} modifiche da salvare`;
  }
  $('#salva').addEventListener('click', () => {
    const n = modifiche.size; modifiche.clear(); aggiornaBarra();
    avviso(`Salvato! ${n === 1 ? '1 modifica' : n + ' modifiche'} · anteprima: il sito vero non cambia`);
  });
  $('#annulla').addEventListener('click', () => { modifiche.clear(); aggiornaBarra(); vai(pagina, true); avviso('Modifiche annullate'); });
  window.addEventListener('beforeunload', (e) => { if (modifiche.size) { e.preventDefault(); e.returnValue = ''; } });

  /* ── accesso ── */
  const form = $('#accessoForm');
  $('.mostra', form).addEventListener('click', (e) => {
    const i = $('input[name="password"]', form), vis = i.type === 'password';
    i.type = vis ? 'text' : 'password'; e.currentTarget.textContent = vis ? 'Nascondi' : 'Mostra';
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const u = form.utente.value.trim().toLowerCase(), p = form.password.value;
    if (u === CREDENZIALI.utente && p === CREDENZIALI.password) { sessionStorage.setItem(CHIAVE_DENTRO, '1'); entra(); }
    else { $('#accessoErrore').hidden = false; form.classList.remove('is-errore'); void form.offsetWidth; form.classList.add('is-errore'); }
  });
  $('#esci').addEventListener('click', () => {
    if (modifiche.size && !confirm('Ci sono modifiche non salvate. Uscire lo stesso?')) return;
    modifiche.clear(); sessionStorage.removeItem(CHIAVE_DENTRO); location.hash = ''; location.reload();
  });

  async function entra() {
    $('#accesso').hidden = true; $('#app').hidden = false;
    if (!SITO) {
      $('#contenuto').innerHTML = '<p class="carica">Sto leggendo il sito…</p>';
      const [html, dati] = await Promise.all([fetch('../index.html', { cache: 'no-cache' }).then((r) => r.text()), fetch('../dati/disponibilita.json', { cache: 'no-cache' }).then((r) => r.json())]);
      SITO = new DOMParser().parseFromString(html, 'text/html'); DATI = dati;
      preparaPrenotazioni();
    }
    vai((location.hash || '#panoramica').slice(1));
    if (!localStorage.getItem(CHIAVE_TOUR)) setTimeout(() => tour.apri(), 500);
  }
  if (sessionStorage.getItem(CHIAVE_DENTRO)) entra();

  /* ── navigazione ── */
  const TITOLI = { panoramica: 'Panoramica', prenotazioni: 'Calendario e prenotazioni', pagine: 'Testi e foto del sito', nidi: 'I nidi', prezzi: 'Prezzi e coccole', domande: 'Domande frequenti', recensioni: 'Recensioni', foto: 'Libreria foto', impostazioni: 'Contatti e impostazioni' };
  window.addEventListener('hashchange', () => { if (SITO) vai(location.hash.slice(1)); });
  function vai(p, forza) {
    if (!TITOLI[p]) p = 'panoramica';
    if (p === pagina && !forza && $('#contenuto').dataset.p === p) return;
    pagina = p; $('#contenuto').dataset.p = p;
    $$('#menu a').forEach((a) => a.classList.toggle('is-attiva', a.getAttribute('href') === '#' + p));
    $('#titoloPagina').textContent = TITOLI[p];
    $('#titoloOcchiello').textContent = p === 'panoramica' ? saluto() : 'Il Nido tra gli Ulivi';
    document.body.classList.remove('menu-aperto');
    const c = $('#contenuto'); c.innerHTML = PAGINE[p](); c.scrollTop = 0; window.scrollTo(0, 0);
    LEGA[p]?.(c);
    c.classList.remove('is-entra'); void c.offsetWidth; c.classList.add('is-entra');
  }
  const saluto = () => { const h = new Date().getHours(); return (h < 13 ? 'Buongiorno' : h < 18 ? 'Buon pomeriggio' : 'Buonasera') + ' Federica'; };
  $('#barraMenu').addEventListener('click', () => document.body.classList.toggle('menu-aperto'));

  /* ── prenotazioni di esempio, ricavate dalle date occupate del calendario ── */
  const NOMI = ['Giulia e Marco', 'Sara e Luca', 'Elena e Davide', 'Chiara e Paolo', 'Marta e Andrea', 'Francesca e Simone', 'Alice e Matteo', 'Irene e Tommaso', 'Laura e Pietro', 'Anna e Giorgio', 'Valentina e Nicola', 'Silvia e Fabio', 'Martina e Riccardo', 'Federico e Camilla', 'Beatrice e Lorenzo', 'Giorgia e Stefano', 'Noemi e Alessio', 'Ilaria e Daniele'];
  const CANALI = ['Sito', 'Airbnb', 'Sito', 'Booking', 'Telefono', 'Sito'];
  let PRENOTAZIONI = [];
  const D = (s) => new Date(s + 'T12:00:00');
  const piu = (s, n) => { const d = D(s); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  const breve = (s) => { const d = D(s); return `${GIORNI[d.getDay()]} ${d.getDate()} ${MESI[d.getMonth()].slice(0, 3)}`; };
  const prezzoNotte = (s) => { const d = D(s), g = d.getDay(), m = d.getMonth(); return g === 5 || g === 6 || g === 0 || m === 6 || m === 7 ? DATI.prezzi.weekend : DATI.prezzi.feriale; };
  function preparaPrenotazioni() {
    let k = 0;
    Object.entries(DATI.nidi).forEach(([id, n]) => {
      const date = [...n.occupate].sort(); let i = 0;
      while (i < date.length) {
        let j = i; while (j + 1 < date.length && piu(date[j], 1) === date[j + 1]) j++;
        const notti = j - i + 1, extra = k % 3 === 0 ? ['Vasca idromassaggio'] : k % 4 === 1 ? ['Aperitivo del Contadino'] : [];
        const tot = date.slice(i, j + 1).reduce((t, d) => t + prezzoNotte(d), 0) + (extra.includes('Vasca idromassaggio') ? 40 : 0) + (extra.includes('Aperitivo del Contadino') ? 40 : 0);
        PRENOTAZIONI.push({ codice: `${n.nome.slice(0, 2).toUpperCase()}-${date[i].slice(2).replace(/-/g, '')}-${String(100 + ((k * 37) % 900))}`, nido: id, ospiti: NOMI[k % NOMI.length], arrivo: date[i], partenza: piu(date[j], 1), notti, extra, totale: tot, canale: CANALI[k % CANALI.length], stato: k % 5 === 2 ? 'Da confermare' : 'Confermata' });
        k++; i = j + 1;
      }
    });
    PRENOTAZIONI.sort((a, b) => a.arrivo.localeCompare(b.arrivo));
  }

  /* ── utilità per i testi del sito: html ↔ testo semplice con *corsivo*, **grassetto** e [link](indirizzo) ── */
  const INLINE = new Set(['B', 'STRONG', 'I', 'EM', 'BR', 'SPAN', 'A', 'SMALL', 'SUP']);
  function aTesto(el) {
    let righe = false;
    const giro = (n) => {
      if (n.nodeType === 3) return n.textContent.replace(/\s+/g, ' ');
      if (n.nodeType !== 1) return '';
      const t = n.tagName, dentro = () => [...n.childNodes].map(giro).join('');
      if (t === 'BR') return '\n';
      if (t === 'SPAN' && n.classList.contains('riga')) { righe = true; return '\u0001' + dentro().trim(); }
      if (t === 'I' && n.parentElement?.classList.contains('riga')) return dentro();
      if (t === 'EM' || t === 'I') return '*' + dentro() + '*';
      if (t === 'B' || t === 'STRONG') return '**' + dentro() + '**';
      if (t === 'A' && el.tagName !== 'A') return `[${dentro()}](${n.getAttribute('href')})`;
      if (n.getAttribute('aria-hidden') === 'true') return '';
      return dentro();
    };
    let t = [...el.childNodes].map(giro).join('');
    if (righe) t = t.split('\u0001').map((x) => x.trim()).filter(Boolean).join('\n');
    return { testo: t.replace(/[ \t]+\n/g, '\n').replace(/\n[ \t]+/g, '\n').trim(), righe };
  }
  function daTesto(t, righe) {
    const linea = (s) => esc(s).replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/\*([^*]+)\*/g, '<em>$1</em>');
    if (righe) return t.split('\n').filter((x) => x.trim()).map((x) => `<span class="riga"><i>${linea(x.trim())}</i></span>`).join(' ');
    return t.split('\n').map(linea).join('<br>');
  }
  const nascosto = (el) => !!el.closest('[aria-hidden="true"], script, style, svg, template, noscript');
  function foglieTesto(radice) {
    const out = [];
    const giro = (el) => {
      if (nascosto(el) || el.tagName === 'SCRIPT') return;
      const testo = el.textContent.trim();
      if (!testo) return;
      const tutteInline = [...el.querySelectorAll('*')].every((d) => INLINE.has(d.tagName) || d.closest('svg'));
      const contenitore = /^(DIV|NAV|UL|OL|DL|SECTION|ARTICLE|HEADER|FOOTER|FIGURE|ASIDE|FORM|MAIN)$/.test(el.tagName);
      if (tutteInline && (el.children.length === 0 || !contenitore) && (el.children.length === 0 || !INLINE.has(el.tagName) || el.tagName === 'A')) { out.push(el); return; }
      [...el.children].forEach(giro);
    };
    [...radice.children].forEach(giro);
    return out;
  }
  /* il percorso di un elemento dentro la sua sezione: serve per ritrovarlo nell'anteprima */
  function percorso(el, radice) {
    const p = []; let n = el;
    while (n && n !== radice) { const fr = [...n.parentElement.children].filter((x) => x.tagName === n.tagName); p.unshift(`${n.tagName.toLowerCase()}:nth-of-type(${fr.indexOf(n) + 1})`); n = n.parentElement; }
    return p.join(' > ');
  }
  function etichetta(el) {
    const t = el.tagName, c = el.className || '';
    if (/occhiello/.test(c)) return 'Scritta piccola sopra il titolo';
    if (t === 'H1' || t === 'H2') return 'Titolo';
    if (t === 'H3' || t === 'H4') return 'Sottotitolo';
    if (t === 'A' || t === 'BUTTON') return /bottone|btn/.test(c) || t === 'BUTTON' ? 'Bottone' : 'Collegamento';
    if (t === 'LI') return 'Voce dell’elenco';
    if (t === 'DT') return 'Etichetta';
    if (t === 'DD') return 'Informazione';
    if (t === 'BLOCKQUOTE') return 'Recensione';
    if (t === 'SMALL') return 'Nota';
    if (/prezzo/.test(c)) return 'Prezzo';
    return 'Testo';
  }

  const SEZIONI = [
    ['#hero', 'Copertina', 'La prima cosa che si vede: foto grande, titolo e bottoni.'],
    ['#federica', 'Chi ti accoglie', 'Le frasi che scorrono con la presentazione di Federica.'],
    ['#nidi', 'I tre nidi', 'Le schede di Skyroom, Starsbox e Nido 3.'],
    ['#magia', 'La magia del Nido', 'La sezione con i punti forti.'],
    ['#stelle', 'Le stelle', 'La notte con la costellazione e il testo sul tetto che si apre.'],
    ['#extra', 'Le coccole', 'Colazione, vasca, aperitivi e torta.'],
    ['#dintorni', 'Dintorni', 'Le cose da fare intorno al lago.'],
    ['#voucher', 'Voucher regalo', 'Il biglietto e il testo per regalare il Nido.'],
    ['#recensioni', 'Recensioni', 'Le parole degli ospiti.'],
    ['#domande', 'Domande frequenti', 'Le risposte alle domande più comuni.'],
    ['#prenota', 'Prenota e contatti', 'Dove siamo, orari, pagamento e contatti.'],
    ['#popup', 'Finestra di benvenuto', 'La finestrella che compare a chi entra nel sito.'],
    ['#menu', 'Menu del telefono', 'Le voci del menu che si apre su telefono.'],
    ['#piede', 'Piè di pagina', 'La parte in fondo a ogni pagina.']
  ];

  /* ── pagine ── */
  const PAGINE = {}, LEGA = {};

  /* PANORAMICA */
  PAGINE.panoramica = () => {
    const oggi = new Date().toISOString().slice(0, 10);
    const prossime = PRENOTAZIONI.filter((p) => p.partenza >= oggi).slice(0, 5);
    const notti = PRENOTAZIONI.reduce((t, p) => t + p.notti, 0), incasso = PRENOTAZIONI.reduce((t, p) => t + p.totale, 0);
    const daConf = PRENOTAZIONI.filter((p) => p.stato === 'Da confermare').length;
    return `
    <div class="griglia-num">
      <div class="num"><span>Prenotazioni in arrivo</span><b>${PRENOTAZIONI.filter((p) => p.arrivo >= oggi).length}</b><small>nella prossima stagione</small></div>
      <div class="num"><span>Notti prenotate</span><b>${notti}</b><small>Skyroom e Starsbox</small></div>
      <div class="num"><span>Incasso previsto</span><b>${incasso.toLocaleString('it-IT')} €</b><small>notti e coccole</small></div>
      <div class="num num--evidenza"><span>Da confermare</span><b>${daConf}</b><small><a href="#prenotazioni">vai alle prenotazioni →</a></small></div>
    </div>
    <div class="due">
      <section class="riquadro">
        <div class="riquadro__testa"><h2>Prossimi arrivi</h2><a href="#prenotazioni">Tutte →</a></div>
        <ul class="arrivi">${prossime.map((p) => `<li><span class="arrivi__data"><b>${D(p.arrivo).getDate()}</b>${MESI[D(p.arrivo).getMonth()].slice(0, 3)}</span><span class="arrivi__chi"><b>${esc(p.ospiti)}</b>${DATI.nidi[p.nido].nome} · ${p.notti} ${p.notti === 1 ? 'notte' : 'notti'}${p.extra.length ? ' · ' + p.extra.join(', ') : ''}</span><span class="stato ${p.stato === 'Confermata' ? 'stato--ok' : 'stato--attesa'}">${p.stato}</span></li>`).join('')}</ul>
      </section>
      <section class="riquadro">
        <div class="riquadro__testa"><h2>Cose veloci</h2></div>
        <div class="veloci">
          <a href="#prenotazioni" class="veloce"><i>▦</i><b>Chiudi delle date</b><span>ferie, lavori, giorni pieni</span></a>
          <a href="#pagine" class="veloce" data-apri-sezione="#hero"><i>▣</i><b>Cambia la foto di copertina</b><span>la prima foto del sito</span></a>
          <a href="#domande" class="veloce"><i>?</i><b>Aggiungi una domanda</b><span>nelle domande frequenti</span></a>
          <a href="#prezzi" class="veloce"><i>€</i><b>Cambia i prezzi</b><span>notti e coccole</span></a>
        </div>
      </section>
    </div>
    <section class="riquadro riquadro--sito">
      <div><h2>Il tuo sito</h2><p>Ogni cosa che vedi sul sito si cambia da qui: testi, foto, prezzi, domande, recensioni e date. Prima di salvare vedi sempre l’anteprima.</p><a class="btn btn--pieno" href="#pagine">Modifica testi e foto</a> <a class="btn" href="../" target="_blank" rel="noopener">Apri il sito ↗</a></div>
      <img src="../img/coppia-tramonto.webp" alt="">
    </section>`;
  };
  LEGA.panoramica = (c) => { $$('[data-apri-sezione]', c).forEach((a) => a.addEventListener('click', () => { sezioneDaAprire = a.dataset.apriSezione; })); };

  /* CALENDARIO E PRENOTAZIONI */
  let calNido = 'skyroom', calMese = null;
  PAGINE.prenotazioni = () => {
    if (!calMese) { const prima = PRENOTAZIONI[0]?.arrivo || new Date().toISOString().slice(0, 10); calMese = prima.slice(0, 7); }
    return `
    <section class="riquadro">
      <div class="riquadro__testa riquadro__testa--a-capo">
        <div class="scelta-nido" role="group" aria-label="Nido">${Object.entries(DATI.nidi).map(([id, n]) => `<button type="button" data-nido="${id}" aria-pressed="${id === calNido}"><img src="../${n.foto || ''}" alt="">${n.nome}</button>`).join('')}</div>
        <div class="mese-nav"><button type="button" data-mese="-1" aria-label="Mese precedente">‹</button><b id="meseNome"></b><button type="button" data-mese="1" aria-label="Mese successivo">›</button></div>
      </div>
      <div class="cal" id="cal"></div>
      <ul class="leggenda"><li><i class="l-libero"></i>Libero</li><li><i class="l-pren"></i>Prenotato</li><li><i class="l-chiuso"></i>Chiuso da te</li></ul>
      <p class="aiuto">Tocca un giorno libero per <b>chiuderlo</b> (non sarà prenotabile sul sito), toccalo di nuovo per riaprirlo.</p>
    </section>
    <section class="riquadro">
      <div class="riquadro__testa"><h2>Prenotazioni</h2><button type="button" class="btn btn--pieno" id="nuovaPren">+ Aggiungi prenotazione</button></div>
      <div class="filtri"><input type="search" id="cerca" placeholder="Cerca per nome o numero"><select id="filtroNido"><option value="">Tutti i nidi</option>${Object.entries(DATI.nidi).map(([id, n]) => `<option value="${id}">${n.nome}</option>`).join('')}</select></div>
      <div class="tabella-box"><table class="tabella"><thead><tr><th>N°</th><th>Ospiti</th><th>Nido</th><th>Date</th><th>Coccole</th><th>Totale</th><th>Da</th><th>Stato</th></tr></thead><tbody id="righe"></tbody></table></div>
    </section>`;
  };
  const chiuse = { skyroom: new Set(), starsbox: new Set() };
  LEGA.prenotazioni = (c) => {
    const disegnaCal = () => {
      const [a, m] = calMese.split('-').map(Number), primo = new Date(a, m - 1, 1), giorni = new Date(a, m, 0).getDate();
      $('#meseNome', c).textContent = `${MESI[m - 1]} ${a}`;
      const occ = new Map(); PRENOTAZIONI.filter((p) => p.nido === calNido).forEach((p) => { for (let d = p.arrivo; d < p.partenza; d = piu(d, 1)) occ.set(d, p); });
      let h = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom'].map((g) => `<span class="cal__int">${g}</span>`).join('');
      for (let i = 0; i < (primo.getDay() + 6) % 7; i++) h += '<span></span>';
      for (let g = 1; g <= giorni; g++) {
        const iso = `${a}-${String(m).padStart(2, '0')}-${String(g).padStart(2, '0')}`, p = occ.get(iso), ch = chiuse[calNido].has(iso);
        h += `<button type="button" class="cal__g ${p ? 'is-pren' : ch ? 'is-chiuso' : ''}" data-g="${iso}" ${p ? `title="${esc(p.ospiti)} · ${p.codice}"` : ''}><b>${g}</b>${p ? `<small>${esc(p.ospiti.split(' ')[0])}</small>` : ch ? '<small>chiuso</small>' : `<small>${prezzoNotte(iso)} €</small>`}</button>`;
      }
      $('#cal', c).innerHTML = h;
    };
    const disegnaRighe = () => {
      const q = $('#cerca', c).value.trim().toLowerCase(), f = $('#filtroNido', c).value;
      $('#righe', c).innerHTML = PRENOTAZIONI.filter((p) => (!f || p.nido === f) && (!q || (p.ospiti + ' ' + p.codice).toLowerCase().includes(q))).map((p, i) => `<tr>
        <td class="mono">${p.codice}</td><td><b>${esc(p.ospiti)}</b></td><td>${DATI.nidi[p.nido].nome}</td><td>${breve(p.arrivo)} → ${breve(p.partenza)}<small>${p.notti} ${p.notti === 1 ? 'notte' : 'notti'}</small></td>
        <td>${p.extra.length ? p.extra.map((e) => `<span class="chip">${e}</span>`).join(' ') : '<span class="tenue">—</span>'}</td><td><b>${p.totale} €</b></td><td>${p.canale}</td>
        <td><button type="button" class="stato ${p.stato === 'Confermata' ? 'stato--ok' : 'stato--attesa'}" data-stato="${PRENOTAZIONI.indexOf(p)}" title="Tocca per cambiare">${p.stato}</button></td></tr>`).join('') || '<tr><td colspan="8" class="tenue">Nessuna prenotazione trovata</td></tr>';
    };
    c.addEventListener('click', (e) => {
      const n = e.target.closest('[data-nido]'); if (n) { calNido = n.dataset.nido; $$('[data-nido]', c).forEach((b) => b.setAttribute('aria-pressed', String(b === n))); disegnaCal(); return; }
      const mm = e.target.closest('[data-mese]'); if (mm) { const [a, m] = calMese.split('-').map(Number); const d = new Date(a, m - 1 + Number(mm.dataset.mese), 1); calMese = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; disegnaCal(); return; }
      const g = e.target.closest('.cal__g'); if (g) {
        if (g.classList.contains('is-pren')) { avviso(g.title || 'Giorno prenotato'); return; }
        const s = chiuse[calNido]; s.has(g.dataset.g) ? s.delete(g.dataset.g) : s.add(g.dataset.g);
        segna(`chiuso-${calNido}-${g.dataset.g}`, 'date'); disegnaCal(); return;
      }
      const st = e.target.closest('[data-stato]'); if (st) { const p = PRENOTAZIONI[st.dataset.stato]; p.stato = p.stato === 'Confermata' ? 'Da confermare' : 'Confermata'; segna('stato-' + p.codice, 'stato'); disegnaRighe(); return; }
      if (e.target.closest('#nuovaPren')) finestraPrenotazione(() => { disegnaCal(); disegnaRighe(); });
    });
    $('#cerca', c).addEventListener('input', disegnaRighe); $('#filtroNido', c).addEventListener('change', disegnaRighe);
    disegnaCal(); disegnaRighe();
  };
  function finestraPrenotazione(fatto) {
    finestra('Nuova prenotazione', `
      <label>Nomi degli ospiti<input name="ospiti" placeholder="Es. Giulia e Marco" required></label>
      <label>Nido<select name="nido">${Object.entries(DATI.nidi).map(([id, n]) => `<option value="${id}">${n.nome}</option>`).join('')}</select></label>
      <div class="due-campi"><label>Arrivo<input type="date" name="arrivo" required></label><label>Partenza<input type="date" name="partenza" required></label></div>
      <fieldset><legend>Coccole</legend>${DATI.extra.map((x) => `<label class="spunta"><input type="checkbox" name="extra" value="${esc(x.nome)}"> ${esc(x.nome)} <span>${x.prezzo} €</span></label>`).join('')}</fieldset>
      <label>Arrivata da<select name="canale"><option>Telefono</option><option>WhatsApp</option><option>Airbnb</option><option>Booking</option><option>Di persona</option></select></label>`,
    (f) => {
      const a = f.arrivo.value, b = f.partenza.value; if (!a || !b || b <= a) { avviso('Controlla le date: la partenza deve essere dopo l’arrivo'); return false; }
      let notti = 0, tot = 0; for (let d = a; d < b; d = piu(d, 1)) { notti++; tot += prezzoNotte(d); }
      const extra = $$('input[name="extra"]:checked', f).map((x) => x.value); tot += DATI.extra.filter((x) => extra.includes(x.nome)).reduce((t, x) => t + x.prezzo, 0);
      const nd = DATI.nidi[f.nido.value];
      const p = { codice: `${nd.nome.slice(0, 2).toUpperCase()}-${a.slice(2).replace(/-/g, '')}-${100 + Math.floor(Math.random() * 900)}`, nido: f.nido.value, ospiti: f.ospiti.value.trim() || 'Ospiti', arrivo: a, partenza: b, notti, extra, totale: tot, canale: f.canale.value, stato: 'Confermata' };
      PRENOTAZIONI.push(p); PRENOTAZIONI.sort((x, y) => x.arrivo.localeCompare(y.arrivo)); calNido = p.nido; calMese = a.slice(0, 7);
      segna('pren-' + p.codice, 'prenotazione'); avviso(`Prenotazione ${p.codice} aggiunta: le date ora risultano occupate`); fatto(); return true;
    });
  }

  /* TESTI E FOTO DEL SITO: elenco delle sezioni con i loro campi, anteprima del sito accanto */
  let sezioneDaAprire = null;
  PAGINE.pagine = () => `
    <div class="editor">
      <div class="editor__campi">
        <p class="aiuto aiuto--su">Apri una sezione, cambia il testo e guardalo subito nell’anteprima. Per il <em>corsivo</em> metti il testo tra *asterischi*, per il <b>grassetto</b> tra **due asterischi**. Per andare a capo premi Invio.</p>
        ${SEZIONI.map(([sel, nome, descr], i) => `<details class="sez" data-sez="${sel}"${(sezioneDaAprire ? sezioneDaAprire === sel : i === 0) ? ' open' : ''}><summary><b>${nome}</b><span>${descr}</span></summary><div class="sez__corpo" data-corpo></div></details>`).join('')}
      </div>
      <div class="editor__anteprima">
        <div class="anteprima-barra"><span>Anteprima</span><div class="schermi"><button type="button" data-schermo="pc" aria-pressed="true">Computer</button><button type="button" data-schermo="tel" aria-pressed="false">Telefono</button></div></div>
        <div class="anteprima-cornice" id="cornice"><iframe id="anteprima" title="Anteprima del sito" src="../index.html?qa=1"></iframe></div>
      </div>
    </div>`;
  LEGA.pagine = (c) => {
    sezioneDaAprire = null;
    const ifr = $('#anteprima', c);
    const docA = () => { try { return ifr.contentDocument; } catch (e) { return null; } };
    const riempi = (det) => {
      const corpo = $('[data-corpo]', det); if (corpo.dataset.pieno) return; corpo.dataset.pieno = '1';
      const sez = $(det.dataset.sez, SITO); if (!sez) { corpo.innerHTML = '<p class="tenue">Sezione non trovata.</p>'; return; }
      const testi = foglieTesto(sez), foto = $$('img', sez).filter((im) => !nascosto(im) && im.getAttribute('src'));
      corpo.innerHTML = (foto.length ? `<div class="foto-sez">${foto.map((im) => `<figure class="foto-campo" data-percorso="${esc(percorso(im, sez))}"><img src="../${esc(im.getAttribute('src'))}" alt=""><figcaption><input value="${esc(im.getAttribute('alt') || '')}" placeholder="Descrizione della foto (per Google e per chi non vede)" data-alt><button type="button" class="btn btn--piccolo" data-sostituisci>Cambia foto</button></figcaption></figure>`).join('')}</div>` : '')
        + testi.map((el) => { const { testo, righe } = aTesto(el); const lungo = testo.length > 70 || testo.includes('\n'); return `<label class="campo" data-percorso="${esc(percorso(el, sez))}" data-righe="${righe ? 1 : ''}"><span>${etichetta(el)}</span>${lungo ? `<textarea rows="${Math.min(8, Math.ceil(testo.length / 60) + (testo.match(/\n/g) || []).length)}">${esc(testo)}</textarea>` : `<input value="${esc(testo)}">`}</label>`; }).join('');
    };
    const trova = (det, p) => { const d = docA(); if (!d) return null; const s = $(det.dataset.sez, d); if (!s) return null; try { return p ? $(':scope > ' + p, s) : s; } catch (e) { return null; } };
    const evidenzia = (el) => {
      if (!el) return; el.scrollIntoView({ block: 'center' });
      const d = docA(); $$('.gest-evidenzia', d).forEach((x) => x.classList.remove('gest-evidenzia')); el.classList.add('gest-evidenzia');
    };
    /* il sito nell'anteprima ha la sua larghezza vera (computer 1440, telefono 390) ed è rimpicciolito per entrare nella cornice */
    const scala = () => {
      const cor = $('#cornice', c); if (!cor) return;
      const W = cor.classList.contains('is-tel') ? 390 : 1440, k = Math.min(1, cor.clientWidth / W);
      Object.assign(ifr.style, { width: W + 'px', height: cor.clientHeight / k + 'px', transform: `scale(${k})`, transformOrigin: '0 0' });
    };
    if (matchMedia('(max-width: 900px)').matches) { $('#cornice', c).classList.add('is-tel'); $$('[data-schermo]', c).forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.schermo === 'tel'))); }
    scala(); window.addEventListener('resize', scala);
    ifr.addEventListener('load', () => {
      const d = docA(); if (!d) return;
      const st = d.createElement('style'); st.textContent = '.gest-evidenzia{outline:3px solid #A0B028!important;outline-offset:4px;border-radius:6px;transition:outline-color .3s} html{scroll-behavior:smooth}'; d.head.append(st);
      const aperta = $('details.sez[open]', c); if (aperta) evidenzia(trova(aperta, ''));
    });
    $$('details.sez', c).forEach((det) => {
      if (det.open) riempi(det);
      det.addEventListener('toggle', () => { if (det.open) { riempi(det); evidenzia(trova(det, '')); } });
    });
    c.addEventListener('focusin', (e) => { const f = e.target.closest('[data-percorso]'); if (f) evidenzia(trova(f.closest('details'), f.dataset.percorso)); });
    c.addEventListener('input', (e) => {
      const f = e.target.closest('[data-percorso]'); if (!f) return;
      const det = f.closest('details'), el = trova(det, f.dataset.percorso);
      if (e.target.matches('[data-alt]')) { if (el) el.alt = e.target.value; segna('alt-' + det.dataset.sez + f.dataset.percorso, 'alt'); return; }
      if (el) el.innerHTML = daTesto(e.target.value, !!f.dataset.righe);
      segna('testo-' + det.dataset.sez + f.dataset.percorso, 'testo');
    });
    c.addEventListener('click', (e) => {
      const b = e.target.closest('[data-sostituisci]'); if (b) {
        const fig = b.closest('.foto-campo'), det = fig.closest('details');
        scegliFoto((url) => { $('img', fig).src = url; const el = trova(det, fig.dataset.percorso); if (el) { el.src = url; el.removeAttribute('srcset'); el.closest('picture')?.querySelectorAll('source').forEach((s) => s.remove()); evidenzia(el); } segna('foto-' + det.dataset.sez + fig.dataset.percorso, 'foto'); avviso('Foto cambiata nell’anteprima'); });
        return;
      }
      const s = e.target.closest('[data-schermo]'); if (s) { $$('[data-schermo]', c).forEach((x) => x.setAttribute('aria-pressed', String(x === s))); $('#cornice', c).classList.toggle('is-tel', s.dataset.schermo === 'tel'); setTimeout(scala, 420); }
    });
  };

  /* I NIDI */
  const NIDI_SEL = ['#skyroom', '#starsbox'];
  function leggiNido(art) {
    const gal = $('[data-galleria]', art);
    return {
      id: art.id,
      occhiello: $('.occhiello', art)?.textContent.trim() || '',
      titolo: aTesto($('h3, h2', art) || art).testo,
      motto: $('.nido__motto', art)?.textContent.trim() || '',
      descr: $$('p', art).filter((p) => !p.className && p.textContent.trim().length > 60).map((p) => p.textContent.trim())[0] || '',
      dettagli: $$('ul li', art).map((li) => li.textContent.trim()),
      foto: $('.nido__foto img', art)?.getAttribute('src') || '',
      galleria: gal ? gal.dataset.galleria.split(',').filter(Boolean) : []
    };
  }
  PAGINE.nidi = () => {
    const nidi = NIDI_SEL.map((s) => $(s, SITO)).filter(Boolean).map(leggiNido);
    const tre = $$('#nidi .occhiello', SITO).find((o) => /Nido 3/.test(o.textContent));
    return nidi.map((n) => `
      <section class="riquadro nido-ed" data-id="${n.id}">
        <div class="nido-ed__testa"><img src="../${esc(n.foto)}" alt=""><div><p class="occhiello">${esc(n.occhiello)}</p><h2>${esc(n.titolo.replace(/\*/g, ''))}</h2></div><button type="button" class="btn btn--piccolo" data-sost-cop>Cambia foto principale</button></div>
        <div class="due-campi">
          <label class="campo"><span>Nome e numero</span><input value="${esc(n.occhiello)}" data-c="occhiello"></label>
          <label class="campo"><span>Titolo della scheda</span><input value="${esc(n.titolo)}" data-c="titolo"></label>
        </div>
        <label class="campo"><span>Frase in corsivo</span><input value="${esc(n.motto)}" data-c="motto"></label>
        <label class="campo"><span>Descrizione</span><textarea rows="4" data-c="descr">${esc(n.descr)}</textarea></label>
        <div class="campo"><span>Cosa c’è nel nido</span><ul class="lista-ed" data-lista>${n.dettagli.map((d) => voceLista(d)).join('')}</ul><button type="button" class="aggiungi" data-agg-voce>+ Aggiungi una voce</button></div>
        <div class="campo"><span>Galleria “Guarda le foto” <small>(la prima è quella che si vede per prima)</small></span><div class="galleria-ed" data-galleria-ed>${n.galleria.map((f) => fotoGalleria('../' + f)).join('')}<button type="button" class="galleria-ed__agg" data-agg-foto>+<span>Aggiungi foto</span></button></div></div>
      </section>`).join('') + (tre ? `<section class="riquadro"><h2>Nido 3</h2><p class="tenue">Il terzo nido è ancora “in arrivo”: il suo testo si cambia da <a href="#pagine">Testi e foto del sito → I tre nidi</a>. Quando sarà pronto, qui comparirà la sua scheda completa come le altre due.</p></section>` : '');
  };
  const voceLista = (t) => `<li><span class="maniglia" aria-hidden="true">⋮⋮</span><input value="${esc(t)}"><button type="button" class="su" title="Sposta su">↑</button><button type="button" class="giu" title="Sposta giù">↓</button><button type="button" class="via" title="Togli">✕</button></li>`;
  const fotoGalleria = (src) => `<figure><img src="${esc(src)}" alt=""><div><button type="button" class="su" title="Sposta prima">←</button><button type="button" class="giu" title="Sposta dopo">→</button><button type="button" class="via" title="Togli dalla galleria">✕</button></div></figure>`;
  LEGA.nidi = (c) => {
    c.addEventListener('input', (e) => { const s = e.target.closest('[data-id]'); if (s) segna('nido-' + s.dataset.id + '-' + (e.target.dataset.c || 'lista'), 'nido'); });
    c.addEventListener('click', (e) => {
      const s = e.target.closest('[data-id]'); if (!s) return; const k = 'nido-' + s.dataset.id;
      const li = e.target.closest('li, figure');
      if (e.target.matches('.via') && li) { li.remove(); segna(k + '-rimozione-' + Math.random(), 'nido'); return; }
      if (e.target.matches('.su') && li?.previousElementSibling) { li.parentNode.insertBefore(li, li.previousElementSibling); segna(k + '-ordine', 'nido'); return; }
      if (e.target.matches('.giu') && li?.nextElementSibling && !li.nextElementSibling.matches('[data-agg-foto]')) { li.parentNode.insertBefore(li.nextElementSibling, li); segna(k + '-ordine', 'nido'); return; }
      if (e.target.closest('[data-agg-voce]')) { const ul = $('[data-lista]', s); ul.insertAdjacentHTML('beforeend', voceLista('')); $('li:last-child input', ul).focus(); segna(k + '-lista', 'nido'); return; }
      if (e.target.closest('[data-agg-foto]')) { scegliFoto((url) => { $('[data-agg-foto]', s).insertAdjacentHTML('beforebegin', fotoGalleria(url)); segna(k + '-galleria', 'nido'); avviso('Foto aggiunta alla galleria'); }); return; }
      if (e.target.closest('[data-sost-cop]')) scegliFoto((url) => { $('.nido-ed__testa img', s).src = url; segna(k + '-foto', 'nido'); avviso('Foto principale cambiata'); });
    });
  };

  /* PREZZI E COCCOLE */
  PAGINE.prezzi = () => {
    const voucher = $('#voucher', SITO)?.textContent.match(/(\d+)\s*(?:&nbsp;| |\s)?€/)?.[1] || '130';
    const ape = DATI.stagione.apertura.split('-'), chi = DATI.stagione.chiusura.split('-');
    return `
    <section class="riquadro"><h2>Prezzo a notte</h2><p class="aiuto">Valgono per tutti i nidi, per due persone con la colazione.</p>
      <div class="due-campi">
        <label class="campo campo--euro"><span>Da lunedì a giovedì</span><input type="number" min="0" value="${DATI.prezzi.feriale}" data-k="feriale"><i>€</i></label>
        <label class="campo campo--euro"><span>Venerdì, sabato, domenica, festivi, luglio e agosto</span><input type="number" min="0" value="${DATI.prezzi.weekend}" data-k="weekend"><i>€</i></label>
      </div>
    </section>
    <section class="riquadro"><h2>Le coccole</h2><p class="aiuto">Compaiono nel calendario quando si prenota e nella sezione “Le coccole”.</p>
      <ul class="extra-ed" id="extraEd">${DATI.extra.map((x) => rigaExtra(x.nome, x.prezzo)).join('')}</ul>
      <button type="button" class="aggiungi" id="aggExtra">+ Aggiungi una coccola</button>
    </section>
    <section class="riquadro"><h2>Stagione e voucher</h2>
      <div class="tre-campi">
        <label class="campo"><span>Apertura</span><input type="date" value="2027-${ape[0]}-${ape[1]}" data-k="apertura"></label>
        <label class="campo"><span>Chiusura</span><input type="date" value="2027-${chi[0]}-${chi[1]}" data-k="chiusura"></label>
        <label class="campo campo--euro"><span>Prezzo del voucher regalo</span><input type="number" min="0" value="${voucher}" data-k="voucher"><i>€</i></label>
      </div>
    </section>`;
  };
  const rigaExtra = (n, p) => `<li><input value="${esc(n)}" placeholder="Nome della coccola"><label class="campo--euro"><input type="number" min="0" value="${p}"><i>€</i></label><button type="button" class="via" title="Togli">✕</button></li>`;
  LEGA.prezzi = (c) => {
    c.addEventListener('input', (e) => segna('prezzi-' + (e.target.dataset.k || 'extra'), 'prezzi'));
    c.addEventListener('click', (e) => {
      if (e.target.matches('.via')) { e.target.closest('li').remove(); segna('prezzi-extra-via-' + Math.random(), 'prezzi'); }
      if (e.target.closest('#aggExtra')) { $('#extraEd', c).insertAdjacentHTML('beforeend', rigaExtra('', '')); $('#extraEd li:last-child input', c).focus(); segna('prezzi-extra', 'prezzi'); }
    });
  };

  /* DOMANDE FREQUENTI */
  PAGINE.domande = () => {
    const voci = $$('.fisarmonica__voce', SITO).map((v) => ({ d: $('button', v).textContent.trim(), r: $$('.fisarmonica__pannello p', v).map((p) => aTesto(p).testo).join('\n\n') }));
    return `<section class="riquadro"><p class="aiuto">Cambia l’ordine con le frecce. La prima domanda è quella che si legge per prima sul sito.</p><ol class="faq-ed" id="faqEd">${voci.map((v) => rigaFaq(v.d, v.r)).join('')}</ol><button type="button" class="aggiungi" id="aggFaq">+ Aggiungi una domanda</button></section>`;
  };
  const rigaFaq = (d, r) => `<li><div class="faq-ed__campi"><label class="campo"><span>Domanda</span><input value="${esc(d)}" placeholder="Es. Si possono portare animali?"></label><label class="campo"><span>Risposta</span><textarea rows="${Math.max(2, Math.ceil(r.length / 80))}">${esc(r)}</textarea></label></div><div class="ordina"><button type="button" class="su" title="Sposta su">↑</button><button type="button" class="giu" title="Sposta giù">↓</button><button type="button" class="via" title="Togli">✕</button></div></li>`;
  const listaOrdinabile = (c, lista, agg, nuova, chiave) => {
    c.addEventListener('input', () => segna(chiave, chiave));
    c.addEventListener('click', (e) => {
      const li = e.target.closest('li');
      if (e.target.matches('.via') && li) { if (confirm('Vuoi togliere questa voce?')) { li.remove(); segna(chiave + Math.random(), chiave); } return; }
      if (e.target.matches('.su') && li?.previousElementSibling) { li.parentNode.insertBefore(li, li.previousElementSibling); segna(chiave, chiave); return; }
      if (e.target.matches('.giu') && li?.nextElementSibling) { li.parentNode.insertBefore(li.nextElementSibling, li); segna(chiave, chiave); return; }
      if (e.target.closest(agg)) { $(lista, c).insertAdjacentHTML('beforeend', nuova()); const u = $(lista + ' > li:last-child', c); u.scrollIntoView({ block: 'center', behavior: 'smooth' }); $('input, textarea', u).focus(); segna(chiave, chiave); }
    });
  };
  LEGA.domande = (c) => listaOrdinabile(c, '#faqEd', '#aggFaq', () => rigaFaq('', ''), 'domande');

  /* RECENSIONI */
  PAGINE.recensioni = () => {
    const rec = $$('.citazione', SITO).map((r) => ({ t: $('blockquote', r)?.textContent.trim() || '', n: $('footer b', r)?.textContent.trim() || '', q: $('footer span:not(.nido)', r)?.textContent.trim() || '', nido: $('footer .nido', r)?.textContent.trim() || '' }));
    return `<section class="riquadro"><p class="aiuto">Le recensioni che scorrono sul sito. Puoi copiarle da Airbnb o Booking.</p><ol class="faq-ed rec-ed" id="recEd">${rec.map((r) => rigaRec(r)).join('')}</ol><button type="button" class="aggiungi" id="aggRec">+ Aggiungi una recensione</button></section>`;
  };
  const rigaRec = (r) => `<li><div class="faq-ed__campi"><label class="campo"><span>Cosa ha scritto</span><textarea rows="3">${esc(r.t)}</textarea></label><div class="tre-campi"><label class="campo"><span>Nome</span><input value="${esc(r.n)}"></label><label class="campo"><span>Quando</span><input value="${esc(r.q)}" placeholder="Es. agosto 2026"></label><label class="campo"><span>Nido</span><select>${['Skyroom', 'Starsbox'].map((x) => `<option${x === r.nido ? ' selected' : ''}>${x}</option>`).join('')}</select></label></div></div><div class="ordina"><button type="button" class="su">↑</button><button type="button" class="giu">↓</button><button type="button" class="via">✕</button></div></li>`;
  LEGA.recensioni = (c) => { listaOrdinabile(c, '#recEd', '#aggRec', () => rigaRec({ t: '', n: '', q: '', nido: 'Skyroom' }), 'recensioni'); c.addEventListener('change', () => segna('recensioni', 'recensioni')); };

  /* LIBRERIA FOTO */
  PAGINE.foto = () => {
    const usi = new Map();
    const aggiungi = (src, dove) => { if (!src || /logo|favicon/.test(src)) return; if (!usi.has(src)) usi.set(src, new Set()); usi.get(src).add(dove); };
    SEZIONI.forEach(([sel, nome]) => { const s = $(sel, SITO); if (!s) return; $$('img', s).forEach((im) => aggiungi(im.getAttribute('src'), nome)); $$('[data-galleria]', s).forEach((g) => g.dataset.galleria.split(',').forEach((f) => aggiungi(f, 'Galleria ' + (g.dataset.nome || '').replace(/^(il|la) /, '')))); });
    return `<section class="riquadro"><div class="riquadro__testa"><p class="aiuto">${usi.size} foto usate nel sito. Sotto ognuna vedi dove compare. Cambiandola qui, cambia ovunque.</p><button type="button" class="btn btn--pieno" id="caricaFoto">+ Carica nuove foto</button></div>
      <div class="libreria">${[...usi].map(([src, dove]) => `<figure><img src="../${esc(src.split('?')[0])}" alt="" loading="lazy"><figcaption><b>${esc(src.split('/').pop().split('?')[0])}</b><span>${[...dove].join(' · ')}</span><button type="button" class="btn btn--piccolo" data-sost>Sostituisci</button></figcaption></figure>`).join('')}</div></section>`;
  };
  LEGA.foto = (c) => c.addEventListener('click', (e) => {
    const b = e.target.closest('[data-sost]'); if (b) { const fig = b.closest('figure'); scegliFoto((url) => { $('img', fig).src = url; segna('libreria-' + $('b', fig).textContent, 'foto'); avviso('Foto sostituita in tutto il sito (anteprima)'); }); return; }
    if (e.target.closest('#caricaFoto')) scegliFoto((url) => { $('.libreria', c).insertAdjacentHTML('afterbegin', `<figure><img src="${url}" alt=""><figcaption><b>Nuova foto</b><span>Non ancora usata: aggiungila a un nido o a una sezione</span></figcaption></figure>`); segna('libreria-nuova-' + Math.random(), 'foto'); avviso('Foto caricata'); });
  });

  /* CONTATTI E IMPOSTAZIONI */
  PAGINE.impostazioni = () => {
    const href = (re) => $$('a[href]', SITO).map((a) => a.getAttribute('href')).find((h) => re.test(h)) || '';
    const wa = (href(/wa\.me\/\d+/).match(/wa\.me\/(\d+)/) || [])[1] || '', tel = href(/^tel:/).replace('tel:', ''), mail = href(/^mailto:[^?]*ilnido/).replace('mailto:', '').split('?')[0], ig = href(/instagram\.com/);
    const dd = (t) => $$('.prenota__info div', SITO).find((d) => $('dt', d)?.textContent.trim() === t)?.querySelector('dd')?.textContent.trim() || '';
    return `
    <section class="riquadro"><h2>Contatti</h2><p class="aiuto">Cambiandoli qui, si aggiornano tutti i bottoni del sito (WhatsApp, chiama, email).</p>
      <div class="due-campi">
        <label class="campo"><span>WhatsApp</span><input value="+${esc(wa)}"></label>
        <label class="campo"><span>Telefono</span><input value="${esc(tel)}"></label>
        <label class="campo"><span>Email</span><input type="email" value="${esc(mail)}"></label>
        <label class="campo"><span>Instagram</span><input value="${esc(ig)}"></label>
      </div>
    </section>
    <section class="riquadro"><h2>Dove e quando</h2>
      <label class="campo"><span>Indirizzo e indicazioni</span><textarea rows="3">${esc(dd('Dove'))}</textarea></label>
      <label class="campo"><span>Orari di check-in e check-out</span><textarea rows="3">${esc(dd('Orari'))}</textarea></label>
      <label class="campo"><span>Pagamento</span><textarea rows="3">${esc(dd('Pagamento'))}</textarea></label>
    </section>
    <section class="riquadro"><h2>Il tuo accesso</h2>
      <div class="due-campi"><label class="campo"><span>Nome utente</span><input value="federica" autocomplete="off"></label><label class="campo"><span>Nuova password</span><input type="password" placeholder="Lascia vuoto per non cambiarla" autocomplete="new-password"></label></div>
      <p class="aiuto">Nell’anteprima la password non si può cambiare davvero.</p>
      <button type="button" class="btn" id="rivediTour">▶ Rivedi il tutorial</button>
    </section>`;
  };
  LEGA.impostazioni = (c) => { c.addEventListener('input', () => segna('impostazioni', 'impostazioni')); $('#rivediTour', c).addEventListener('click', () => tour.apri()); };

  /* ── scelta di una foto dal dispositivo (resta nel browser: nell'anteprima non viene caricata da nessuna parte) ── */
  let quandoScelta = null;
  const scegliFoto = (fn) => { quandoScelta = fn; $('#sceltaFoto').value = ''; $('#sceltaFoto').click(); };
  $('#sceltaFoto').addEventListener('change', (e) => { const f = e.target.files[0]; if (f && quandoScelta) quandoScelta(URL.createObjectURL(f)); quandoScelta = null; });

  /* ── finestra (per aggiungere una prenotazione) ── */
  function finestra(titolo, campi, conferma) {
    const w = document.createElement('div'); w.className = 'finestra';
    w.innerHTML = `<div class="finestra__velo" data-chiudi></div><form class="finestra__carta" role="dialog" aria-modal="true"><button type="button" class="finestra__x" data-chiudi aria-label="Chiudi">✕</button><h2>${titolo}</h2>${campi}<div class="finestra__azioni"><button type="button" class="btn" data-chiudi>Annulla</button><button class="btn btn--pieno" type="submit">Salva</button></div></form>`;
    document.body.append(w); requestAnimationFrame(() => w.classList.add('is-aperta'));
    const chiudi = () => { w.classList.remove('is-aperta'); setTimeout(() => w.remove(), 300); };
    w.addEventListener('click', (e) => { if (e.target.closest('[data-chiudi]')) chiudi(); });
    $('form', w).addEventListener('submit', (e) => { e.preventDefault(); if (conferma(e.target) !== false) chiudi(); });
    $('input, select', w)?.focus();
  }

  /* ── tutorial: alla prima visita da un dispositivo, e quando si vuole dal bottone "Rivedi il tutorial" ── */
  const PASSI = [
    { t: 'Benvenuta nel gestionale del Nido', x: 'Da qui puoi cambiare tutto il sito da sola: testi, foto, prezzi, date e prenotazioni. Ti faccio fare un giro veloce, ci vuole un minuto.' },
    { s: '[data-tour="panoramica"]', t: 'Panoramica', x: 'La prima pagina: i prossimi arrivi, le prenotazioni da confermare, l’incasso previsto e le scorciatoie per le cose che fai più spesso.' },
    { s: '[data-tour="prenotazioni"]', t: 'Calendario e prenotazioni', x: 'Vedi chi arriva e quando, per ogni nido. Tocca un giorno per chiuderlo (ferie, lavori) e aggiungi a mano le prenotazioni arrivate per telefono.' },
    { s: '[data-tour="pagine"]', t: 'Testi e foto del sito', x: 'Ogni sezione del sito, dalla copertina al piè di pagina. Cambi un testo o una foto e lo vedi subito nell’anteprima accanto, anche come appare sul telefono.' },
    { s: '[data-tour="nidi"]', t: 'I nidi', x: 'Le schede di Skyroom e Starsbox: descrizione, cosa c’è dentro, foto principale e galleria. Puoi aggiungere, togliere e riordinare le foto.' },
    { s: '[data-tour="prezzi"]', t: 'Prezzi e coccole', x: 'I prezzi a notte, le coccole (vasca, aperitivi, torta), le date di apertura e il prezzo del voucher. Il calendario del sito si aggiorna da solo.' },
    { s: '[data-tour="domande"]', t: 'Domande e recensioni', x: 'Aggiungi, cambia o riordina le domande frequenti. Sotto ci sono le recensioni che scorrono sul sito.' },
    { s: '[data-tour="foto"]', t: 'Libreria foto', x: 'Tutte le foto del sito in un posto solo, con scritto dove compaiono. Ne sostituisci una e cambia ovunque.' },
    { s: '[data-tour="impostazioni"]', t: 'Contatti e impostazioni', x: 'Numero di WhatsApp, telefono, email, indirizzo e orari: li cambi una volta e si aggiornano su tutti i bottoni.' },
    { s: '[data-tour="salva"]', t: 'Ricordati di salvare', x: 'Quando cambi qualcosa qui compare il numero di modifiche. Premi “Salva modifiche” e il sito si aggiorna. Con “Annulla” torni a com’era.' },
    { s: '[data-tour="tutorial"]', t: 'Quando vuoi, lo rivedi', x: 'Questo giro lo trovi sempre qui, nel menu a sinistra. Buon lavoro! 🌿' }
  ];
  const tour = (() => {
    let i = 0;
    const T = $('#tour'), buco = $('#tourBuco'), carta = $('#tourCarta');
    const mostra = () => {
      const p = PASSI[i], el = p.s ? $(p.s) : null, tel = matchMedia('(max-width: 900px)').matches;
      document.body.classList.toggle('menu-aperto', tel && !!el && !!el.closest('#lato'));
      $('#tourPasso').textContent = `${i + 1} di ${PASSI.length}`; $('#tourTitolo').textContent = p.t; $('#tourTesto').textContent = p.x;
      $('#tourPuntini').innerHTML = PASSI.map((_, k) => `<i class="${k === i ? 'is-attivo' : ''}"></i>`).join('');
      $('#tourIndietro').hidden = i === 0; $('#tourAvanti').textContent = i === PASSI.length - 1 ? 'Ho capito' : i === 0 ? 'Iniziamo' : 'Avanti';
      $('#tourSalta').hidden = i === PASSI.length - 1;
      setTimeout(() => {
        if (el) {
          const r = el.getBoundingClientRect(), m = 6;
          Object.assign(buco.style, { left: r.left - m + 'px', top: r.top - m + 'px', width: r.width + 2 * m + 'px', height: r.height + 2 * m + 'px', opacity: 1 });
          const cw = carta.offsetWidth, ch = carta.offsetHeight;
          let x = r.right + 18, y = r.top + r.height / 2 - ch / 2;
          if (x + cw > innerWidth - 12) { x = Math.min(innerWidth - cw - 12, Math.max(12, r.left + r.width / 2 - cw / 2)); y = r.bottom + 18; if (y + ch > innerHeight - 12) y = r.top - ch - 18; }
          carta.style.left = Math.max(12, x) + 'px'; carta.style.top = Math.max(12, Math.min(innerHeight - ch - 12, y)) + 'px'; carta.classList.remove('is-centro');
        } else { buco.style.opacity = 0; Object.assign(buco.style, { left: '50%', top: '50%', width: '0px', height: '0px' }); carta.style.left = ''; carta.style.top = ''; carta.classList.add('is-centro'); }
        carta.classList.remove('is-entra'); void carta.offsetWidth; carta.classList.add('is-entra');
      }, document.body.classList.contains('menu-aperto') ? 320 : 0);
    };
    const chiudi = () => { T.hidden = true; document.body.classList.remove('menu-aperto'); localStorage.setItem(CHIAVE_TOUR, '1'); $('#apriTutorial').focus({ preventScroll: true }); };
    $('#tourAvanti').addEventListener('click', () => { if (i < PASSI.length - 1) { i++; mostra(); } else chiudi(); });
    $('#tourIndietro').addEventListener('click', () => { if (i > 0) { i--; mostra(); } });
    $('#tourSalta').addEventListener('click', chiudi);
    window.addEventListener('keydown', (e) => { if (T.hidden) return; if (e.key === 'Escape') chiudi(); if (e.key === 'ArrowRight') $('#tourAvanti').click(); if (e.key === 'ArrowLeft') $('#tourIndietro').click(); });
    window.addEventListener('resize', () => { if (!T.hidden) mostra(); });
    return { apri: () => { i = 0; T.hidden = false; mostra(); $('#tourAvanti').focus({ preventScroll: true }); } };
  })();
  $('#apriTutorial').addEventListener('click', () => tour.apri());
})();
