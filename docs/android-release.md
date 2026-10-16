# Android: sestavení, preview a release safety

Status: implementováno v GitHub Actions; **Google Play publikace je záměrně zablokovaná**.  
Poslední aktualizace: 2026-10-17.

## Co workflow dělá

| Job | Kdy | Co |
|---|---|---|
| `verify` | PR, release build | frozen-lockfile install, mobile dependency type-check, mobile Vitest |
| `preview-apk` | PR | release-mode APK s vloženým JS bundlem, explicitní mock režim, package `cz.libertin.preview.run<RUN>.attempt<ATTEMPT>`, jednorázový CI podpis |
| `release-aab` | tag `android-vX.Y.Z` nebo ručně z `main` | pouze podepsaný AAB artefakt; live režim vyžaduje explicitní ověřený API base a production package |
| `publish-play` | pouze ručně z `main` s `publish=true` | samostatný chráněný Play krok; dnes vždy skončí na eligibility gate a nic neodešle |

Preview není debug build. Workflow spouští `assembleRelease` a následně ověří, že APK obsahuje `assets/index.android.bundle`, má package id `cz.libertin.preview.run<RUN>.attempt<ATTEMPT>` a je podepsané disposable certifikátem `Libertin Preview`. Každý run/attempt dostane unikátní package, protože podpisový klíč se pokaždé mění; starší testovací instalace a její data tak zůstanou nedotčené. Nemá tedy potřebovat Metro na `localhost:8081`.

Preview je záměrně **mock-backed demo**. `EXPO_PUBLIC_NETWORK_MODE=mock` je nastavené explicitně. Release AAB je naopak `live` a build se zastaví, pokud není nakonfigurován `LIBERTIN_API_BASE_URL`; žádný odhadovaný backend se nepoužije jako fallback.

## Runtime konfigurace

Mobil rozlišuje dva režimy:

- `mock` — lokální MSW kontrakt pro demo/preview;
- `live` — vyžaduje `EXPO_PUBLIC_API_BASE_URL` jako validní HTTPS URL bez credentials, query nebo fragmentu.

`EXPO_PUBLIC_*` hodnoty jsou součástí JS bundle. **Nikdy do nich nepatří hesla, cookies, bearer tokeny, CSRF tokeny ani jiné secrets.**

Dokud není bezpečně zopakován autentizovaný live audit, `docs/live-contract-discovery.md` výslovně označuje skutečný auth/feed/profile kontrakt jako neověřený.

## Jednorázová příprava produkčního AAB

Protected environment `play-release` musí mít required reviewers a následující hodnoty:

Secrets:

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`
- `PLAY_SERVICE_ACCOUNT_JSON` — používá ho až samostatný publish krok

Variables:

- `ANDROID_PACKAGE` — bez fallbacku v release jobu; vlastník musí potvrdit finální Play application id
- `ANDROID_UPLOAD_CERT_SHA256`
- `ANDROID_VERSION_CODE_OFFSET`
- `LIBERTIN_API_BASE_URL` — pouze URL potvrzená live-contract auditem

Upload keystore se nesmí commitovat. Play App Signing je doporučené; první Play verze a store konfigurace vyžadují ruční nastavení v Play Console.

## Aktuální Google Play blocker — target SDK

Od **31. 8. 2026** musí nové aplikace a aktualizace pro běžný Android cílit na **Android 16 / API level 36 nebo vyšší**:

- https://developer.android.com/google/play/requirements/target-sdk

Expo SDK 52 používá React Native 0.76 a má `targetSdkVersion 34` (compile SDK 35):

- https://docs.expo.dev/versions/v54.0.0/ (tabulka kompatibility SDK verzí)
- https://expo.dev/changelog/2024-11-12-sdk-52

Proto současný projekt může sestavit AAB, ale **není dnes způsobilý k novému Play submissionu**. `publish-play` obsahuje hard failure před upload akcí. Tuto bránu je možné odstranit až v PR, které:

1. upgraduje Expo/React Native nebo jinak prokazatelně nastaví `targetSdkVersion >= 36` podporovaným způsobem;
2. úspěšně sestaví a otestuje nový native build;
3. znovu ověří Kotlin/Compose kompatibilitu;
4. dokončí níže uvedené Play policy/store požadavky.

## Google Play policy / store readiness

Technický build sám o sobě nestačí. Libertin je social/dating/UGC aplikace pro dospělé a před store submissionem je nutné samostatně ověřit zejména:

- Inappropriate Content / sexual content policy;
- Age-Restricted Content and Functionality a ochranu nezletilých u dating/matchmaking funkcí;
- User Generated Content: moderace, in-app reporting a blokování uživatelů;
- Child Safety Standards pro social/dating aplikace;
- Privacy policy a správný Data safety formulář;
- content rating a další App content declarations;
- store listing, ikony, screenshots a support/privacy URL.

Oficiální zdroje:

- https://support.google.com/googleplay/android-developer/answer/9878810
- https://support.google.com/googleplay/android-developer/answer/9876937
- https://support.google.com/googleplay/android-developer/answer/16838200
- https://support.google.com/googleplay/android-developer/answer/10787469

Současný PR tyto produktové/policy podmínky neprohlašuje za splněné.

## Kotlin / Compose

Expo SDK 52 v tomto repozitáři narazilo na Compose Compiler 1.5.15 vs Kotlin 1.9.24. Plugin `withKotlinVersion` pinuje Kotlin 1.9.25. Předchozí Android CI po tomto pinu úspěšně dokončilo `expo prebuild` a `assembleDebug`; nový standalone preview musí tento výsledek znovu prokázat přes `assembleRelease`.

Pin se nesmí obejít vypnutím compatibility checku. Při budoucím Expo upgradu se má odstranit až po zeleném native buildu.

## Lokální reprodukce preview

Bez produkčních secrets lze reprodukovat princip preview takto (keystore je pouze disposable testovací):

```bash
pnpm install --frozen-lockfile --config.node-linker=hoisted
export EXPO_PUBLIC_NETWORK_MODE=mock
export ANDROID_PACKAGE=cz.libertin.preview
pnpm --filter @libertin/mobile exec expo prebuild --platform android --no-install --clean
# Vytvoř dočasný test keystore a nastav LIBERTIN_UPLOAD_* proměnné.
cd apps/mobile/android
./gradlew assembleRelease --no-daemon --stacktrace
```

Nativní projekt `apps/mobile/android/` je generovaný a necommitovaný.

## Co není ověřeno / hotovo

- Autentizovaný Cypress audit skutečného swingerslife.cz backendu nebylo možné v tomto execution environment bezpečně spustit; viz `docs/live-contract-discovery.md`.
- Reálný native cookie/session nebo bearer adapter proto ještě není implementován — jeho implementace bez capture by byla guesswork.
- Release AAB nebyl v tomto PR spuštěn, protože chráněné production signing secrets nejsou součástí PR jobu.
- GitLab Android runner parity není provedena. `.gitlab-ci.yml` zůstává neexecuted podle D-002; nepředstíráme zelený GitLab build.
- Google Play submission je hard-blocked a tento PR nic do Play neodesílá.
