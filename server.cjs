require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Yandex Search API config
const YANDEX_API_KEY = process.env.YANDEX_API_KEY || '';
const YANDEX_FOLDER_ID = process.env.YANDEX_FOLDER_ID || '';

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    apiKeyConfigured: !!YANDEX_API_KEY,
    folderIdConfigured: !!YANDEX_FOLDER_ID,
  });
});

// Search proxy
app.post('/api/search', async (req, res) => {
  try {
    const { queryText, searchType = 'SEARCH_TYPE_RU', page = 0 } = req.body;

    if (!queryText || queryText.trim().length === 0) {
      return res.status(400).json({ error: 'Query text is required' });
    }

    if (!YANDEX_API_KEY) {
      return res.status(500).json({
        error: 'API key not configured',
        hint: 'Set YANDEX_API_KEY environment variable',
      });
    }

    const body = {
      query: {
        searchType,
        queryText: queryText.trim(),
      },
      responseFormat: 'FORMAT_XML',
      page,
    };

    if (YANDEX_FOLDER_ID) {
      body.folderId = YANDEX_FOLDER_ID;
    }

    const response = await fetch(
      'https://searchapi.api.cloud.yandex.net/v2/web/search',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Api-Key ${YANDEX_API_KEY}`,
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({
        error: 'Yandex API error',
        status: response.status,
        details: errorText,
      });
    }

    const data = await response.json();

    // Decode base64 XML
    let decoded = '';
    try {
      decoded = Buffer.from(data.rawData, 'base64').toString('utf-8');
    } catch {
      decoded = data.rawData || '';
    }

    // Parse XML to extract results
    const results = parseYandexResults(decoded);

    res.json({
      success: true,
      query: queryText,
      searchType,
      results,
      rawXml: decoded,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Parse Yandex XML response
function parseYandexResults(xml) {
  const results = [];

  // Extract <url>, <title>, <passages> from <doc> elements
  const docRegex = /<doc[^>]*>[\s\S]*?<\/doc>/g;
  const docs = xml.match(docRegex) || [];

  for (const doc of docs) {
    const urlMatch = doc.match(/<url>(.*?)<\/url>/);
    const titleMatch = doc.match(/<title>(.*?)<\/title>/);
    const passageMatches = doc.match(/<passage>(.*?)<\/passage>/gs);

    if (urlMatch && titleMatch) {
      const url = decodeXmlEntities(urlMatch[1]);
      let title = decodeXmlEntities(titleMatch[1]);
      // Clean title from <hlword> tags
      title = title.replace(/<\/?hlword>/g, '');

      let snippet = '';
      if (passageMatches && passageMatches.length > 0) {
        snippet = passageMatches
          .map((p) => {
            let text = p.replace(/<passage>|<\/passage>/g, '');
            text = text.replace(/<\/?hlword>/g, '');
            return decodeXmlEntities(text);
          })
          .join(' ');
      }

      // Try to extract domain
      const domain = extractDomain(url);

      results.push({
        title,
        url,
        domain,
        snippet,
      });
    }
  }

  return results;
}

function decodeXmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_match, dec) => String.fromCharCode(dec));
}

function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

// Serve static in production
app.use(express.static(path.join(__dirname, 'dist')));

app.use((_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API Key configured: ${YANDEX_API_KEY ? 'Yes' : 'NO - Set YANDEX_API_KEY'}`);
  console.log(`Folder ID configured: ${YANDEX_FOLDER_ID ? 'Yes' : 'NO - Set YANDEX_FOLDER_ID'}`);
});
