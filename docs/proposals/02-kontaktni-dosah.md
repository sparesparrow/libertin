# Kontaktní dosah příspěvků (návrh funkce)

Status: **Návrh**. V repozitáři neexistuje telefonní identita ani import kontaktů.

## Princip

Příspěvek na Zeď nebo do Marketplace může autor doručit lidem z okruhu svých telefonních kontaktů. Kontaktní vazba je signál relevance, ne záruka důvěryhodnosti.

## Tři publika

| Publika | Co vidí | Co může |
|---|---|---|
| Přátelé na Libertinu | autora, profil, celý inzerát | reagovat pod jménem |
| Certifikovaný člen mimo přátele, v okruhu | inzerát bez jména autora | reagovat s utajenou identitou, odhalit se po souhlasu obou |
| Nečlen s ověřeným číslem, v okruhu | inzerát bez jména autora, omezený rozsah | reagovat s utajenou identitou, odhalit se po certifikaci a souhlasu |

Termín „anonymní“ nepoužívat. Provozovatel zná totožnost vždy. Vhodnější je „inzerát bez jména autora“.

## Stupně propojení

1. Jeden z dvojice má druhého v telefonu.
2. Kontakt jednoho z dvojice má druhého v telefonu.
3. Druhý má v kontaktech někoho, kdo je v kontaktech kontaktu prvního.

První verze: pouze stupně 1 a 2. Zobrazuje se hrubý stupeň, nikdy cesta ani počet prostředníků.

## Ochranná opatření

- Rozšíření mimo přátele se zapíná u každého příspěvku zvlášť, výchozí volba je jen přátelé.
- Před odesláním se ukáže počet potenciálních příjemců a upozornění, že mezi nimi mohou být nečlenové.
- Nečlenům se nezobrazuje stupeň 1.
- Minimální velikost okruhu, při malém počtu jen varianta pro přátele.
- Nečlen nevidí fotografie, přesnou polohu, jedinečné formulace. Denní limit a potvrzení věku 18+.
- Odhalení vyžaduje certifikované účty obou stran a souhlas obou. Před potvrzením se ukáže, co se zobrazí.
- Hlášení a blokace bez odhalení identity, pravidla pro přístup moderátora k totožnosti.
- Denní limity pro příspěvky a reakce s utajeným autorem.

## Technické poznámky

- HMAC je klíčovaný kód, PBKDF2 je odvození klíče, ne šifrování. Hash telefonního čísla je pseudonymizace, ne anonymizace.
- Uložené hrany a „okamžité smazání nečlenů“ se vylučují: pro vazby přes nečlena je nutné něco uchovat nebo použít jiný protokol soukromého porovnání.
- Kontaktní služba má být oddělená od profilu, zdi a zpráv.

## Právní otevřené body

- Právní titul ke zpracování čísel osob v adresáři (čl. 6, 14 GDPR).
- Údaje o sexuálním životě (čl. 9) a potřeba posouzení vlivu (DPIA).
- Krátké uložení a pseudonymizace nejsou automatická výjimka z GDPR.
- App Store: pravidla 1.1.4, 1.2 a 5.1.x, jiné zacházení s organickým doručením a placenou reklamou.
