import { GoogleGenAI } from '@google/genai';

const asText = (content) => {
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
        return content.map((part) => typeof part?.text === 'string' ? part.text : '').join('');
    }
    if (Array.isArray(content?.parts)) return asText(content.parts);
    return '';
};

const toMessages = ({ contents, config = {} }) => {
    const messages = [];
    const systemInstruction = asText(config.systemInstruction);
    if (systemInstruction) messages.push({ role: 'system', content: systemInstruction });

    const entries = Array.isArray(contents) ? contents : [{ role: 'user', parts: [{ text: asText(contents) }] }];
    for (const entry of entries) {
        const role = entry?.role === 'model' || entry?.role === 'assistant' ? 'assistant' : 'user';
        const content = asText(entry?.parts || entry?.content || entry);
        if (content) messages.push({ role, content });
    }
    return messages;
};

const createFreeLlmClient = ({ apiKey, baseUrl, timeoutMs, fetchImpl }) => ({
    models: {
        generateContent: async (request) => {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), timeoutMs);
            try {
                const { config = {} } = request;
                const response = await fetchImpl(`${baseUrl.replace(/\/+$/, '')}/chat/completions`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        model: request.model,
                        messages: toMessages(request),
                        max_tokens: config.maxOutputTokens,
                        temperature: config.temperature,
                        ...(config.responseMimeType === 'application/json'
                            ? { response_format: { type: 'json_object' } }
                            : {}),
                    }),
                    signal: controller.signal,
                });
                const data = await response.json().catch(() => ({}));
                if (!response.ok) {
                    const error = new Error(data.error?.message || `FreeLLMAPI returned HTTP ${response.status}.`);
                    error.status = response.status;
                    throw error;
                }
                return {
                    text: data.choices?.[0]?.message?.content || '',
                    finishReason: data.choices?.[0]?.finish_reason || null,
                    usageMetadata: {
                        promptTokenCount: data.usage?.prompt_tokens || 0,
                        candidatesTokenCount: data.usage?.completion_tokens || 0,
                    },
                };
            } finally {
                clearTimeout(timeout);
            }
        },
    },
});

export const createAIProvider = ({
    provider,
    apiKey,
    model,
    baseUrl,
    timeoutMs = 60_000,
    fetchImpl = globalThis.fetch,
}) => {
    if (provider === 'gemini') {
        return {
            client: apiKey
                ? new GoogleGenAI({
                    apiKey,
                    httpOptions: {
                        timeout: timeoutMs,
                        retryOptions: { attempts: 1 },
                    },
                })
                : null,
            model,
            supportsWebSearch: true,
        };
    }
    if (provider === 'freellmapi') {
        return {
            client: apiKey ? createFreeLlmClient({ apiKey, baseUrl, timeoutMs, fetchImpl }) : null,
            model,
            supportsWebSearch: false,
        };
    }
    throw new Error(`Unsupported AI_PROVIDER "${provider}". Choose "gemini" or "freellmapi".`);
};
