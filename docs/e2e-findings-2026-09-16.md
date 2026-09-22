# E2E nálezy — https://libertin.app, 16. 9. 2026

Běh proti novému nasazení (`CYPRESS_BASE_URL=https://libertin.app`). Předchozí
běhy mířily na `libertine-omega.vercel.app`; tohle je jiný hosting (Apache, ne
Vercel) a jiný, dál dotažený stav. Srovnání s [nálezy z 15. 8.](./e2e-findings-2026-08-15.md).

## Jak to dopadlo

| Sada | Testů | Prošlo | Padlo | Přeskočeno |
|---|---|---|---|---|
| moduly (`e2e:modules`) | 70 | 28 | 1 | 41 |
| platforma (`e2e:platform`) | 102 | 25 | 12 | 65 |

**41 + 65 přeskočených není úspěch ani chyba sady** — sedm z deseti modulů je za
přihlášením a v prostředí nebyly nastavené `CYPRESS_TEST_USERNAME` /
`CYPRESS_TEST_PASSWORD`. Sada je záměrně přeskakuje, místo aby je vykázala jako
zelené (`support/session.ts`). Bez testovacího účtu (D-009) zůstává většina
produktu neověřená.

## Co se od minula opravilo

Nic z toho už běh nehlásí:

- **bezpečnostní hlavičky** — `X-Content-Type-Options`, `X-Frame-Options`,
  `Referrer-Policy`, CSP `frame-ancestors` i HSTS jsou nasazené
- **české překlepy** z blocklistu — `Zapomenute`, `svůj učet` jsou pryč
- **Lorem ipsum** na kartách komunit nahradil skutečný text
- **výkon zdi** se zlepšil z 2532 ms na ~1850 ms

## Co zůstává otevřené

### 1. Členský obsah v odpovědi pro nepřihlášeného (E14-T5b) — privacy

`/wall` posílá nepřihlášenému návštěvníkovi v těle odpovědi řetězce
`Vytvořit příběh`, `Od přátel` a `Co sleduji`, přestože vykreslená stránka
ukazuje hostovský pohled. Vizuálně to není vidět; v `view-source` ano.

U produktu, jehož hlavní vlastností je diskrétnost, je tohle nejzávažnější
nález běhu. Ověřit `cy.visibleText()` nestačí — `$body.text()` vrací i RSC
payload, právě proto na to sada kouká zvlášť.

### 2. Chybí přepínač jazyka (B13) — smluvní brána

Na `/` není nikde `Česky` / `English`. Smlouva žádá plné CS+EN. Jediný padající
test modulové sady.

### 3. Cookie lišta nenabízí odmítnutí na jedno kliknutí (ePrivacy)

Nabízí: `Zapnout slušný režim`, `Souhlas`, `Detaily`, `Více o cookies`,
`Upravit`, `Povolit vše`. Odmítnout jde až přes `Upravit`. Souhlas musí být
stejně snadný jako nesouhlas.

### 4. Výkon zdi nad rozpočtem C12.1

`/wall` se načítá 1829–1865 ms proti rozpočtu 1500 ms, ve třech měřeních za
sebou. TTFB je 12–35 ms, takže to není server — brzdí to klient.

### 5. Zeď zůstane na „Načítám…“

Po 8 s pro nepřihlášeného návštěvníka pořád spinner. Nový nález oproti minule.

### 6. Přístupnost — tři vážné třídy

- `color-contrast` — 36 uzlů na `/`, 17 na `/wall`
- `nested-interactive` — 2 uzly na `/` (ovládací prvek v ovládacím prvku;
  odečítač obrazovky pak neumí říct, co je co)
- `scrollable-region-focusable` — 2 uzly na `/` (vodorovný karusel nejde
  ovládat klávesnicí)

### 7. Neznámé id profilu nemá stav „nenalezeno“

`/profile/[id]` s neexistujícím id se vykreslí bez chybového stavu.

### 8. Překlep: „Kde te nikdo neposuzuje“

V bloku „O platformě Libertin“. O řádek výš je `kteří tě chápou` napsané
správně, takže jde o slip v jednom řetězci, ne o systematický problém
s kódováním. `Kde tě` se na stránce nevyskytuje ani jednou.

## Co se v sadě tímhle během zlepšilo

Překlep z bodu 8 sada **nenašla** — blocklist zná jen překlepy, které už někdo
nahlásil. Doplněno:

- `Kde te ` do `CZECH_TYPO_BLOCKLIST` (tvrdá kontrola, potvrzený nález)
- nová kontrola `missing-diacritics`: sada čtrnácti českých slov, jejichž tvar
  bez diakritiky není české slovo (`te`, `vam`, `muze`, `ucet`, …), hledaná jako
  celá slova. Hlásí se jako nález, ne jako pád — na uživatelském obsahu by
  taková kontrola mohla plánovat falešný poplach a neměla by kvůli tomu
  blokovat merge.

Ověřeno proti živému webu: obě kontroly se rozsvítí na `/`, a heuristika
nevydala jediný falešný poplach na `/`, `/faq` ani `/novinky`.

---

## Doplněk 22. 9. 2026 — veřejné a právní stránky

Dosud nepokrytá část: patička odkazuje na **17 veřejných rout**, ale registr
sady jich znal šest. Chyběly přesně ty stránky, podle kterých se smluvní dílo
posuzuje — `/gdpr`, `/vop`, `/pravidla`, `/impresum`, `/clenstvi`.

Nový spec `platform/public-pages.cy.ts` je projde všechny: **61 testů, 61
prošlo.** Pro tohle nasazení je to skutečná informace, ne prázdný test —
všech patnáct stránek existuje, jsou dostupné bez přihlášení, nesou vlastní
obsah a `/gdpr` i `/vop` opravdu mluví o svém tématu (`osobní údaj`, `podmín`).

Ověřuje se u každé stránky:

- je to skutečná routa, ne 404 obrazovka s kódem 200 (tohle nasazení vrací na
  neznámé cesty 200, takže stavový kód nic nedokazuje)
- **je dostupná bez přihlášení** — právní dokument za loginem není zveřejněný;
  kdo se rozhoduje, jestli vstoupí, si nemůže přečíst, s čím by souhlasil
- nese vlastní obsah, ne jen shell (formulářové stránky jsou z téhle kontroly
  vyjmuté — jsou krátké oprávněně)
- neobsahuje překlepy z blocklistu
- patička neodkazuje na nic, co vrací chybu

### Co to našlo

- `/clenstvi` přesměrovává na `/membership`. Funguje to, ale patička inzeruje
  českou adresu a přistane se na anglické — nekonzistence v URL, ne chyba.
- `/pomoc` má 381 znaků viditelného textu. Na stránku jménem „Nápověda“ je to
  málo; hlásí se jako nález, protože prahová hodnota je odhad, ne pravidlo.

### Pro srovnání

Vlastní klient v tomhle repu má v patičce **čtyři mrtvé odkazy** (`/o-nas`,
`/kontakt`, `/soukromi`, `/podminky`). Nasazený klient nemá ani jeden. Stejná
kontrola teď běží na obě strany, takže se nemůžou rozejít.
