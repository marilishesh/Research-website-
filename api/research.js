export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query, mode, length } = req.body || {};
    let apiKey = process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'Server configuration error: API key is missing in Vercel settings.' });
    }

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

    // Call Groq API (Fast, Free, and reliable)
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: query.trim() }
        ],
        temperature: 0.3
      })
    });

    const data = await groqResponse.json();

    if (!groqResponse.ok) {
      const errMsg = data.error?.message || `Groq API returned status ${groqResponse.status}`;
      return res.status(groqResponse.status).json({ error: errMsg });
    }

    const text = data.choices?.[0]?.message?.content;

    if (!text) {
      return res.status(500).json({ error: "Groq API returned an empty text payload." });
    }

    return res.status(200).json({ text });

  } catch (error) {
    return res.status(500).json({ error: `Server exception: ${error.message}` });
  }
}
