import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { imageUrl } = await req.json();

    if (!process.env.GITHUB_TOKEN) {
      throw new Error("GitHub API anahtarı (GITHUB_TOKEN) eksik!");
    }

    const response = await fetch("https://models.inference.ai.azure.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Sen sadece bir renk analiz aracısın. Gönderilen görseldeki ana marka rengini (brandColor) ve vurgu rengini (accentColor) HEX formatında analiz et. SADECE aşağıdaki JSON formatında çıktı ver, başka hiçbir kelime veya açıklama yazma. Markdown kullanma, direkt JSON döndür:\n{\"brandColor\": \"#xxxxxx\", \"accentColor\": \"#xxxxxx\"}"
          },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: imageUrl
                }
              }
            ]
          }
        ],
        max_tokens: 150
      })
    });

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message);
    }

    const content = data.choices[0].message.content.trim();
    // In case the AI includes markdown code blocks, strip them
    const jsonStr = content.replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();
    const colors = JSON.parse(jsonStr);

    return NextResponse.json(colors);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
