const CATALOG_URL = process.env.VIOLET_CATALOG_URL || '';
const ANTARCTIC_USDT_RATE_RUB = 77.95;
const APP_STORE_MARKUP_RATE = 0.5;
const CHECK_RU_PURCHASE_PRICES = [
  { nominal: 600, purchasePriceUsd: 16.97 },
  { nominal: 700, purchasePriceUsd: 19.80 },
  { nominal: 800, purchasePriceUsd: 22.62 },
  { nominal: 900, purchasePriceUsd: 25.45 },
  { nominal: 1000, purchasePriceUsd: 30.72 },
  { nominal: 1500, purchasePriceUsd: 42.42 },
];
const APP_STORE_PRODUCT_IDS = ['apple-tr', 'apple-us', 'apple-ru', 'apple-in'];

function roundStorePriceUsdt(priceUsdt) {
  const ceilToTenth = (value) => Number((Math.ceil((value - Number.EPSILON) * 10) / 10).toFixed(2));
  if (priceUsdt < 1) return Math.max(0.5, ceilToTenth(priceUsdt));
  if (priceUsdt < 10) return ceilToTenth(priceUsdt);
  return Math.ceil(priceUsdt - Number.EPSILON);
}

function expectedAppStorePrice(purchasePriceUsd) {
  return roundStorePriceUsdt(purchasePriceUsd * (1 + APP_STORE_MARKUP_RATE));
}

console.log('Apple RU expected prices from FazerCards purchase price with APP_STORE_MARKUP_RATE=0.50');
for (const { nominal, purchasePriceUsd } of CHECK_RU_PURCHASE_PRICES) {
  console.log(`${nominal} RUB @ ${purchasePriceUsd.toFixed(2)} USD -> ${expectedAppStorePrice(purchasePriceUsd)} USDT`);
}

if (CATALOG_URL) {
  const response = await fetch(CATALOG_URL, { headers: { Accept: 'application/json' } });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`Catalog HTTP ${response.status}: ${JSON.stringify(payload)}`);
  }

  console.log(`Catalog URL: ${CATALOG_URL}`);
  for (const productId of APP_STORE_PRODUCT_IDS) {
    const product = payload.items?.find((item) => item.productId === productId);
    if (!product) throw new Error(`${productId} is missing from catalog`);
    if (!Array.isArray(product.offers) || product.offers.length === 0) {
      throw new Error(`${productId} has no offers`);
    }

    for (const offer of product.offers) {
      const purchasePriceUsd = Number(offer.rawPriceUsd);
      if (!Number.isFinite(purchasePriceUsd) || purchasePriceUsd <= 0) {
        throw new Error(`${productId} ${offer.nominal} ${offer.currency} has invalid rawPriceUsd: ${offer.rawPriceUsd}`);
      }

      const expected = expectedAppStorePrice(purchasePriceUsd);
      if (offer.priceUsdt !== expected) {
        throw new Error(
          `${productId} ${offer.nominal} ${offer.currency} expected ${expected} USDT from rawPriceUsd ${offer.rawPriceUsd}, got ${offer.priceUsdt}`,
        );
      }
    }

    console.log(`${productId}: ${product.offers.length} offers match rawPriceUsd * 1.50`);
  }

  const appleRu = payload.items.find((item) => item.productId === 'apple-ru');
  for (const { nominal } of CHECK_RU_PURCHASE_PRICES) {
    const offer = appleRu.offers.find((item) => item.nominal === nominal);
    if (!offer) {
      console.log(`Apple RU ${nominal} RUB catalog -> not in current FazerCards offers`);
      continue;
    }
    console.log(`Apple RU ${nominal} RUB @ ${Number(offer.rawPriceUsd).toFixed(2)} USD catalog -> ${offer.priceUsdt} USDT`);
  }
}
