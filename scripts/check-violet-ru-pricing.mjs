const CATALOG_URL = process.env.VIOLET_CATALOG_URL || '';
const ANTARCTIC_USDT_RATE_RUB = 77.95;
const APP_STORE_RU_MARKUP_RATE = 0.6;
const CHECK_NOMINALS = [500, 1000, 2500, 5000];

function roundStorePriceUsdt(priceUsdt) {
  const ceilToTenth = (value) => Number((Math.ceil((value - Number.EPSILON) * 10) / 10).toFixed(2));
  if (priceUsdt < 1) return Math.max(0.5, ceilToTenth(priceUsdt));
  if (priceUsdt < 10) return ceilToTenth(priceUsdt);
  return Math.ceil(priceUsdt - Number.EPSILON);
}

function expectedRuPrice(nominal) {
  const baseRub = nominal;
  const baseUsdt = baseRub / ANTARCTIC_USDT_RATE_RUB;
  return roundStorePriceUsdt(baseUsdt * (1 + APP_STORE_RU_MARKUP_RATE));
}

console.log('Apple RU expected prices with APP_STORE_RU_MARKUP_RATE=0.60');
for (const nominal of CHECK_NOMINALS) {
  console.log(`${nominal} RUB -> ${expectedRuPrice(nominal)} USDT`);
}

if (CATALOG_URL) {
  const response = await fetch(CATALOG_URL, { headers: { Accept: 'application/json' } });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`Catalog HTTP ${response.status}: ${JSON.stringify(payload)}`);
  }

  const appleRu = payload.items?.find((item) => item.productId === 'apple-ru');
  if (!appleRu) throw new Error('apple-ru is missing from catalog');

  console.log(`Catalog URL: ${CATALOG_URL}`);
  for (const nominal of CHECK_NOMINALS) {
    const offer = appleRu.offers?.find((item) => item.nominal === nominal);
    const expected = expectedRuPrice(nominal);
    const actual = offer?.priceUsdt;
    if (!offer) {
      console.log(`${nominal} RUB catalog -> not in current FazerCards offers; formula price would be ${expected} USDT`);
      continue;
    }
    console.log(`${nominal} RUB catalog -> ${actual} USDT`);
    if (actual !== expected) {
      throw new Error(`${nominal} RUB expected ${expected} USDT, got ${actual}`);
    }
  }
}
