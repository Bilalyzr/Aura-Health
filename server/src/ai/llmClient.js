import dotenv from 'dotenv';
dotenv.config();

/**
 * Reusable fetch wrapper with a configurable timeout
 * @param {string} url 
 * @param {object} options 
 * @param {number} timeoutMs 
 */
const fetchWithTimeout = async (url, options, timeoutMs = 15000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timer);
    return response;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
};

export const callLLM = async (prompt, systemInstruction = '') => {
  const { GEMINI_API_KEY, OPENAI_API_KEY, OPENAI_API_BASE, ANTHROPIC_API_KEY, AI_MODEL } = process.env;

  if (GEMINI_API_KEY) {
    try {
      const response = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemInstruction ? `${systemInstruction}\n\nUser Message: ${prompt}` : prompt }] }],
          generationConfig: { maxOutputTokens: 200, temperature: 0.6 }
        })
      }, 15000);
      if (response.ok) {
        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      }
      console.error(`Gemini API returned status ${response.status}: ${response.statusText}`);
    } catch (err) {
      console.error('Error calling Gemini API:', err);
    }
  }

  if (OPENAI_API_KEY) {
    try {
      const baseUrl = OPENAI_API_BASE || 'https://api.openai.com/v1';
      const model = AI_MODEL || (baseUrl.includes('openai.com') ? 'gpt-4o-mini' : 'glm-4');
      const response = await fetchWithTimeout(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model,
          messages: [
            ...(systemInstruction ? [{ role: 'system', content: systemInstruction }] : []),
            { role: 'user', content: prompt }
          ],
          max_tokens: 200,
          temperature: 0.6,
          ...(baseUrl.includes('bigmodel.cn') ? { thinking: { type: 'disabled' } } : {})
        })
      }, 15000);
      if (response.ok) {
        const data = await response.json();
        return data.choices?.[0]?.message?.content || '';
      }
      const errorText = await response.text();
      console.error(`OpenAI-compatible API returned status ${response.status}: ${response.statusText}. Body: ${errorText}`);
    } catch (err) {
      console.error('Error calling OpenAI-compatible API:', err);
    }
  }

  if (ANTHROPIC_API_KEY) {
    try {
      const response = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          model: AI_MODEL || 'claude-3-5-sonnet-20241022',
          max_tokens: 200,
          system: systemInstruction,
          messages: [{ role: 'user', content: prompt }]
        })
      }, 15000);
      if (response.ok) {
        const data = await response.json();
        return data.content?.[0]?.text || '';
      }
      console.error(`Anthropic API returned status ${response.status}: ${response.statusText}`);
    } catch (err) {
      console.error('Error calling Anthropic API:', err);
    }
  }

  return null;
};

/**
 * Streaming LLM call. Invokes onToken(deltaText) as chunks arrive.
 * Returns the full accumulated text, or null if no streaming provider is
 * configured / the request fails (caller should fall back to callLLM or rules).
 * @param {string} prompt
 * @param {string} systemInstruction
 * @param {(delta: string) => void} onToken
 */
export const callLLMStream = async (prompt, systemInstruction = '', onToken = () => {}) => {
  const { OPENAI_API_KEY, OPENAI_API_BASE, AI_MODEL } = process.env;

  // Only the OpenAI-compatible provider is wired for streaming (the active one).
  if (!OPENAI_API_KEY) return null;

  const baseUrl = OPENAI_API_BASE || 'https://api.openai.com/v1';
  const model = AI_MODEL || (baseUrl.includes('openai.com') ? 'gpt-4o-mini' : 'glm-4');

  try {
    // fetchWithTimeout clears its timer once response headers arrive, so the
    // body can stream freely afterwards without being aborted mid-response.
    const response = await fetchWithTimeout(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model,
        stream: true,
        max_tokens: 200,
        temperature: 0.6,
        messages: [
          ...(systemInstruction ? [{ role: 'system', content: systemInstruction }] : []),
          { role: 'user', content: prompt }
        ],
        ...(baseUrl.includes('bigmodel.cn') ? { thinking: { type: 'disabled' } } : {})
      })
    }, 15000);

    if (!response.ok || !response.body) {
      const errorText = response.body ? await response.text() : '';
      console.error(`Streaming API returned status ${response.status}: ${response.statusText}. Body: ${errorText}`);
      return null;
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let full = '';

    for await (const chunk of response.body) {
      buffer += decoder.decode(chunk, { stream: true });

      // Parse complete SSE lines; keep any trailing partial line in the buffer.
      let nlIndex;
      while ((nlIndex = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, nlIndex).trim();
        buffer = buffer.slice(nlIndex + 1);
        if (!line.startsWith('data:')) continue;

        const payload = line.slice(5).trim();
        if (payload === '[DONE]') continue;

        try {
          const json = JSON.parse(payload);
          const delta = json.choices?.[0]?.delta?.content || '';
          if (delta) {
            full += delta;
            onToken(delta);
          }
        } catch {
          // Ignore keep-alive / non-JSON lines.
        }
      }
    }

    return full || null;
  } catch (err) {
    console.error('Error streaming from OpenAI-compatible API:', err);
    return null;
  }
};
