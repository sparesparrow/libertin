# ADR 0005 — Směr rozšíření legacy Laravelu

| | |
|---|---|
| **Stav** | Navrženo; technický směr vlastníka potvrzen, zdrojový audit čeká |
| **Datum** | 2026-10-17 |
| **Role** | `architect` / `backend` |
| **Backlog** | E9-T1; návazně E9-T2, E9-T3; D-003 |
| **Smluvní kódy** | **A3**, C3, C6, C13 |
| **Výzkum** | RES-001 (probíhá) |
| **Nutná návazná rozhodnutí** | D-004 topologie hostingu; provozní umístění služeb |

> Tento záznam zachycuje technický směr pro návrh a vývoj. Není dodatkem
> k podepsanému rozsahu, schválením právního výkladu ani povolením produkční
> migrace.

## 1. Kontext

`docs/live-audit.md` popisuje stávající platformu jako Laravel. Veřejný repozitář
Libertin neobsahuje její zdrojový kód ani schéma databáze. Libertin dnes obsahuje
samostatný klientský API balíček a návrhový OpenAPI snapshot; mobilní JSON/bearer
tok je mock-only a nesmí být vydáván za živý backend.

Vlastník potvrdil 2026-10-17, že preferovaným technickým směrem je rozšířit legacy
Laravel. Rozhodnutí samo o sobě neprokazuje dostupnost kódu, slučitelnost
datového modelu ani to, že každá navržená služba musí běžet uvnitř monolitu.
Doslovný rozsah A3/C3/C6 zůstává určen podepsanou smlouvou a tímto ADR se
nevykládá ani nemění.

## 2. Síly a omezení

- Zachovat migrační cestu existujících dat a identit (C13) bez neověřeného
  přepisu produkčního schématu.
- Udržet veřejné API založené na skutečně pozorovaném kontraktu; současný
  Libertin OpenAPI snapshot není důkazem existujících Laravel endpointů.
- Respektovat vlastníkem potvrzenou prioritu maximálního on-premise umístění.
  Konkrétní hosty, kapacita, HA/DR a případné externí služby řeší D-004.
- Neprovádět produkční migraci, export dat ani změnu přihlášení v rámci tohoto
  směrového rozhodnutí.

## 3. Uvažované varianty

### Varianta A — Rozšířit legacy Laravel

- **Jak by to fungovalo**: ověřit existující Laravel aplikaci, její moduly,
  autentizaci, databázi a běžící rozhraní. Poté navrhnout kompatibilní rozšíření
  a řízenou migraci podle E9-T1 až E9-T3.
- **Pro**: odpovídá pokynu vlastníka; může zachovat existující účty a data,
  omezit paralelní identity a využít již provozované doménové chování.
- **Proti**: může zdědit technický dluh, nezdokumentované vazby a riziko
  nekompatibilních změn; zatím neznáme stav ani dostupnost zdrojů.
- **Cena**: nejdřív je nutný audit kódu, schématu, autentizace, záloh a deploymentu.
- **Dopad na soukromí**: společná identita a datové úložiště mohou zvýšit dopad
  chybného oprávnění nebo migrace; před přístupem k datům je nutná klasifikace,
  minimální přístup a testy s umělými daty.

### Varianta B — Nový backend s migrační hranicí

- **Jak by to fungovalo**: vybudovat nový backend a explicitní rozhraní pro
  ověřené čtení nebo převod legacy dat.
- **Pro**: čistší doménové hranice a možnost volit nezávislé služby.
- **Proti**: vytváří souběžné identity a provozní plochu, dokud migrace neskončí;
  vlastníkem nebyla zvolena jako výchozí směr.
- **Cena**: více integračních, migračních a dohledových komponent.
- **Dopad na soukromí**: kopie účtů a kontaktů zvyšují počet úložišť, která mohou
  odhalit citlivé vazby.

## 4. Rozhodnutí

Pro návrh a vývoj je zvolen směr **rozšířit legacy Laravel**. Než bude možné
navrhnout schéma nebo implementovat produkční integraci, E9-T1 musí ověřit
skutečný zdrojový kód, model dat, provozní hranice a migrační cestu. Pokud audit
prokáže zásadní neslučitelnost, vznikne nové ADR; tato podmínka není povolením
samostatně přejít na variantu B.

## 5. Důsledky

- **Pozitivní**: backendové návrhy se nejprve připraví pro Laravel a zachování
  legacy identit/dat.
- **Negativní / co tím platíme**: bez přístupu ke zdrojům nelze ověřit návrh,
  odhad migrace ani produkční kompatibilitu; možné technické překážky zůstávají.
- **Co to vynucuje na ostatních částech**: E9-T1 musí inventarizovat existující
  endpointy, autentizaci, databázi, migrace, deployment a testovací prostředí.
  Návrhové API pro dosud chybějící funkce musí být verzované a oddělené od
  pozorovaných živých cest.
- **Jak se pozná, že to nefunguje**: audit nenajde bezpečný způsob zachování
  identity/dat nebo testovací prostředí nedokáže ověřit kompatibilitu; návrh se
  vrátí k vlastníkovi s konkrétními důkazy.
- **Kdy se k tomu vrátit**: po zpřístupnění legacy zdrojů a testovacího schématu,
  nebo pokud audit odhalí nepřijatelné bezpečnostní či migrační riziko.

## 6. Splněné požadavky ze smlouvy

| Kód | Požadavek | Jak toto ADR přispívá | Co ještě zbývá |
|---|---|---|---|
| A3 | Backendová implementace | Zaznamenává technický směr vlastníka. | Vyjasnit smluvní hranici a ověřit konkrétní implementaci. |
| C3 | Backendové služby | Určuje výchozí platformu pro následný návrh. | Struktura služeb, runtime, kontrakt a ověřovací testy. |
| C6 | Architektura systému | Zajišťuje, že návrh navazuje na legacy stav. | Zdrojový audit, bezpečnostní review a aktualizace cílové architektury. |
| C13 | Migrace | Vyžaduje zachování a ověření cesty existujících dat. | Schéma, mapování, retenční pravidla a testovací migrace. |

## 7. Co toto ADR neřeší

- Výklad nebo změnu podepsané smlouvy.
- Výběr databázové varianty, doménových hranic, frameworkových balíčků nebo
  nových endpointů.
- Hostingovou topologii, veřejného cloudového poskytovatele, SMS bránu, platby
  ani produkční nasazení.
- Oprávnění ke čtení, kopírování či migraci skutečných produkčních dat.
