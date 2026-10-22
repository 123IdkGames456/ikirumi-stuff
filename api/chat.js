export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Server mangler GEMINI_API_KEY. Legg nøkkelen inn som en server environment variable." });
  }

  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  if (!message) return res.status(400).json({ error: "Skriv et spørsmål først." });
  if (message.length > 8000) return res.status(413).json({ error: "Spørsmålet er for langt." });

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  try {
    const upstream = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/" +
        encodeURIComponent(model) +
        ":generateContent?key=" +
        encodeURIComponent(apiKey),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{
              text: "Du er en underholdende norsk AI-medvert på en fiktiv livestream. Svar på norsk bokmål, naturlig og ganske kort (1–4 setninger). Chatten har både hyggelige seere og småfrekk/troll-aktige kommentarer. Svar humoristisk og sett grenser uten å bli grusom, diskriminerende eller truende. Ikke påstå at seertall, likes eller følgere er ekte."
            }]
          },
          contents: [{ role: "user", parts: [{ text: message }] }],
          generationConfig: { temperature: 0.9, maxOutputTokens: 350 }
        })
      }
    );

    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      return res.status(upstream.status >= 400 && upstream.status < 600 ? upstream.status : 502)
        .json({ error: data.error?.message || "Gemini-forespørselen mislyktes." });
    }

    const answer = (data.candidates || [])
      .flatMap(candidate => candidate.content?.parts || [])
      .map(part => part.text || "")
      .join("\n")
      .trim();

    if (!answer) return res.status(502).json({ error: "Gemini returnerte ikke noe tekstsvar." });
    return res.status(200).json({ answer });
  } catch {
    return res.status(502).json({ error: "Kunne ikke kontakte Gemini. Prøv igjen." });
  }
}