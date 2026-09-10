// relay.js - Search and click relay backend rewritten in Bun.js

export function qryExplode(qryStr) {
  const kwArr = [];
  let kw = '';
  let dollarOpen = false;

  for (let i = 0; i < qryStr.length; i++) {
    const c = qryStr[i];
    if (c === '$') {
      dollarOpen = !dollarOpen;
    }

    if (!dollarOpen && c === ',') {
      kwArr.push(kw);
      kw = '';
    } else {
      kw += c;
    }
  }

  kwArr.push(kw);
  return kwArr;
}

export function replaceInterrogation(str) {
  const wildcardLetters = [];
  for (let i = 0; i < 26; i++) {
    const c = String.fromCharCode(65 + i); // 'A' .. 'Z'
    if (!str.includes(c)) {
      wildcardLetters.push(c);
    }
  }
  if (wildcardLetters.length === 0) {
    wildcardLetters.push('x');
  }

  for (const letter of wildcardLetters) {
    const pos = str.indexOf('?');
    if (pos === -1) break;
    const replace = `\\qvar{${letter}}`;
    str = str.slice(0, pos) + replace + str.slice(pos + 1);
  }

  return str;
}

export function buildQueryObj(reqQryStr, page, remoteIp, geo = {}) {
  const queryObj = {
    ip: remoteIp,
    page: page || 1,
    geo: {
      city: geo.city || 'Unknown',
      region: geo.region || 'Unknown',
      country: geo.country || 'Unknown',
    },
    kw: [],
  };

  const keywords = qryExplode(reqQryStr);

  for (let rawKw of keywords) {
    const kwTrimmed = rawKw.trim();
    const match = kwTrimmed.match(/^(OR|AND|NOT) ([a-z]+):(.*)$/s);
    if (!match) continue;

    const op = match[1] || 'OR';
    const fi = match[2] || 'content';
    const rest = match[3] ?? '';

    if (rest === '') continue;

    let kwStr;
    let kwType;

    if (rest.startsWith('$')) {
      kwStr = rest.replace(/^\$+|\$+$/g, '');
      kwStr = replaceInterrogation(kwStr);
      kwType = 'tex';
    } else {
      kwStr = rest;
      kwType = 'term';
    }

    queryObj.kw.push({
      type: kwType,
      op: op,
      field: fi,
      str: kwStr,
    });
  }

  return queryObj;
}

function getCorsHeaders(req) {
  const origin = req.headers.get('origin') || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Cache-Control': 'no-cache',
  };
}

export function getConfig() {
  const searchdHost = process.env.A0_SEARCHD || 'localhost';
  const searchdPort = parseInt(process.env.A0_SEARCHD_PORT || '8921', 10);
  const logdHost = process.env.A0_QRYLOGD || 'localhost';
  const logdPort = parseInt(process.env.A0_QRYLOGD_PORT || '3207', 10);

  return {
    searchdUrl: `http://${searchdHost}:${searchdPort}/search`,
    logdUrl: `http://${logdHost}:${logdPort}/push/query`,
    clickdUrl: `http://${logdHost}:${logdPort}/push/clicks`,
  };
}

async function sendQueryLog(queryObj, logdUrl) {
  try {
    await fetch(logdUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(queryObj),
      signal: AbortSignal.timeout(10000),
    });
  } catch (err) {
    console.error('[search-relay] send_query_log error:', err.message);
  }
}

async function relayToSearchd(queryObj, searchdUrl) {
  const res = await fetch(searchdUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(queryObj),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    throw new Error(`searchd returned HTTP ${res.status}`);
  }
  return await res.text();
}

async function relayClick(data, clickdUrl) {
  const res = await fetch(clickdUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    throw new Error(`clickd returned HTTP ${res.status}`);
  }
  return await res.text();
}

export async function handleSearchRelay(req, url) {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const q = url.searchParams.get('q');
  if (!q) {
    return new Response('[search-relay] Bad GET Request!', {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
    });
  }

  const p = parseInt(url.searchParams.get('p') || '1', 10) || 1;
  const remoteIp =
    req.headers.get('x-real-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    '127.0.0.1';

  const geo = {
    city: req.headers.get('http_geo_city') || 'Unknown',
    region: req.headers.get('http_geo_subd') || 'Unknown',
    country: req.headers.get('http_geo_ctry') || 'Unknown',
  };

  const queryObj = buildQueryObj(q, p, remoteIp, geo);
  const config = getConfig();

  // Async query logging (non-blocking)
  sendQueryLog(queryObj, config.logdUrl);

  try {
    const searchdResponse = await relayToSearchd(queryObj, config.searchdUrl);
    return new Response(searchdResponse, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json; charset=utf-8',
      },
    });
  } catch (err) {
    console.error('[search-relay] searchd error:', err.message);
    return new Response(
      `[search-relay] Internal Server Error! (${err.message})`,
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
      }
    );
  }
}

export async function handleClickRelay(req) {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  let data;
  try {
    data = await req.json();
  } catch {
    data = {};
  }

  const remoteIp =
    req.headers.get('x-real-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    '127.0.0.1';

  data.ip = remoteIp;
  const config = getConfig();

  try {
    await relayClick(data, config.clickdUrl);
    return new Response('OK', {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
    });
  } catch (err) {
    console.error('[click-relay] error:', err.message);
    return new Response(
      `[search-relay] Internal Server Error! (${err.message})`,
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
      }
    );
  }
}

export async function handleRelayRequest(req) {
  const url = new URL(req.url);
  const pathname = url.pathname;

  if (
    pathname === '/search-relay' ||
    pathname === '/search-relay/' ||
    pathname === '/search-relay.php' ||
    (pathname === '/' && url.searchParams.has('q'))
  ) {
    return await handleSearchRelay(req, url);
  }

  if (
    pathname === '/click-relay' ||
    pathname === '/click-relay/' ||
    pathname === '/click-relay.php'
  ) {
    return await handleClickRelay(req);
  }

  return null;
}

