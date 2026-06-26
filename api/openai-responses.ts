const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const TEXT_TOKEN_LIMIT = 220;
const IMAGE_TOKEN_LIMIT = 1200;

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
    const tools = Array.isArray(requestBody.tools) ? requestBody.tools : [];
    const usesImageGeneration = tools.some((tool: any) => tool?.type === 'image_generation');
    const upstreamBody = {
      ...requestBody,
      model,
      store: requestBody.store ?? false,
      reasoning: requestBody.reasoning ?? { effort: 'minimal' },
      text: requestBody.text ?? { verbosity: 'low' },
      max_output_tokens: Math.min(
        requestBody.max_output_tokens ?? (usesImageGeneration ? IMAGE_TOKEN_LIMIT : TEXT_TOKEN_LIMIT),
        usesImageGeneration ? IMAGE_TOKEN_LIMIT : TEXT_TOKEN_LIMIT
      ),
    };

    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(upstreamBody),
    });

    const text = await response.text();
    res.status(response.status).setHeader('Content-Type', 'application/json');
    res.send(text);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'OpenAI request failed.' });
  }
}
