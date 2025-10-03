console.log("background.js loaded");

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Got message:", message);

  if (message.action === "sendToChatGPT") {
    fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${message.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: message.content }]
      })
    })
      .then(res => res.json())
      .then(data => {
        console.log("OpenAI response:", data);
        sendResponse({ success: true, data });
      })
      .catch(err => {
        console.error("Fetch error:", err);
        sendResponse({ success: false, error: err.message });
      });

    return true; // keep channel open
  }

  sendResponse({ success: false, error: "Unknown action" });
});
