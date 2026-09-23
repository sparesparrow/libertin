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

### 2. ~~Chybí přepínač jazyka (B13)~~ — **odvoláno 23. 9.**

> **Tenhle nález byl chybou testu, ne webu.** Přepínač v záhlaví je a je
> správně označený (`aria-label="Jazyk"`), nabízí dvanáct jazyků včetně
> angličtiny a po volbě „Angličtina“ se stránka opravdu přepne do angličtiny.
> Podrobnosti v doplňku z 23. 9. níže.

~~Na `/` není nikde `Česky` / `English`. Smlouva žádá plné CS+EN. Jediný padající
test modulové sady.~~

### 3. Cookie lišta nenabízí odmítnutí na jedno kliknutí (ePrivacy) — **zúženo 23. 9.**

> Odmítnout na jedno kliknutí **jde** — křížkem (✕, „Zavřít“), a funguje:
> neuloží se žádná cookie a nenačte se žádný tracker. Otevřené zůstává jen to,
> že odmítnutí není označené tlačítko stejně výrazné jako „Povolit vše“ a že se
> nepamatuje. Viz doplněk z 23. 9.

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

---

## Doplněk 23. 9. 2026 — co se na nasazení změnilo za týden

Běh bez nastavené URL: `pnpm e2e:modules` a `e2e:platform` teď mají výchozí
cíl `https://libertin.app` (`apps/e2e/scripts/run-deployed.mjs`).

| Sada | Testů | Prošlo | Padlo | Přeskočeno |
|---|---|---|---|---|
| moduly | 70 | 26 | **3** (bylo 1) | 41 |
| platforma | 164 | 85 | 14 | 65 |

### Z úvodní stránky zmizela sekce akcí

Dva nové pády modulové sady (`01-homepage`) mají společnou příčinu: sekce
**„Doporučené akce“ a „Nadcházející akce“ zmizela celá** — z vykreslené
stránky i ze serverového HTML, včetně všech dvanácti karet akcí, které tam byly
16. 9. Nejde o přejmenování ani o jiný tag nadpisu.

Nepřesunula se ani na vlastní routu: `/akce`, `/events`, `/udalosti`,
`/kalendar` i `/party` vrací stránku 404 bez obsahu akcí a úvodní stránka na
nic takového neodkazuje.

**Testy jsou záměrně ponechané červené.** Hlásí přesně to, co se stalo, a
jestli bylo odebrání akcí záměrné, rozhoduje objednatel. Pokud ano, oba testy
se smažou jedním commitem; pokud ne, je to regrese.

### Co se zlepšilo

- `color-contrast` na `/`: **36 → 4 uzly.**
- `scrollable-region-focusable` na `/` **zmizel.** Pravděpodobně vedlejší
  efekt odebrání akcí, ne oprava — nahlášený prvek byl vodorovný karusel
  (`.no-scrollbar.overflow-x-auto`) ve čtvrté sekci stránky, kde akce byly.

### Beze změny

Únik členského obsahu v odpovědi pro nepřihlášeného na `/wall`, chybějící
přepínač jazyka (B13), cookie lišta bez odmítnutí na jedno kliknutí, `/wall`
zaseknuté na „Načítám…“, `nested-interactive` na `/`, chybějící stav
„nenalezeno“ u neznámého profilu, překlep „Kde te nikdo“, tenká `/pomoc`.

### Výkon — co číst a co ne

`/wall` je nad rozpočtem C12.1 **v každém běhu za poslední dva týdny**
(1580–1871 ms proti 1500 ms). To je signál.

Úvodní stránka se v jednom měření ocitla na 1508 ms, tedy 8 ms nad rozpočtem.
To signál **není**: jedno měření, v kontejneru, který celé sezení pouštěl
Cypress, a v předchozím běhu téhož dne rozpočet držela. Hlásí se to jako nález,
ne jako regrese.

### Vada v samotné sadě — opravená

Tenhle běh odhalil, že si sady navzájem mažou důkazy. `e2e:modules` a
`e2e:platform` míří na stejný host a obě jsou „failure“ běhy, takže sdílely
jednu složku — a Cypress ji na začátku každého běhu vyprázdní. Platformní sada
puštěná po modulové tak smazala **všechny tři screenshoty pádů úvodní stránky**
(včetně toho pro B13) a přepsala nálezy modulové sady (`missing-empty-state`
a další) — bez jakékoli stopy, že kdy existovaly.

Přesně tohle pořadí přitom pouští CI job, takže jeho artefakt i souhrn běhu by
pády modulové sady tiše vynechaly.

Oprava: třetí osa artefaktů vedle hostu a druhu běhu — **sada**
(`screenshots/<host>/<sada>/…`, `reports/<host>/<sada>/…`). Lokální sada,
evidence i `cy:open` mají cesty beze změny. Ověřeno stejným pořadím běhů: obě
složky nálezů přežijí a screenshoty pádů úvodní stránky zůstanou (9 souborů,
předtím 0).


---

## Doplněk 23. 9. 2026 (odpoledne) — co ukázalo zkoumání v prohlížeči

Tentokrát jsem nejdřív zjišťoval, jak se stránka *chová*, a teprve pak psal
testy. Vyšly z toho dvě opravy toho, co jsem dřív tvrdil, a dva nové nálezy.
Jeden z nich je zatím nejzávažnější ze všech.

### Oprava: B13 je splněné

Tvrzení, že chybí přepínač jazyka, bylo **chybou testu, a to dvakrát**:

1. První verze hledala na stránce slova „Česky“ a „English“. Přepínač je ale
   ikona (vlajka) bez viditelného textu, s `aria-label="Jazyk"`, takže ho test
   nemohl najít.
2. Při prvním prozkoumání menu jsem hledal slovo „English“. Menu uvádí
   **dvanáct jazyků pojmenovaných česky** (Angličtina, Španělština, Němčina,
   Italština, Francouzština, Nizozemština, Ruština, Norština, Rumunština,
   Čeština, Chorvatština, Maďarština), takže filtr v angličtině „Angličtinu“
   nenašel a mylně ohlásil, že je nabízená jen čeština.

Test teď dělá to, co B13 opravdu požaduje: vybere angličtinu a ověří, že se
stránka přepnula. Výsledek: `lang="en"` a méně než 0,5 % textu nese českou
diakritiku. **Prochází.**

### Oprava: odmítnout cookies na jedno kliknutí jde

Křížek (✕) na cookie liště je funkční odmítnutí: po zavření **žádná cookie,
nic v localStorage, žádný tracker** — ani po znovunačtení. Test teď měří
právě tohle (a spadne, kdyby se ✕ někdy začal tvářit jako souhlas) a
**prochází**.

Zůstávají dva menší nálezy: odmítnutí je jen neoznačený křížek vedle
výrazného „Povolit vše“ a **nepamatuje se** — lišta se po každém načtení
ptá znovu, což je přesně ten tlak, pod kterým lidé nakonec klepnou na souhlas.

Pozitivní: **před jakoukoli volbou se nenačte ani jeden tracker.**

### Nový nález: nepřihlášený vidí tváře členů — nejzávažnější nález

Hostovský pohled na `/wall` skrývá **jména** členů („Zaregistrujte se zdarma
a uvidíte jména…“), ale v postranním panelu ukazuje jejich **tváře**, a to
nerozmazané:

- **„Online uživatelé“** — v tomto běhu 25 nerozmazaných profilových fotek
- **„Narozeniny dnes“** — 4 tváře, ke kterým stránka přidává datum narození

Tvář identifikuje člověka mnohem spolehlivěji než přezdívka, a „dnes má
narozeniny“ k ní přidává datum narození. U platformy, jejíž hlavní slib je,
že nikoho neprozradí, je to horší než únik textů z RSC payloadu (bod 1 výše),
protože tohle je **vidět na obrazovce**, ne jen ve zdrojovém kódu.

Nový spec `platform/member-exposure.cy.ts` to kontroluje tvrdě, stejně jako
test úniku z RSC. Hlásí **jen počty**, nikdy adresy fotek — URL obsahuje ID
člena, a výsledky testů končí v artefaktech CI a v souhrnech běhů.

Záměrně jsem **neověřoval**, jestli jsou fotky dostupné i napřímo bez
přihlášení (URL mají tvar `…/user_profile_photo/<číselné ID>`, což naznačuje
výčet po sobě jdoucích ID). Jediný pokus o takový dotaz zablokovala politika
oprávnění jako práci s osobními údaji a obcházet ji jsem nezkoušel. Nález
stojí na tom, co stránka sama vykreslí nepřihlášenému návštěvníkovi. Přímou
dostupnost fotek by měl ověřit provozovatel na své straně.

### Nový nález: slušný režim neskrývá to, co může někoho prozradit

„Zapnout slušný režim“ v patičce je skutečný přepínač (`<button
aria-pressed>`), **pamatuje si volbu** a na `/wall` **rozmaže příspěvky**
(z 1 na 21 rozmazaných prvků). To všechno prochází. Ale:

- **tváře členů nechává nerozmazané** — 24 z 24. Právě ty jsou v hostovském
  pohledu to jediné, co může někoho prozradit, a slušný režim je přesně ten
  vypínač, po kterém nervózní návštěvník sáhne.
- **na úvodní stránce nedělá nic** — žádný obrázek včetně úvodní fotografie
  nezmizí ani se nerozmaže. Co má úvodní stránka v tomhle režimu skrýt, je
  rozhodnutí o obsahu, proto se to jen hlásí.

Nový spec `platform/decent-mode.cy.ts`.

### Oprava testu: „noreferrer“

Kontrola odkazů `target="_blank"` bez `rel="noreferrer"` padala, když stránka
**žádné** externí odkazy nemá — tedy v nejbezpečnějším možném případě.
`cy.get()` čeká, dokud nenajde aspoň jednu shodu, takže nula znamenala
vypršení času. Teď se dotazuje přes `body` a nula projde.

### Stav po těchto změnách

Skutečné pády, které zůstávají: zmizelá sekce akcí (×2, čeká se na
vyjádření objednatele), cookie lišta překrývá přihlašovací formulář, slušný
režim nerozmaže tváře a nepřihlášený vidí tváře členů i jejich narozeniny.
