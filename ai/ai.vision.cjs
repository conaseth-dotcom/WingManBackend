import fs from "fs";

export async function describeImage(imagePath) {
  const imageBytes = fs.readFileSync(imagePath);

  // Use your provider’s vision endpoint
  const client = new (await import("openai")).default({
    apiKey: process.env.OPENAI_API_KEY
  });

  const result = await client.chat.completions.create({
    model: "gpt-4o-mini", // or your chosen vision model
    messages: [
      {
        role: "user",
        content: [
          { type: "input_text", text: "Describe this image." },
          { type: "input_image", image: imageBytes }
        ]
      }
    ]
  });

  return result.choices?.[0]?.message?.content ?? "";
}
