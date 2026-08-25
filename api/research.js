export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query, mode, length } = req.body || {};
    let apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'Server configuration error: GEMINI_API_KEY environment variable is missing in Vercel settings.' });
    }

    // Sanitize the key (removes any accidental spaces, quotes, or newlines)
    apiKey = apiKey.trim().replace(/^["']|["']$/g, '');

    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ error: 'A valid research query is required.' });
    }

    let systemPrompt = "";
    if (mode === "summary") {
      systemPrompt = "You are a professional research assistant. Provide an accurate, comprehensive, and well-structured factual summary answering the user's question. Format your response using clean Markdown. At the very end of your response under a heading '### Sources & References', list credible websites, domain references, or data repositories used to derive these answers.";
    } else {
      const lengthGuides = {
        short: "around 300-500 words",
        medium: "around 600-900 words",
        long: "around 1000-1500 words"
      };
      systemPrompt = `You are an expert academic essayist and researcher. Write a comprehensive, well-structured essay answering the user's question. The desired length is ${lengthGuides[length] || 'around 600 words'}. Include an introduction, deep body paragraphs, and a clear conclusion. Format with professional Markdown headings. At the very end of your essay under a heading '### Sources & References', list the credible academic sources, organizations, or websites that support these findings.`;
    }

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    const apiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: query.trim() }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: { temperature: 0.3 }
      })
    });

    const data = await apiResponse.json();

    if (!apiResponse.ok) {
      const errMsg = data.error?.message || `Gemini API returned status ${apiResponse.status}`;
      return res.status(apiResponse.status).json({ error: errMsg });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return res.status(500).json({ error: "Gemini API returned a successful status but an empty text payload." });
    }

    return res.status(200).json({ text });

  } catch (error) {
    return res.status(500).json({ error: `Server exception: ${error.message}` });
  }
}
