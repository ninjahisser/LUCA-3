// background.js
// Runs in the background and handles API requests securely

// Listen for messages from popup.js
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "sendToChatGPT") {
    const apiKey = message.apiKey;
    const userMessage = message.content;

    // Wrap in async IIFE so we can await
    (async () => {
      try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: userMessage }]
          })
        });

        const data = await response.json();
        console.log("ChatGPT Response:", data);

        sendResponse({ success: true, data });
      } catch (err) {
        console.error("Error calling ChatGPT:", err);
        sendResponse({ success: false, error: err.toString() });
      }
    })();

    // 👇 VERY IMPORTANT: keep the channel alive for async response
    return true;
  }
});