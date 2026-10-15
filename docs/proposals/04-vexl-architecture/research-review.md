# Vexl: upravený architektonický rozbor

Datum: 2026-10-15
Status: výzkumný podklad, nikoliv bezpečnostní audit nebo schválený smluvní rozsah.

## Použitelné principy

Vexl ve vlastním technickém vysvětlení popisuje oddělení profilů, kontaktů, nabídek a chatových interakcí do samostatných služeb a jejich propojení na klientovi. Uvádí také, že společný kontakt umožňující objevení nabídky nemusí sám Vexl používat. Jde o popis poskytovaný samotným projektem, nikoliv o nezávislou bezpečnostní garanci. [S1]

Pro Libertin je inspirací minimalizace informací dostupných jednotlivým službám, oddělení kontaktního grafu od obsahu a konverzace bez zpřístupnění profilů. Konkrétní implementace vyžaduje vlastní návrh a posouzení.

## Opravy původního podkladu

| Původní tvrzení | Korekce |
|---|---|
| Nepropojené mikroslužby jsou decentralizované. | Oddělení služeb a dat samo nezajišťuje nezávislé provozovatele ani decentralizované řízení. |
| Ani úplný administrátorský přístup neumožní korelaci. | Je nutné posoudit identifikátory, klíče, síťová metadata, logy, časování a možnost změnit provozovaný kód. Absolutní odolnost není doložena. |
| Získaný sociální graf je bezcenný. | Chybějící vazba na nabídky a chaty nesnižuje citlivost samotných vztahů mezi telefonními čísly na nulu. |
| Izolace služeb poskytuje stejné soukromí jako PSI. | Izolace je architektonické opatření. PSI je kryptografický protokol s definovaným bezpečnostním modelem. Nelze je bez důkazu zaměňovat. [S2] |
| PSI vždy skryje velikost adresáře. | Záleží na protokolu. Běžné modely mohou velikosti množin odhalovat. [S2] |
| Matematické PSI je pro mobilní použití neúměrně pomalé. | Výkon závisí na protokolu, velikosti množin, předzpracování a přijatelných únicích. Mobilní proveditelnost konkrétního návrhu je nutné změřit. [S3] |

HMAC není asymetrické šifrování a PBKDF2 není druhé zašifrování. Hashované telefonní identifikátory ani oddělené databáze samy nezakládají tvrzení o zero-knowledge.

## VEXL Nova GIS

Byl nalezen web používající označení VEXL Ecosystem pro GIS. Vztah k bitcoinové aplikaci Vexl nebyl ověřen a bezpečnostní stránku se při rešerši nepodařilo načíst. Shodný název nestačí k zařazení do stejné rodiny produktů. Tvrzení o egyptské legislativě, RAM enklávách a air-gapped nasazení se proto nepřebírají jako fakta o Vexlu. [S4]

## Licence

Repozitář vexl-it/vexl uvádí GPL-3.0. Studium principů a samostatná implementace se liší od převzetí konkrétního kódu. Před kopírováním komponent nebo kryptografické implementace posoudit licenční povinnosti. [S5]

## Limity a otevřené ověření

- Tato revize není úplným auditem Vexlu, Signalu ani Session.
- Absolutní tvrzení o anonymitě, Sybil odolnosti a bezpečnosti při úplné kompromitaci se nepřebírají.
- Původní srovnání technologických stacků a výkonu vyžaduje ověření vůči konkrétním verzím.
- Kontaktní vazba je signál relevance, nikoliv záruka důvěryhodnosti.

## Zdroje použité při revizi

- [S1] Vexl Team: Understanding Vexl: Security, Privacy, and Building a Web of Trust. https://vexl.it/post/understanding-vexl-security-privacy-and-building-a-web-of-trust
- [S2] Private Set Intersection: Are Garbled Circuits Better than Custom Protocols? https://www.cs.umd.edu/~jkatz/papers/psi.pdf
- [S3] A Brief Overview of Private Set Intersection, prezentace hostovaná NIST. https://csrc.nist.gov/CSRC/media/Projects/pec/documents/stppa-02-PSI-rosulek.pdf
- [S4] VEXL GIS: bezpečnostní stránka nalezená ve vyhledávání, obsah ani vztah k Vexlu neověřen. https://vexl-gis.tech/security
- [S5] Vexl app, repozitář a licence. https://github.com/vexl-it/vexl
