import dotenv from 'dotenv';
dotenv.config();

/**
 * Call the configured LLM API (Gemini, Zhipu GLM/OpenAI-compatible, or Anthropic Claude)
 * @param {string} prompt - User request or message
 * @param {string} systemInstruction - Optional system/role prompt
 * @returns {Promise<string|null>} - Generated response, or null if no key is configured
 */
export const callLLM = async (prompt, systemInstruction = '') => {
  const { GEMINI_API_KEY, OPENAI_API_KEY, OPENAI_API_BASE, ANTHROPIC_API_KEY, AI_MODEL } = process.env;

  if (GEMINI_API_KEY) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemInstruction ? `${systemInstruction}\n\nUser Message: ${prompt}` : prompt }] }]
        })
      });
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
      const response = await fetch(`${baseUrl}/chat/completions`, {
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
          ...(baseUrl.includes('bigmodel.cn') ? { thinking: { type: 'disabled' } } : {})
        })
      });
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
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          model: AI_MODEL || 'claude-3-5-sonnet-20241022',
          max_tokens: 1024,
          system: systemInstruction,
          messages: [{ role: 'user', content: prompt }]
        })
      });
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
