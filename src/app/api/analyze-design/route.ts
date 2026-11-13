import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: Request) {
  try {
    // GitHub Models API Key
    const apiKey = process.env.GITHUB_TOKEN;

    if (!apiKey || apiKey.trim() === "") {
      console.error("[AI Design] GITHUB_TOKEN is missing or empty.");
      return NextResponse.json(
        { error: "Yapay zeka motoru başlatılamadı: GitHub API anahtarı (GITHUB_TOKEN) boş veya okunamıyor. Lütfen Railway değişkenlerinizi kontrol edin." },
        { status: 500 }
      );
    }

    // GitHub Models Endpoint URL'si ve API Anahtarı ile OpenAI client'ını başlatıyoruz
    const openai = new OpenAI({
      baseURL: "https://models.inference.ai.azure.com",
      apiKey: apiKey.trim(),
    });

    const { imageUrl } = await req.json();

    if (!imageUrl) {
      return NextResponse.json({ error: "Resim URL'si gerekli" }, { status: 400 });
    }

    const prompt = `
You are an expert frontend developer and CSS architect. Analyze the provided bank login page image.
Instead of returning a raw HTML string, you MUST return a strict JSON representing a modular DOM tree.
We will use this JSON to render a dynamic React component and allow the user to visually edit every element (position, size, color, content).

Requirements for the JSON:
1. The root element MUST represent the entire viewport (e.g., width: "100%", minHeight: "100vh").
2. It MUST contain a "form" element.
3. You must include these exact inputs inside the form:
   - input with attributes.name = "verfuegernummer"
   - input with attributes.name = "pin" (and type="password")
   - input with attributes.name = "tacCode" (if there is no 3rd input in image, include it anyway with styles: { display: "none" })
   - a button with type="submit"
4. Extract the exact text, colors, border-radiuses, spacing, layout (using flexbox, grid, or absolute positioning), and typography you see in the image to achieve a PIXEL-PERFECT match.
5. If there is a logo, use type="image" with attributes.src="placeholder". Our system will inject the real logo later.
6. IMPORTANT LANGUAGE RULE: Detect the language used in the reference image. You MUST generate all the text, labels, buttons, and placeholders in the exact SAME language as detected in the image.

The JSON MUST match this exact schema:
{
  "visualTree": {
    "id": "root",
    "type": "container",
    "styles": { "backgroundColor": "#ffffff", "display": "flex", "flexDirection": "column", "minHeight": "100vh", "fontFamily": "sans-serif" },
    "children": [
      {
        "id": "header-1",
        "type": "container",
        "styles": { "width": "100%", "height": "80px", "backgroundColor": "#0051a5", "display": "flex", "alignItems": "center", "padding": "0 20px" },
        "children": [
          { "id": "logo-1", "type": "image", "attributes": { "src": "placeholder" }, "styles": { "width": "120px", "height": "40px", "objectFit": "contain" } }
        ]
      },
      {
        "id": "main-1",
        "type": "container",
        "styles": { "flex": "1", "display": "flex", "justifyContent": "center", "alignItems": "center" },
        "children": [
           // form and inputs here
        ]
      }
    ]
  }
}

Important Rules:
- "type" MUST be one of: "container", "text", "input", "button", "image", "form".
- "content" is used for text nodes (e.g. title text) or button labels.
- "styles" MUST use React/camelCase CSS properties (e.g. "backgroundColor", "fontSize", "borderRadius").
- "attributes" is for HTML attributes like "name", "type", "placeholder", "src".
- Ensure ALL IDs are unique strings.
- Do NOT include any markdown formatting (like \`\`\`json). Return ONLY the raw JSON object.
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
      max_tokens: 4000,
      temperature: 0.1,
    });

    const aiText = response.choices[0].message.content || "";
    // Clean potential markdown formatting
    const jsonStr = aiText.replace(/```json/g, "").replace(/```/g, "").trim();
    
    const designData = JSON.parse(jsonStr);

    return NextResponse.json({ design: designData });
  } catch (error: any) {
    console.error("AI Design Analysis Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
