document.addEventListener("DOMContentLoaded", () => {
  const apiKeyInput = document.getElementById("apiKey");
  const saveButton = document.getElementById("saveKey");
  const sendButton = document.getElementById("sendHello");
  const clearSitesButton = document.getElementById("clearSites");
  const output = document.getElementById("output");

  function log(msg) {
    output.textContent += msg + "\n";
    output.scrollTop = output.scrollHeight;
  }

  // Load saved API key
  chrome.storage.local.get("chatgpt_api_key", res => {
    if (res.chatgpt_api_key) apiKeyInput.value = res.chatgpt_api_key;
  });

  // Save API key
  saveButton.addEventListener("click", () => {
    const key = apiKeyInput.value.trim();
    if (!key) return log("No API key entered.");
    chrome.storage.local.set({ chatgpt_api_key: key }, () => log("API Key saved!"));
  });

  // Clear saved sites
  clearSitesButton.addEventListener("click", () => {
    chrome.storage.local.get(null, items => {
      const keysToRemove = Object.keys(items).filter(k => k.startsWith("site_is_news_"));
      chrome.storage.local.remove(keysToRemove, () => log("Saved news sites cleared."));
    });
  });

  // Start censorship
  sendButton.addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const tab = tabs[0];
    if (!tab) return log("No active tab found.");

    chrome.storage.local.get("chatgpt_api_key", res => {
      const key = res.chatgpt_api_key;
      if (!key) return log("No API key saved!");

      // Stuur tabId expliciet mee
      const sendMsg = typeof browser !== "undefined" ? browser.runtime.sendMessage : chrome.runtime.sendMessage;
      sendMsg({
        action: "startCensorship",
        apiKey: key,
        url: tab.url,
        tabId: tab.id
      });
    });
  });
});


  // Receive logs
  chrome.runtime.onMessage.addListener(msg => {
    if (msg.action === "logMessage" && msg.message) log(msg.message);
  });
});