# Publikování balíčků a image

> Stav: **E11-T8 hotovo** (workflow existují a jejich logika je ověřená lokálně),
> **E10-T8 review** (image workflow neběžel — v prostředí není Docker daemon).
> Požadavky smlouvy: **C4** (komponenty jako image), **C8** (předání externímu
> provozovateli), navazuje na **C11.1**.
> Rozhodnutí **D-008** (do jakého registru patří npm balíčky) je **otevřené** —
> viz [Kam se publikuje](#kam-se-publikuje).

Soubory, které tento dokument popisuje:

| Soubor | Účel |
|---|---|
| `../.github/workflows/release.yml` | vydání z tagu `vX.Y.Z` — ověření, `pnpm pack`, npm registry (volitelně), GitHub Release |
| `../.github/workflows/publish-image.yml` | image webu do GHCR + build-only kontrola na PR |
| `../.github/workflows/ci.yml` (stupeň `pack`) | hlídá publikovatelnou plochu na každém PR |

## Co se publikuje

Čtyři sdílené balíčky. `apps/web` a `apps/mobile` mají `"private": true`, takže
se do registru nedostanou ani omylem — a CI to na každém PR kontroluje.

| Balíček | Obsah |
|---|---|
| `@libertin/theme` | design tokens — `tokens.css` (web), `native.ts` (RN) |
| `@libertin/i18n` | i18next setup + `locales.json` (cs/en) |
| `@libertin/api` | typovaný klient proti snapshotu + MSW mocky |
| `@libertin/ui` | sdílené komponenty, web i native varianty |

### Balíčky vydáváme jako TypeScript zdroj, ne jako `dist`

Není to opomenutí. `apps/web` konzumuje balíčky přes
`transpilePackages: ['@libertin/ui', '@libertin/theme', '@libertin/i18n', '@libertin/api']`
v `next.config.mjs`, mobil přes Metro. Uvnitř monorepa se tedy **dnes nic
nebuilduje** a `main` míří rovnou na `.ts`. Publikovat zdroj znamená, že
publikovaný balíček je přesně to, co si repozitář sám ověřuje.

**Důsledek, který je potřeba říct nahlas:** konzument, který si zdroj
netranspiluje (čistý `node`, `tsc` bez `allowJs`/bundleru), takový balíček
nepoužije. Pro dnešní konzumenty — `apps/web`, `apps/mobile` a případný další
klient objednatele stavěný na Next/Expo — to omezení není. Až se objeví
konzument mimo tuhle množinu, přibude build do `dist` a `publishConfig` přepne
`main`/`types` na něj; `turbo.json` s tím počítá (`outputs` už obsahuje
`dist/**`). Do té doby by build vrstva byla kód, který nikdo nespotřebuje.

Co se do tarballu **nesmí** dostat, hlídá pole `files` a k tomu dvě kontroly
v CI: testy (`*.test.tsx`), stories (`*.stories.tsx`) a `src/vitest.d.ts`.
Ten poslední importuje `@testing-library/jest-dom/vitest` — devDependency, která
se s balíčkem neinstaluje, takže publikovaný `vitest.d.ts` by konzumentovi
rozbil `tsc`.

## Jak se vydává verze

Verze jsou **napříč workspace jednotné** a tag je zdroj pravdy. Workflow
odmítne vydat cokoliv, kde se manifest a tag neshodnou — publikovaná verze,
kterou nikdo nedohledá v gitu, je horší než spadlý release.

```bash
# 1. sjednotit verzi ve všech čtyřech balíčcích
pnpm -r --filter './packages/*' exec npm version 0.1.0 --no-git-tag-version

# 2. commitnout a otagovat
git commit -am "chore: release 0.1.0"
git tag v0.1.0
git push origin main --tags
```

Tag `v0.1.0` spustí `release.yml`:

| Stupeň | Co dělá | Selže když |
|---|---|---|
| `verify` | verze z tagu vs. manifesty, publikovatelná množina, `type-check` + `test:all` + `build` | manifest má jinou verzi, přibyl nečekaně publikovatelný balíček, nebo neprojde brána |
| `pack` | `pnpm pack` každého balíčku + kontrola obsahu tarballu | v tarballu je test/story/`vitest`, nebo přežil specifikátor `workspace:` |
| `publish-npm` | `pnpm publish -r` | jen když je nastavený `NPM_TOKEN` — viz níže |
| `github-release` | připne tarbally k GitHub Release | — |

**Proč `verify` znovu pouští celou bránu:** `ci.yml` se spouští na
`push: branches:`, a push tagu **nesedí na žádnou branch** — otagování commitu
tedy samo o sobě CI nespustí. Bez tohohle stupně by šlo vydat kód, který nikdy
neprošel buildem.

`concurrency` má u release záměrně `cancel-in-progress: false`. Zrušený běh
uprostřed publikace nechá část balíčků vydanou a část ne; čekající druhý běh je
menší zlo.

## Kam se publikuje

**Registr pro npm balíčky je otevřené rozhodnutí objednatele — D-008.** Dokud
není, tag vyrobí kompletní GitHub Release s tarbally a registr se přeskočí
(bez `NPM_TOKEN` se stupeň `publish-npm` neselže, jen oznámí, že se přeskočil).
Ruční běh, který si publikaci výslovně vyžádá, naopak spadne — o mlčení
nestojíme tam, kde někdo řekl „publikuj“.

Podstatné a snadno přehlédnutelné omezení, kvůli kterému rozhodnutí vůbec
vzniklo: **GitHub Packages tyhle balíčky přijmout nemůže.** Jeho npm registr
vyžaduje, aby se scope rovnal vlastníkovi repozitáře — tedy `@sparesparrow/*`.
Naše balíčky jsou `@libertin/*` a přejmenování by sáhlo do každého importu
v repozitáři i do `CLAUDE.md`. Zbývají dvě cesty a obě chce potvrdit objednatel:

1. **npmjs.com, organizace `libertin`** — scope sedí beze změny. `publishConfig`
   má schválně `"access": "restricted"`, aby se interní komponenty adult
   platformy nevystavily veřejně omylem; restricted balíčky ale na npmjs
   vyžadují placenou organizaci.
2. **Vlastní privátní registr** (Verdaccio on-premise, blíž k **C2**). Změna je
   pak čistě v manifestech — do každého `publishConfig` přibude `registry` —
   a workflow se nemění.

Až rozhodnutí padne, stačí do repozitáře přidat secret `NPM_TOKEN`.

## Image webu

`publish-image.yml` staví `apps/web/Dockerfile` a publikuje do GHCR. Na rozdíl
od npm větve **nepotřebuje žádný nastavený secret** — `GITHUB_TOKEN` má na
`ghcr.io/<owner>/<repo>` právo zápisu. Je to tedy publikační cesta, která
funguje dnes.

| Spouštěč | Tagy | Publikuje? |
|---|---|---|
| tag `v1.2.3` | `1.2.3`, `1.2`, `latest`, `sha-<sha>` | ano |
| push do `main` | `edge`, `sha-<sha>` | ano |
| pull request (dotčené cesty) | — | **ne**, jen ověří, že se image pořád postaví |

`docker-compose.yml` už obě proměnné čte:

```bash
WEB_IMAGE=ghcr.io/sparesparrow/libertin/web WEB_TAG=v0.1.0 docker compose up -d
```

Pro provoz pinuj `sha-<sha>` nebo digest, ne `latest` a už vůbec ne `edge`.

**Caveat, na kterém záleží při předání (C8):** `NEXT_PUBLIC_SITE_URL` se
zapéká do klientského bundlu v době buildu, takže **image je vázaný na jeden
host**. Výchozí hodnota je `https://libertin.cz`. Jiné prostředí (staging,
on-premise instance objednatele) potřebuje **vlastní build** s vlastním
`--build-arg`, ne jen jinou runtime proměnnou. Ruční běh workflow proto má
`site_url` jako vstup.

Image se staví pro `linux/amd64`. `arm64` jde zapnout jen u ručního běhu —
běží pod emulací a `next build` v ní trvá násobně déle.

K image se připojuje **provenance a SBOM** (`provenance: mode=max`,
`sbom: true`). Externí provozovatel se tak nemusí ptát nás, co je uvnitř.

## Kontrola na každém PR

Stupeň `pack` v `ci.yml` je levná pojistka: chyba v balení je totiž tichá —
`type-check`, `test` ani `build` si stráženého testovacího souboru v `files`
ani appky, která ztratila `"private": true`, nevšimnou. A na registru se špatný
tarball opravit nedá, jen přepublikovat vyšší verzí.

```bash
# totéž lokálně, bez sítě a bez tokenu
pnpm publish -r --filter './packages/*' --dry-run --no-git-checks
```

## Co ověřené není

Stejná hranice jako u `docs/ci.md` a `docs/ansible.md` — říkáme rovnou, co
jsme nespustili.

| Neověřeno | Proč |
|---|---|
| **Běh workflow na runneru** | Z vývojového prostředí GitHub Actions spustit nejde. Ověřený je YAML (parsuje se) a shell logika všech kontrol, spuštěná lokálně proti skutečnému workspace — včetně negativního testu, že kontrola tarballu podstrčený testovací soubor opravdu najde. `actionlint` tu k dispozici není. |
| **Build image** | V kontejneru neběží Docker daemon (`/var/run/docker.sock` neexistuje). Dockerfile sám se tímhle úkolem neměnil a E10-T1 ho ověřilo skutečným buildem; nové je jen to, že ho staví workflow. První skutečný důkaz přijde z prvního PR, který sáhne na `apps/web/**`. |
| **Publikace do registru** | Nikam se zatím nepublikovalo — čeká na D-008. `--dry-run` proběhl a hlásí `restricted access`, což je zamýšlený stav. |
| **GHCR push** | Nikdy neproběhl; ověří ho až první push do `main` po zmergování. |

## Diskrétnost

Publikované balíčky obsahují `locales.json` — tedy veškerou uživatelskou copy —
a komponenty. Žádná členská data, žádné klíče; MSW mocky obsahují jen ukázková
data ze snapshotu. Přesto: **`"access": "restricted"` je výchozí schválně.**
Veřejně publikovaný `@libertin/ui` vystaví návrh a texty adult platformy pod
jménem objednatele dřív, než to kdokoliv schválí. Zveřejnění je rozhodnutí
objednatele, ne výchozí stav.
