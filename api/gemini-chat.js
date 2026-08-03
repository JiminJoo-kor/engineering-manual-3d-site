export default async function handler(request, response) {
  if (request.method !== "POST") return response.status(405).json({ error: "POST only" });
  if (!process.env.GEMINI_API_KEY) return response.status(500).json({ error: "Vercel 환경변수 GEMINI_API_KEY가 필요합니다." });
  try {
    const { question = "", context = "" } = request.body || {};
    const prompt = ["너는 엔지니어링 팀 프로젝트 관리 AI Agent다.", "한국어로 간결하고 실행 가능한 답변을 한다.", "업무 프로세스, 리스크, 다음 액션, 메일 초안, 체크리스트 중심으로 답한다.", "", "[현재 프로젝트 맥락]", context, "", "[사용자 질문]", question].join("\n");
    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const apiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": process.env.GEMINI_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    const data = await apiResponse.json();
    if (!apiResponse.ok) return response.status(apiResponse.status).json({ error: data?.error?.message || "Gemini 요청 실패" });
    const answer = data?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("\n").trim();
    return response.status(200).json({ answer: answer || "Gemini 응답을 해석하지 못했습니다." });
  } catch (error) {
    return response.status(500).json({ error: error instanceof Error ? error.message : "Gemini 서버 오류" });
  }
}
