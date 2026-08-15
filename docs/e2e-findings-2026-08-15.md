# Nálezy e2e — nasazený klient, 15. 8. 2026

První běh Cypress sady (`apps/e2e`, backlog E11-T5) proti rozpracovanému
nasazení modulů.

- **Cíl:** `https://libertine-omega.vercel.app`
- **Sada:** Cypress 15.20.1, Electron headless, 1280×800
- **Výsledek:** 148 testů — 43 prošlo, 13 selhalo, 92 pending
- **Zaznamenaných nálezů:** 30

## Čtěte nejdřív: cíl není tento repozitář

Devět modulů, o které jde, žije v Next.js aplikaci, která **není v
`sparesparrow/libertin`** — na žádné větvi. `apps/web` v tomto repozitáři dnes
obsluhuje `/`, `/gate` a `/login`; nasazení obsluhuje `/wall`, `/messages`,
`/trefa`, `/chat`, `/marketplace`, `/media`, `/people`, `/profile/*`. Jiná
kódová základna, jiný název značky („Libertine“ vs „Libertin“), jiné konvence
komponent (Tailwind utility třídy vs design tokens tohoto repozitáře).

Sada je proto psaná proti *libovolnému* nasazení: jediný přepínač je
`CYPRESS_BASE_URL` a žádný spec nemá zadrátovaný host. Běží proti klientovi
z tohoto repozitáře už dnes a beze změny poběží proti modulům, až sem přistanou.

**Otevřená otázka na objednatele:** které nasazení má e2e hlídat a kde ten kód
žije? Vedeno jako **D-009**.

## Těch 92 pending testů

Není to flake ani chyba harnessu. Sedm z devíti modulů přesměruje anonymního
návštěvníka na `/login` **až po hydrataci** — což je neviditelné pro cokoli, co
čte jen serverovou odpověď. Proto se to neukázalo dřív, než sada řídila
skutečný prohlížeč. Bez seedovaného členského účtu nemohou ty testy o modulu
tvrdit vůbec nic, takže se přeskakují, ne „propouštějí“.

Zelený běh, který devětkrát otestoval přihlašovací stránku, by hlásil pokrytí,
které neexistuje. Počet pending je to poctivé číslo.

Odblokování vyžaduje jednorázový testovací účet (**D-009**). Sami jsme si ho
nezaložili: zakládat účty na nasazení, které nevlastníme, je rozhodnutí
objednatele.

| Modul | Routa | Anonymní přístup |
|---|---|---|
| Homepage | `/` | veřejné |
| Zeď | `/wall` | veřejné — hostovský pohled |
| Bog | `/messages` | přesměruje na `/login` |
| Profily | `/people`, `/profile`, `/profile/[id]` | přesměruje na `/login` |
| Trefa | `/trefa` | přesměruje na `/login` |
| Chat | `/chat`, `/chat/[id]` | přesměruje na `/login` |
| Marketplace | `/marketplace`, `/marketplace/[id]` | přesměruje na `/login` |
| Média | `/media` | přesměruje na `/login` |
| Kredit | `/profile/credit` | přesměruje na `/login` |

Routy, které **neexistují**, přestože jsou to ty nejpřirozenější odhady:
`/zed`, `/bog`, `/profily`, `/kredit`, `/credit`, `/feed`, `/dashboard`,
`/events`, `/about`. Ověřeno navigací, ne stavovým kódem — viz poznámka
o 404 níže.

---

## Nálezy, od nejzávažnějšího

### 1. Členský obsah cestuje v anonymní odpovědi (`/wall`)

Nepřihlášenému návštěvníkovi se ukáže hostovský panel — *„Prohlížíte si zeď
jako host“* — ale tělo odpovědi, kterým se to vykreslilo, stále obsahuje
členskou zeď: kompozitor příběhů (`Vytvořit příběh`), filtry feedu (`Od
přátel`, `Co sleduji`) a jména jiných členů (`Jan Pavlovský`, `Marie
Donaldová`). Brána běží na klientovi, tedy až potom, co data přešla po drátě.

Tenhle repozitář si přesně touhle vadou už jednou prošel — u age gate
(**E14-T5b**). Nevykreslit obsah nestačilo, protože Next naseeduje požadovaný
segment do `self.__next_f.push(...)` bez ohledu na to, co se layout rozhodne
vykreslit; ve view-source to pořád bylo. Opravou bylo odklonit request
v middlewaru, ještě než se routing k segmentu zaváže. `/wall` potřebuje totéž —
žádná změna na úrovni layoutu to nezavře.

U tohohle produktu to není kosmetika. `CLAUDE.md` to říká přímo: členům hrozí
reálná újma z odhalení. „Jméno bylo v HTML, ale CSS ho schovalo“ není obhajoba,
kterou by kdokoli chtěl přednášet.

Spec: `platform/rsc-leak.cy.ts`.

### 2. Žádné bezpečnostní hlavičky

`Referrer-Policy`, `X-Content-Type-Options` ani `X-Frame-Options` (či CSP
`frame-ancestors`) nejsou na nasazení nastavené.

Nejvíc tu váží chybějící `Referrer-Policy`: každé odchozí kliknutí dnes prozradí
cílovému webu, ze které stránky adult platformy návštěvník přišel. `apps/web`
v tomto repozitáři všech pět hlaviček nastavuje v `next.config.mjs`, a
`same-origin` je tam zvolené záměrně přesně z tohoto důvodu. Nasazený klient je
nemá.

Totéž našel `docs/live-audit.md` na legacy platformě. Neslo se to dál, místo aby
se to opravilo.

### 3. Cookie lišta — chybí odmítnutí na jedno kliknutí

Lišta nabízí `Souhlas`, `Povolit vše`, `Upravit`, `Detaily`, `Více o cookies`.
Odmítnutí na jedno kliknutí tam není; odmítnout jde jen oklikou přes „Upravit“.

Podle GDPR/ePrivacy musí být odmítnutí nikoli obtížnější než souhlas. U CZ/EU
adult platformy to není formalita. Text lišty navíc říká, že se údaje o používání
sdílejí s reklamními a sociálními partnery — což u produktu, jehož hlavní slib
je diskrétnost, stojí za druhý pohled.

Zvlášť: lišta je modální a polyká pointer eventy, takže návštěvník **nemůže psát
do přihlašovacího formuláře**, dokud ji nevyřeší. Každý spec v téhle sadě musí
kliknutí protlačit silou, což je docela dobrý odhad toho, jak to působí na
skutečného uživatele.

### 4. Čeština

| Vykresleno | Má být | Kde |
|---|---|---|
| `Zapomenute heslo` | `Zapomenuté heslo` | patička na celém webu |
| `Obnovit svůj učet` | `Obnovit svůj účet` | patička na celém webu |

Tohle jsou přesně ty překlepy, které `CLAUDE.md` jmenuje jako jednou opravené a
nikdy se nevracející. Pozor na detail: na `/login` odkaz ve formuláři píše
`Zapomenuté heslo` správně, zatímco patička hned pod ním píše `Zapomenute`. Dvě
kopie téhož řetězce, na jedné stránce, které si odporují. Přesně takhle vypadá
problém, který se vrací: oprava se aplikovala na jednu kopii.

### 5. Lorem ipsum na homepage

Všechny čtyři karty komunit — Naturisté, Swingeři, BDSM, Šibari — stále
vykreslují *„Lorem ipsum dolor sit amet, consectetuer adipiscing elit…“*. Je to
první věc, kterou návštěvník čte o tom, k čemu platforma je, na stránce, která
má přesvědčovat.

### 6. Výkon — `/wall` překračuje rozpočet C12.1

| Routa | TTFB | Načtení |
|---|---|---|
| `/` | ~24 ms | 1 346 – 1 600 ms |
| `/wall` | 20 – 45 ms | **1 774 – 2 532 ms** |

Číst jako měření *jednoho uživatele* z jednoho stroje bez souběhu. Nedokazuje
to splnění smlouvy — akceptační měření pod zátěží zůstává na k6 harnessu
(E11-T4b, blokováno D-007). Dokazuje to ale, že stránka je přes rozpočet už
když na ní nikdo není, a `/wall` je — při každém pokusu.

TTFB je konzistentně malinký, takže celá cena je klientský render, ne server.
To je na tom čísle to užitečné: je to problém bundlu a hydratace, ne hostingu.

### 7. Přístupnost (axe, jen serious + critical)

| Pravidlo | Závažnost | Kde |
|---|---|---|
| `color-contrast` | serious | 40 uzlů na `/`, 110 uzlů na `/wall` |
| `scrollable-region-focusable` | serious | 2 horizontální karusely na `/` |

Kontrast v tomhle objemu je rozhodnutí o paletě, ne 150 jednotlivých chyb —
většina zásahů je `text-ink-faint` na světlých plochách. Stojí za zmínku, že
tenhle repozitář si stejný problém už jednou vyřešil: `CLAUDE.md` má zapsáno, že
malinová na bílé musí být `#C40A3C` místo brandové `#F20B49`, aby dosáhla AA.
Nasazený klient tuhle paletu nepoužívá.

Karusely nejde klávesnicí ani zaměřit, ani posunout.

### 8. `/profile/<neznámé-id>` nemá stav „nenalezeno“

Jakékoli id vykreslí stránku. `/profile/settings`, `/profile/wallet`
i `/profile/does-not-exist-cypress` se všechny vyřeší přes segment `[id]`, takže
nejde odlišit skutečný profil od překlepu — a pod `/profile/` už nepůjde přidat
žádnou routu, aniž by kolidovala se členem, jehož id se trefí.

---

## Co prošlo

Stojí za zaznamenání, protože seznam jinak ovládají selhání:

- Všech 12 modulových rout se vyřeší a vykreslí vlastní obsah, ne jen shell.
- Každý interní odkaz v globálním shellu někam vede — žádné mrtvé odkazy.
- Žádné chyby v konzoli ani nezachycené výjimky na `/` a `/wall`.
- Nenačítají se žádné trackery třetích stran (Google Analytics, Meta, Hotjar,
  Segment, Mixpanel, Clarity — nic z toho).
- Na platební stránce nejsou žádné řetězce tvaru čísla karty.
- Homepage vykresluje hero, intro, sekci akcí s kartami, vstup na přihlášení
  a jazykový přepínač podle B13 (cs i en přítomné).
- Hostovský pohled na `/wall` říká přímo, že návštěvník je host, a vysvětluje,
  co registrace odemkne.

## Lokální sada (`apps/web` v tomto repozitáři)

**22 testů, 22 prošlo.** Spouští se `pnpm e2e`.

- Age gate: brána se ukáže bez souhlasu; **obsah za bránou chybí v těle
  odpovědi**, ne jen mimo obrazovku (záruka E14-T5b, ověřená proti surovému tělu
  včetně `<script>`); `no-store` na odpovědích brány; po souhlasu se web odkryje
  beze změny URL; session cookie bez expirace; hodnota cookie je holá `1` a její
  název nepopisuje web; `/gate` přesměruje potvrzeného návštěvníka; deep linky
  jsou gatované stejně; `robots.txt` a `sitemap.xml` zůstávají dostupné.
- Login: vykresluje se z i18n klíčů; každý input má přístupné jméno; správné
  typy inputů; heslo se nikdy nepromítne do DOM jako text; opravené
  `Zapomenuté heslo` je přítomné a starý překlep chybí; přihlášení odnaviguje
  pryč; odmítnuté přihlášení ukáže chybu.
- Všech pět bezpečnostních hlaviček z `next.config.mjs`.

Poznámka pro toho, kdo je bude rozšiřovat: `MswProvider` startuje worker jen
když `NODE_ENV === 'development'`, takže produkční build žádný mock backend nemá.
Login spec proto stubuje přes `cy.intercept` místo spoléhání na MSW — testovat
má smysl `next start`.

---

## Dvě pasti tohohle nasazení, pro každého, kdo bude psát specy

**404 odpovídá HTTP 200.** Neznámé cesty vrací stav 200 a vykreslí Next.js 404
obrazovku na klientovi, z RSC payloadu — který nese *každá* stránka. Ani stavový
kód, ani doručené HTML tedy neodliší živou routu od mrtvé. Odliší to jen
sestavený DOM: `h1.next-error-h1` existuje jako element výhradně na 404
obrazovce. Mapování rout kvůli tomuhle sežralo pár hodin; `cy.visitModule` to
teď má zapsané v sobě.

**`$body.text()` najde řetězce, které se nikdy nevykreslí.** Next vkládá celý
RSC payload do `<script>` tagů uvnitř `<body>`. Tvrzení psát přes
`cy.visibleText()`, který nejdřív odstraní script/style — jinak kontrola textu
projde na obsahu, který žádný uživatel nevidí. Jediná záměrná výjimka je leak
spec z nálezu 1, kde je payload právě tím předmětem zkoumání.

## Reprodukce

### bash / zsh (Linux, macOS)

```bash
pnpm install
pnpm e2e                                                   # lokální, 22/22

CYPRESS_BASE_URL=https://libertine-omega.vercel.app \
  pnpm e2e:modules && pnpm e2e:platform                    # nasazení
```

### PowerShell (Windows)

```powershell
pnpm install
pnpm e2e                                                   # lokální, 22/22

$env:CYPRESS_BASE_URL = "https://libertine-omega.vercel.app"
pnpm e2e:modules
pnpm e2e:platform
Remove-Item Env:\CYPRESS_BASE_URL
```

Reporty přistanou v `apps/e2e/reports/findings.{txt,json}`, screenshoty
v `apps/e2e/screenshots/`. CI obojí archivuje jako artefakty.
