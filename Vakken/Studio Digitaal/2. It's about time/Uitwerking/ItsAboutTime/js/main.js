console.log('main.js loaded');

// Main initialization
init();

async function init() {
    const clockElement = document.getElementById('clock');
    const currentClockLabel = document.getElementById('current-clock');

    const data = await fetch('manifest.json').then(r => r.json());
    const clocks = Object.keys(data.Clocks || {});
    if (clocks.length === 0) {
        console.warn('No clocks found in manifest');
        return;
    }

    let currentIndex = Math.max(0, clocks.indexOf('BeadsClock'));
    if (currentIndex === -1) currentIndex = 0;

    // time override state (shared across clocks)
    const timeOverride = { enabled: false, hours: 12, minutes: 30, seconds: 0, milliseconds: 0 };

    // simulation clock (for speed multiplier)
    let speed = 1; // 1x..100x
    let simBaseReal = performance.now(); // ms
    let simBaseTime = Date.now(); // epoch ms

    function currentSimNowMs() {
        // if override active, caller should ignore sim time and use override values
        const nowReal = performance.now();
        const elapsed = nowReal - simBaseReal;
        return simBaseTime + elapsed * speed;
    }

    function setSpeed(newSpeed) {
        // re-anchor base so time remains continuous when changing speed
        const nowSim = currentSimNowMs();
        simBaseTime = nowSim;
        simBaseReal = performance.now();
        speed = newSpeed;
    }

    // show a clock by index
    async function showClock(index) {
        const clockName = clocks[index];
        if (currentClockLabel) currentClockLabel.textContent = clockName;
        // clear existing
        clockElement.innerHTML = '';

        const files = data.Clocks[clockName].files || [];

        // add elements (preserve original innerHTML style)
        files.forEach(f => {
            console.log('Loading', f);
            clockElement.innerHTML += `\n<dotlottie-wc class="anim" src="Clocks/${clockName}/${f}" speed="1" mode="forward" loop autoplay></dotlottie-wc>`;
        });

        // helper wait
        async function waitLoaded(el, timeout = 5000) {
            const start = Date.now();
            return new Promise((resolve, reject) => {
                function check() {
                    try { if (el.dotLottie && el.dotLottie.isLoaded) return resolve(el.dotLottie); } catch (e) {}
                    if (Date.now() - start > timeout) return reject(new Error('dotLottie load timeout'));
                    requestAnimationFrame(check);
                }
                check();
            });
        }

        // gather anims
        const animEls = Array.from(clockElement.querySelectorAll('.anim'));
        const anims = animEls.map((el, idx) => {
            const f = files[idx] || '';
            const lower = f.toLowerCase();
            const is24h = lower.includes('24h');
            const is1h = lower.includes('1h') || lower.includes('-1h');
            const is1m = lower.includes('1m') || lower.includes('-1m');
            const is1s = lower.includes('1s') || lower.includes('-1s');
            return { file: f, el, is24h, is1h, is1m, is1s, dot: null };
        });

        // wait for load
        await Promise.all(anims.map(async a => {
            try {
                a.dot = await waitLoaded(a.el, 8000);
                try { a.dot.pause(); } catch (e) {}

                // Some animations may need a short moment after isLoaded before
                // properties like totalFrames/duration are available. Wait until
                // the player reports usable frame information before we try
                // setting frames. This is generic (no clock-specific code).
                async function waitReady(dot, timeout = 5000) {
                    const start = Date.now();
                    return new Promise((resolve) => {
                        let resolved = false;
                        function done(val) { if (!resolved) { resolved = true; resolve(val); } }

                        // If totalFrames or duration become available, we're good
                        function checkProps() {
                            try {
                                const tf = dot.totalFrames;
                                const dur = dot.duration;
                                if ((typeof tf === 'number' && tf > 1) || (typeof dur === 'number' && dur > 0)) {
                                    return done(true);
                                }
                            } catch (e) {}
                            if (Date.now() - start > timeout) return done(false);
                            requestAnimationFrame(checkProps);
                        }

                        // Also listen for the 'frame' event which indicates the player produced a frame
                        const frameHandler = () => { done(true); };
                        try { dot.addEventListener('frame', frameHandler); } catch (e) {}

                        checkProps();

                        // ensure we cleanup the listener when resolved
                        const cleanup = () => { try { dot.removeEventListener && dot.removeEventListener('frame', frameHandler); } catch (e) {} };
                        // wrap resolve to cleanup
                        const origResolve = resolve;
                        resolve = (v) => { cleanup(); origResolve(v); };
                    });
                }

                const ready = await waitReady(a.dot, 5000);
                if (!ready) {
                    // still attempt a small setFrame to nudge the player
                    try { a.dot.setFrame(0); a.dot.pause(); } catch (e) {}
                }
            } catch (err) {
                console.warn('Failed to load', a.file, err);
            }
        }));

        // apply time
        function applyTimeToAnims() {
            let now;
            if (timeOverride.enabled) {
                // when override is enabled, use the explicit override values (speed ignored)
                now = new Date();
                now.setHours(timeOverride.hours);
                now.setMinutes(timeOverride.minutes);
                now.setSeconds(timeOverride.seconds || 0);
                now.setMilliseconds(timeOverride.milliseconds || 0);
            } else {
                // otherwise compute simulated now using speed multiplier
                now = new Date(currentSimNowMs());
            }

            const hours = now.getHours();
            const minutes = now.getMinutes();
            const seconds = now.getSeconds();
            const ms = now.getMilliseconds();

            anims.forEach(a => {
                if (!a.dot) return;
                const total = a.dot.totalFrames || 1;
                let progress = 0;

                if (a.is1s) {
                    // progress within the current second
                    progress = (ms) / 1000;
                } else if (a.is1m) {
                    // progress within current minute
                    progress = (seconds + ms/1000) / 60;
                } else if (a.is1h) {
                    // progress within current hour
                    progress = (minutes + seconds/60 + ms/60000) / 60;
                } else if (a.is24h) {
                    // progress across 24 hours
                    progress = (hours + minutes/60 + seconds/3600 + ms/3600000) / 24;
                } else {
                    // fallback: treat as 24h
                    progress = (hours + minutes/60 + seconds/3600 + ms/3600000) / 24;
                }

                progress = Math.min(1, Math.max(0, progress));
                const frame = Math.max(0, Math.min(total - 1, Math.round(progress * (total - 1))));
                try { a.dot.setFrame(frame); a.dot.pause(); } catch (e) { console.warn('Could not set frame for', a.file, e); }
            });
        }

        // initial apply
        applyTimeToAnims();

        // return control object so outer scope could call applyTimeToAnims if needed
        return { applyTimeToAnims };
    }

    // navigation
    let currentApply = null; // function to call to update frames for current clock
    let rafId = null;

    async function doShowClock(index) {
        // await showClock to finish and get its control object
        const control = await showClock(index);
        currentApply = control && control.applyTimeToAnims ? control.applyTimeToAnims : null;
        // run immediately
        if (currentApply) currentApply();
        // restart rAF loop
        if (rafId) cancelAnimationFrame(rafId);
        const loop = () => { if (currentApply) currentApply(); rafId = requestAnimationFrame(loop); };
        rafId = requestAnimationFrame(loop);
    }

    function nextClock() { currentIndex = (currentIndex + 1) % clocks.length; doShowClock(currentIndex); }
    function prevClock() { currentIndex = (currentIndex - 1 + clocks.length) % clocks.length; doShowClock(currentIndex); }

    // wire up buttons and keyboard
    const prevBtn = document.getElementById('prev-clock');
    const nextBtn = document.getElementById('next-clock');
    if (prevBtn) prevBtn.addEventListener('click', () => prevClock());
    if (nextBtn) nextBtn.addEventListener('click', () => nextClock());

    window.addEventListener('keydown', (e) => {
        // don't intercept keys when typing in inputs
        const active = document.activeElement;
        const typing = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);
        if (!typing) {
            if (e.key === 'ArrowLeft') { prevClock(); }
            if (e.key === 'ArrowRight') { nextClock(); }
            if (e.code === 'Space' || e.key === ' ') {
                // toggle debug/time-override UI and clock selector together by toggling
                // a class on <body>. This avoids conflicts with stylesheet defaults.
                if (document.body) {
                    document.body.classList.toggle('debug-shown');
                    e.preventDefault();
                }
                // Ensure debug hand UI visibility updates when toggling
                toggleHandDebugVisibility();
            }
        }
    });

    // hook up override UI (shared)
    const overrideEnableEl = document.getElementById('override-enable');
    const overrideHourEl = document.getElementById('override-hour');
    const overrideMinuteEl = document.getElementById('override-minute');
    const overrideSecondEl = document.getElementById('override-second');
    const overrideNowBtn = document.getElementById('override-now');
    const overrideClearBtn = document.getElementById('override-clear');
    const overrideSpeedEl = document.getElementById('override-speed');
    const speedValueEl = document.getElementById('speed-value');

    function readOverrideInputs() {
        if (!overrideHourEl || !overrideMinuteEl || !overrideSecondEl) return;
        const h = parseInt(overrideHourEl.value, 10);
        const m = parseInt(overrideMinuteEl.value, 10);
        const s = parseInt(overrideSecondEl.value, 10) || 0;
        timeOverride.hours = isNaN(h) ? 0 : Math.max(0, Math.min(23, h));
        timeOverride.minutes = isNaN(m) ? 0 : Math.max(0, Math.min(59, m));
        timeOverride.seconds = isNaN(s) ? 0 : Math.max(0, Math.min(59, s));
        timeOverride.milliseconds = 0;
    }

    // speed control
    if (overrideSpeedEl) {
        overrideSpeedEl.addEventListener('input', (e) => {
            const v = parseFloat(e.target.value) || 1;
            setSpeed(v);
            if (speedValueEl) speedValueEl.textContent = v + 'x';
            // apply immediately
            if (currentApply) currentApply();
        });
        // initialize display
        if (speedValueEl) speedValueEl.textContent = String(overrideSpeedEl.value) + 'x';
    }

    if (overrideEnableEl) {
        overrideEnableEl.addEventListener('change', e => {
            timeOverride.enabled = !!e.target.checked;
            if (timeOverride.enabled) readOverrideInputs();
            // just update frames, don't reload DOM
            if (!timeOverride.enabled) {
                // when leaving override mode, re-anchor simulation to current real time
                simBaseTime = Date.now();
                simBaseReal = performance.now();
            }
            if (currentApply) currentApply();
        });
    }
    if (overrideHourEl) overrideHourEl.addEventListener('input', () => { readOverrideInputs(); if (timeOverride.enabled && currentApply) currentApply(); });
    if (overrideMinuteEl) overrideMinuteEl.addEventListener('input', () => { readOverrideInputs(); if (timeOverride.enabled && currentApply) currentApply(); });
    if (overrideSecondEl) overrideSecondEl.addEventListener('input', () => { readOverrideInputs(); if (timeOverride.enabled && currentApply) currentApply(); });
    if (overrideNowBtn) overrideNowBtn.addEventListener('click', () => {
        const now = new Date();
        if (overrideHourEl) overrideHourEl.value = String(now.getHours());
        if (overrideMinuteEl) overrideMinuteEl.value = String(now.getMinutes());
        if (overrideSecondEl) overrideSecondEl.value = String(now.getSeconds());
        if (overrideEnableEl) overrideEnableEl.checked = true;
        readOverrideInputs();
        timeOverride.enabled = true;
        if (currentApply) currentApply();
    });
    if (overrideClearBtn) overrideClearBtn.addEventListener('click', () => {
        if (overrideEnableEl) overrideEnableEl.checked = false;
        timeOverride.enabled = false;
        if (currentApply) currentApply();
    });

    // --- Hand Tracking / Gesture Swipe Setup (TensorFlow.js HandPose) ---
    async function loadScript(src) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) return resolve();
            const s = document.createElement('script');
            s.src = src;
            s.onload = resolve;
            s.onerror = reject;
            document.head.appendChild(s);
        });
    }

    function ensureDebugHandUI() {
        let container = document.getElementById('hands-debug');
        if (!container) {
            container = document.createElement('div');
            container.id = 'hands-debug';
            container.style.cssText = 'position:relative;display:flex;flex-direction:column;gap:4px;padding:4px;background:#111;color:#fff;font:12px/1.4 monospace;max-width:340px;';
            container.className = 'hands-debug';
            const title = document.createElement('div');
            title.textContent = 'Hand Tracking';
            title.style.fontWeight = 'bold';
            const status = document.createElement('div');
            status.id = 'hands-status';
            status.textContent = 'Loading...';
            const video = document.createElement('video');
            video.id = 'hands-video';
            video.playsInline = true;
            video.muted = true;
            video.autoplay = true;
            video.style.cssText = 'width:320px;height:240px;background:#000;';
            const canvas = document.createElement('canvas');
            canvas.id = 'hands-canvas';
            canvas.width = 320;
            canvas.height = 240;
            canvas.style.cssText = 'position:absolute;left:0;top:0;width:320px;height:240px;pointer-events:none;';
            const videoWrap = document.createElement('div');
            videoWrap.style.cssText = 'position:relative;width:320px;height:240px;';
            videoWrap.appendChild(video);
            videoWrap.appendChild(canvas);
            container.appendChild(title);
            container.appendChild(videoWrap);
            container.appendChild(status);
            const host = document.getElementById('debug-panel') || document.body;
            host.appendChild(container);
        }
        return container;
    }

    function toggleHandDebugVisibility() {
        const shown = document.body && document.body.classList.contains('debug-shown');
        const el = document.getElementById('hands-debug');
        if (el) el.style.display = shown ? 'block' : 'none';
    }

    const bodyObserver = new MutationObserver(toggleHandDebugVisibility);
    if (document.body) bodyObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    // Swipe detection state
    let swipeHistory = [];
    let lastSwipeTs = 0;
    const SWIPE_WINDOW_MS = 500;
    const SWIPE_MIN_DELTA = 100; // pixels
    const SWIPE_COOLDOWN = 1000;

    function detectSwipe(x) {
        const now = performance.now();
        swipeHistory.push({ x, t: now });
        swipeHistory = swipeHistory.filter(p => now - p.t <= SWIPE_WINDOW_MS);
        if (now - lastSwipeTs < SWIPE_COOLDOWN) return;

        if (swipeHistory.length >= 5) {
            const first = swipeHistory[0];
            const last = swipeHistory[swipeHistory.length - 1];
            const delta = last.x - first.x;
            if (delta > SWIPE_MIN_DELTA) {
                lastSwipeTs = now;
                prevClock();
                console.log('Swipe right detected');
            } else if (delta < -SWIPE_MIN_DELTA) {
                lastSwipeTs = now;
                nextClock();
                console.log('Swipe left detected');
            }
        }
    }

    async function setupHandTracking() {
        ensureDebugHandUI();
        toggleHandDebugVisibility();

        const statusEl = document.getElementById('hands-status');
        const videoEl = document.getElementById('hands-video');
        const canvasEl = document.getElementById('hands-canvas');
        const ctx = canvasEl.getContext('2d');

        try {
            // Load TensorFlow.js and HandPose with correct CDN URLs
            if (statusEl) statusEl.textContent = 'Loading TensorFlow...';
            await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-core');
            await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-converter');
            await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-webgl');
            await loadScript('https://unpkg.com/@tensorflow-models/hand-pose-detection@2.1.0');
            
            if (statusEl) statusEl.textContent = 'Creating detector...';
            
            await tf.ready();
            
            const model = handPoseDetection.SupportedModels.MediaPipeHands;
            const detector = await handPoseDetection.createDetector(model, {
                runtime: 'tfjs',
                modelType: 'lite'
            });
            
            if (statusEl) statusEl.textContent = 'Model loaded';

            // Start camera
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { width: 320, height: 240, facingMode: 'user' }, 
                audio: false 
            });
            videoEl.srcObject = stream;
            await videoEl.play();
            
            if (statusEl) statusEl.textContent = 'Camera ready';

            async function runDetection() {
                try {
                    const hands = await detector.estimateHands(videoEl);
                    const shown = document.body && document.body.classList.contains('debug-shown');
                    
                    if (shown) {
                        // Draw video frame
                        ctx.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);
                        
                        // Draw hand landmarks
                        if (hands.length > 0) {
                            hands.forEach(hand => {
                                const keypoints = hand.keypoints;
                                
                                // Draw points
                                ctx.fillStyle = '#0f0';
                                keypoints.forEach(kp => {
                                    ctx.beginPath();
                                    ctx.arc(kp.x, kp.y, 4, 0, Math.PI * 2);
                                    ctx.fill();
                                });
                                
                                // Draw connections
                                ctx.strokeStyle = '#0f0';
                                ctx.lineWidth = 2;
                                const fingers = [
                                    [0, 1, 2, 3, 4],
                                    [0, 5, 6, 7, 8],
                                    [0, 9, 10, 11, 12],
                                    [0, 13, 14, 15, 16],
                                    [0, 17, 18, 19, 20]
                                ];
                                fingers.forEach(finger => {
                                    for (let i = 0; i < finger.length - 1; i++) {
                                        const kp1 = keypoints[finger[i]];
                                        const kp2 = keypoints[finger[i + 1]];
                                        ctx.beginPath();
                                        ctx.moveTo(kp1.x, kp1.y);
                                        ctx.lineTo(kp2.x, kp2.y);
                                        ctx.stroke();
                                    }
                                });
                                
                                // Use wrist position for swipe
                                const wrist = keypoints[0];
                                detectSwipe(wrist.x);
                            });
                        }

                        if (statusEl) statusEl.textContent = hands.length ? `${hands.length} hand(s)` : 'No hands';
                    } else {
                        ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
                    }
                } catch (e) {
                    console.warn('Detection error:', e);
                }

                requestAnimationFrame(runDetection);
            }

            runDetection();

        } catch (e) {
            console.warn('Hand tracking setup failed:', e);
            if (statusEl) statusEl.textContent = 'Setup failed: ' + (e.message || 'unknown');
        }
    }

    // Ensure hand tracking and clock both start
    setupHandTracking();
    doShowClock(currentIndex);
}
