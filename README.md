# Il Nido tra gli Ulivi — bozza della home, versione verde

**Anteprima privata, non è il sito pubblico.** Tutte le pagine hanno `noindex, nofollow` e `robots.txt` blocca i motori. Niente CNAME: il dominio vero resta sul sito attuale finché il cliente non approva.

Seconda proposta per Federica (glamping Il Nido tra gli Ulivi, Viverone BI), disegnata da zero attorno al verde del suo logo. La prima proposta, clonata da grids03.obys.agency, è nel repo `nido`.

## Come si avvia

Sito statico, un solo file HTML, niente build:

```bash
python3 -m http.server 8090 --directory /Users/lucas/nido-verde
```

`?qa` in fondo all'indirizzo salta il velo e lo scroll morbido (collaudi automatici). Con `prefers-reduced-motion` non ci sono sezioni pinnate né scrub: tutto è già al suo posto.

## Dove sta cosa

- `index.html` — tutti i contenuti, sezione per sezione (testi, prezzi, link, foto).
- `css/style.css` — i token e gli stili; i valori vengono da `MASTER.md`.
- `js/main.js` — le animazioni: velo-tetto, hero pinnata con la finestra a casetta, manifesto a parole, falde dei tetti, notte con le stelle (canvas), nastro con skew, striscia orizzontale pinnata, sentiero, voucher con tilt, fisarmonica, testata, menu, foglia-puntatore.
- `MASTER.md` — sistema di design: colori con i contrasti, tipografia, spazi, forme, moto.
- `img/` — foto in WebP; `guida-dintorni.pdf` — la guida del cliente (dal sito vecchio).

Stack: GSAP 3.13 + ScrollTrigger + Lenis 1.3 da CDN, Instrument Serif + Albert Sans (Google Fonts).

## Prima di mostrarla

Leggere `DA-VERIFICARE.md`: elenca ciò che ho scritto io e che Federica deve confermare.
