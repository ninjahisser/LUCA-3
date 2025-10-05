console.log("UnBiased content script loaded");

// Inject style
const style = document.createElement("style");
style.id = "UnBiasedStyle";
style.textContent = `
  .UnBiased_Censored {
    background-color: black !important;
    color: black !important;
    padding: 0 2px;
    border-radius: 2px;
  }
`;
(document.head || document.documentElement).appendChild(style);

// Listen for messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getHTML") {
    // Try to find <main>, fallback to <body>
    const main = document.querySelector("main") || document.body;
    if (main) sendResponse({ html: main.innerHTML });
    else sendResponse({ html: null });
    return true;
  }

  if (message.action === "replaceMainHTML" && message.html) {
    const main = document.querySelector("main") || document.body;
    if (main) {
      main.innerHTML = message.html;
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: "No <main> or <body> found" });
    }
    return true;
  }
});
