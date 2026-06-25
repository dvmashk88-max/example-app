# Antarctic Violet — Project Status

## Audit Report 2026-06-21

### Результаты read-only аудита интеграции Antarctic Wallet SDK

- AWSDK создаётся корректно: один экземпляр за жизненный цикл компонента, cleanup на unmount через `sdk.destroy()`.
- Scope `user.profile.read` используется корректно: соответствует актуальному SDK-идентификатору `AWScopes.USER_PROFILE_READ`.
- APP ID приходит из Railway env `AW_APP_ID` через backend-эндпоинт `/config.json`, hardcode отсутствует.
- Double init отсутствует: в production-сборке React StrictMode не дублирует эффекты; deps `[addLog, appId]` стабильны.
- Старые appId (`dev`, `antarctic-violet`) в source и bundle не найдены.
- Старые scopes (`accounts.read`, `accounts.balances.read`) в source и bundle не найдены.
- Frontend корректно читает `/config.json` по абсолютному пути; backend инжектирует `AW_APP_ID` в ответ.
- Сравнение с официальными примерами (Angular, Vue) не выявило ошибок; React-реализация корректнее оригиналов (абсолютный fetch, env-override вместо хардкода).
- **Баг в коде не найден.**
- **Наиболее вероятная причина ошибки 422** находится на стороне Antarctic Wallet backend или настройках APP ID: SDK делает `postMessage` → wallet shell выполняет `POST /api/v2/sdk/scopes` → backend возвращает 422. Наш код к этому HTTP-вызову прямого отношения не имеет.

### Вопросы для поддержки Antarctic

1. Включён ли scope `user.profile.read` для нашего APP ID? Какие scopes доступны?
2. Добавлен ли origin `https://example-app-production-e00d.up.railway.app` в whitelist для нашего APP ID?
3. Требуется ли статус "approved" / "active" для приложения до того, как SDK session заработает?
4. Что содержит тело 422-ответа — есть ли error code или message?
5. Нужно ли отдельно регистрировать scopes через developer portal?

---

## Итоги сессии 2026-06-20

### Что сделали

- Добавлен тестовый production-путь:
  - https://example-app-production-e00d.up.railway.app/antarctic-violet
- Путь `/antarctic-violet` отдаёт ту же React-витрину Antarctic Violet, что и корневой URL.
- `/antarctic-violet/` канонически редиректит на `/antarctic-violet`, чтобы Vite assets с `base: './'` не запрашивались из вложенного пути.
- Frontend теперь читает config через `/config.json`, а не `./config.json`, чтобы конфиг стабильно открывался с тестового route.
- Commit: `a98aac3` (`Add Antarctic Violet test route`).
- Push в `origin/master` выполнен.
- Railway автодеплой применился после задержки; ручной Railway CLI был недоступен из-за протухшего OAuth token (`railway login` требуется только для CLI-операций).

### Что проверено на production

- `GET /antarctic-violet` -> HTTP 200, `text/html; charset=UTF-8`.
- `GET /config.json` -> HTTP 200:
  - `requiredScopes` = `["user.profile.read"]`;
  - `diagnostics.awAppIdPresent` = `true`;
  - `diagnostics.appIdSource` = `"env"`.
- `GET /health` -> HTTP 200, `{"ok":true}`.
- `GET /api/fazercards/violet-catalog` -> HTTP 200:
  - `ok` = `true`;
  - `matchedIds` содержит 12 товаров:
    - `apple-tr`;
    - `apple-us`;
    - `apple-ru`;
    - `apple-idr`;
    - `roblox-gift-card`;
    - `playstation-gift-card`;
    - `xbox-gift-card`;
    - `steam-top-up`;
    - `pubg`;
    - `free-fire`;
    - `telegram-stars`;
    - `telegram-premium`.

### Локальная проверка перед deploy

- `npm run build` прошёл успешно.
- Локальный production-сервер на `STATIC_DIR=examples/react/dist` проверен:
  - `/antarctic-violet` -> HTTP 200;
  - `/antarctic-violet/` -> HTTP 301 на `/antarctic-violet`;
  - `/config.json` -> HTTP 200;
  - `/health` -> HTTP 200.

## Итоги сессии 2026-06-19

### Что сделали сегодня

- Подняли публичную витрину Antarctic Violet на Railway.
- App URL: https://example-app-production-e00d.up.railway.app/
- App Icon URL: https://example-app-production-e00d.up.railway.app/app-icon.svg
- Убрали старый query `?appId=dev` из App URL в Antarctic Wallet Dev Mode.
- Добавили публичную SVG-иконку приложения.
- FazerCards API подключён к backend.
- Каталог FazerCards `/api/fazercards/violet-catalog` отдаёт HTTP 200.
- Витрина открывается внутри Antarctic Wallet.
- В Railway добавлены переменные `AW_APP_ID`, `AW_API_KEY`, `AW_API_SECRET`.
- Реальный `AW_APP_ID` начал использоваться вместо старых `dev` / `antarctic-violet`.
- Старые appId и старые scopes из deployed bundle убраны.
- `requiredScopes` временно сокращены до одного scope: `user.profile.read`.

### Что проверено

- `/` отдаёт HTTP 200 и открывает React-витрину.
- `/health` отдаёт HTTP 200.
- `/config.json` публично отдаёт:
  - `id` = значение `AW_APP_ID`;
  - `requiredScopes` = `["user.profile.read"]`;
  - `diagnostics.awAppIdPresent` = `true`;
  - `diagnostics.appIdSource` = `"env"`.
- Deployed bundle не содержит:
  - `appId=dev`;
  - `antarctic-violet`;
  - `accounts.read`;
  - `accounts.balances.read`.
- `AWSDK.init()` вызывается один раз за production-загрузку.
- Повторного цикла `sdk.init()` нет.
- React StrictMode не должен давать double-effect в production.
- Был проверен официальный Antarctic example-app: он тоже передаёт `scopes: [...cfg.requiredScopes]` в `new AWSDK(...)`, то есть текущая схема `config.json -> requiredScopes -> AWSDK` корректная.
- Добавлялся тестовый helper для очистки SDK/localStorage/sessionStorage cache и отключался/проверялся `persistSession`, но ошибка не изменилась.

### Текущий блокер

Текущая ошибка внутри Antarctic Wallet:

```text
POST https://app.antarcticwallet.com/api/v2/sdk/scopes -> HTTP 422
```

Диагностика на экране приложения показывает:

- `appId` = реальный `AW_APP_ID`;
- `AW_APP_ID` = found;
- `source` = env;
- `origin` = `https://example-app-production-e00d.up.railway.app`;
- `parent` = `https://app.antarcticwallet.com`;
- `scopes` = `user.profile.read`.

Ранее были промежуточные ошибки:

- 404 на `/api/v2/sdk/session`, когда использовался неправильный appId (`dev` / `antarctic-violet`);
- 429 на `/api/v2/sdk/session`, вероятно после большого количества тестовых попыток;
- после паузы и исправления appId остался стабильный 422 на `/api/v2/sdk/scopes`.

### Текущий вывод

Наиболее вероятная причина блокера: Antarctic Wallet backend не разрешает scope `user.profile.read` для текущего SDK APP ID, либо этот scope/appId/origin ещё не активирован на стороне Antarctic Wallet.

Оценка вероятностей:

- 50% — scope не включён/не разрешён для текущего APP ID;
- 25% — APP ID привязан к старому/другому origin или не обновился в backend Antarctic;
- 15% — Antarctic backend ожидает другой scope identifier;
- 10% — залипшая/битая session/consent после сегодняшних тестов, хотя cache-cleaning уже не помог.

### Поддержка Antarctic

В Telegram-поддержку Antarctic уже отправлено сообщение с описанием проблемы. Поддержка ответила, что передала вопрос техническим специалистам / товарищам, и они свяжутся или дадут ответ.

В поддержку передано:

- APP ID;
- App URL;
- ошибка `/api/v2/sdk/scopes -> 422`;
- scope `user.profile.read`;
- информация, что `config.json` и bundle проверены.

### Что НЕ надо завтра делать первым делом

- Не менять FazerCards.
- Не менять товары, цены и каталог.
- Не делать случайные redeploy без причины.
- Не возвращать `?appId=dev`.
- Не возвращать scopes `accounts.read` и `accounts.balances.read`, пока не решится `user.profile.read`.
- Не менять APP ID без ответа поддержки.

### Что делать завтра / следующий шаг

Сначала прочитать этот файл.

Потом:

1. Проверить, ответила ли поддержка Antarctic.
2. Если поддержка активировала scopes или дала инструкцию — применить её.
3. Если поддержки нет — один раз открыть Antarctic Wallet -> Antarctic Violet и проверить, остался ли 422.
4. Если 422 остался — подготовить повторное сообщение поддержке: "После очистки cache, корректного config.json и минимального scope user.profile.read ошибка /api/v2/sdk/scopes 422 сохраняется."
5. После успешной SDK session:
   - вернуть нужные scopes по одному;
   - проверить доступ к профилю;
   - потом переходить к payment/intents;
   - проверить `AW_API_BASE`, потому что сейчас `/api/intents` отвечает `MISSING_CREDENTIALS` и требует `AW_API_BASE` + `AW_API_KEY` + `AW_API_SECRET`.

### Важная заметка

`AW_API_KEY` и `AW_API_SECRET` сейчас не участвуют в SDK session.

Они понадобятся дальше для backend server-to-server flow:

- `/api/intents`;
- HMAC подпись;
- payments/transfers;
- подтверждение операций.

Сейчас основной блокер — именно SDK session/scopes внутри Antarctic Wallet.

---

## Railway

- **Project:** diligent-vibrancy
- **Service:** example-app
- **GitHub:** подключён
- **Автодеплой:** работает
- **Последний deployment:** SUCCESS
- **Deployment ID:** f2c3fa36-0afd-404c-8dd6-e39ae5778b15

---

## FazerCards

- Подключён через Railway backend
- Переменные окружения:
  - `FAZERCARDS_API_BASE`
  - `FAZERCARDS_API_KEY`

---

## Backend Endpoints

- `GET /api/fazercards/giftcards`
- `GET /api/fazercards/violet-catalog`

---

## Текущая витрина

### Apple
- Apple TR
- Apple US
- Apple RU
- Apple IDR
- Roblox Gift Card
- PlayStation Gift Card
- Xbox Gift Card

### Steam
- Steam Wallet

### Games
- PUBG Mobile
- Free Fire

### Telegram
- Telegram Stars
- Telegram Premium

---

## Удалённые товары

- Roblox Top-Up
- Minecraft

---

## NEXT STEPS

1. Проверка реальных `offer_id` и номиналов через FazerCards API.
2. Сопоставление всех номиналов витрины с реальными офферами.
3. Тестовый заказ без оплаты.
4. Подключение оплаты.
5. Подготовка к модерации Antarctic Apps.

---

## 2026-06-25 — русификация UI и подготовка к модерации

### Что изменено
- Пользовательский интерфейс React-приложения полностью переведён на русский язык.
- Видимое название приложения в UI заменено на `Маркет цифровых товаров`.
- Обновлены пользовательские подписи категорий, товаров, кнопок, статусов, ошибок, placeholder и checkout-блока.
- HTML-документ React-примера получил `lang="ru"` и русский `<title>`.
- Проверено, что новая `icon.svg` попадает в production build.

### Что осталось без изменений
- SDK Antarctic Wallet не изменялся.
- Express backend не изменялся.
- Railway, `nixpacks.toml`, маршруты и deployment-настройки не изменялись.
- `config.json`, `appId`, scopes и env-переменные не изменялись.
- Endpoint, headers, запросы, ответы и структура FazerCards API не изменялись.
- Product IDs, внутренние идентификаторы, номиналы и данные, приходящие из FazerCards, не преобразуются.

### Что проверено
- `npm run build --prefix examples/react` проходит успешно.
- TypeScript/React build ошибок не показывает.
- `examples/react/dist/icon.svg` совпадает с `examples/react/public/icon.svg`.
- Diff запрещённых зон (`config.json`, SDK/package files, backend, Railway/nixpacks) отсутствует.

### Совместимость
- FazerCards API полностью совместим: русификация затрагивает только пользовательский UI вокруг данных.
- SDK Antarctic Wallet не изменялся.

---

## Финальная проверка перед модерацией

### Что проверено
- Локальный production build запущен через Express backend с `STATIC_DIR=examples/react/dist`.
- Маршруты `/`, `/antarctic-violet`, `/config.json`, `/icon.svg` локально отвечают HTTP 200.
- UI проверен визуально через Playwright screenshots на desktop и mobile.
- Новая иконка открывается по `/icon.svg` и `examples/react/dist/icon.svg` совпадает с `examples/react/public/icon.svg`.
- В UI отображается название `Маркет цифровых товаров`.
- Русифицированы пользовательские подписи, кнопки, статусы, placeholder, уведомления и ошибки.
- Каталог FazerCards загружается: endpoint вернул `ok: true`, 12 items и ожидаемые `matchedIds`.
- Карточки товаров, выбор номинала и checkout-блок отображаются корректно.
- `npm run build` проходит успешно без ошибок TypeScript/React.
- Проверен diff запрещённых зон: `config.json`, package files, backend, Railway/nixpacks без изменений.

### Что исправлено
- Исправлены оставшиеся англоязычные диагностические подписи `App ID`/`Origin` в пользовательском интерфейсе.
- Других исправлений не потребовалось.

### Готовность
- Приложение готово к деплою.
- SDK Antarctic Wallet не изменялся.
- Совместимость с FazerCards полностью сохранена: API, endpoint, headers, JSON-структура, product IDs, номиналы и данные поставщика не менялись.
- Приложение готово к отправке на модерацию Antarctic Wallet.
