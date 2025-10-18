let loading = false;

console.log("content.js loaded");

// Inject CSS for censor effect and tooltip
const style = document.createElement("style");
style.textContent = `
.UnBiased_Censored_Chosen,
.UnBiased_Censored_Other {
  transition-duration: 0.3s;
  margin: 0 -0.4em;
  padding: 0.1em 0.4em;
  border-radius: 0.8em 0.3em;
  background: transparent;
  -webkit-box-decoration-break: clone;
  box-decoration-break: clone;
  color: rgba(0, 0, 0, 0) !important;
}

/* Chosen gradient */
.UnBiased_Censored_Chosen {
  background-image: linear-gradient(
    to right,
    rgba(0, 128, 178, 1) 30%,
    rgba(0, 92, 157, 1) 60%,
    rgba(7, 22, 228, 0.87)
  );
}

/* Other gradient */
.UnBiased_Censored_Other {
  background-image: linear-gradient(
    to right,
    rgba(173, 25, 232, 1) 30%,
    rgba(227, 135, 255, 1) 60%,
    rgba(228, 51, 255, 0.87)
  );
}

/* Hover transparency */
.UnBiased_Censored_Chosen:hover {
  background-image: linear-gradient(
    to right,
    rgba(190, 223, 236, 0.9) 30%,
    rgba(194, 215, 231, 0.9) 60%,
    rgba(195, 197, 223, 0.9)
  ) !important;
  color: initial !important;
}

.UnBiased_Censored_Other:hover {
  background-image: linear-gradient(
    to right,
    rgba(222, 203, 229, 0.9) 30%,
    rgba(217, 201, 222, 0.9) 60%,
    rgba(216, 201, 218, 0.9)
  ) !important;
  color: initial !important;
}
`;
(document.head || document.documentElement).appendChild(style);

// Create tooltip
const tooltip = document.createElement("div");
tooltip.id = "unbiased-tooltip";
document.documentElement.appendChild(tooltip);

let tooltipVisible = false;
let tooltipHideTimeout = null;

function showTooltip(text, x, y) {
  if (!text) return;
  tooltip.textContent = text;
  tooltip.style.left = (x + 12) + "px";
  tooltip.style.top = (y + 12) + "px";
  tooltip.style.opacity = "1";
  tooltipVisible = true;
  if (tooltipHideTimeout) clearTimeout(tooltipHideTimeout);
}

function hideTooltipSoon() {
  tooltipHideTimeout = setTimeout(() => {
    tooltip.style.opacity = "0";
    tooltipVisible = false;
  }, 100);
}

// Event listeners for censored hover/clicks
document.addEventListener("click", (e) => {
  const t = e.target;
  if (t && (t.classList.contains("UnBiased_Censored_Chosen") || t.classList.contains("UnBiased_Censored_Other"))) {
    e.preventDefault();
    e.stopPropagation();
    return;
  }
});

document.addEventListener("mouseover", (e) => {
  const t = e.target;
  if (!t) return;
  if (t.classList && (t.classList.contains("UnBiased_Censored_Chosen") || t.classList.contains("UnBiased_Censored_Other"))) {
    const reason = t.getAttribute("data-reason") || t.title || "";
    showTooltip(reason, e.clientX, e.clientY);
  }
});

document.addEventListener("mousemove", (e) => {
  if (!tooltipVisible) return;
  tooltip.style.left = (e.clientX + 12) + "px";
  tooltip.style.top = (e.clientY + 12) + "px";
});

document.addEventListener("mouseout", (e) => {
  const t = e.target;
  if (t && t.classList && (t.classList.contains("UnBiased_Censored_Chosen") || t.classList.contains("UnBiased_Censored_Other"))) {
    hideTooltipSoon();
  }
});

// Censor animation
const censored_style = document.createElement("style");
censored_style.textContent = `
h1, h2, h3, h4, h5, h6, p {
  transition-duration: 0.3s;
  margin: 0 -0.4em;
  padding: 0.1em 0.4em;
  border-radius: 0.8em 0.3em;
  background: linear-gradient(
    to right,
    rgba(0, 128, 178, 1) 30%,
    rgba(198, 231, 255, 1) 60%,
    rgba(15, 87, 202, 0.87)
  );
  background-size: 200% 100%;
  animation: scrollColor 1.5s linear infinite;
  -webkit-box-decoration-break: clone;
  box-decoration-break: clone;
  color: rgba(0, 0, 0, 0) !important;
}
@keyframes scrollColor {
  0% { background-position: 0% 0%; }
  50% { background-position: 100% 0%; }
  100% { background-position: 0% 0%; }
}
`;

// --- Loading overlay setup ---
const loadingOverlay = document.createElement("div");
loadingOverlay.id = "loadingOverlay";
loadingOverlay.innerHTML = `
  <div class="boo-text">
    B<span class="boo-o">OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO</span>
  </div>
  <div class="boo-sub">Fighting the BIAS...</div>
`;
const loadingStyle = document.createElement("style");
loadingStyle.textContent = `

`;
document.head.appendChild(loadingStyle);
document.body.appendChild(loadingOverlay);

function startLoading() {
  loading = true;
  loadingOverlay.style.display = "flex";
  loadingOverlay.style.opacity = "1";
}

function stopLoading() {
  loading = false;
  loadingOverlay.style.opacity = "0";
  setTimeout(() => (loadingOverlay.style.display = "none"), 500);
}

// --- Chrome message handling ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getHTML") {
    const html = document.documentElement.outerHTML;
    sendResponse({ html });
  }

  if (message.action === "replaceMainHTML") {
    const newHTML = message.html;
    document.body.innerHTML = newHTML;

    const scripts = document.body.querySelectorAll("script");
    scripts.forEach(oldScript => {
      const newScript = document.createElement("script");
      if (oldScript.src) newScript.src = oldScript.src;
      else newScript.textContent = oldScript.textContent;
      oldScript.replaceWith(newScript);
    });

    censored_style.remove();
    stopLoading();
  }

  if (message.action === "censorAllText") {
    (document.head || document.documentElement).appendChild(censored_style);
    startLoading();
  }

  return true;
});
