// POST /api/lookup
// body: { mode: "word"|"idiom"|"translate", text: "調べたい語句" }
// テキスト系の辞書機能をまとめて処理する。

const { callAnthropic } = require("./_anthropic");

function buildPrompt(mode, val) {
  if (mode === "word") {
    return `次の語句について、日本語辞書・類語辞典として回答してください。JSON形式のみで、前置きや説明、コードフェンスは一切つけずに出力してください。
形式: {"term":"入力された語句","reading":"読み方（ひらがな。英単語ならカタカナ発音表記）","meaning":"簡潔な意味の説明（1〜2文）","synonyms":["類語1","類語2","類語3"],"antonyms":["対義語（無ければ空配列）"]}
語句:「${val}」`;
  }
  if (mode === "idiom") {
    return `次の文章の意味・情景に近い四字熟語または慣用句を1〜3個、日本語話者向けに提案してください。JSON形式のみで、前置きや説明、コードフェンスは一切つけずに出力してください。
形式: {"original":"入力文章","suggestions":[{"idiom":"熟語または慣用句","reading":"読み方","meaning":"意味の説明（1文）"}]}
文章:「${val}」`;
  }
  return `次の英文を自然な日本語に翻訳してください。JSON形式のみで、前置きや説明、コードフェンスは一切つけずに出力してください。
形式: {"original":"入力英文","translation":"自然な日本語訳","notes":"補足や注意点があれば1文。無ければ空文字"}
英文:「${val}」`;
}

module.exports = async (req, res) => {
  // CORS（同一オリジンで使う想定なので基本は自ドメインのみ）
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOW_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POSTのみ対応しています" });

  try {
    const { mode, text } = req.body || {};
    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ error: "textが空です" });
    }
    if (text.length > 2000) {
      return res.status(400).json({ error: "入力が長すぎます（2000文字まで）" });
    }
    const validModes = ["word", "idiom", "translate"];
    const m = validModes.includes(mode) ? mode : "word";

    const parsed = await callAnthropic([{ type: "text", text: buildPrompt(m, text.trim()) }]);
    return res.status(200).json(parsed);
  } catch (err) {
    console.error("lookup error:", err.status || "", err.message, err.detail || "");
    return res.status(502).json({ error: "調べる処理に失敗しました。しばらくして再度お試しください。" });
  }
};
