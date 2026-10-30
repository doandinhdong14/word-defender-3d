import express from 'express';
import { PayOS } from '@payos/node';
import { ApiError } from './permissions.mjs';

export const COIN_PACKS = [
  { id: 'pocket', coins: 200, price: 20000, name: 'Túi Xu Khởi Đầu', bonus: 'Đủ mua 1 skin Classic' },
  { id: 'adventure', coins: 550, price: 50000, name: 'Túi Xu Chiến Binh', popular: true, bonus: '+50 xu tặng thêm' },
  { id: 'treasure', coins: 1200, price: 100000, name: 'Rương Kho Báu', bonus: '+200 xu tặng thêm' },
  { id: 'vip', coins: 2600, price: 200000, name: 'Đại Gia Pempom VIP', bonus: '+600 xu tặng thêm' },
];

export const SKIN_CATALOG = {
  outfit_ninja: { title: 'Ninja Outfit', priceCoins: 220, priceVnd: 20000 },
  outfit_ghost: { title: 'Blanket Ghost', priceCoins: 240, priceVnd: 20000 },
  outfit_samurai: { title: 'Samurai Armor', priceCoins: 250, priceVnd: 25000 },
  outfit_builder: { title: 'Kỹ Sư Công Trường', priceCoins: 260, priceVnd: 25000 },
  outfit_halloween: { title: 'Bí Ngô Ma Quái', priceCoins: 280, priceVnd: 29000 },
  outfit_basketball: { title: 'Cầu Thủ Bóng Rổ #30', priceCoins: 280, priceVnd: 29000 },
  outfit_soccer: { title: 'Siêu Sao Bóng Đá #7', priceCoins: 280, priceVnd: 29000 },
  outfit_gladiator: { title: 'Đấu Sĩ La Mã', priceCoins: 290, priceVnd: 29000 },
  outfit_dino: { title: 'Chiến Binh Khủng Long', priceCoins: 300, priceVnd: 35000 },
  outfit_banana_cat: { title: 'Mèo Chuối Siêu Quậy', priceCoins: 300, priceVnd: 35000 },
  outfit_teddy_bear: { title: 'Gấu Bông Chắp Vá', priceCoins: 300, priceVnd: 35000 },
  outfit_football: { title: 'Cầu Thủ Số 10', priceCoins: 310, priceVnd: 35000 },
  outfit_shinobi: { title: 'Nhẫn Giả Bạch Y', priceCoins: 310, priceVnd: 35000 },
  outfit_boba_rabbit: { title: 'Thỏ Trà Sữa Trân Châu', priceCoins: 320, priceVnd: 39000 },
  outfit_hunter: { title: 'Thợ Săn Tiền Sử', priceCoins: 320, priceVnd: 39000 },
  outfit_musician: { title: 'Nhạc Trưởng Quý Tộc', priceCoins: 320, priceVnd: 39000 },
  outfit_coral: { title: 'Nữ Hoàng San Hô', priceCoins: 330, priceVnd: 45000 },
  outfit_hacker: { title: 'Hacker Cyberpunk', priceCoins: 340, priceVnd: 49000 },
};

function removeDiacritics(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
}

export function paymentsRouter({ store, authenticate, origin, env = process.env, payOSClient } = {}) {
  const router = express.Router();

  const isConfigured = Boolean(
    env.PAYOS_CLIENT_ID && env.PAYOS_API_KEY && env.PAYOS_CHECKSUM_KEY
  );

  const payOS = payOSClient || (isConfigured
    ? new PayOS({
        clientId: env.PAYOS_CLIENT_ID,
        apiKey: env.PAYOS_API_KEY,
        checksumKey: env.PAYOS_CHECKSUM_KEY,
      })
    : null);

  router.use(express.json({ limit: '2mb' }));

  // 1. Get payment configuration and catalog prices
  router.get('/config', (_req, res) => {
    res.json({
      enabled: Boolean(payOS),
      packs: COIN_PACKS,
      skins: SKIN_CATALOG,
    });
  });

  // 2. Sync server wallet & inventory to client
  router.get('/sync', async (req, res, next) => {
    try {
      const actor = await authenticate(req);
      if (!actor) throw new ApiError(401, 'Vui lòng đăng nhập.');
      const user = await store.user(actor.id);
      res.json({
        wallet: user?.wallet || null,
        inventory: user?.inventory || null,
      });
    } catch (err) {
      next(err);
    }
  });

  // 3. Create checkout payment link
  router.post('/checkout', async (req, res, next) => {
    try {
      if (!payOS) throw new ApiError(503, 'Cổng thanh toán payOS chưa được kích hoạt trên máy chủ.');

      const actor = await authenticate(req);
      if (!actor) throw new ApiError(401, 'Vui lòng đăng nhập tài khoản trước khi thanh toán.');

      const { packageId, skinId } = req.body || {};
      if (!packageId && !skinId) {
        throw new ApiError(400, 'Thiếu thông tin gói xu hoặc skin cần mua.');
      }

      let amount = 0;
      let coins = 0;
      let type = 'pack';
      let targetId = '';
      let itemName = '';
      let rawDesc = '';

      if (packageId) {
        const pack = COIN_PACKS.find(p => p.id === packageId);
        if (!pack) throw new ApiError(400, 'Gói xu không hợp lệ.');
        amount = pack.price;
        coins = pack.coins;
        type = 'pack';
        targetId = pack.id;
        itemName = pack.name;
        rawDesc = `Nap ${pack.coins} xu`;
      } else if (skinId) {
        const skin = SKIN_CATALOG[skinId];
        if (!skin) throw new ApiError(400, 'Skin không tồn tại trong cửa hàng.');
        amount = skin.priceVnd;
        coins = 0;
        type = 'skin';
        targetId = skinId;
        itemName = skin.title;
        rawDesc = `Skin ${removeDiacritics(skin.title).replace(/[^a-zA-Z0-9 ]/g, '')}`;
      }

      // Safe integer orderCode (9 digits)
      const orderCode = Number(`${Date.now().toString().slice(-6)}${Math.floor(100 + Math.random() * 900)}`);
      const description = rawDesc.slice(0, 25);
      const appOrigin = origin || 'http://127.0.0.1:5173';
      const returnUrl = `${appOrigin}/account?payment=success&orderCode=${orderCode}`;
      const cancelUrl = `${appOrigin}/account?payment=cancelled&orderCode=${orderCode}`;

      const paymentData = {
        orderCode,
        amount,
        description,
        returnUrl,
        cancelUrl,
        items: [
          {
            name: itemName.slice(0, 40),
            quantity: 1,
            price: amount,
          },
        ],
      };

      const result = await payOS.paymentRequests.create(paymentData);

      await store.saveOrder({
        orderCode,
        userId: actor.id,
        type,
        targetId,
        amount,
        coins,
        status: 'PENDING',
        checkoutUrl: result.checkoutUrl,
        paymentLinkId: result.paymentLinkId,
      });

      res.json({
        checkoutUrl: result.checkoutUrl,
        orderCode,
      });
    } catch (err) {
      next(err);
    }
  });

  // 4. Check order status & auto-fulfill if paid
  router.get('/order/:orderCode', async (req, res, next) => {
    try {
      const orderCode = Number(req.params.orderCode);
      if (!orderCode || isNaN(orderCode)) throw new ApiError(400, 'Mã đơn hàng không hợp lệ.');

      const order = await store.order(orderCode);
      if (!order) throw new ApiError(404, 'Không tìm thấy đơn hàng.');

      if (order.status === 'PAID') {
        return res.json({
          status: 'PAID',
          type: order.type,
          targetId: order.targetId,
          coins: order.coins,
          amount: order.amount,
          fulfilled: true,
        });
      }

      if (payOS) {
        try {
          const payosData = await payOS.paymentRequests.get(orderCode);
          if (payosData.status === 'PAID') {
            const { user } = await store.fulfillOrder(orderCode, payosData);
            return res.json({
              status: 'PAID',
              type: order.type,
              targetId: order.targetId,
              coins: order.coins,
              amount: order.amount,
              fulfilled: true,
              userWallet: user?.wallet,
              userInventory: user?.inventory,
            });
          }
          return res.json({
            status: payosData.status,
            orderCode,
            type: order.type,
            targetId: order.targetId,
          });
        } catch {
          // If PayOS query fails or pending
        }
      }

      res.json({
        status: order.status,
        orderCode,
        type: order.type,
        targetId: order.targetId,
      });
    } catch (err) {
      next(err);
    }
  });

  // 5. PayOS webhook endpoint
  router.post('/webhook', async (req, res) => {
    if (!payOS) {
      return res.status(503).json({ error: 'payos_not_configured' });
    }
    try {
      const webhookData = await payOS.webhooks.verify(req.body);
      if (webhookData && (webhookData.code === '00' || webhookData.desc === 'success')) {
        const orderCode = Number(webhookData.orderCode);
        if (orderCode) {
          await store.fulfillOrder(orderCode, webhookData);
        }
      }
      res.json({ success: true });
    } catch (err) {
      console.error('PayOS webhook verification error:', err.message);
      res.status(400).json({ error: 'invalid_webhook_signature' });
    }
  });

  return router;
}
