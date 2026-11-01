# Il Nido tra gli Ulivi — sistema di design (versione verde)

Fonte di verità per ogni token del sito in `/Users/lucas/nido-verde`. Diverso di proposito dalla prima bozza (clone di grids03): questo è disegnato da zero attorno al colore preferito di Federica, il verde, e alla forma delle sue casette.

## Tesi visiva
Verde luminoso, non scuro: carta olivastra chiara con inchiostro oliva profondo, la salvia del ramo del logo per superfici ed etichette, il lime della stella come unico accento piccolo; serif Instrument Serif (corsivo per l'enfasi) su Albert Sans; spazi ampi, angoli morbidi e la forma della casetta (il timpano) come modulo ricorrente; niente ombre, tutto piatto.

## Tesi di interazione
Tutto guidato dallo scroll: velo-tetto che si apre, hero pinnata con dezoom della foto che diventa una finestra a casetta, manifesto a parole che si accendono, foglio che sale con gli angoli tondi, falde dei tetti che si aprono sulle foto, notte con le stelle, nastro con skew dalla velocità, striscia orizzontale pinnata, sentiero che si riempie, voucher con tilt. Entrate 0.6–0.9 s `power3.out`, scrub lineare, micro-interazioni 160–320 ms. Hover a riempimento o zoom 1.03. Vietati: sottolineature animate, rimbalzi ed elastici, pallini luminosi, numerazioni ordinali, glassmorphism, ombre grigie.

## Colori
| Token | Hex | Uso | Contrasto |
|---|---|---|---|
| `--carta` | #EEF1E6 | fondo pagina | |
| `--carta-2` | #E3E8D7 | fondo alternato (foglio dei nidi, extra) | |
| `--inchiostro` | #1B2A1E | testo, bottoni scuri | 12.6:1 su carta |
| `--oliva` | #3F5E42 | verde principale: titoli secondari, riempimenti, bottoni | 6.6:1 su carta |
| `--salvia` | #607860 | ramo del logo: etichette grandi, bordi, falde | 3.9:1 su carta (solo testo ≥ 18 px) |
| `--salvia-chiara` | #B4C2AC | parole spente del manifesto, righe | |
| `--lime` | #A0B028 | stella del logo: solo riempimenti e testo su notte | 7.4:1 su notte, mai testo su carta |
| `--legno` | #C99A62 | calore del legno: nodi del sentiero, dettagli del voucher | |
| `--notte` | #0E1A12 | sezione delle stelle, menu mobile | |
| `--bianco` | #F7F8F3 | testo su oliva e notte | 8.7:1 su oliva |

## Tipografia
- Display: **Instrument Serif** 400, corsivo per l'enfasi (Google Fonts). Titoli enormi con `letter-spacing: -.02em`, interlinea 0.95.
- Testo: **Albert Sans** 300/400/500/600. Corpo 17 px / 1.55, massimo 62 caratteri per riga.
- Scala fluida: `--t-xl` clamp(3.2rem, 9.2vw, 9.6rem) · `--t-l` clamp(2.4rem, 5.4vw, 5.2rem) · `--t-m` clamp(1.6rem, 2.6vw, 2.4rem) · `--t-s` 1.0625rem · `--t-xs` .875rem.
- Occhielli: corsivo serif 1.15rem, mai maiuscolo spaziato.

## Spazi e forme
- Base 8 px. Sezione: `--sez` clamp(88px, 12vw, 168px). Gutter: `--gut` clamp(20px, 5vw, 72px). Colonna testo: 62ch.
- Raggi: `--r-s` 10px, `--r-m` 22px, `--r-l` 36px, `--r-foglio` clamp(44px, 9vw, 140px) (solo angoli alti del foglio che sale).
- Timpano (casetta): `clip-path: polygon(0 32%, 50% 0, 100% 32%, 100% 100%, 0 100%)`.
- Ombre: nessuna. Separazioni con colore di fondo e righe 1 px `--salvia-chiara`.

## Moto
- Durate: `--d-veloce` 160 ms · `--d-base` 320 ms · `--d-lenta` 640 ms.
- Curve CSS: `--e-out` cubic-bezier(.23, 1, .32, 1) · `--e-inout` cubic-bezier(.77, 0, .175, 1).
- GSAP: entrate `power3.out` 0.9 s, stagger 0.06; scrub `none`; contatori 1.4 s `power3.out`.
- Stati dei bottoni: default, hover (riempimento che scorre da sinistra), focus (anello 2 px oliva), active (scale .97), disabled (opacità .5).
- `prefers-reduced-motion`: velo statico, niente pin né scrub, contenuti già al loro posto.

## Componenti base
- `.bottone`: pillola 1px bordo oliva, testo oliva; `--pieno`: fondo oliva, testo bianco. Hover: fondo che scorre. Altezza 48 px.
- `.occhiello`: corsivo serif, colore salvia.
- `.nido` (card casetta): tetto a timpano con due falde che si aprono, corpo su carta.
- `.coccole` (indice di traverso, da public-house.ch): fondo notte, parole Albert Sans 600 a 9.6vw ruotate 33° con origine in alto a sinistra, binario 1.5px carta lungo 300vw che si allunga in scrub, foto sfalsate (destra 3:4 + seconda 4:3, oppure centro 4:3 + seconda 3:4) con wipe diagonale e parallasse; hover = riempimento lime del testo.
- `.manifesto` icone: quattro SVG illustrati a colori (ulivo, casetta, cestino, notte) chiudono le frasi; hover o tocco sull'icona accende in lime la sua frase.
- `.passi` (dintorni, clonato dalla sezione sticky-slider di funtownstudio.com): contenitore alto (N+1)×60svh con blocco sticky a 15svh; a sinistra i passi sovrapposti (titolo bold sans + corsivo serif, testo, lista), a destra l'omino che cammina (WebP animata, due copie specchiate che si alternano), sotto le tappe con forma (lime quando fatta) e barra di avanzamento che si riempie con lo scroll; la tappa attiva è larga 40%, le altre 10%.
- `.fisarmonica__voce`: bottone con pulsante a croce che ruota, pannello con transizione su grid-template-rows.
