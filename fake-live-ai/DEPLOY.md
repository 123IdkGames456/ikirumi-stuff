# Fake Live AI — GitHub Pages

Denne versjonen fungerer som en statisk GitHub Pages-side. Den sender forespørsler direkte fra nettleseren til Gemini.

## Publisering

1. Gå til repository-innstillingene på GitHub.
2. Åpne **Pages** under **Code and automation**.
3. Velg publisering fra `main`-branchen" (vanligvis root eller den mappen du bruker til nettstedet).
4. Åpne `fake-live-ai/` på den publiserte nettsiden.
5. På siden limer du inn din egen Gemini API-nøkkel og trykker **Lagre i denne økten**. Standardmodell er `gemini-2.5-flash`; endre modellnavnet dersom du har tilgang til en annen støttet modell.

## Viktig om nøkkelen

GitHub Pages har ikke server-side funksjoner, så direkte Gemini-kall fra nettleseren er ikke en sikker måte å dele din private API-nøkkel på. Nøkkelen legges ikke i repository-koden og lagres bare midlertidig i nettleserøkten, men den kan fortsatt bli synlig i nettleseren/nettverkstrafikken mens den brukes. Bruk dette kun med en egen nøkkel du har begrenset og følger med på. Ikke legg nøkkelen inn i HTML eller GitHub.

Hvis du vil at andre skal kunne bruke en offentlig side uten å se eller bruke din nøkkel, trenger du en separat backend/proxy. GitHub Pages alene kan ikke holde en Gemini-nøkkel hemmelig.

Hvis en nøkkel tidligere ble delt i en chat eller lagt inn i offentlig kode, tilbakekall den og lag en ny.