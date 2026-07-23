// POST /api/vision
// body: { mode: "image"|"handwrite", image: "<base64>", mediaType: "image/jpeg" }
// 画像OCR（ふりがな＋翻訳）と手書き認識をまとめて処理する。

const { callAnthropic } = require("./_anthropic");

const IMAGE_PROMPT = `この画像に写っている文章を読み取ってください。JSON形式のみで、前置き・説明・コードフェンスは一切つけずに出力してください。
形式: {"original_text":"画像から読み取った原文","furigana_text":"原文の漢字すべてに、その漢字の直後に「（読み）」の形でふりがなを付けたテキスト。前後の文脈から自然な読みを選ぶこと。漢字が無い場合は原文をそのまま入れる。","language":"検出した言語（日本語／英語 など）","translation":"原文が日本語以外なら自然な日本語訳、原文が日本語なら自然な英語訳"}`;

const HANDWRITE_PROMPT = `この画像には手書きの文字・単語が描かれています。書かれている内容を認識し、日本語辞書・類語辞典として回答してください。JSON形式のみで、前置き・説明・コードフェンスは一切つけずに出力してください。
形式: {"term":"認識した語句","reading":"読み方（ひらがな。英単語ならカタカナ発音表記）","meaning":"簡潔な意味の説明（1〜2文）","synonyms":["類語1","類語2","類語3"],"antonyms":["対義語（無ければ空配列）"]}`;

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOW_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POSTのみ対応しています" });

  try {
    const { mode, image, mediaType } = req.body || {};
    if (!image || typeof image !== "string") {
      return res.status(400).json({ error: "画像データがありません" });
    }
    // base64のおおよそのサイズ上限（約6MB相当）
    if (image.length > 8_000_000) {
      return res.status(400).json({ error: "画像が大きすぎます。縮小して再度お試しください。" });
    }
    const mt = /^image\/(png|jpeg|webp|gif)$/.test(mediaType || "") ? mediaType : "image/jpeg";
    const prompt = mode === "handwrite" ? HANDWRITE_PROMPT : IMAGE_PROMPT;

    const parsed = await callAnthropic([
      { type: "image", source: { type: "base64", media_type: mt, data: image } },
      { type: "text", text: prompt },
    ]);
    return res.status(200).json(parsed);
  } catch (err) {
    console.error("vision error:", err.status || "", err.message, err.detail || "");
    return res.status(502).json({ error: "画像の処理に失敗しました。しばらくして再度お試しください。" });
  }
};
