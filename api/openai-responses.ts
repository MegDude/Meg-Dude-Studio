const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';

export default async function handler(req: any, res: any) {
  const apiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;

  if (req.method === 'GET') {
    res.status(200).json({
      configured: Boolean(apiKey),
      provider: 'openai',
      model: process.env.OPENAI_IMAGE_MODEL || process.env.VITE_OPENAI_IMAGE_MODEL || 'gpt-5.5',
      missing: apiKey ? [] : ['OPENAI_API_KEY'],
    });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  if (!apiKey) {
    res.status(503).json({
      error: 'OPENAI_API_KEY is not configured.',
      code: 'OPENAI_API_KEY_MISSING',
      missing: ['OPENAI_API_KEY'],
    });
    return;
  }

  try {
    const requestBody = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const model = requestBody.model || process.env.OPENAI_IMAGE_MODEL || process.env.VITE_OPENAI_IMAGE_MODEL || 'gpt-5.5';

    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...requestBody,
        model,
      }),
    });

    const text = await response.text();
    res.status(response.status).setHeader('Content-Type', 'application/json');
    res.send(text);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'OpenAI request failed.' });
  }
}
