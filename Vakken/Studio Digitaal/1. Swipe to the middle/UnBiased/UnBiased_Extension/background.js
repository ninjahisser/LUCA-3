// Luistert naar berichten van content.js of popup.js
browser.runtime.onMessage.addListener((request, sender) => {
    if (request.action === "processText") {
      return processText(request.text, request.bias).then((result) => {
        logMessage(`[processText] Original: ${request.text}`);
        logMessage(`[processText] Result: ${result}`);
        return { result };
      });
    }
  });
  
  // Functie om tekst naar OpenAI API te sturen en bias te checken
  async function processText(text, bias) {
    const { apiKey } = await browser.storage.local.get("apiKey");
    if (!apiKey) {
      logMessage("[processText] No API key set. Cannot process text.");
      return text;
    }
  
    try {
      logMessage(`[processText] Sending API request with bias=${bias}`);
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "You detect political bias and rewrite it." },
            { role: "user", content: `Bias to block: ${bias}\nText: ${text}\n\nIf text matches the bias, respond with 'BLOCK'. Otherwise, rewrite it with the opposite bias.` }
          ],
          temperature: 0.7
        })
      });
  
      const data = await response.json();
      logMessage(`[processText] Raw API response: ${JSON.stringify(data).slice(0, 200)}...`);
  
      if (!response.ok) {
        logMessage(`[processText] API HTTP error ${response.status}`);
        return text;
      }
  
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        logMessage(`[processText] Unexpected API response format`);
        return text;
      }
  
      const result = data.choices[0].message.content.trim();
      return result;
  
    } catch (err) {
      logMessage(`[processText] Error in API call: ${err}`);
      return text;
    }
  }
  
  // Functie om alles naar storage logs te sturen
  function logMessage(msg) {
    browser.storage.local.get("logs").then((data) => {
      let logs = data.logs || [];
      logs.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
      if (logs.length > 50) logs.shift();
      browser.storage.local.set({ logs });
    });
  }
  