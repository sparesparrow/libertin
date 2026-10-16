# ADR — Architecture Decision Records

Tady žijí architektonická rozhodnutí Libertinu. Jeden soubor = jedno
rozhodnutí, včetně **pojmenovaných kompromisů**.

> **Proč to existuje**: smlouva požaduje kompletní architektonickou dokumentaci
> (**C7.2**) a předatelnost externímu subjektu (**C8**). Kód říká *co* systém
> dělá; ADR říká *proč* a co jsme za to zaplatili. Bez druhé části nový tým
> rozhodnutí buď zbytečně zvrátí, nebo ho zdědí, aniž by věděl, že si vybírá.
>
> Související dokumenty: `docs/architecture.md` (stav dnes),
> `docs/backlog.yaml` (rozsah a stav — **jediný** zdroj pravdy),
> `docs/requirements-traceability.md` (mapování na smluvní kódy A/B/C).

---

## Index

| # | Rozhodnutí | Stav | Role | Backlog | Smluvní kódy |
|---|---|---|---|---|---|
| [0001](0001-2fa-architecture.md) | Architektura 2FA — TOTP + passkey/WebAuthn + SMS pro web i React Native | Navrženo | `security` | E2-T1 | **B4.2**, B4.1, B4.4, B14 |
| [0002](0002-contact-graph-reach-semantics.md) | Sémantika dosahu kontaktního grafu | Navrženo, blokováno rozhodnutím vlastníka a privacy/security review | `architect` / `security` | proposed PR 12 | proposal-only |
| [0003](0003-marketplace-payment-activation.md) | Aktivace plateb a provizí Marketplace | Navrženo, blokováno rozhodnutím vlastníka, právním posouzením a podmínkami poskytovatele | `architect` / `security` | proposed PR 12 | proposal-only |
| [0004](0004-identity-certification-states.md) | Oddělení telefonního ověření, certifikace a obchodního stavu | Navrženo; poskytovatelé a produkční pravidla zůstávají otevřené | `architect` / `security` | proposed PR 12 | proposal-only |
| [0005](0005-legacy-laravel-extension-direction.md) | Směr rozšíření legacy Laravelu | Směr vlastníka potvrzen; zdrojový kód, schéma a migrační cesta se ověřují | `architect` / `backend` | E9-T1, D-003 | architecture direction only |

Index je autoritativní seznam ADR. **Když přidáte soubor, přidejte řádek** —
jinak rozhodnutí nikdo nenajde.

## Plánovaná ADR

Backlog dnes explicitně žádá tato rozhodnutí. Číslo dostanou až při vzniku
souboru — **čísla se nerezervují dopředu** (viz §Číslování).

| Téma | Backlog | Výzkum | Poznámka |
|---|---|---|---|
| Backend stack a struktura služeb | E9-T1 | RES-001 | Vlastník zvolil rozšíření legacy Laravelu; ADR 0005 a audit zdrojů probíhají |
| Mapová vrstva — on-premise tiles a privacy-preserving geolokace | E4-T1 | RES-004 | musí být opt-in, střet s diskrétností |
| Self-hosted analytika s per-objekt granularitou | E7-T1 | RES-005 | C2 (minimalizace externích služeb) |
| Platební brána a Marketplace provize | E8-T1 | — | PR 12 nově preferuje provize před povinným členstvím; návrh nenahrazuje podepsaný backlog |
| Realtime audio/video — WebRTC SFU vs. hostovaná služba | E3-T6 | RES-003 | ADR požadované v akceptačních kritériích tasku |

Otevřené výzkumné otázky (`research:` v `docs/backlog.yaml`, id `RES-*`) mají
**jako výstup ADR, ne kód**. Rozhodnutí bez podloženého výzkumu se do ADR
nezapisuje jako fakt — zapíše se jako otevřená otázka.

---

## Číslování a pojmenování

- Formát názvu: **`NNNN-slug.md`** — čtyřmístné číslo s vedoucími nulami, pomlčka,
  krátký slug s pomlčkami. Příklad: `0001-2fa-architecture.md`.
- **Slug je anglicky**, obsah dokumentu česky (stejně jako ostatní dokumenty
  v `docs/`). Anglický slug drží cesty ASCII-only.
- Číslo je **další volné celé číslo** podle indexu výše. Čísla se **nerecyklují**
  ani nemění — odkazy na `ADR-0003` musí platit navždy.
- Čísla se **nerezervují dopředu.** Kolizi (dva lidé vezmou stejné číslo
  paralelně) řeší ten, kdo commituje druhý: přečísluje svůj soubor.
- Číslo **nevyjadřuje důležitost ani pořadí platnosti**, jen pořadí vzniku.

## Životní cyklus a stavy

| Stav | Význam |
|---|---|
| **Navrženo** | Rozhodnutí je popsané a doporučené, ale ještě nemá zelenou (typicky čeká na objednatele nebo na jiné rozhodnutí). |
| **Přijato** | Platí. Nový kód se podle něj píše. |
| **Nahrazeno ADR-NNNN** | Neplatí. V hlavičce **musí** být odkaz na nástupce. |
| **Zamítnuto** | Zvažovali jsme, nejdeme do toho. Zůstává, aby se otázka neotvírala znovu. |

**ADR se nemaže a nepřepisuje.** Změna rozhodnutí = nové ADR, které staré
označí za nahrazené. Historie důvodů je celá cena tohoto formátu.

Pokud rozhodnutí vlastní objednatel, ADR ho **nesmí předstírat**. Zapíše se do
`decisions:` v `docs/backlog.yaml` (id `D-NNN`), závislé tasky zůstávají
`blocked`, dokud není rozhodnutí skutečně zaznamenáno, a ADR ten blok pojmenuje.
Aktuální rozhodnutí jsou v backlogu; návrhy PR 12 je nesmějí potichu měnit.
**D-003** nyní zaznamenává směr rozšířit Laravel; **D-004** zaznamenává prioritu
on-premise, ale konkrétní topologie zůstává otevřená. Další otevřené body zahrnují
Figma, GitLab vs GitHub, AI moderaci, 2FA, C12.1 a modulové E2E.

ADR smí **navrhnout** nové `D-NNN`, ale nesmí ho považovat za existující, dokud
není v `docs/backlog.yaml`. Návrh D-006 z `0001-2fa-architecture.md` je již
v backlogu; jeho stav a text se řídí výhradně tam uvedeným záznamem.

---

## Šablona

Struktura je povinná: **kontext → varianty s kompromisy → rozhodnutí →
důsledky → smluvní kódy**. Sekce se nevynechávají; když je sekce prázdná,
napíše se proč.

Zkopírujte následující blok do `docs/adr/NNNN-slug.md`:

```markdown
# ADR NNNN — <rozhodnutí jednou větou>

| | |
|---|---|
| **Stav** | Navrženo / Přijato / Nahrazeno ADR-NNNN / Zamítnuto |
| **Datum** | RRRR-MM-DD |
| **Role** | která role z `.claude/agents/` rozhodnutí vlastní |
| **Backlog** | id z `docs/backlog.yaml`, které to řeší (a co na tom závisí) |
| **Smluvní kódy** | primární kód tučně, pak podpůrné (viz `docs/requirements-traceability.md`) |
| **Výzkum** | id `RES-*`, pokud ADR je jeho výstupem, jinak „—" |
| **Nutná návazná rozhodnutí** | id `D-NNN`, která tohle blokují nebo z něj plynou |

> Tento dokument je psaný tak, aby podle něj implementoval i externí inženýr
> bez přístupu k autorovi (**C8**). Kde je rozhodnutí kompromis, je kompromis
> pojmenovaný, ne zamlčený.

## 1. Kontext

Co si smlouva vynucuje (cituj kód požadavku), jaký je **dnešní stav v kódu**
(konkrétní soubory), a co konkrétně nejde udělat bez rozhodnutí. Žádná obecná
teorie — jen fakta, která rozhodnutí tlačí.

Pokud je něco domněnka nebo neověřený předpoklad, napiš to sem a označ.

## 2. Síly a omezení

Vyjmenuj to, co zužuje prostor řešení: smluvní kódy (např. C2 on-premise,
C12.1 odezva ≤ 1,5 s), diskrétnost jako produktová vlastnost, dvě runtime
(web + React Native), veřejný repozitář, velikost týmu, blokující `D-NNN`.

## 3. Uvažované varianty

Minimálně dvě. Pro každou:

### Varianta A — <název>

- **Jak by to fungovalo**: stručně, ale konkrétně (knihovny, endpointy, tok).
- **Pro**: …
- **Proti**: …
- **Cena**: provozní náročnost, závislost na externí službě, dopad na výkon,
  bezpečnostní povrch, náročnost údržby externím subjektem.
- **Dopad na soukromí**: co může uniknout a komu. U adult platformy je to
  akceptační kritérium, ne poznámka.

### Varianta B — <název>

(dtto)

## 4. Rozhodnutí

Co se vybralo, **jednou jednoznačnou větou**, a proč právě to — vztaženo k
§2. Pokud je rozhodnutí částečné („vybíráme A pro web, B pro mobil"), napiš to
explicitně včetně hranice.

## 5. Důsledky

- **Pozitivní**: co tím získáváme.
- **Negativní / co tím platíme**: konkrétně. Sem patří i „tohle bude bolet při
  škálování" nebo „přidává to jednu externí závislost".
- **Co to vynucuje na ostatních částech**: změny v `contracts/openapi.snapshot.yaml`,
  nové balíčky, nové obrazovky, migrace dat, nové proměnné prostředí.
- **Jak se to pozná, že to nefunguje**: co měřit, který test to hlídá.
- **Kdy se k tomu vrátit**: podmínka, při které rozhodnutí přehodnotit.

## 6. Splněné požadavky ze smlouvy

| Kód | Požadavek | Jak ho toto rozhodnutí plní | Co ještě zbývá |
|---|---|---|---|
| **B4.2** | … | … | … |

Tabulka musí být v souladu s `docs/requirements-traceability.md`. Když ADR
posouvá stav požadavku, je třeba posunout i ten dokument — nebo to nahlásit
jako nález.

## 7. Co toto ADR neřeší

Explicitní seznam. Zabraňuje tomu, aby se ADR číslo citovalo jako pokrytí
věcí, které v něm nikdy nebyly.
```

## Pravidla pro psaní ADR

1. **Kompromis se pojmenuje.** ADR, které nemá žádné „proti", je marketing.
2. **Nepiš záměr jako realitu.** Sekce §1 popisuje kód, jak je dnes; zbytek je
   návrh. Stejná hranice jako v `docs/architecture.md`.
3. **Diskrétnost je produktová vlastnost.** U každé varianty se ptej, co může
   uniknout a komu. Členům platformy hrozí reálná újma z prozrazení.
4. **Repozitář je veřejný.** Žádná čísla smluv, jména stran, přihlašovací
   údaje, tokeny, interní hostnames ani osobní data — ani v příkladech.
5. **Rozhodnutí objednatele nevymýšlej.** Blokující volba jde do `decisions:`
   v `docs/backlog.yaml` a ADR ji pojmenuje jako otevřenou.
6. **Ověřuj tvrzení.** Čísla, výkonové odhady a chování knihoven doplň
   skutečným výstupem příkazu nebo odkazem na `RES-*`, ne z hlavy.
7. **Po commitu doplň řádek do Indexu výše** a případně posuň
   `docs/requirements-traceability.md`.
