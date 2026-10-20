import test from 'node:test';
import assert from 'node:assert/strict';
import { createAIProvider } from './aiProvider.js';

test('FreeLLMAPI adapter maps Gemini-shaped requests to OpenAI chat completions', async () => {
    let captured;
    const provider = createAIProvider({
        provider: 'freellmapi',
        apiKey: 'test-key',
        model: 'auto',
        baseUrl: 'http://127.0.0.1:31415/v1/',
        fetchImpl: async (url, options) => {
            captured = { url, options, body: JSON.parse(options.body) };
            return new Response(JSON.stringify({
                choices: [{ message: { content: '{"subject":"Hello","body":"Welcome"}' }, finish_reason: 'stop' }],
                usage: { prompt_tokens: 15, completion_tokens: 9 },
            }), { status: 200 });
        },
    });

    const result = await provider.client.models.generateContent({
        model: 'auto',
        contents: [{ role: 'user', parts: [{ text: 'Write an email.' }] }],
        config: {
            systemInstruction: 'Return a useful draft.',
            responseMimeType: 'application/json',
            maxOutputTokens: 300,
            temperature: 0.3,
        },
    });

    assert.equal(captured.url, 'http://127.0.0.1:31415/v1/chat/completions');
    assert.equal(captured.options.headers.Authorization, 'Bearer test-key');
    assert.deepEqual(captured.body.messages, [
        { role: 'system', content: 'Return a useful draft.' },
        { role: 'user', content: 'Write an email.' },
    ]);
    assert.deepEqual(captured.body.response_format, { type: 'json_object' });
    assert.equal(captured.body.max_tokens, 300);
    assert.equal(result.text, '{"subject":"Hello","body":"Welcome"}');
    assert.equal(result.finishReason, 'stop');
    assert.deepEqual(result.usageMetadata, { promptTokenCount: 15, candidatesTokenCount: 9 });
    assert.equal(provider.supportsWebSearch, false);
});

test('FreeLLMAPI adapter reports provider HTTP errors with their status', async () => {
    const provider = createAIProvider({
        provider: 'freellmapi',
        apiKey: 'test-key',
        model: 'auto',
        baseUrl: 'http://127.0.0.1:31415/v1',
        fetchImpl: async () => new Response(JSON.stringify({
            error: { message: 'Invalid API key.' },
        }), { status: 401 }),
    });

    await assert.rejects(
        provider.client.models.generateContent({ model: 'auto', contents: 'hello' }),
        (error) => error.status === 401 && error.message === 'Invalid API key.',
    );
});

test('provider selection preserves Gemini and rejects unknown provider names', () => {
    assert.equal(createAIProvider({
        provider: 'gemini',
        apiKey: '',
        model: 'gemini-3.8-flash',
    }).client, null);
    assert.throws(
        () => createAIProvider({ provider: 'unknown', model: 'x' }),
        /Choose "gemini" or "freellmapi"/,
    );
});
