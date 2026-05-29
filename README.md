# ⭐ Stjernejakt Mobil

En enkel mobilside for å holde styr på **Stjernejakt** ute på golfbanen.
Velg handicap og utslag, tast inn slag for hvert av de tre hullene mens
barna spiller, og samle bronse-, sølv- og gullstjerner som lagres på tvers
av økter.

**Åpne på mobilen:** https://kopnoob.github.io/stjernejakt/

> Lag en snarvei på hjemskjermen (Del → «Legg til på Hjem-skjerm») så føles
> det som en app.

---

## Slik spiller du

1. Legg til barna som spillere — velg en figur og farge, og skriv fornavn/kallenavn.
2. Hver spiller har en **reise**: start på 10 m og jobb deg utover. Trykk «Spill»
   på neste utslag for å starte en runde.
3. For hvert av de tre hullene: bruk **+ / −** for å sette antall slag, eller
   **Plukk opp** (✕) hvis hullet ikke ble fullført.
4. Trykk **Lagre** — barnet får sin egen feiring med stjerne, lyd og konfetti.
   Klarer du gull på alle sju utslag, rykker du ned til et hardere handicap.

**Stjerneregler (som original Stjernejakt):**

- 1 hull i mål → 🥉 bronse
- 2 hull i mål → 🥈 sølv
- 3 hull i mål → 🥇 gull
- I tillegg: gull hvis totalt antall slag ≤ 3 × handicap (men ikke hvis et hull
  ble plukket opp)

Et hull teller bare som «i mål» hvis ballen nådde ringen **innen** handicap-slag.
Du kan også se en **historikk** per spiller og dele et **diplom** med fremgangen.

---

## Datalagring

Appen er **offline-først**: alt lagres umiddelbart lokalt på enheten, så
den fungerer selv med dårlig dekning på banen. Når Supabase er satt opp,
synkroniseres dataene til skyen slik at stjerner bevares på tvers av enheter
og økter.

### Sette opp Supabase (valgfritt, men anbefalt)

1. Lag et gratis prosjekt på [supabase.com](https://supabase.com).
2. Åpne **SQL Editor** → kjør innholdet i [`supabase/schema.sql`](supabase/schema.sql).
3. Gå til **Project Settings → API** og kopier *Project URL* og *anon public key*.
4. **Lokalt:** lag en `.env` (kopi av `.env.example`) med:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
5. **For den publiserte siden:** legg inn de samme to verdiene som
   repo-secrets i GitHub (**Settings → Secrets and variables → Actions →
   New repository secret**): `VITE_SUPABASE_URL` og `VITE_SUPABASE_ANON_KEY`.
   Kjør så workflowen på nytt (**Actions → Deploy → Run workflow**).

Uten Supabase fungerer alt fint — da lagres data kun lokalt i nettleseren.

**Sikkerhet (RLS):** datamodellen er *insert-only* — rader endres aldri, og
sletting er en lokal tombstone på enheten. Derfor tillater
[`schema.sql`](supabase/schema.sql) kun **lesing + innsetting** for anon-nøkkelen
(ingen update/delete), selv om nøkkelen er offentlig i dette åpne repoet.

**Rydde testdata:** kjør [`supabase/cleanup-testdata.sql`](supabase/cleanup-testdata.sql)
i SQL Editor for å fjerne test-spillere.

---

## Utvikling

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # bygger til dist/
```

## Deploy

Hvert push til `main` bygges og publiseres automatisk til GitHub Pages
via [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).
Aktiver Pages én gang under **Settings → Pages → Source: GitHub Actions**.

---

## Teknisk

- **React + TypeScript + Vite** — bygger til statiske filer
- **PWA** (vite-plugin-pwa): installerbar, offline-skall via service worker
- **Self-hostede fonter** (@fontsource: Fredoka + Inter) — ingen Google-kall
- **Supabase** for skylagring (med localStorage som offline-cache/fallback)
- Ingen ekstern UI-ramme — håndlaget CSS med varm, mobil-først stil
- Bygd som et lett supplement til den fulle simulator-appen `golf-coach-r50`
