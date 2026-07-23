// 共通ヘルパー: Anthropic APIを呼び、返答からJSONを取り出す。
// APIキーは環境変数 ANTHROPIC_API_KEY から読む（コードには絶対書かない）。

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-haiku-4-5-20251001"; // 辞書のような定型処理は安価なHaikuで十分

// モデルの返答テキストから JSON オブジェクトを頑丈に抽出する
function extractJSON(text) {
  if (!text) throw new Error("empty response");
  let t = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/, "").trim();
  try { return JSON.parse(t); } catch (e) {}
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    try { return JSON.parse(t.slice(start, end + 1)); } catch (e) {}
  }
  throw new Error("could not parse JSON from model output");
}

// content 配列（テキスト or 画像ブロック）を渡して呼び出す
async function callAnthropic(content) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");

  const resp = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1000,
      messages: [{ role: "user", content }],
    }),
  });

  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    const err = new Error("anthropic error " + resp.status);
    err.status = resp.status;
    err.detail = detail;
    throw err;
  }

  const data = await resp.json();
  const text = (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text || "")
    .join("")
    .trim();
  return extractJSON(text);
}

module.exports = { callAnthropic, extractJSON };
