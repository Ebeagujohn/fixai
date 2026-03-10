export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages, system } = req.body;
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  const contents = messages.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: typeof msg.content === 'string'
      ? [{ text: msg.content }]
      : msg.content.map(part => {
          if (part.type === 'text') return { text: part.text };
          if (part.type === 'image') return { inlineData: { mimeType: part.source.media_type, data: part.source.data } };
          return { text: '' };
        })
  }));

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: system }] },
          contents,
          generationConfig: { maxOutputTokens: 1000 }
        })
      }
    );
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json(data);
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, could not process that.';
    return res.status(200).json({ reply });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
