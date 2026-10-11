const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace("/api-proxy", "");

  const apiKey = Deno.env.get("EXPO_PUBLIC_PUBLIC_DATA_KEY") || Deno.env.get("PUBLIC_DATA_KEY") || "";
  console.log(`[api-proxy] path=${path}, keyLen=${apiKey.length}`);

  if (!apiKey) {
    return jsonResponse({ error: "API key not configured" }, 500);
  }

  try {
    if (path === "/tide") {
      return await handleTide(apiKey, url);
    } else if (path === "/weather") {
      return await handleWeather(apiKey, url);
    } else if (path === "/weather-alerts") {
      return await handleWeatherAlerts(apiKey);
    } else {
      return jsonResponse({ error: "Unknown endpoint: " + path }, 404);
    }
  } catch (e) {
    console.error("[api-proxy] Error:", e);
    return jsonResponse({ error: "Proxy server error", detail: String(e) }, 500);
  }
});

function isOpenApiError(data: any): boolean {
  return !!(data?.OpenAPI_ServiceResponse?.cmmMsgHeader?.errMsg);
}

async function handleTide(apiKey: string, url: URL): Promise<Response> {
  const tideCode = url.searchParams.get("tideCode");
  const date = url.searchParams.get("date");
  if (!tideCode || !date) {
    return jsonResponse({ error: "Missing tideCode or date parameter" }, 400);
  }

  // KHOA tide forecast API (국립해양조사원 조석예보 고/저조) — fixed params obsCode/reqDate/type v8
  // Endpoint: https://apis.data.go.kr/1192136/tideFcstHghLw/GetTideFcstHghLwApiService
  // Swagger spec (data.go.kr dataset 15156018) parameters:
  //   serviceKey (required): API key
  //   obsCode (required): 예보지점 코드 (e.g. DT_0006)
  //   reqDate (optional): 요청일자 (yyyyMMdd)
  //   type (optional): xml or json
  // Response item fields:
  //   obsvtrNm, lot, lat, predcDt (YYYYMMDDHHmm), predcTdlvVl (cm), extrSe (1=AM high, 2=AM low, 3=PM high, 4=PM low)
  const base = "https://apis.data.go.kr/1192136/tideFcstHghLw/GetTideFcstHghLwApiService";

  const url1 = `${base}?serviceKey=${encodeURIComponent(apiKey)}&obsCode=${encodeURIComponent(tideCode)}&reqDate=${encodeURIComponent(date)}&type=json&numOfRows=10&pageNo=1`;
  const url2 = `${base}?serviceKey=${apiKey}&obsCode=${encodeURIComponent(tideCode)}&reqDate=${encodeURIComponent(date)}&type=json&numOfRows=10&pageNo=1`;

  const params3 = new URLSearchParams();
  params3.set("serviceKey", apiKey);
  params3.set("obsCode", tideCode);
  params3.set("reqDate", date);
  params3.set("type", "json");
  params3.set("numOfRows", "10");
  params3.set("pageNo", "1");
  const url3 = `${base}?${params3.toString()}`;

  const attempts = [
    { label: "encoded", url: url1 },
    { label: "raw-key", url: url2 },
    { label: "URLSearchParams", url: url3 },
  ];

  for (const attempt of attempts) {
    try {
      const res = await fetch(attempt.url, { headers: { Accept: "application/json" } });
      const text = await res.text();
      console.log(`[api-proxy/tide] ${attempt.label}: status=${res.status}, body(400)=${text.slice(0, 400)}`);

      let data: any;
      try { data = JSON.parse(text); } catch {
        // Try XML-to-JSON if response is XML
        if (text.includes("<response>")) {
          const resultCodeMatch = text.match(/<resultCode>(.*?)<\/resultCode>/);
          const resultMsgMatch = text.match(/<resultMsg>(.*?)<\/resultMsg>/);
          if (resultCodeMatch && resultCodeMatch[1] !== "00") {
            console.warn(`[api-proxy/tide] ${attempt.label} XML error: ${resultMsgMatch?.[1]} (code ${resultCodeMatch[1]})`);
            continue;
          }
        }
        continue;
      }

      if (isOpenApiError(data)) {
        const hdr = data.OpenAPI_ServiceResponse.cmmMsgHeader;
        console.warn(`[api-proxy/tide] ${attempt.label} error: ${hdr.errMsg} (code ${hdr.returnReasonCode})`);
        continue;
      }

      const resultMsg = data?.response?.header?.resultMsg || "";
      if (resultMsg && resultMsg !== "NORMAL_SERVICE") {
        console.warn(`[api-proxy/tide] ${attempt.label} resultMsg: ${resultMsg}`);
        continue;
      }

      const items = data?.response?.body?.items?.item;
      const itemCount = Array.isArray(items) ? items.length : items ? 1 : 0;
      console.log(`[api-proxy/tide] SUCCESS with ${attempt.label}: ${itemCount} items`);
      return jsonResponse(data);
    } catch (e) {
      console.error(`[api-proxy/tide] ${attempt.label} fetch error:`, e);
    }
  }

  return jsonResponse({ error: "KHOA tide API unavailable", _v: 6 }, 502);
}

async function handleWeather(apiKey: string, url: URL): Promise<Response> {
  const nx = url.searchParams.get("nx");
  const ny = url.searchParams.get("ny");
  const baseDate = url.searchParams.get("base_date");
  const baseTime = url.searchParams.get("base_time") || "0500";
  if (!nx || !ny || !baseDate) {
    return jsonResponse({ error: "Missing nx, ny, or base_date parameter" }, 400);
  }

  // 1) Try real-time ultra-short-term forecast (초단기예보) — closest to "now"
  //    Uses base_time every hour at :45 (e.g. 1445 → forecasts from 1500 onward)
  const ultraBaseTime = computeUltraBaseTime(baseTime);
  const ultraResult = await tryKmaFetch(
    "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtFcst",
    apiKey, baseDate, ultraBaseTime, nx, ny, 100
  );
  if (ultraResult) {
    console.log("[api-proxy/weather] ultra-short-term forecast succeeded");
    return jsonResponse(ultraResult);
  }

  // 2) Try real-time observation (초단기실황) — actual current conditions
  const obsBaseTime = computeObsBaseTime();
  const obsResult = await tryKmaFetch(
    "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNst",
    apiKey, baseDate, obsBaseTime, nx, ny, 100
  );
  if (obsResult) {
    console.log("[api-proxy/weather] real-time observation succeeded");
    return jsonResponse(obsResult);
  }

  // 3) Fall back to regular short-term forecast
  const fcstResult = await tryKmaFetch(
    "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst",
    apiKey, baseDate, baseTime, nx, ny, 300
  );
  if (fcstResult) {
    console.log("[api-proxy/weather] short-term forecast succeeded");
    return jsonResponse(fcstResult);
  }

  return jsonResponse({ error: "KMA weather API unavailable" }, 502);
}

function computeUltraBaseTime(baseTime: string): string {
  // Ultra-short-term forecast base_time is every hour at :45
  // e.g. if current KST hour is 15, base_time = "1445"
  const now = new Date();
  const kstOffset = 9 * 60 * 60 * 1000;
  const kst = new Date(now.getTime() + kstOffset);
  const kstHour = kst.getUTCHours();
  const prevHour = kstHour === 0 ? 23 : kstHour - 1;
  return String(prevHour).padStart(2, "0") + "45";
}

function computeObsBaseTime(): string {
  // Ultra-short-term observation (초단기실황) base_time is every hour at :40
  const now = new Date();
  const kstOffset = 9 * 60 * 60 * 1000;
  const kst = new Date(now.getTime() + kstOffset);
  const kstHour = kst.getUTCHours();
  const prevHour = kstHour === 0 ? 23 : kstHour - 1;
  return String(prevHour).padStart(2, "0") + "00";
}

async function tryKmaFetch(
  baseUrl: string,
  apiKey: string,
  baseDate: string,
  baseTime: string,
  nx: string,
  ny: string,
  numOfRows: number
): Promise<any | null> {
  const urls = [
    `${baseUrl}?serviceKey=${encodeURIComponent(apiKey)}&base_date=${encodeURIComponent(baseDate)}&base_time=${encodeURIComponent(baseTime)}&nx=${encodeURIComponent(nx)}&ny=${encodeURIComponent(ny)}&dataType=JSON&numOfRows=${numOfRows}&pageNo=1`,
    `${baseUrl}?serviceKey=${apiKey}&base_date=${encodeURIComponent(baseDate)}&base_time=${encodeURIComponent(baseTime)}&nx=${encodeURIComponent(nx)}&ny=${encodeURIComponent(ny)}&dataType=JSON&numOfRows=${numOfRows}&pageNo=1`,
  ];

  for (const tryUrl of urls) {
    try {
      const res = await fetch(tryUrl, { headers: { Accept: "application/json" } });
      const text = await res.text();
      console.log(`[api-proxy/weather] ${baseUrl.split("/").pop()} fetch: status=${res.status}, body(300)=${text.slice(0, 300)}`);

      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        // Check for XML error response
        if (text.includes("<response>")) {
          const resultCodeMatch = text.match(/<resultCode>(.*?)<\/resultCode>/);
          const resultMsgMatch = text.match(/<resultMsg>(.*?)<\/resultMsg>/);
          if (resultCodeMatch && resultCodeMatch[1] !== "00") {
            console.warn(`[api-proxy/weather] XML error: ${resultMsgMatch?.[1]} (code ${resultCodeMatch[1]})`);
            continue;
          }
        }
        continue;
      }

      if (isOpenApiError(data)) {
        const hdr = data.OpenAPI_ServiceResponse.cmmMsgHeader;
        console.warn(`[api-proxy/weather] OpenAPI error: ${hdr.errMsg} (code ${hdr.returnReasonCode})`);
        continue;
      }

      const resultMsg = data?.response?.header?.resultMsg || "";
      const resultCode = data?.response?.header?.resultCode || "";
      if (resultMsg && resultMsg !== "NORMAL_SERVICE") {
        console.warn(`[api-proxy/weather] resultMsg: ${resultMsg} (code ${resultCode})`);
        continue;
      }

      const items = data?.response?.body?.items?.item;
      const itemCount = Array.isArray(items) ? items.length : items ? 1 : 0;
      if (itemCount === 0) {
        console.warn(`[api-proxy/weather] no items in response`);
        continue;
      }

      console.log(`[api-proxy/weather] success: ${itemCount} items`);
      return data;
    } catch (e) {
      console.error(`[api-proxy/weather] fetch error:`, e);
    }
  }

  return null;
}

async function handleWeatherAlerts(apiKey: string): Promise<Response> {
  const apiUrl = `https://apis.data.go.kr/1360000/WthrWrnInfoService/getWthrWrnList?serviceKey=${encodeURIComponent(apiKey)}&dataType=JSON&numOfRows=20&pageNo=1`;
  const res = await fetch(apiUrl, { headers: { Accept: "application/json" } });
  const text = await res.text();
  try {
    const data = JSON.parse(text);
    if (isOpenApiError(data)) {
      return jsonResponse({ error: `KMA alert API error: ${data.OpenAPI_ServiceResponse.cmmMsgHeader.errMsg}` }, 502);
    }
    return jsonResponse(data);
  } catch {
    return jsonResponse({ error: "Failed to parse weather alert API response", raw: text.slice(0, 500) }, 502);
  }
}
