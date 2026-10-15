# Úvodní obrazovka (koncept)

Status: **Návrh**. Kód je uložený jako `welcome.tsx.draft`, aby se nespouštěl v `pnpm type-check` ani `next build`.

## Logika

- Přátelé vidí autora a profil.
- Okruh kontaktů vidí inzerát bez jména autora.
- Odhalení je možné jen po certifikaci a souhlasu obou stran.

## Před přenosem do `apps/mobile`

1. **Paleta:** koncept používá tmavé pozadí a barvy mint, pink, gold podle vzoru jiné aplikace. Brand Libertinu je podle CLAUDE.md primární `#F20B49`, pozadí `#FAFAF9`, volitelný noční motiv `private`. Barvy převést na existující tokeny, doplnit chybějící do `packages/theme`.
2. **Tokeny:** názvy `surface`, `surfaceAccent`, `mint`, `pink`, `onAccent` jsou odhad, ověřit v `packages/theme`.
3. **Komponenty:** podle konvencí patří diagram a kroky do `packages/ui` s položkou ve Storybooku.
4. **Trasy:** `/auth/register` a `/auth/login` jsou odhad.
5. **Text o soukromí:** nepřidávat tvrzení o šifrovaných otiscích, dokud kontaktní služba neexistuje.
6. **Rozsah:** funkce ještě není v backlogu. Vyžaduje rozhodnutí vlastníka a závisí na D-003.
