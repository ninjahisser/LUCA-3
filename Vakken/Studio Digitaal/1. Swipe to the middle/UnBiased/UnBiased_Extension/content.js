document.addEventListener("DOMContentLoaded", () => {

    console.log("UnBiased content script loaded");
    
    // === Inject UnBiased style into every page ===
    const style = document.createElement("style");
style.id = "UnBiasedStyle"; // optional, to avoid duplicates
style.textContent = `
  .UnBiased_Censored {
    background-color: black !important;
    color: black !important;
    padding: 0 2px;
    border-radius: 2px;
  }
`;
(document.head || document.documentElement).appendChild(style);
});

// === Listen for messages from popup.js ===
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "getHTML") {
        const main = document.querySelector("main");
        if (main) {
            sendResponse({ html: main.innerHTML });
        } else {
            sendResponse({ html: null });
        }
    }

    if (message.action === "replaceMainHTML" && message.html) {
        const main = document.querySelector("main");
        if (main) {
            main.innerHTML = message.html;
            sendResponse({ success: true });
        } else {
            sendResponse({ success: false, error: "No <main> found" });
        }
    }
});

