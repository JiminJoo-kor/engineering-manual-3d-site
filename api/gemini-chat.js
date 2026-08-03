export default async function handler(request, response) {
  if (request.method !== "POST") return response.status(405).json({ error: "POST only" });
  try {
    const { question = "", context = "", apiKey = "" } = request.body || {};
    const key = String(apiKey || "").trim() || process.env.GEMINI_API_KEY;
    if (!key) return response.status(500).json({ error: "媛쒖씤 Gemini API Key瑜??낅젰?섍굅??Vercel 湲곕낯 GEMINI_API_KEY瑜??ㅼ젙?댁빞 ?⑸땲??" });
    const prompt = ["?덈뒗 ?붿??덉뼱留?? ?꾨줈?앺듃 愿由?AI Agent??", "?쒓뎅?대줈 媛꾧껐?섍퀬 ?ㅽ뻾 媛?ν븳 ?듬????쒕떎.", "?낅Т ?꾨줈?몄뒪, 由ъ뒪?? ?ㅼ쓬 ?≪뀡, 硫붿씪 珥덉븞, 泥댄겕由ъ뒪??以묒떖?쇰줈 ?듯븳??", "", "[?꾩옱 ?꾨줈?앺듃 留λ씫]", context, "", "[?ъ슜??吏덈Ц]", question].join("\n");
    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const apiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    const data = await apiResponse.json();
    if (!apiResponse.ok) return response.status(apiResponse.status).json({ error: data?.error?.message || "Gemini ?붿껌 ?ㅽ뙣" });
    const answer = data?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("\n").trim();
    return response.status(200).json({ answer: answer || "Gemini ?묐떟???댁꽍?섏? 紐삵뻽?듬땲??" });
  } catch (error) {
    return response.status(500).json({ error: error instanceof Error ? error.message : "Gemini ?쒕쾭 ?ㅻ쪟" });
  }
}