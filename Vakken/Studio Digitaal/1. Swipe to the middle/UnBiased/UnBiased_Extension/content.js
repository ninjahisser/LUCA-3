console.log("content.js loaded");

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getHTML") {
    sendResponse({ html: document.documentElement.outerHTML });
  }

  if (message.action === "censorText") {
    const { sideToCensor } = message.data;
    censorPage(sideToCensor);
  }

  if (message.action === "logMessage") {
    console.log("📩 LOG:", message.message);
  }
});

function censorPage(side) {
  if (!side) return;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const texts = [];
  while (walker.nextNode()) texts.push(walker.currentNode);

  texts.forEach(node => {
    if (node.nodeValue.toLowerCase().includes(side)) {
      node.nodeValue = "█".repeat(node.nodeValue.length);
    }
  });
  console.log(`🔒 Censored all mentions of "${side}".`);
}
