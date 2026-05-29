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

1. Legg til barna som spillere.
2. Trykk på en rute i stjerne-matrisen (handicap × utslag) for å starte en runde.
3. For hvert av de tre hullene: trykk antall slag det tok å komme i mål,
   eller **Over** (i mål, men flere slag enn handicap) / **Bom** (kom ikke i mål).
4. Når alle tre hull er registrert, trykk **Lagre**. Stjernen havner i matrisen.

**Stjerneregler (som original Stjernejakt):**

- 1 hull i mål → 🥉 bronse
- 2 hull i mål → 🥈 sølv
- 3 hull i mål → 🥇 gull
- I tillegg: gull hvis totalt antall slag ≤ 3 × handicap

Et hull teller bare som «i mål» hvis ballen nådde ringen **innen** handicap-slag.

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
- **Supabase** for skylagring (med localStorage som offline-cache/fallback)
- Ingen ekstern UI-ramme — håndlaget CSS med varm, mobil-først stil
- Bygd som et lett supplement til den fulle simulator-appen `golf-coach-r50`
