# Závěrečná zpráva z testování — swingerslife.cz

**Pro:** produktového vlastníka
**Stav k:** 25. 9. 2026
**Co bylo testováno:** nasazená platforma na `https://swingerslife.cz`
(`https://libertin.app` na ni trvale přesměrovává, HTTP 301)
**Jak:** automatická sada Cypress z tohoto repozitáře (`apps/e2e`) a přímé
dotazy na server, vše 25. 9. 2026

Tato zpráva nahrazuje dřívější dílčí zprávy (15. 8., 16. 9. a jejich doplňky).
Obsahuje **jen to, co k dnešku není opravené**. Každý bod je znovu změřený
25. 9., žádný se nepřebírá ze starého běhu. Co se mezitím opravilo, je
souhrnně na konci, abyste viděli, že se to kontrolovalo.

---

## Shrnutí

Vývojáři oznámili, že je vývoj hotový. Veřejná část webu je v dobrém stavu:
bezpečnostní hlavičky, právní stránky, výběr jazyka, obnova hesla i
registrační formulář fungují a nenačítá se žádný sledovací skript třetí strany.

**Tři věci ale brání tomu, aby se dodávka převzala jako hotová:**

1. **Nepřihlášený návštěvník vidí tváře členů.** Na stránce „Zeď“ je vidí bez
   rozmazání, u části z nich i s tím, že mají dnes narozeniny. U platformy,
   jejímž hlavním slibem je diskrétnost, je to nejzávažnější nález.
   „Slušný režim“ tváře nerozmaže.
2. **Testovací účet na nové platformě nefunguje** („Nesprávný nick nebo
   heslo“). Buď uživatelská databáze zatím převedená není, nebo v ní tento účet
   chybí. Proto **celou členskou část (9 modulů za přihlášením) nešlo 25. 9.
   ověřit vůbec.** Tvrzení „hotovo“ je pro ni zatím nepodložené.
3. **Registrace neposílá na server souhlas s podmínkami ani prohlášení
   o věku 18+.** Zaškrtávací pole kontroluje jen prohlížeč. Pokud server
   souhlas nezaznamenává sám, provozovatel nemá doklad o souhlasu, který po
   něm může dozorový úřad chtít.

| Sada (25. 9., swingerslife.cz) | Testů | Prošlo | Selhalo | Přeskočeno |
|---|---|---|---|---|
| Platforma: soukromí, přístupnost, výkon, čeština, veřejné a právní stránky (vč. 61 testů stránek, všechny prošly) | 171 | 97 | **9** | 65 |
| Scénáře uživatelů (8 person napříč stránkami) | 9 | 7 | 0 | 2 |
| Průzkum (jen zaznamenává, nic netvrdí) | 12 | 12 | 0 | 0 |
| Moduly | 70 | 28 | **2** | 40 **nelze ověřit**, účet odmítnut |

Všech 9 selhání platformy jsou skutečné nálezy níže. Obě selhání modulů jsou
zmizelá sekce akcí na úvodní stránce (k rozhodnutí). Do „nelze ověřit“ patří
i 8 modulů, u kterých selhalo přihlášení, a 2 testy členské zdi, které bez
přihlášení nemají co měřit.
Přeskočené testy nejsou „prošlé“: jde o testy za přihlášením a o skutečnou
registraci, kterou sada bez výslovného povolení neprovádí. Počty platformy
a scénářů jsou po opravě pěti chyb v samotné sadě (viz konec zprávy).

---

## Otevřené nálezy

Seřazeno od nejzávažnějšího. U každého je, jak si ho ověřit sami.

### 1. Nepřihlášený vidí tváře členů a jejich narozeniny — kritické

Na `/wall` skrývá hostovský pohled jména členů („Zaregistrujte se zdarma
a uvidíte jména…“). V postranním panelu ale ukazuje jejich profilové fotky,
nerozmazané:

- **24 nerozmazaných profilových fotek** v panelu (mimo jiné „Online
  uživatelé“), 25. 9. všech 24 z 24 zobrazených
- **„Narozeniny dnes“: 3 tváře** a u nich informace, že má člověk dnes
  narozeniny

Tvář identifikuje člověka spolehlivěji než přezdívka a k ní se přidává datum
narození. Na obrazovce to vidí kdokoli, přihlášení není potřeba.

*Ověření:* anonymní okno → `https://swingerslife.cz/wall` → pravý panel.

*Poznámka:* zda jsou fotky dostupné i napřímo přes svou adresu, jsme záměrně
nezkoušeli (šlo by o práci s osobními údaji). Měl by to ověřit provozovatel.

### 2. Slušný režim nerozmaže tváře a na úvodní stránce nedělá nic — vysoké

„Zapnout slušný režim“ v patičce funguje jako přepínač, pamatuje si volbu i po
přechodu na jinou stránku a na zdi rozmaže příspěvky (z 1 na 21 rozmazaných
prvků). Ale:

- **tváře členů nechá ostré: 24 z 24.** Právě ty jsou to, co může někoho
  prozradit, a slušný režim je vypínač, po kterém sáhne nervózní návštěvník.
- **na úvodní stránce neskryje nic**, ani úvodní fotografii (17 obrázků před
  i po zapnutí).

*Ověření:* patička → „Zapnout slušný režim“ → `/wall` → tváře v pravém panelu.

### 3. Stránka „Zeď“ posílá nepřihlášenému členský obsah — vysoké

Nepřihlášený návštěvník vidí hostovský pohled. V těle odpovědi serveru jsou
ale i prvky členské zdi: „Vytvořit příběh“, „Od přátel“, „Co sleduji“.
Na obrazovce to vidět není, ve zdrojovém kódu stránky ano. Brána se tedy
rozhoduje až v prohlížeči, když data už dorazila. Až bude zeď plná
skutečného obsahu, poteče stejnou cestou i ten.

*Ověření:* anonymní okno → `/wall` → `Ctrl+U` (zdroj stránky) → hledat
„Vytvořit příběh“.

### 4. Členská část je neověřitelná — testovací účet nefunguje — vysoké

Účet, který jsme dostali k testování, nová platforma odmítá hláškou
„Nesprávný nick nebo heslo“. Na migrovanou databázi to neukazuje: buď převod
uživatelů ještě neproběhl, nebo účet nebyl jeho součástí, nebo má jiné heslo.

Důsledek: **Bog (zprávy), Profily, Trefa, Chat, Marketplace, Média, Kredit
a Nastavení nebyly 25. 9. otestované vůbec.** Seznam toho, co se v nich
v srpnu našlo a co teď ověřit nejde, je v oddílu
[Co nešlo ověřit](#co-neslo-overit).

*Potřebujeme:* jednorázový testovací účet **bez skutečných osobních údajů**,
předaný mimo repozitář (rozhodnutí D-009), a potvrzení, zda a kdy proběhla
migrace uživatelů.

### 5. Souhlas s podmínkami a prohlášení 18+ se na server neposílá — vysoké

Registrační formulář vyžaduje zaškrtnout „Četl/a jsem a souhlasím
s podmínkami“ i „Je mi 18 let a souhlasím s prohlášením uživatele“. Kontroluje
to ale jen prohlížeč. Požadavek na server nese pouze přezdívku, e-mail, heslo,
pohlaví a zájmy.

Pokud server souhlas nezaznamenává sám od sebe, provozovatel nemá doklad, že
člen souhlasil, ani že prohlásil plnoletost (GDPR čl. 7 odst. 1). U platformy
pro dospělé jde o obojí. **Prosíme ověřit na straně serveru.**

### 6. Zeď je pomalejší, než dovoluje smlouva (C12.1) — střední

Smlouva dovoluje odezvu uživatelského rozhraní nejvýš 1,5 s. `/wall` se
25. 9. načítala **1 688 – 2 031 ms** (tři měření), a to s jediným
uživatelem, bez zátěže. Odpověď serveru přitom přijde za 16–27 ms, zdržení
tedy vzniká v prohlížeči. Úvodní stránka se vejde s rezervou (429 ms).

Zeď je nad limitem ve všech bězích od srpna. Formální akceptační měření pod
zátěží zatím nejde provést, protože smlouva neurčuje, co je „špička“
(rozhodnutí D-007).

### 7. Widgety Počasí a Horoskop na zdi se nenačtou — střední

V pravém panelu zdi zůstávají „Počasí“ i „Horoskop“ i po 8 sekundách na
„Načítám…“. Samotný obsah zdi se načte normálně.

### 8. Cookie lišta — střední

Dobrá zpráva: před jakoukoli volbou se nenačte žádný sledovací skript a
volitelné kategorie nejsou předem zaškrtnuté. Zbývá:

- **Odmítnutí křížkem (✕) se nepamatuje.** Lišta se po každém načtení stránky
  ptá znovu. Tímto tlakem lidé nakonec klepnou na „Povolit vše“.
- **Výslovné tlačítko „Odmítnout“ je schované v „Detaily“**, kdežto „Povolit
  vše“ je výrazné tlačítko hned na liště.
- **Lišta překrývá přihlašovací formulář.** Dokud ji návštěvník nezavře,
  nemůže psát do pole pro heslo.
- **Klávesnicí se pracuje naslepo pod lištou.** Tabulátor projde 25 prvků
  stránky pod ní, než se dostane na její ✕.

### 9. Angličtina není úplná — střední (B13)

Přepnutí jazyka funguje: úvodní stránka je po volbě „Angličtina“ anglicky
téměř celá a jazyk vydrží i při procházení webu. Na dalších stránkách ale
zůstává česky **2,6 – 4,6 % textu**: členství, VOP, GDPR, přihlášení
i registrace. Česky zůstává i text cookie lišty. Smlouva požaduje plnou
dodávku v češtině i angličtině.

### 10. Přístupnost — střední

Automatická kontrola (axe, jen závažné a kritické):

- **nedostatečný kontrast textu:** 4 prvky na úvodní stránce, 16 na zdi
- **vnořené ovládací prvky:** 2 na úvodní stránce (tlačítko v tlačítku, čtečka
  obrazovky pak neumí říct, co je co)

### 11. Web nemá vstupní potvrzení věku 18+ — střední

Starý web neměl při vstupu potvrzení, že je návštěvníkovi 18 let. Nová
platforma ho nemá taky: při prvním příchodu se zobrazí jen cookie lišta. Zeď
s příspěvky a fotografiemi členů je přístupná bez přihlášení i bez
potvrzení věku. Příspěvky jsou pro hosta částečně rozmazané, jejich texty ale
stránka obsahuje. Prohlášení „Je mi 18 let“ je až součástí
registrace. Zda vstupní brána má být, je právní a obsahové rozhodnutí.
Vlastní klient v tomto repozitáři ji má (viz příloha).

### 12. Texty a značka — nízké

- **Překlep na úvodní stránce:** „Kde **te** nikdo neposuzuje“, správně „Kde
  **tě**“. O řádek výš je „kteří tě chápou“ napsané správně.
- **Tři různé názvy na jednom webu:** titulek stránky „SwingersLIFE“, patička
  „© 2026 Libertin“, text na úvodní stránce „Na **Libertine** vytváříme…“.
- **Registrace už neříká, kdo uvidí zvolené zájmy.** Dřív tam stálo „Uvidíte
  jen zájmy uživatelů…“, teď jen „Uvidíte jen příspěvky ze světů, které máte
  vybrané“. Pro člena je to podstatná informace o tom, co o sobě prozradí.
- **Adresa členství:** patička odkazuje na `/clenstvi`, stránka ale přesměruje
  na `/membership`. Funguje, jen je to nejednotné.

---

<a id="co-neslo-overit"></a>

## Co nešlo ověřit (členská část)

Tyto nálezy jsou z přihlášeného běhu 15.–16. 8. na tehdejším nasazení. Kvůli
odmítnutému testovacímu účtu je **nelze potvrdit ani vyvrátit**. Nejsou tedy
„otevřené“, ale nejsou ani „opravené“. Ověří se, jakmile bude funkční účet.

| Tehdy nalezeno | Proč na tom záleží |
|---|---|
| Heslo `123456789` projde registrací (pravidlo je jen „aspoň 8 znaků“, beze změny) | Nejčastější heslo vůbec; bez založení účtu to nejde znovu ověřit |
| `/verify-email` se nevymáhá, neověřený účet se dostane všude | Buď text slibuje víc, než systém dělá, nebo chybí brána |
| Všech 9 členských modulů nad limitem 1,5 s | Smluvní požadavek C12.1 |
| Nepopsané tlačítko v horní liště (7 modulů) | Čtečka obrazovky ho ohlásí jen jako „tlačítko“ |
| `/media`: desítky obrázků bez alternativního textu | Pro nevidomé je stránka prázdná |
| `/profile/<neexistující>` se vykreslí bez hlášky „nenalezeno“ | Nelze odlišit profil od překlepu |
| Překlep v modálu po přihlášení („nenámé síti“) | Čeština |
| Bog, Profily a Trefa bez nadpisu `h1`; Trefa bez patičky | Přístupnost, konzistence |
| Zeď se přihlášenému zasekla na „Načítám…“ | Hlavní stránka pro členy |

---

## Co je potřeba rozhodnout (objednatel)

| # | Otázka |
|---|---|
| D-009 | Funkční testovací účet bez osobních údajů a potvrzení migrace uživatelů. Bez toho zůstane členská část neověřená. |
| — | **Sekce akcí na úvodní stránce zmizela** („Doporučené akce“, „Nadcházející akce“, 12 karet). Záměr, nebo chyba? Na žádnou jinou adresu se nepřesunula. |
| — | **Název v titulku a v náhledu odkazu.** Náhled při sdílení odkazu zní „SwingersLIFE — swingers seznamka a komunita“, titulek v záložce a historii prohlížeče „SwingersLIFE“. Kdo uvidí cizí obrazovku nebo historii, pozná, o jaký web jde. Je to v souladu se slibem diskrétnosti? |
| — | Záznam souhlasu s VOP a prohlášení 18+ na serveru (nález 5). |
| — | Vstupní potvrzení věku 18+ před zobrazením zdi (nález 11). |
| D-007 | Co je „špička“ pro akceptační měření výkonu C12.1. |

---

## Co je opraveno

Všechno níže bylo v některé z dřívějších zpráv a 25. 9. už to neplatí.

| Dříve nalezeno | Stav 25. 9. |
|---|---|
| Chybějící bezpečnostní hlavičky (starý web i první nasazení) | Všechny nastavené: HSTS, CSP `frame-ancestors`, `Referrer-Policy: same-origin`, `X-Frame-Options`, `X-Content-Type-Options` |
| Přesměrování HTTP → HTTPS jen dočasné (307) | Trvalé (301) |
| Chybějící `sitemap.xml` | Existuje |
| `robots.txt` bez výjimek | Členské stránky (`/wall`, `/profile`, `/messages`, …) jsou vyloučené z vyhledávačů |
| Překlepy „Zapomenute heslo“, „svůj učet“ | Opraveno |
| Lorem ipsum na kartách komunit | Nahrazeno skutečným textem |
| Zdvojené popisky v navigaci | Opraveno |
| Tenká stránka Nápověda (`/pomoc`) | Nahlášení zmizelo |
| Kontrast na úvodní stránce | Zlepšen z 36 na 4 prvky (zbytek viz nález 10) |
| Vodorovný karusel neovladatelný klávesnicí | Zmizel |
| Mrtvé odkazy | Žádný — všech 15 veřejných a právních stránek existuje a je dostupných bez přihlášení |

Dvě dřívější tvrzení se ukázala jako **chyba testu, ne webu**, a byla
odvolaná: přepínač jazyka existuje (ikona v záhlaví, 12 jazyků) a odmítnutí
cookies křížkem funguje (neuloží nic a nenačte žádný tracker).

**Co navíc funguje (ověřeno 25. 9.):**

- obnova hesla neprozradí, jestli účet s danou adresou existuje, a adresa
  nikdy neprojde adresním řádkem
- telefon (390 px): žádná stránka se neposouvá do strany, lišta jde zavřít
- klávesnice: přihlášení jde vyplnit a odeslat bez myši
- výpadek serveru při registraci: návštěvník se to dozví a nepřijde
  o vyplněné údaje
- nenačítá se žádný sledovací skript třetí strany, ani po „Povolit vše“

---

## Příloha — vlastní klient v tomto repozitáři

Týká se kódu v `apps/web` a `packages/*` tohoto repozitáře, **ne** nasazené
platformy. Ta běží z jiné kódové základny (D-009). Z auditu soukromí
(`docs/privacy-review.md`) jsou body P1, P2, P3 a P7 opravené. Otevřené
zůstávají:

| # | Nález | Závažnost |
|---|---|---|
| P4 | „Opustit web“ na vstupní bráně je obyčejný odkaz: zůstane v historii a nemá `rel="noreferrer"` | střední |
| P5 | Požadavky API s přihlášením nemají `cache: 'no-store'` | střední |
| P6 | `Avatar` načítá vzdálené obrázky bez `referrerPolicy` | střední, po napojení vysoká |
| P8 | Chybí `Cache-Control` a CSP v hlavičkách vlastního klienta | nízká |
| P9 | `robots.txt` vlastního klienta povoluje vše | nízká, po profilech vysoká |
| P10 | Storybook načítá zástupný obrázek z cizí služby | nízká |
| P11 | `.gitignore` nechytá `.env.production` a podobné | nízká–střední |
| D-010 | Bílý text na značkové barvě `#F20B49` má kontrast 4,27:1, AA požaduje 4,5:1 | střední |

---

## Jak jsme měřili a jak si to zopakovat

```bash
pnpm install
export CYPRESS_BASE_URL=https://swingerslife.cz
pnpm e2e:platform      # soukromí, přístupnost, výkon, čeština, veřejné stránky
pnpm e2e:scenarios     # 8 person napříč stránkami
pnpm e2e:explore       # jen zaznamenává, nic netvrdí
# s funkčním testovacím účtem navíc:
CYPRESS_TEST_USERNAME=… CYPRESS_TEST_PASSWORD=… pnpm e2e:modules
```

Výsledky se zapíšou do `apps/e2e/reports/swingerslife.cz/<sada>/`.

**Co sada při běhu posílá na produkční server:** jednu žádost o obnovu hesla
pro adresu na `example.com` (nikomu nepatří, pošta na ni nedojde) a jedno
přihlášení vymyšleným účtem, které server odmítne. Nic jiného: každý další
zápis sada zastaví ještě v prohlížeči a test spadne. Účty nezakládá.

**Ochrana soukromí členů při testování:** zprávy obsahují jen počty (kolik
tváří, kolik obrázků), nikdy adresy fotek, jména ani ID členů. Hodnoty cookies
se nezapisují, jen jejich názvy. Přihlašovací údaje nejsou v repozitáři.

**Pět chyb v samotné sadě** odhalil tento běh a jsou opravené: měření
výkonu padalo na každé stránce, test slušného režimu hledal skrytou kopii
přepínače, kontrola navigace a patičky čekala popisky, které host nevidí,
a dva testy čekaly texty, které web mezitím přeformuloval (pravidlo hesla,
hláška o odmítnutém přihlášení). Žádná z nich se do nálezů výše nepromítla.

Sdílená verze této zprávy pro čtení a komentáře:
https://claude.ai/artifact/WUXj86UzzepsNQBtgsL2GQ
