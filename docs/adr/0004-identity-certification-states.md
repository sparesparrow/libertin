# ADR 0004 — Oddělení telefonního ověření, certifikace a obchodního stavu

| | |
|---|---|
| **Stav** | Navrženo; produkční pravidla a poskytovatelé zůstávají otevření |
| **Datum** | 2026-10-17 |
| **Role** | `architect` / `security` |
| **Backlog** | Žádný nový podepsaný task. Návrh PR 12 je pouze autorizován k vývoji. |
| **Smluvní kódy** | Žádný nový požadavek se tímto ADR nepřidává. Existující B1, B4.2 a B14 se nemění. |
| **Výzkum** | — |
| **Nutná návazná rozhodnutí** | D-003 backend, D-004 hosting; navíc právní a bezpečnostní schválení věkové kontroly a certifikace |

> Toto ADR stanoví stavové hranice pro bezpečný návrh a syntetický vývoj.
> Nejde o smluvní dodatek, právní stanovisko ani schválení produkčního ověřování.

## 1. Kontext

PR 12 rozlišuje ověření telefonního čísla, existenci účtu a certifikaci profilu.
Marketplace k tomu přidává ověření obchodníka a platební stav. Návrh
`04-vexl-architecture/libertin-design.md` dále vyžaduje, aby obě strany byly
certifikované a nezávisle souhlasily s odhalením profilu. Platba nesmí být
podmínkou odhalení.

V aktuálním klientovi `packages/api/src/client.ts` pole `User.verified` znamená
ověření e-mailu. `TwoFactorMethod` zahrnuje SMS jako druhý faktor při
přihlašování. To není stav ověření držení telefonního čísla ani důkaz věku či
právní totožnosti. API nemá model certifikace nebo obchodníka. Reálný provider,
recenzenti, retenční pravidla a produkční backend zatím nejsou vybrány.

## 2. Síly a omezení

- Telefonní číslo, účet, certifikace, ověření obchodníka a platba musí zůstat
  samostatné dimenze; změna jedné nesmí automaticky měnit ostatní.
- SMS prokazuje nanejvýš dočasnou kontrolu nad číslem. Neprokazuje věk,
  občanskou totožnost, důvěryhodnost ani odbornou způsobilost.
- Member attestations jsou samostatný komunitní signál, nikoli identity check.
- Žádná platba, provize ani nákup certifikaci nezakládá.
- Video certifikace je pouze návrhová možnost. V prototypu se živé video
  nenahrává ani neukládá; vendor, věkové ověření a právní základ zůstávají
  otevřené.
- D-003 a D-004 blokují volbu produkčního úložiště, API a migrací. PR 12
  nemění `docs/backlog.yaml`.

## 3. Uvažované varianty

### Varianta A — Jeden sloučený „ověřený“ nebo „důvěryhodný“ stav

- **Jak by to fungovalo:** telefon, certifikaci, obchodníka a platbu by UI nebo
  backend shrnul do jednoho odznaku.
- **Pro:** jednoduché vykreslení a méně stavů v raném prototypu.
- **Proti:** nejasně sděluje, co bylo skutečně ověřeno; platba či telefon by
  mohly být mylně považovány za identitu, věk nebo bezpečnostní záruku.
- **Cena:** obtížné odvolání dílčích oprávnění a nejednoznačné logy.
- **Dopad na soukromí:** odznak může odhalit citlivé informace a svádět k
  neodůvodněné důvěře v osobu nebo nabídku.

### Varianta B — Nezávislé stavové dimenze

- **Jak by to fungovalo:** každá oblast má svůj stav, vlastní zdroj pravdy,
  oprávněné aktéry a životní cyklus. UI ukazuje pouze potřebný význam.
- **Pro:** odpovídá omezenému důkazu každého procesu; podporuje samostatnou
  revokaci, audit a přístupová pravidla.
- **Proti:** vyžaduje explicitní model a pečlivější vysvětlení v UI.
- **Cena:** více stavových přechodů, oprávnění a testů.
- **Dopad na soukromí:** lze omezit zpřístupnění evidence i propojení komunitního
  profilu s právní identitou obchodníka.

## 4. Rozhodnutí

Pro návrhový a syntetický vývoj zvolit **variantu B**: telefonní držení, účet,
certifikace, ověření obchodníka a platební stav modelovat samostatně. Toto
rozhodnutí nepovoluje živé SMS, věkové ověřování, video review, sběr dokladů,
reálné platby ani výplaty. Produkční pravidla zůstanou `blocked`, dokud je
neschválí vlastník spolu s požadovanou právní, bezpečnostní a provider review.

## 5. Důsledky

- **Pozitivní:** příspěvek, zpráva, odhalení profilu a marketplace objednávka
  mohou ověřovat pouze stav potřebný pro konkrétní akci. Certifikace není na
  prodej.
- **Negativní / cena:** klient i API musí rozlišit více stavů; jejich UI a
  selhání potřebují vlastní testy.
- **Co to vynucuje:** model žádosti o certifikaci, oprávnění recenzenta,
  revokaci, přezkum zamítnutí a audit; oddělený model ověření obchodníka a
  platby. Výběr databáze a endpointů se odkládá do rozhodnutí D-003/D-004.
- **Jak poznat selhání:** test musí prokázat, že SMS nepovýší účet na
  certifikovaný, platba nepovolí reveal a změna/odvolání jednoho stavu
  nezmění jiné dimenze.
- **Kdy se vrátit:** před propojením reálného provideru, uložením dokladů,
  spuštěním certifikace, prodejem nebo povolením profilového reveal.

## 6. Smluvní požadavky

Toto ADR neposouvá stav žádného podepsaného požadavku a nepřidává nové.
Vazby na B1, B4.2 a B14 zůstávají vedené v
[`docs/requirements-traceability.md`](../requirements-traceability.md) a
`docs/backlog.yaml`. Produkční doručení podle smlouvy se tímto ADR nepotvrzuje.

## 7. Co toto ADR neřeší

- právní titul, DPIA ani způsob ověření věku;
- poskytovatele, kritéria, počet recenzentů, důkazní materiál, retenční dobu,
  přezkum zamítnutí a přístup moderátorů;
- seznam kategorií, obchodní podmínky nebo platební model Marketplace;
- zvolený backend, hosting, databázi nebo konkrétní API trasy;
- obsah odznaku, který se má veřejně ukazovat.
