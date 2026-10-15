# Libertin: kontaktní distribuce a odhalování profilů

Datum: 2026-10-15
Status: návrh podle upřesnění vlastníka v konverzaci. Nejde o implementovanou funkci, bezpečnostní audit ani změnu smluvního backlogu.

## Cíl

Libertin propojuje seznamování, komunitní obsah, události a Marketplace. Autor může dobrovolně rozšířit dosah příspěvku do kontaktního okruhu. Kontaktní vazba slouží jako signál relevance, nikoliv jako záruka důvěryhodnosti.

## Produktová pravidla

1. Přátelé na Libertinu vidí příspěvek s autorem a mohou otevřít jeho profil.
2. Ostatní oprávnění příjemci v kontaktním okruhu vidí inzerát bez propojení na autorův profil.
3. Člověk s ověřeným telefonním číslem může podle zadání reagovat i bez certifikovaného profilu. Taková reakce nezpřístupní jeho profil autorovi.
4. Konverzace je do odhalení založena na inzerátu a reakci na něj, nikoliv na vzájemném zpřístupnění účtů.
5. Odhalení vyžaduje certifikované účty obou stran a souhlas obou. Potom se konverzace propojí s konkrétními profily.

Ověření držení telefonního čísla, certifikace účtu a předplatné jsou rozdílné stavy. Zde není stanovena podmínka platby pro odhalení.

## Stavový model konverzace

```text
INZERÁT S NEODHALENÝM AUTOREM
          |
          v
REAKCE BEZ ZPŘÍSTUPNĚNÍ PROFILU
          |
          v
KONVERZACE BEZ ZPŘÍSTUPNĚNÍ PROFILŮ
          |
          +-- jeden účet není certifikovaný -> odhalení není dostupné
          |
          +-- oba účty jsou certifikované
                        |
                        v
                 ŽÁDOST O ODHALENÍ
                        |
                        +-- odmítnutí -> profily zůstávají neodhalené
                        |
                        +-- souhlas obou -> ZPŘÍSTUPNĚNÍ OBOU PROFILŮ
```

Žádost sama nezpřístupňuje profil žadatele. Certifikace i souhlasy se ověřují při provedení odhalení, nikoliv jen při zobrazení tlačítka.

## Návrhové hranice služeb

- Kontaktní služba: ověření a vyhodnocení oprávněného kontaktního dosahu; bez automatického přístupu k textům příspěvků a zpráv.
- Obsah a publika: přátelům poskytují reprezentaci s autorem, ostatním oprávněným příjemcům reprezentaci bez vazby na profil.
- Konverzace: uchovává stav komunikace a odhalení; před schváleným odhalením nezpřístupňuje profilové identifikátory protistraně.
- Certifikace a oprávnění: umožňuje ověřit způsobilost k odhalení bez zbytečného rozšiřování osobních údajů mezi službami.

Jde o logické hranice, nikoliv o schválený backendový stack. Oddělení služeb samo neřeší úniky metadat.

## Rozhodnutí před implementací

- Přesně rozlišit přímý kontakt, cestu přes adresář kontaktu a průnik dvou adresářů. Jde o různé typy publika.
- Určit, která služba nebo zařízení zná vazbu autor–příspěvek–konverzace a kdo může tuto vazbu rekonstruovat.
- Zvolit mechanismus párování kontaktů; nepovažovat hashování samo o sobě za anonymizaci nebo PSI.
- Definovat přístup moderátorů, hlášení, blokace a omezení zneužití bez automatického odhalování profilů protistranám.
- Určit rozsah údajů zobrazovaných při odhalení a pravidla pro čekající či odvolané souhlasy.
- Provést právní a bezpečnostní posouzení před sběrem adresářů.

## Návaznost na dřívější návrhy

Tento dokument zpřesňuje produktovou logiku v ../02-kontaktni-dosah.md. Dříve navržená omezení, například vyloučení přímých kontaktů pro necertifikované příjemce, nejsou tímto dokumentem schválena jako požadavek vlastníka. Jejich přijetí zůstává otevřeným rozhodnutím.

Výzkumná východiska a limity jsou v research-review.md ve stejné složce.
