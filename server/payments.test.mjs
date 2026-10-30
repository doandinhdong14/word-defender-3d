import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { createApp } from './app.mjs';
import { createStore } from './store.mjs';
import { PGlite } from '@electric-sql/pglite';

test('payments router and order fulfillment', async () => {
  const store = await createStore({ database: new PGlite() });
  const env = {
    SESSION_SECRET: 'mock_secret_which_is_at_least_32_characters_long_12345',
    APP_URL: 'http://127.0.0.1:5173',
    PAYOS_CLIENT_ID: 'mock_client_id',
    PAYOS_API_KEY: 'mock_api_key',
    PAYOS_CHECKSUM_KEY: 'mock_checksum_key',
  };

  const mockPayOS = {
    paymentRequests: {
      create: async (data) => ({
        checkoutUrl: `https://pay.payos.vn/web/mock_${data.orderCode}`,
        paymentLinkId: `link_${data.orderCode}`,
      }),
      get: async (orderCode) => ({
        orderCode,
        status: 'PAID',
        amount: 50000,
      }),
    },
    webhooks: {
      verify: async (body) => body.data,
    },
  };

  const app = createApp({ store, env, payOSClient: mockPayOS });
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. Config endpoint
    const configRes = await fetch(`${baseUrl}/api/payments/config`);
    const configData = await configRes.json();
    assert.equal(configData.enabled, true);
    assert.equal(configData.packs.length, 4);
    assert.ok(configData.skins['outfit_hacker']);

    // 2. Checkout without login fails with 401
    const anonRes = await fetch(`${baseUrl}/api/payments/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packageId: 'adventure' }),
    });
    assert.equal(anonRes.status, 401);

    // Register a test player
    const user = await store.registerIdentity({
      id: 'google:test_buyer',
      email: 'buyer@example.com',
      displayName: 'Test Buyer',
      role: 'player',
      status: 'active',
      authProvider: 'google',
    }, true);

    const sessionData = {
      purpose: 'session',
      account: { id: user.id, email: user.email, displayName: user.displayName, authProvider: 'google' },
      sessionVersion: 0,
      expiresAt: Date.now() + 60000,
    };
    const bodyStr = Buffer.from(JSON.stringify(sessionData)).toString('base64url');
    const sig = createHmac('sha256', env.SESSION_SECRET).update(bodyStr).digest('base64url');
    const cookie = `pempom_session=${bodyStr}.${sig}`;

    // 3. Checkout with coin pack succeeds
    const packCheckout = await fetch(`${baseUrl}/api/payments/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie },
      body: JSON.stringify({ packageId: 'adventure' }),
    });
    assert.equal(packCheckout.status, 200);
    const packData = await packCheckout.json();
    assert.ok(packData.checkoutUrl.startsWith('https://pay.payos.vn/web/mock_'));
    assert.ok(packData.orderCode > 0);

    // 4. Query order status -> triggers auto fulfillment from mock PayOS
    const orderCheck = await fetch(`${baseUrl}/api/payments/order/${packData.orderCode}`, {
      headers: { cookie },
    });
    assert.equal(orderCheck.status, 200);
    const orderResult = await orderCheck.json();
    assert.equal(orderResult.status, 'PAID');
    assert.equal(orderResult.coins, 550);
    assert.equal(orderResult.fulfilled, true);

    // 5. Verify user received 550 coins
    const updatedUser = await store.user('google:test_buyer');
    assert.equal(updatedUser.wallet.balance, 550);

    // 6. Buying skin directly
    const skinCheckout = await fetch(`${baseUrl}/api/payments/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie },
      body: JSON.stringify({ skinId: 'outfit_hacker' }),
    });
    assert.equal(skinCheckout.status, 200);
    const skinData = await skinCheckout.json();

    // Fulfill skin order
    await fetch(`${baseUrl}/api/payments/order/${skinData.orderCode}`, { headers: { cookie } });
    const userAfterSkin = await store.user('google:test_buyer');
    assert.ok(userAfterSkin.inventory.ownedItemIds.includes('outfit_hacker'));

    // 7. Sync endpoint returns wallet and inventory
    const syncRes = await fetch(`${baseUrl}/api/payments/sync`, { headers: { cookie } });
    assert.equal(syncRes.status, 200);
    const syncData = await syncRes.json();
    assert.equal(syncData.wallet.balance, 550);
    assert.ok(syncData.inventory.ownedItemIds.includes('outfit_hacker'));
  } finally {
    server.close();
    await store.close();
  }
});
