# Závěrečná zpráva z testování — swingerslife.cz

**Pro:** produktového vlastníka
**Stav k:** 25.–26. 9. 2026
**Co bylo testováno:** nasazená platforma na `https://swingerslife.cz`
(`https://libertin.app` na ni trvale přesměrovává, HTTP 301), veřejná část
i členská část za přihlášením
**Jak:** automatická sada Cypress z tohoto repozitáře (`apps/e2e`) a přímé
dotazy na server; členská část testovacím účtem, který dodal objednatel

Tato zpráva nahrazuje dřívější dílčí zprávy (15. 8., 16. 9. a jejich doplňky).
Obsahuje **jen to, co k dnešku není opravené**. Každý bod je znovu změřený
25.–26. 9., žádný se nepřebírá ze starého běhu. Co se mezitím opravilo, je
souhrnně na konci, abyste viděli, že se to kontrolovalo.

---

## Shrnutí

Vývojáři oznámili, že je vývoj hotový. Veřejná i členská část z velké
části funguje: bezpečnostní hlavičky, právní stránky, výběr jazyka, obnova
hesla, registrace, zprávy, chat, marketplace i kredit. Nenačítá se žádný
sledovací skript třetí strany. Po odhlášení se zprávy přes tlačítko Zpět
znovu neukážou.

Migrace uživatelů podle všeho proběhla: na zdi je oznámení, že se lze přihlásit
jménem a heslem ze starého webu, a testovací účet objednatele funguje. (První
dodaný účet nefungoval, nový ano.)

**Čtyři věci ale brání tomu, aby se dodávka převzala jako hotová:**

1. **Nepřihlášený návštěvník vidí tváře členů.** Na stránce „Zeď“ je vidí bez
   rozmazání, u části z nich i s tím, že mají dnes narozeniny. „Slušný
   režim“ tváře nerozmaže. U platformy, jejímž hlavním slibem je diskrétnost,
   je to nejzávažnější nález.
2. **Vlastní profil člena spadne.** Stránka `/profile` testovacího účtu
   skončí hláškou „This page couldn't load“ (chyba v kódu stránky), ve všech
   šesti pokusech.
3. **Citlivé údaje bez ovládání viditelnosti.** Nastavení „O mně“ sbírá
   sexuální orientaci a vztahový stav, ale nikde neříká ani nedovoluje
   nastavit, kdo je uvidí. Jde o zvláštní kategorie osobních údajů (GDPR
   čl. 9).
4. **Registrace neposílá na server souhlas s podmínkami ani prohlášení
   o věku 18+.** Pokud server souhlas nezaznamenává sám, provozovatel nemá
   doklad o souhlasu.

| Sada (swingerslife.cz, přihlášeně) | Testů | Prošlo | Selhalo | Přeskočeno |
|---|---|---|---|---|
| Moduly (Zeď, Bog, Profily, Trefa, Chat, Marketplace, Média, Kredit, Nastavení) | 70 | 62 | **8** | 0 |
| Platforma: soukromí, přístupnost, výkon, čeština, 15 veřejných a právních stránek | 171 | 145 | **25** | 1 |
| Scénáře uživatelů (8 person napříč stránkami) | 9 | 8 | 0 | 1 |
| Průzkum (jen zaznamenává, nic netvrdí) | 12 | 12 | 0 | 0 |

Všech 33 selhání jsou skutečné nálezy níže, nebo sekce akcí k rozhodnutí.
Přeskočená je jen skutečná registrace nového účtu, kterou sada bez
výslovného povolení neprovádí. Během měření se v samotné sadě našlo a opravilo
několik míst, kde čekala starý návrh webu (viz konec zprávy); do nálezů se
žádné nepromítlo.

---

## Otevřené nálezy

Seřazeno od nejzávažnějšího. U každého je, jak si ho ověřit sami.

### 1. Nepřihlášený vidí tváře členů a jejich narozeniny — kritické

Na `/wall` skrývá hostovský pohled jména členů („Zaregistrujte se zdarma
a uvidíte jména…“). V postranním panelu ale ukazuje jejich profilové fotky,
nerozmazané:

- **24 nerozmazaných profilových fotek** v panelu (mimo jiné „Online
  uživatelé“), 24 z 24 zobrazených
- **„Narozeniny dnes“: 2–3 tváře** (podle dne) a u nich informace, že má
  člověk dnes narozeniny

Tvář identifikuje člověka spolehlivěji než přezdívka a k ní se přidává datum
narození. Na obrazovce to vidí kdokoli, přihlášení není potřeba.

*Ověření:* anonymní okno → `https://swingerslife.cz/wall` → pravý panel.

*Poznámka:* zda jsou fotky dostupné i napřímo přes svou adresu, jsme záměrně
nezkoušeli (šlo by o práci s osobními údaji). Měl by to ověřit provozovatel.

### 2. Vlastní profil člena spadne — vysoké

Přihlášený člen, který otevře svůj profil (`/profile`), uvidí jen „This
page couldn't load — Reload to try again, or go back“. V konzoli prohlížeče je
chyba `TypeError: Cannot read properties of null (reading 'length')`.
Zopakováno v šesti pokusech během dvou běhů. Testovací účet nemá profilovou
fotku ani vyplněné údaje „O mně“; pravděpodobně stránka nepočítá s prázdnou
hodnotou. Takových nových členů bude většina.

*Ověření:* přihlásit se účtem bez fotky → ikona profilu vpravo nahoře →
jméno v nabídce.

### 3. Citlivé údaje bez ovládání viditelnosti — vysoké

Nastavení profilu → „O mně“ nabízí vyplnit **sexuální orientaci** a **stav**
(vztahový). U žádného z polí není volba, kdo je uvidí, ani vysvětlení, kde se
zobrazí. Nastavení soukromí, jako „skrýt profil“ nebo „anonymní prohlížení“,
jsme v nastavení nenašli. Sexuální orientace patří mezi zvláštní kategorie
osobních údajů (GDPR čl. 9); u této platformy je to přesně ten údaj, jehož
prozrazení člověku ublíží.

*Ověření:* přihlásit se → Nastavení profilu → 3. O mně.

### 4. Slušný režim nerozmaže tváře — vysoké

Přepínač „Zapnout slušný režim“ funguje, pamatuje si volbu i při přechodu
mezi stránkami a na zdi rozmaže příspěvky (z 1 na 21 prvků). **Tváře členů ale
nechá ostré (24 z 24)** a na úvodní stránce neskryje nic, ani úvodní
fotografii.

*Ověření:* patička → „Zapnout slušný režim“ → `/wall`.

### 5. Zeď posílá nepřihlášenému členský obsah — vysoké

V těle odpovědi pro nepřihlášeného jsou prvky členské zdi („Vytvořit
příběh“, „Od přátel“, „Co sleduji“). Na obrazovce nejsou, ve zdroji stránky
ano: brána se rozhoduje až v prohlížeči, kdy data už dorazila.

*Ověření:* anonymní okno → `/wall` → `Ctrl+U` → hledat „Vytvořit příběh“.

### 6. Souhlas s VOP a prohlášení 18+ se na server neposílá — vysoké

Obě zaškrtávací pole registrace kontroluje jen prohlížeč. Požadavek na
server nese jen přezdívku, e-mail, heslo, pohlaví a zájmy. Pokud server
souhlas nezaznamenává sám, provozovatel nemá doklad o souhlasu ani
o prohlášení plnoletosti (GDPR čl. 7 odst. 1). Prosíme ověřit na straně
serveru.

### 7. Čtyři stránky jsou pomalejší, než dovoluje smlouva (C12.1) — střední

Smlouva dovoluje odezvu nejvýš 1,5 s. Měřeno s jediným přihlášeným
uživatelem, bez zátěže, tři pokusy na stránku:

| Stránka | Načtení | Stav |
|---|---|---|
| Média | 1 966 – 2 179 ms | nad limitem ve všech pokusech |
| Chat | 1 719 – 1 889 ms | nad limitem ve všech pokusech |
| Lidé | 1 576 – 1 873 ms | nad limitem ve všech pokusech |
| Zeď | 1 508 – 1 833 ms | nad limitem ve všech pokusech |
| Nastavení profilu | 1 359 – 2 172 ms | na hraně |
| Kredit | 1 433 – 1 619 ms | na hraně |
| Bog (zprávy) | 1 482 – 1 595 ms | na hraně |
| Marketplace | 1 471 ms | v limitu |
| Trefa | 653 ms | v limitu |
| Úvodní stránka | 402 – 429 ms | v limitu |

Server odpovídá za 16–77 ms, zdržení tedy vzniká v prohlížeči. Formální
akceptační měření pod zátěží zatím nejde provést, protože smlouva neurčuje, co
je „špička“ (D-007).

### 8. Přístupnost — střední

Automatická kontrola (axe, jen závažné a kritické), přihlášeně:

- **nedostatečný kontrast textu na každé stránce:** od 2 prvků (Trefa) po 92
  (Chat); nejčastěji malé šedé nadpisy v levém menu
- **Nastavení „Osobní“:** 6 rozbalovacích polí a pole data narození bez
  popisu pro čtečku obrazovky (kritické)
- **chybí hlavní nadpis `h1`** na Bogu, Lidech a Trefě; Nastavení má
  nadpisy `h1` dva
- **Média:** 33 ikon rozhraní bez alternativního textu
- **vnořené ovládací prvky:** 2 na úvodní stránce

### 9. Widgety Počasí a Horoskop se nenačtou — střední

V pravém panelu zdi zůstávají i po 8 s na „Načítám…“. Obsah zdi se načte
normálně.

### 10. Cookie lišta — střední

Před volbou se nenačte žádný sledovací skript a volitelné kategorie nejsou
předem zaškrtnuté. Zbývá:

- odmítnutí křížkem (✕) se nepamatuje, lišta se ptá po každém načtení
  stránky; přihlášenému členovi pak znovu zakrývá nabídku účtu
- tlačítko „Odmítnout“ je schované v „Detaily“, „Povolit vše“ je výrazné
  hned na liště
- lišta překrývá přihlašovací formulář, do hesla nejde psát
- tabulátor projde 25 prvků pod lištou, než se dostane na její ✕

### 11. Angličtina není úplná (B13) — střední

Přepnutí jazyka funguje a vydrží při procházení, ale na členství, VOP, GDPR,
přihlášení a registraci zůstává česky **2,6 – 4,6 % textu**, stejně jako
text cookie lišty.

### 12. Chybí vstupní potvrzení věku 18+ — střední

Při prvním příchodu se zobrazí jen cookie lišta. Zeď s příspěvky
a fotografiemi členů je přístupná bez přihlášení i bez potvrzení věku.
Příspěvky jsou pro hosta částečně rozmazané, jejich texty ale stránka
obsahuje. Prohlášení „Je mi 18 let“ je až součástí registrace.

### 13. Trefa nemá patičku — nízké

Na Trefě chybí patička, a s ní odkazy na podporu, VOP a GDPR, které mají
všechny ostatní stránky.

### 14. Texty a značka — nízké

- překlep na úvodní stránce: „Kde **te** nikdo neposuzuje“, správně „Kde
  **tě**“
- tři názvy na jednom webu: titulek „SwingersLIFE“, patička „© 2026
  Libertin“, text „Na **Libertine** vytváříme…“
- registrace už neříká, kdo uvidí zvolené zájmy (dřív „Uvidíte jen zájmy
  uživatelů…“)
- patička odkazuje na `/clenstvi`, stránka přesměruje na `/membership`

---

## Co nešlo ověřit

| Dříve nalezeno | Proč nešlo ověřit |
|---|---|
| Heslo `123456789` projde registrací (pravidlo je stále jen „aspoň 8 znaků“) | Bez založení nového účtu to znovu ověřit nejde; účty sada nezakládá |
| Ověření e-mailu se nevymáhá | Testovací účet je už ověřený |
| Konverzace, interakce v Trefě, platba kreditu | Účet nemá konverzace ani fotku a platba potřebuje testovací přístup k bráně |

---

## K rozhodnutí objednatele

| # | Otázka |
|---|---|
| — | **„Dětský režim“ na platformě pro dospělé.** Po přihlášení z nové sítě se zobrazí „Chceš prohlížet obsah v režimu do 18 let?“ s přepínačem „Dětský režim“. Platforma je 18+. Je text záměrný? Naznačuje, že s nezletilými uživateli se počítá. |
| — | **Sekce akcí na úvodní stránce zmizela** („Doporučené akce“, „Nadcházející akce“, 12 karet) a nepřesunula se jinam. Záměr, nebo chyba? |
| — | **Náhled odkazu a titulek.** Náhled při sdílení odkazu zní „SwingersLIFE — swingers seznamka a komunita“, titulek v záložce a historii prohlížeče „SwingersLIFE“. Je to v souladu se slibem diskrétnosti? |
| — | Záznam souhlasu s VOP a prohlášení 18+ na serveru (nález 6). |
| — | Vstupní potvrzení věku 18+ před zobrazením zdi (nález 12). |
| D-007 | Co je „špička“ pro akceptační měření výkonu C12.1. |

---

## Co je opraveno

Všechno níže bylo v některé z dřívějších zpráv a 25.–26. 9. už to neplatí.

| Dříve nalezeno | Stav 25.–26. 9. |
|---|---|
| Chybějící bezpečnostní hlavičky (starý web i první nasazení) | Všechny nastavené: HSTS, CSP `frame-ancestors`, `Referrer-Policy: same-origin`, `X-Frame-Options`, `X-Content-Type-Options` |
| Přesměrování HTTP → HTTPS jen dočasné (307) | Trvalé (301) |
| Chybějící `sitemap.xml` | Existuje |
| `robots.txt` bez výjimek | Členské stránky jsou vyloučené z vyhledávačů |
| Neexistující profil se vykreslí bez hlášky | „Profil nenalezen.“ |
| Nepopsané tlačítko v horní liště (7 modulů) | Opraveno, kontrola ho už nehlásí |
| Média: 65–71 obrázků bez alt | Bez alt je už jen 33 ikon rozhraní (nález 8) |
| Zeď se přihlášenému zasekne na „Načítám…“ | Obsah zdi se načte (zbývají widgety, nález 9) |
| Překlep v modálu po přihlášení („nenámé síti“) | „neznámé síti“ |
| Překlepy „Zapomenute heslo“, „svůj učet“ | Opraveno |
| Lorem ipsum na kartách komunit | Nahrazeno skutečným textem |
| Zdvojené popisky v navigaci | Opraveno |
| Tenká stránka Nápověda | Opraveno |
| Kontrast na úvodní stránce | Zlepšen z 36 na 4 prvky (zbytek viz nález 8) |
| Karusel neovladatelný klávesnicí | Zmizel |
| Mrtvé odkazy | Žádný; všech 15 veřejných a právních stránek existuje a je dostupných bez přihlášení |
| Testovací účet nefunguje | Nový účet objednatele funguje |

Dvě dřívější tvrzení byla chybou testu a jsou odvolaná: přepínač jazyka
existuje (ikona v záhlaví, 12 jazyků) a odmítnutí cookies křížkem funguje.

**Ověřeno, že funguje:**

- po odhlášení tlačítko Zpět vrátí na přihlášení a zprávy se neukážou
- obnova hesla neprozradí, jestli účet existuje, a adresa nikdy neprojde
  adresním řádkem
- na telefonu (390 px) se žádná stránka neposouvá do strany
- přihlášení jde vyplnit a odeslat jen klávesnicí
- při výpadku serveru se návštěvník dozví chybu a nepřijde o vyplněné údaje
- žádná chyba v konzoli na devíti členských stránkách (kromě vlastního
  profilu, nález 2)
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
export CYPRESS_TEST_USERNAME=… CYPRESS_TEST_PASSWORD=…   # testovací účet, mimo repozitář
pnpm e2e:modules       # členské moduly
pnpm e2e:platform      # soukromí, přístupnost, výkon, čeština, veřejné stránky
pnpm e2e:scenarios     # 8 person napříč stránkami
pnpm e2e:explore       # jen zaznamenává, nic netvrdí
```

Výsledky se zapíšou do `apps/e2e/reports/swingerslife.cz/<sada>/`.

**Co sada při běhu posílá na produkční server:** přihlášení testovacím
účtem a odhlášení, jednu žádost o obnovu hesla pro adresu na `example.com`
(nikomu nepatří, pošta na ni nedojde) a jedno přihlášení vymyšleným účtem,
které server odmítne. K tomu provoz, který přihlášená stránka posílá sama
(připojení v reálném čase, značka „online“, hledání lidí). Nic jiného: každý
další zápis sada zastaví ještě v prohlížeči a test spadne. Nic nepublikuje,
nikomu nepíše a účty nezakládá.

**Ochrana soukromí členů při testování:** zprávy obsahují jen počty (kolik
tváří, kolik obrázků), nikdy adresy fotek, jména ani ID členů. Hodnoty cookies
se nezapisují, jen jejich názvy. Přihlašovací údaje nejsou v repozitáři ani
v této zprávě.

**Opravy v samotné sadě během měření:** sada na několika místech čekala
předchozí návrh webu nebo se u některých stránek nepřihlásila. Měření výkonu
padalo na každé stránce, test slušného režimu hledal skrytou kopii
přepínače a pomocník pro modál „neznámé sítě“ hledal tlačítko, které už
neexistuje. Každá oprava je v kódu okomentovaná s tím, co bylo 25. 9.
změřeno. Žádná se do nálezů výše nepromítla.

Sdílená verze této zprávy pro čtení a komentáře:
https://claude.ai/artifact/WUXj86UzzepsNQBtgsL2GQ
