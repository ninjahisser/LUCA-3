document.addEventListener("DOMContentLoaded", () => {
  const apiKeyInput = document.getElementById("apiKey");
  const saveButton = document.getElementById("saveKey");
  const sendHelloButton = document.getElementById("sendHello");
  const output = document.getElementById("output");

  // Load saved API key
  chrome.storage.local.get("chatgpt_api_key", res => {
    if (res.chatgpt_api_key) apiKeyInput.value = res.chatgpt_api_key;
  });

  // Save API key
  saveButton.addEventListener("click", () => {
    const key = apiKeyInput.value.trim();
    if (!key) return output.textContent = "Please enter a valid API key.";

    chrome.storage.local.set({ chatgpt_api_key: key }, () => {
      output.textContent = "API Key saved!";
    });
  });

  // Send hello message
  sendHelloButton.addEventListener("click", () => {
    output.textContent = "ChatGPT: loading...";

    chrome.storage.local.get("chatgpt_api_key", res => {
      const key = res.chatgpt_api_key;
      if (!key) return output.textContent = "No API key saved!";

      chrome.runtime.sendMessage(
        { action: "sendToChatGPT", apiKey: key, content: "hello" },
        response => {
          console.log("Full response:", response);

          if (!response) return output.textContent = "No response from background.js";

          if (response.success) {
            const reply = response.data?.choices?.[0]?.message?.content || "No reply";
            output.textContent = "ChatGPT: " + reply;
          } else {
            output.textContent = "Error: " + response.error;
          }
        }
      );
    });
  });
});
