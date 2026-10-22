# Fake Live AI — sikker Gemini-oppsett

Gemini-nøkkelen skal aldri legges i HTML, JavaScript, GitHub-filer eller nettleserlagring.

## Sett opp

1. Gå til Vercel og importer `123IdkGames456/ikirumi-stuff` som et prosjekt.
2. I prosjektets Settings → Environment Variables, legg til:
   - `GEMINI_API_KEY` = din NYE Gemini API-nøkkel
   - `GEMINI_MODEL` = `gemini-2.5-flash` (valgfritt; bruk en modell-ID som kontoen din støtter)
3. Velg prosjektets rot som Root Directory, og deploy.
4. Åpne `/fake-live-ai/` på Vercel. API-kall går via `/api/chat`.

GitHub Pages kjører bare statiske filer og kan ikke kjøre `api/chat.js`. Derfor vil Gemini-delen ikke fungere på GitHub Pages alene; deploy prosjektet på Vercel eller en annen host som støtter serverless-funksjoner.

## Sikkerhet

- Nøkkelen som allerede ble limt inn i en chat bør tilbakekalles og erstattes.
- Ikke commit den nye nøkkelen, heller ikke kryptert eller delt opp i flere variabler i klientkode.
- For offentlig bruk bør du også sette opp rate limiting og eventuelt autentisering for API-ruten, slik at fremmede ikke kan bruke kvoten din.