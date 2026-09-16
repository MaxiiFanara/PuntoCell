// Chequeo del módulo de pagos. Sin framework: node:assert y un main() que
// corta en el primer error. Correr con:
//   docker compose exec api node scripts/check-pagos.mjs
import assert from 'node:assert/strict';
import { crearMercadoPagoClient } from '../src/modules/pagos/mercadopago.client.js';

const casos = [];
const test = (nombre, fn) => casos.push([nombre, fn]);

// --- mercadopago.client.js ---

test('crearPreferencia manda el token y devuelve el init_point', async () => {
  let recibido = null;
  const fetchFalso = async (url, opciones) => {
    recibido = { url, opciones };
    return {
      ok: true,
      status: 200,
      json: async () => ({ id: 'pref-1', init_point: 'https://mp/checkout/pref-1' }),
    };
  };

  const client = crearMercadoPagoClient({ accessToken: 'TEST-abc', fetchImpl: fetchFalso });
  const pref = await client.crearPreferencia({ items: [] });

  assert.equal(pref.init_point, 'https://mp/checkout/pref-1');
  assert.equal(recibido.url, 'https://api.mercadopago.com/checkout/preferences');
  assert.equal(recibido.opciones.method, 'POST');
  assert.equal(recibido.opciones.headers.Authorization, 'Bearer TEST-abc');
});

test('crearPreferencia tira error con el detalle que devuelve MP', async () => {
  const fetchFalso = async () => ({
    ok: false,
    status: 400,
    json: async () => ({ message: 'invalid unit_price' }),
  });

  const client = crearMercadoPagoClient({ accessToken: 'TEST-abc', fetchImpl: fetchFalso });
  await assert.rejects(
    () => client.crearPreferencia({ items: [] }),
    /invalid unit_price/
  );
});

test('obtenerPago devuelve null cuando MP responde 404', async () => {
  const fetchFalso = async () => ({ ok: false, status: 404, json: async () => ({}) });
  const client = crearMercadoPagoClient({ accessToken: 'TEST-abc', fetchImpl: fetchFalso });
  assert.equal(await client.obtenerPago('999'), null);
});

test('obtenerPago pega al endpoint de pagos con el id', async () => {
  let urlRecibida = null;
  const fetchFalso = async (url) => {
    urlRecibida = url;
    return { ok: true, status: 200, json: async () => ({ id: 123, status: 'approved' }) };
  };
  const client = crearMercadoPagoClient({ accessToken: 'TEST-abc', fetchImpl: fetchFalso });
  const pago = await client.obtenerPago('123');

  assert.equal(urlRecibida, 'https://api.mercadopago.com/v1/payments/123');
  assert.equal(pago.status, 'approved');
});

// --- runner ---

const main = async () => {
  for (const [nombre, fn] of casos) {
    try {
      await fn();
      console.log(`  ok  ${nombre}`);
    } catch (err) {
      console.error(`FALLA  ${nombre}`);
      console.error(err);
      process.exit(1);
    }
  }
  console.log(`\n${casos.length} chequeos pasaron`);
};

main();
