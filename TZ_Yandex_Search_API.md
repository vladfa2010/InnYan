# ТЗ: Подключение Yandex Search API (базовый поиск, RU-сегмент)

## 1. Общие сведения

| Параметр | Значение |
|----------|----------|
| **Сервис** | Yandex Search API v2 |
| **Endpoint** | `https://searchapi.api.cloud.yandex.net/v2/web/search` |
| **Метод** | `POST` |
| **Авторизация** | `Authorization: Api-Key {API_KEY}` |
| **Content-Type** | `application/json` |
| **Сегмент** | RU (`SEARCH_TYPE_RU`) |
| **Поисковый домен** | `yandex.ru` |

---

## 2. Учетные данные

```
API Key:     YOUR_API_KEY_HERE
Folder ID:   YOUR_FOLDER_ID_HERE
```

### Где получить (если ключ нужно сменить)

1. [aistudio.yandex.ru](https://aistudio.yandex.ru) → войти
2. В правом верхнем углу → **Создать API-ключ** → тип `search-api.webSearch.user`
3. Folder ID: навести на название каталога → кликнуть иконку копирования
4. Стартовый грант: 4000 руб. на первые запросы

---

## 3. Тело запроса (JSON)

```json
{
  "query": {
    "searchType": "SEARCH_TYPE_RU",
    "queryText": "погода москва"
  },
  "folderId": "YOUR_FOLDER_ID_HERE",
  "responseFormat": "FORMAT_XML",
  "page": 0
}
```

### Параметры

| Поле | Тип | Обязательно | Описание |
|------|-----|-------------|----------|
| `query.searchType` | string | Да | `SEARCH_TYPE_RU` — RU-сегмент |
| `query.queryText` | string | Да | Текст запроса, **max 400 символов** |
| `folderId` | string | Да | ID каталога Yandex Cloud |
| `responseFormat` | string | Нет | `FORMAT_XML` (по умолчанию) или `FORMAT_HTML` |
| `page` | number | Нет | Номер страницы, 0-based |

### Все типы поиска (searchType)

| Значение | Домен | Язык |
|----------|-------|------|
| `SEARCH_TYPE_RU` | yandex.ru | Русский |
| `SEARCH_TYPE_COM` | yandex.com | Международный |
| `SEARCH_TYPE_TR` | yandex.tr | Турецкий |
| `SEARCH_TYPE_KK` | yandex.kz | Казахский |
| `SEARCH_TYPE_BE` | yandex.by | Белорусский |
| `SEARCH_TYPE_UZ` | yandex.uz | Узбекский |

---

## 4. Заголовки запроса

```http
POST /v2/web/search HTTP/1.1
Host: searchapi.api.cloud.yandex.net
Content-Type: application/json
Authorization: Api-Key YOUR_API_KEY_HERE

{...тело...}
```

---

## 5. Ответ

### Успех (200 OK)

```json
{
  "rawData": "PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4..."
}
```

`rawData` — Base64-закодированный XML. Декодировать:

```bash
echo "PD94bWwg..." | base64 -d
```

### Структура XML-ответа

```xml
<?xml version="1.0" encoding="utf-8"?>
<yandexsearch version="1.0">
  <request>
    <query>погода москва</query>
    <page>0</page>
  </request>
  <response date="20260715T120000">
    <reqid>...</reqid>
    <found priority="phrase">1079724</found>
    <found-human>Нашёлся 1 млн ответов</found-human>
    <results>
      <grouping ...>
        <page first="1" last="10">0</page>
        <group>
          <doc id="...">
            <url>https://yandex.ru/pogoda/moscow</url>
            <title>Погода в Москве — Яндекс Погода</title>
            <passages>
              <passage>Температура +19°, облачно с прояснениями...</passage>
            </passages>
          </doc>
          <!-- ... -->
        </group>
      </grouping>
    </results>
  </response>
</yandexsearch>
```

### Поля каждого результата (`<doc>`)

| XML-тег | Описание |
|---------|----------|
| `<url>` | Ссылка на страницу |
| `<title>` | Заголовок (может содержать `<hlword>` — подсветка) |
| `<passage>` | Сниппет / фрагмент текста |
| `<saved-copy-url>` | Ссылка на сохраненную копию |

---

## 6. Ошибки

| Код | Причина |
|-----|---------|
| `400` | Невалидный JSON, превышен лимит длины запроса, отсутствует обязательное поле |
| `401` | Неверный или отсутствующий API-ключ |
| `403` | Нет прав `search-api.webSearch.user` для ключа |
| `429` | Превышен rate limit (30 запросов/сек) |
| `500` | Внутренняя ошибка Яндекса |

---

## 7. Лимиты и тарификация

| Параметр | Значение |
|----------|----------|
| **Rate limit** | 30 запросов/сек |
| **Длина запроса** | **Max 400 символов** (жесткое ограничение API Яндекса) |
| **Результатов на страницу** | 10 |
| **Цена днем** | ~$0.004 за 1 запрос |
| **Цена ночью** | ~$0.003 за 1 запрос (00:00–07:59 UTC+3) |
| **Стартовый грант** | 4000 руб. (~1000 бесплатных запросов) |

---

## 8. Альтернатива: Generative Search (для длинных запросов)

Если 400 символов не хватает — у Яндекса есть второй endpoint с **лимитом 16 384 символа**:

| | Базовый поиск | Generative Search |
|--|---------------|-------------------|
| **Endpoint** | `/v2/web/search` | `/v2/gen/search` |
| **Max длина запроса** | **400 символов** | **16 384 символа** |
| **Что возвращает** | Список ссылок (XML) | ИИ-саммари + источники (JSON) |
| **FolderId** | Не обязателен | **Обязателен** |
| **Скорость** | Мгновенно | До 200 секунд |
| **Цена** | ~$0.004/запрос | Дороже |
| **Rate limit** | 30 запросов/сек | 1 запрос/сек |

### Endpoint

```
POST https://searchapi.api.cloud.yandex.net/v2/gen/search
```

### Тело запроса

```json
{
  "messages": [
    {
      "content": "Здесь может быть текст до 16384 символов...",
      "role": "ROLE_USER"
    }
  ],
  "folderId": "YOUR_FOLDER_ID_HERE",
  "searchType": "SEARCH_TYPE_RU",
  "getPartialResults": false,
  "fixMisspell": true
}
```

### Ответ

```json
{
  "message": {
    "content": "ИИ-сгенерированный ответ на основе поиска...",
    "role": "ROLE_ASSISTANT"
  },
  "sources": [
    {
      "url": "https://example.com",
      "title": "Заголовок страницы",
      "used": true
    }
  ],
  "searchQueries": [{"text": "уточненный запрос", "reqId": "..."}],
  "fixedMisspellQuery": "исправленный запрос",
  "isAnswerRejected": false,
  "isBulletAnswer": false,
  "problematicAnswer": false,
  "hints": []
}
```

### Поля ответа

| Поле | Тип | Описание |
|------|-----|----------|
| `message.content` | string | Текст ИИ-ответа |
| `sources` | array | Источники (URL, заголовок, флаг `used`) |
| `searchQueries` | array | Уточненные запросы, которые сделала модель |
| `fixedMisspellQuery` | string | Исправленный запрос (если были опечатки) |
| `isAnswerRejected` | boolean | Модель отказалась отвечать (этика) |
| `isBulletAnswer` | boolean | Ответ в виде буллетов вместо текста |
| `problematicAnswer` | boolean | Ответ может содержать неточности |
| `hints` | array | Подсказки от сервиса |

---

## 10. Пример реализации (бекенд)

```typescript
// api/search.ts
const YANDEX_API_KEY = "YOUR_API_KEY_HERE";
const YANDEX_FOLDER_ID = "YOUR_FOLDER_ID_HERE";
const API_URL = "https://searchapi.api.cloud.yandex.net/v2/web/search";

async function searchYandex(queryText: string, page = 0) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Api-Key ${YANDEX_API_KEY}`,
    },
    body: JSON.stringify({
      query: {
        searchType: "SEARCH_TYPE_RU",
        queryText: queryText.trim(),
      },
      folderId: YANDEX_FOLDER_ID,
      responseFormat: "FORMAT_XML",
      page,
    }),
  });

  if (!response.ok) {
    throw new Error(`Yandex API ${response.status}`);
  }

  const data = await response.json();
  const xml = Buffer.from(data.rawData, "base64").toString("utf-8");
  return parseResults(xml); // парсинг <doc> элементов
}
```

---

## 10. Пример реализации (фронтенд через прокси)

```typescript
const API = "/api/trpc/search.yandex"; // tRPC-роутер на бекенде

const mutation = trpc.search.yandex.useMutation();

// Вызов:
mutation.mutate({
  queryText: "погода москва",
  searchType: "SEARCH_TYPE_RU",
  page: 0,
});
```

**Важно:** Ключ API никогда не светится на фронтенде. Только через бекенд-прокси.

---

## 11. Чек-лист интеграции

- [ ] API-ключ создан в [AI Studio](https://aistudio.yandex.ru)
- [ ] Ключу выдана роль `search-api.webSearch.user`
- [ ] Folder ID скопирован из Yandex Cloud
- [ ] Бекенд-прокси реализован (ключ хранится в env)
- [ ] Парсинг XML-ответа реализован
- [ ] Rate limit (30 rps) учтен
- [ ] Обработка ошибок (400, 401, 403, 429, 500) реализована
- [ ] Ключ не попадает в клиентский код / git

### Если используется Generative Search:
- [ ] Folder ID обязателен (указан в env)
- [ ] Лимит 16 384 символа на запрос учтен
- [ ] Rate limit 1 запрос/сек учтен
- [ ] Обработка `isAnswerRejected` и `problematicAnswer` реализована
- [ ] Источники (`sources`) отображаются пользователю
