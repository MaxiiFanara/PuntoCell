import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildModelCandidates,
  buildAttemptModels,
  isGuaranteedFreeModel,
  isConversationalModel,
  looksLikeClassifierOutput,
  requestOpenRouterCompletion,
} from '../src/core/utils/openrouter-chat.js';

test('solo considera gratis los slugs :free y el router gratuito', () => {
  assert.equal(isGuaranteedFreeModel('google/modelo:free'), true);
  assert.equal(isGuaranteedFreeModel('openrouter/free'), true);
  assert.equal(isGuaranteedFreeModel('google/modelo'), false);
  assert.equal(isGuaranteedFreeModel('openrouter/auto'), false);
});

test('excluye modelos y respuestas de clasificación de seguridad', () => {
  assert.equal(isConversationalModel({ id: 'nvidia/nemotron-content-safety:free' }), false);
  assert.equal(isConversationalModel({ id: 'google/gemma-chat:free' }), true);
  assert.equal(looksLikeClassifierOutput('User Safety: safe'), true);
  assert.equal(looksLikeClassifierOutput('Revisá primero el conector de batería.'), false);
});

test('cada intento respeta el máximo de tres modelos y cambia los directos', () => {
  const candidates = ['a:free', 'b:free', 'c:free', 'd:free', 'openrouter/free'];
  assert.deepEqual(buildAttemptModels(candidates, 0), ['a:free', 'b:free', 'openrouter/free']);
  assert.deepEqual(buildAttemptModels(candidates, 1), ['c:free', 'd:free', 'openrouter/free']);
});

test('la cadena siempre termina en el router gratuito y excluye un modelo pago solicitado', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: false });

  try {
    const candidates = await buildModelCandidates('openai/modelo-pago');
    assert.equal(candidates.includes('openai/modelo-pago'), false);
    assert.equal(candidates.at(-1), 'openrouter/free');
    assert.ok(candidates.every(isGuaranteedFreeModel));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('envía el array de fallback y devuelve el modelo que realmente respondió', async () => {
  const originalFetch = globalThis.fetch;
  let requestBody;
  globalThis.fetch = async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return {
      ok: true,
      json: async () => ({
        model: 'segundo/modelo:free',
        choices: [{ message: { content: 'respuesta lista' } }],
      }),
    };
  };

  try {
    const result = await requestOpenRouterCompletion({
      apiKey: 'test',
      models: ['primero/modelo:free', 'segundo/modelo:free', 'openrouter/free'],
      prompt: 'consulta',
      systemPrompt: 'reglas',
      timeoutMs: 1000,
    });
    assert.deepEqual(requestBody.models, ['primero/modelo:free', 'segundo/modelo:free', 'openrouter/free']);
    assert.equal(requestBody.provider.allow_fallbacks, true);
    assert.deepEqual(requestBody.reasoning, { exclude: true });
    assert.equal(result.modelo, 'segundo/modelo:free');
    assert.equal(result.respuesta, 'respuesta lista');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('un modelo retirado permite continuar con el siguiente lote', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: false,
    status: 400,
    json: async () => ({ error: { message: 'old/model:free is not a valid model ID' } }),
  });

  try {
    await assert.rejects(
      requestOpenRouterCompletion({
        apiKey: 'test',
        models: ['old/model:free', 'openrouter/free'],
        prompt: 'consulta',
        systemPrompt: 'reglas',
        timeoutMs: 1000,
      }),
      (error) => error.statusCode === 400 && error.retryable === true,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('rechaza una respuesta cortada por límite para permitir la rotación', async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      model: 'modelo-cortado:free',
      choices: [{ finish_reason: 'length', message: { content: 'Respuesta incompleta...' } }]
    })
  });

  try {
    await assert.rejects(
      requestOpenRouterCompletion({
        apiKey: 'test',
        models: ['modelo-cortado:free', 'openrouter/free'],
        prompt: 'consulta',
        systemPrompt: 'sistema',
        timeoutMs: 1000,
        maxTokens: 20
      }),
      (error) => error.retryable === true && error.model === 'modelo-cortado:free'
    );
  } finally {
    global.fetch = originalFetch;
  }
});
