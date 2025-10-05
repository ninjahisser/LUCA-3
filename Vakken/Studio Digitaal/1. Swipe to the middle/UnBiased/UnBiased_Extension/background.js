console.log("background.js loaded");

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "sendToChatGPT") {
    const model = message.model || "gpt-3.5-turbo"; // default to GPT-3.5

    fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${message.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: "user", content: message.content }]
      })
    })
      .then(res => res.json())
      .then(data => sendResponse({ success: true, data }))
      .catch(err => sendResponse({ success: false, error: err.message }));

    return true; // keep channel open for async response
  }

  sendResponse({ success: false, error: "Unknown action" });
});

chrome.runtime.onInstalled.addListener(() => {
  console.log("UnBiased extension installed.");
});
