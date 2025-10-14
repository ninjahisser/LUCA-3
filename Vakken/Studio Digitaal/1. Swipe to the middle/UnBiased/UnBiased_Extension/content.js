console.log("content.js loaded");

// Inject CSS for censor effect
const style = document.createElement("style");
style.textContent = `
  .UnBiased_Censored {
    margin: 0 -0.4em;
    padding: 0.1em 0.4em;
    border-radius: 0.8em 0.3em;
    background: transparent;
      background-image: linear-gradient( to right, 
      rgba(178, 0, 0, 1) 2%, 
      rgba(157, 0, 0, 1) 4%, 
      rgba(228, 7, 7, 0.87) 
    );
  
    color: rgba(0, 0, 0, 0) !important;
  
    -webkit-box-decoration-break: clone;
    box-decoration-break: clone;
    color: rgba(255, 225, 0, 0.7);
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