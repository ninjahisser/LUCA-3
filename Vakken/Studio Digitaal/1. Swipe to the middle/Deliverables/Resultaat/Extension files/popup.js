function apiKeyLoaded(){
  console.log("API KEY LOADED");
  document.getElementById("no_api_key").style.display = "none";
}

document.addEventListener("DOMContentLoaded", () => {
  const apiKeyInput = document.getElementById("apiKey");
  const saveButton = document.getElementById("saveKey");
  const sendButton = document.getElementById("sendHello");
  //const clearSitesButton = document.getElementById("clearSites");
  const output = document.getElementById("output");

  const autoCheckbox = document.getElementById("auto_activate");
  if (!autoCheckbox) return;

  // Load saved state (default: false)
  chrome.storage.local.get("auto_activate", (res) => {
    autoCheckbox.checked = !!res.auto_activate;
  });

  // Save when changed
  autoCheckbox.addEventListener("change", () => {
    chrome.storage.local.set({ auto_activate: !!autoCheckbox.checked });
  });

  function log(msg) {
    //output.textContent += msg + "\n";
    //output.scrollTop = output.scrollHeight;
  }

  // Load saved API key
  chrome.storage.local.get("chatgpt_api_key", res => {
    if (res.chatgpt_api_key) {
      apiKeyInput.value = res.chatgpt_api_key;
      apiKeyLoaded();
    }
  });

  // Save API key
  saveButton.addEventListener("click", () => {
    const key = apiKeyInput.value.trim();
    if (!key) return log("No API key entered.");
    chrome.storage.local.set({ chatgpt_api_key: key }, () => log("API Key saved!"));
    apiKeyLoaded();
  });

  // Clear saved sites
  //clearSitesButton.addEventListener("click", () => {
  //  chrome.storage.local.get(null, items => {
  //    const keysToRemove = Object.keys(items).filter(k => k.startsWith("site_is_news_"));
  //    chrome.storage.local.remove(keysToRemove, () => log("Saved news sites cleared."));
  //  });
  //});

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