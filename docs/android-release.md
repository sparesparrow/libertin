# Android: sestavení a vydání do Google Play

Status: návrh implementace. Workflow ani konfigurace nebyly spuštěny. První běh CI pravděpodobně vyžádá úpravy, hlavně kvůli pnpm a Gradle (viz Rizika).

## Co CI dělá

| Job | Kdy | Co |
|---|---|---|
| verify | PR, tag, ručně | type-check mobilní aplikace a závislostí, testy `apps/mobile` |
| debug-apk | PR, ručně | `expo prebuild` + `assembleDebug`, APK jako artefakt, bez tajemství |
| release | tag `android-vX.Y.Z` nebo ručně z `main` | podepsané AAB, kontrola podpisu, nahrání do Google Play (`draft`) |

Nativní projekt `apps/mobile/android/` se negeneruje do gitu, vzniká v CI přes `expo prebuild`. Release nikdy nenahrává na track `production`; povyšování dělá člověk v Play Console.

## Jednorázová příprava

1. **Application id.** Výchozí je `cz.libertin.app` (`apps/mobile/app.config.ts`). Po prvním nahrání se nedá změnit, rozhodnutí patří vlastníkovi. Jiné id nastav v repo variable `ANDROID_PACKAGE` a změň i výchozí hodnotu v `app.config.ts` a ve workflow.
2. **Upload keystore.** `keytool -genkeypair -v -storetype PKCS12 -keystore upload.keystore -alias libertin-upload -keyalg RSA -keysize 2048 -validity 10000`. Soubor nikdy necommituj. `base64 -w0 upload.keystore` dá hodnotu pro secret.
3. **Secrets v environment `play-release`:** `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`, `PLAY_SERVICE_ACCOUNT_JSON`. Environment nastav s povinným schválením.
4. **Variables:** `ANDROID_UPLOAD_CERT_SHA256` (otisk z `keytool -list -v`, workflow podle něj ověří podpis), `ANDROID_VERSION_CODE_OFFSET` (viz níže), volitelně `ANDROID_PACKAGE`.
5. **Play Console.** Vytvoř aplikaci, zapni Play App Signing (ztráta upload klíče je pak řešitelná) a **první verzi nahraj ručně** na interní testování. API upload nové aplikace bez prvního ručního vydání neprojde.
6. **Servisní účet.** V Google Cloud zapni Google Play Android Developer API, vytvoř servisní účet a JSON klíč. V Play Console ho pozvi do Users and permissions s právem vydávat tuto aplikaci.
7. **versionCode** je `github.run_number + ANDROID_VERSION_CODE_OFFSET`. Offset nastav nad nejvyšší ručně nahraný versionCode, jinak Play nahrání odmítne.

## Vydání

- Tag: `git tag android-v0.1.0 && git push origin android-v0.1.0`. Název tagu určí `versionName`.
- Ručně: Actions, Android, Run workflow, `release=true`, track `internal`, `alpha` nebo `beta`. Funguje jen z `main`.

## Lokální reprodukce

```bash
pnpm install --frozen-lockfile --config.node-linker=hoisted
pnpm --filter @libertin/mobile exec expo prebuild --platform android --no-install --clean
cd apps/mobile/android && ./gradlew assembleDebug
```

Hoisted instalace změní rozložení `node_modules`. Pro běžnou práci spusť pak znovu obyčejný `pnpm install`.

## Rizika a co není hotové

- **Neověřeno.** Nic z toho nebylo spuštěno. Největší riziko je React Native Gradle v pnpm monorepu (`shamefully-hoist=false`) a záplata podpisu `plugins/patchBuildGradle.js`, která závisí na šabloně Expo SDK 52. Při neshodě spadne build, nepodepí se tiše debug klíčem.
- **Backend.** Aplikace míří na `https://api.libertin.cz/v1` a backend je podle backlogu blokován rozhodnutím D-003. Ověřit, zda release build nespouští MSW mocky, před nahráním komukoli mimo tým.
- **Pravidla Google Play.** Aplikace se sexuální tematikou a seznamovací funkce podléhají pravidlům obchodu. Před veřejným vydáním je potřeba politika soukromí, formulář bezpečnosti dat, hodnocení obsahu a cílová skupina.
- **Chybí:** ikona a adaptivní ikona, snímky obrazovky a popis aplikace, iOS, ekvivalent pro GitLab CI (D-002). Oprávnění ke kontaktům je zablokované, dokud funkce kontaktního dosahu není schválený rozsah.
- **Akce r0adkll/upload-google-play@v1** je připnutá na značku. Pro přínos pin na commit SHA.
