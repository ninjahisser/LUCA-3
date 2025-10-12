console.log("content.js loaded");

// Inject CSS for censor effect
const style = document.createElement("style");
style.textContent = `
  .UnBiased_Censored {
    background-color: black !important;
    color: black !important;
    border-radius: 2px;
  }
`;
(document.head || document.documentElement).appendChild(style);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
if (message.action === "getHTML") {
  const text = document.body.innerText;
  console.log("HTML Text:" + text);
  sendResponse({ html: text });
}

  if (message.action === "replaceMainHTML") {
    const { html, toMark } = message;
    if (!html) return sendResponse({ success: false });

    let newHTML = html;
    if (Array.isArray(toMark)) {
      toMark.forEach(text => {
        const safe = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(safe, "gi");
        newHTML = newHTML.replace(regex, match => `<span class="UnBiased_Censored">${match}</span>`);
      });
    }

    const main = document.querySelector("main") || document.body;
    main.innerHTML = newHTML;
    console.log(`🔒 Applied ${toMark.length} censorship marks.`);
    sendResponse({ success: true });
  }

  if (message.action === "logMessage") {
    console.log("📩 LOG:", message.message);
  }
});
