import http from 'node:http';
import https from 'node:https';

const port = 8787;

function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Content-Type': type,
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => {
      chunks.push(chunk);
      if (Buffer.concat(chunks).length > 20000) {
        reject(new Error('body too large'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function requestUpstream(target, options = {}, redirects = 0) {
  const method = options.method || 'GET';
  return new Promise((resolve, reject) => {
    const url = new URL(target);
    const payload = options.body ?? null;
    const req = https.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        path: `${url.pathname}${url.search}`,
        method,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          Accept: options.accept || 'text/html,application/json',
          Referer: options.referer || `${url.origin}/`,
          ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': payload.length } : {}),
        },
      },
      (response) => {
        if (
          response.statusCode &&
          [301, 302, 303, 307, 308].includes(response.statusCode) &&
          response.headers.location &&
          redirects < 4 &&
          method === 'GET'
        ) {
          response.resume();
          const next = new URL(response.headers.location, target).href;
          resolve(requestUpstream(next, { ...options, method: 'GET', body: null }, redirects + 1));
          return;
        }
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => {
          resolve({
            status: response.statusCode ?? 502,
            type: response.headers['content-type'] || 'application/json; charset=utf-8',
            body: Buffer.concat(chunks),
          });
        });
      },
    );
    req.on('error', reject);
    req.setTimeout(12000, () => req.destroy(new Error('timeout')));
    if (payload) req.write(payload);
    req.end();
  });
}

function etfTarget(url) {
  const symbol = url.searchParams.get('symbol') ?? '';
  if (!/^[0-9A-Za-z]{4,6}$/.test(symbol)) return null;
  if (url.searchParams.get('source') === 'yuanta') {
    return {
      href: `https://www.yuantaetfs.com/product/detail/${symbol}/ratio`,
      referer: 'https://www.yuantaetfs.com/',
    };
  }
  return {
    href: `https://www.moneydj.com/etf/x/basic/Basic0007B.xdjhtm?etfid=${symbol}.tw`,
    referer: 'https://www.moneydj.com/',
  };
}

const server = http.createServer((req, res) => {
  if (!req.url) {
    send(res, 400, JSON.stringify({ error: 'missing url' }));
    return;
  }
  if (req.method === 'OPTIONS') {
    send(res, 204, '');
    return;
  }
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/capital/list' || url.pathname === '/capital/buyback') {
    if (req.method !== 'POST') {
      send(res, 405, JSON.stringify({ error: 'method' }));
      return;
    }
    const target =
      url.pathname === '/capital/list'
        ? 'https://www.capitalfund.com.tw/CFWeb/api/etf/list'
        : 'https://www.capitalfund.com.tw/CFWeb/api/etf/buyback';
    readBody(req)
      .then((body) => requestUpstream(target, { method: 'POST', body, accept: 'application/json', referer: 'https://www.capitalfund.com.tw/' }))
      .then((upstream) => send(res, upstream.status, upstream.body, upstream.type))
      .catch((error) => send(res, 502, JSON.stringify({ error: error.message })));
    return;
  }
  if (req.method !== 'GET') {
    send(res, 405, JSON.stringify({ error: 'method' }));
    return;
  }
  let target = '';
  let referer = 'https://mis.twse.com.tw/stock/index.jsp';
  if (url.pathname === '/mis') {
    target = `https://mis.twse.com.tw/stock/api/getStockInfo.jsp${url.search}`;
  } else if (url.pathname === '/search') {
    target = `https://www.twse.com.tw/rwd/zh/api/codeQuery${url.search}`;
  } else if (url.pathname === '/search-otc') {
    target = `https://www.tpex.org.tw/www/zh-tw/api/codeQuery${url.search}`;
    referer = 'https://www.tpex.org.tw/';
  } else if (url.pathname === '/etf') {
    const next = etfTarget(url);
    if (!next) {
      send(res, 400, JSON.stringify({ error: 'bad symbol' }));
      return;
    }
    target = next.href;
    referer = next.referer;
  } else {
    send(res, 404, JSON.stringify({ error: 'not found' }));
    return;
  }
  requestUpstream(target, { referer })
    .then((upstream) => send(res, upstream.status, upstream.body, upstream.type))
    .catch((error) => send(res, 502, JSON.stringify({ error: error.message })));
});

server.listen(port, '0.0.0.0', () => {
  console.log(`quote proxy http://localhost:${port}`);
});
