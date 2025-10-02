// popup.js
// Handles saving API key and sending requests to ChatGPT

// Get references to DOM elements
const apiKeyInput = document.getElementById("apiKey");
const saveButton = document.getElementById("saveKey");
const sendHelloButton = document.getElementById("sendHello");
const output = document.getElementById("output");

// Load saved API key when popup opens
browser.storage.local.get("chatgpt_api_key").then((res) => {
  if (res.chatgpt_api_key) {
    apiKeyInput.value = res.chatgpt_api_key;
  }
});

// Save API key
saveButton.addEventListener("click", () => {
  const key = apiKeyInput.value.trim();
  if (key) {
    browser.storage.local.set({ chatgpt_api_key: key }).then(() => {
      output.textContent = "API Key saved!";
    });
  } else {
    output.textContent = "Please enter a valid API key.";
  }
});

// Send "hello" to ChatGPT
sendHelloButton.addEventListener("click", async () => {
  output.textContent = "ChatGPT: " + "loading...";

  const res = await browser.storage.local.get("chatgpt_api_key");
  const key = res.chatgpt_api_key;

  if (!key) {
    output.textContent = "No API key saved!";
    return;
  }

  // Send message to background.js
  browser.runtime.sendMessage({
    action: "sendToChatGPT",
    apiKey: key,
    content: "hello"
  }).then((response) => {
    if (response.success) {
      const reply = response.data.choices?.[0]?.message?.content || "No reply";
      output.textContent = "ChatGPT: " + reply;
    } else {
      output.textContent = "Error: " + response.error;
    }
  });
});
