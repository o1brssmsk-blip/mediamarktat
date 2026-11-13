import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GITHUB_TOKEN;

    if (!apiKey || apiKey.trim() === "") {
      return NextResponse.json(
        { error: "GITHUB_TOKEN is missing." },
        { status: 500 }
      );
    }

    const openai = new OpenAI({
      baseURL: "https://models.inference.ai.azure.com",
      apiKey: apiKey.trim(),
    });

    const { imageUrl, design } = await req.json();

    if (!imageUrl || !design) {
      return NextResponse.json({ error: "Resim URL'si ve tasarım verisi gerekli" }, { status: 400 });
    }

    const prompt = `
You are a strict UI/UX Quality Assurance bot. 
Compare the provided reference image of the bank login page with the provided JSON design structure.
Your job is to identify any deviations in layout, color, typography, spacing, or text content.

Here is the current JSON design:
\`\`\`json
${JSON.stringify(design, null, 2)}
\`\`\`

If the design perfectly matches the image, return an empty array of warnings.
If there are deviations, return a list of specific warnings and suggestions on how to fix them.
Focus on:
1. Missing elements (like forgot password links, specific text blocks).
2. Incorrect colors (background, buttons, text).
3. Incorrect layout (e.g. form is centered but image has it on the left).
4. Missing or incorrect inputs.

Return ONLY a JSON array of objects in this exact format:
[
  {
    "elementId": "header-1", 
    "issue": "Background color is #fff but image shows #0051a5",
    "suggestion": "Change backgroundColor to #0051a5"
  }
]
No markdown. No extra text. Only the JSON array.
`;

    const response = await openai.chat.completions.create({
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
                detail: "high"
              },
            },
          ],
        },
      ],
      model: "gpt-4o",
      max_tokens: 2000,
      temperature: 0.1,
    });

    const aiText = response.choices[0].message.content || "[]";
    const jsonStr = aiText.replace(/```json/g, "").replace(/```/g, "").trim();
    
    const warnings = JSON.parse(jsonStr);

    return NextResponse.json({ warnings });
  } catch (error: any) {
    console.error("AI Validation Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
