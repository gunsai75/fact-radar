async function detectAIText(text) {
    const response = await fetch("https://api-inference.huggingface.co/models/openai-detector", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inputs: text }),
    });
    const data = await response.json();
    return data[0][0].score * 100; // Convert to percentage
  }