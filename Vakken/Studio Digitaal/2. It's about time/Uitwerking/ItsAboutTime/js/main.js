console.log("main.js loaded");

loadClock("BeadsClock");

async function loadClock(clockName) {
    const clockElement = document.getElementById("clock");
    const data = await fetch("manifest.json").then(r => r.json());
    const files = data.Clocks[clockName].files;

    // Insert animations exactly like your original approach
    files.forEach(f => {
        console.log("Loading " + f);

        clockElement.innerHTML = clockElement.innerHTML +
        `<dotlottie-wc class="anim" src="Clocks/${clockName}/${f}" 
            speed="1" 
            mode="forward" 
            loop 
            autoplay>
        </dotlottie-wc>`;
    });

    // Wait until the element has a ready dotLottie instance with data loaded
    async function waitLoaded(el, timeout = 5000) {
        const start = Date.now();
        return new Promise((resolve, reject) => {
            function check() {
                try {
                    if (el.dotLottie && el.dotLottie.isLoaded) return resolve(el.dotLottie);
                } catch (e) {}
                if (Date.now() - start > timeout) return reject(new Error('dotLottie load timeout'));
                requestAnimationFrame(check);
            }
            check();
        });
    }

    // Gather elements and metadata
    const animEls = Array.from(clockElement.querySelectorAll('.anim'));
    const anims = animEls.map((el, idx) => {
        const f = files[idx] || '';
        const is24h = f.toLowerCase().includes('24');
        const is1h = f.toLowerCase().includes('1h') || f.toLowerCase().includes('-1h');
        return { file: f, el, is24h, is1h, dot: null };
    });

    // wait for all to load
    await Promise.all(anims.map(async a => {
        try {
            a.dot = await waitLoaded(a.el, 8000);
            try { a.dot.pause(); } catch (e) {}
        } catch (err) {
            console.warn('Failed to load', a.file, err);
        }
    }));

    // time override state (for testing via UI)
    const timeOverride = { enabled: false, hours: 12, minutes: 30, seconds: 0 };

    // compute and apply appropriate frame based on current time or override
    function applyTimeToAnims() {
        const nowBase = new Date();
        const now = new Date(nowBase.getTime());
        if (timeOverride.enabled) {
            now.setHours(timeOverride.hours);
            now.setMinutes(timeOverride.minutes);
            now.setSeconds(timeOverride.seconds || 0);
        }
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const seconds = now.getSeconds();

        anims.forEach(a => {
            if (!a.dot) return;
            const total = a.dot.totalFrames || 1;
            let progress = 0;

            if (a.is1h) {
                progress = (minutes + seconds/60) / 60;
            } else if (a.is24h) {
                progress = (hours + minutes/60 + seconds/3600) / 24;
            } else {
                progress = (hours + minutes/60 + seconds/3600) / 24;
            }

            progress = Math.min(1, Math.max(0, progress));
            const frame = Math.max(0, Math.min(total - 1, Math.round(progress * (total - 1))));
            try {
                a.dot.setFrame(frame);
                a.dot.pause();
            } catch (e) {
                console.warn('Could not set frame for', a.file, e);
            }
        });
    }

    applyTimeToAnims();

    // wire up override UI (if present)
    const overrideEnableEl = document.getElementById('override-enable');
    const overrideHourEl = document.getElementById('override-hour');
    const overrideMinuteEl = document.getElementById('override-minute');
    const overrideSecondEl = document.getElementById('override-second');
    const overrideNowBtn = document.getElementById('override-now');
    const overrideClearBtn = document.getElementById('override-clear');

    function readOverrideInputs() {
        if (!overrideHourEl || !overrideMinuteEl || !overrideSecondEl) return;
        const h = parseInt(overrideHourEl.value, 10);
        const m = parseInt(overrideMinuteEl.value, 10);
        const s = parseInt(overrideSecondEl.value, 10) || 0;
        timeOverride.hours = isNaN(h) ? 0 : Math.max(0, Math.min(23, h));
        timeOverride.minutes = isNaN(m) ? 0 : Math.max(0, Math.min(59, m));
        timeOverride.seconds = isNaN(s) ? 0 : Math.max(0, Math.min(59, s));
    }

    if (overrideEnableEl) {
        overrideEnableEl.addEventListener('change', e => {
            timeOverride.enabled = !!e.target.checked;
            if (timeOverride.enabled) readOverrideInputs();
            applyTimeToAnims();
        });
    }
    if (overrideHourEl) overrideHourEl.addEventListener('input', () => { readOverrideInputs(); if (timeOverride.enabled) applyTimeToAnims(); });
    if (overrideMinuteEl) overrideMinuteEl.addEventListener('input', () => { readOverrideInputs(); if (timeOverride.enabled) applyTimeToAnims(); });
    if (overrideSecondEl) overrideSecondEl.addEventListener('input', () => { readOverrideInputs(); if (timeOverride.enabled) applyTimeToAnims(); });
    if (overrideNowBtn) overrideNowBtn.addEventListener('click', () => {
        const now = new Date();
        if (overrideHourEl) overrideHourEl.value = String(now.getHours());
        if (overrideMinuteEl) overrideMinuteEl.value = String(now.getMinutes());
        if (overrideSecondEl) overrideSecondEl.value = String(now.getSeconds());
        if (overrideEnableEl) overrideEnableEl.checked = true;
        readOverrideInputs();
        timeOverride.enabled = true;
        applyTimeToAnims();
    });
    if (overrideClearBtn) overrideClearBtn.addEventListener('click', () => {
        if (overrideEnableEl) overrideEnableEl.checked = false;
        timeOverride.enabled = false;
        applyTimeToAnims();
    });

    // update periodically to keep clock in sync. 15s is a reasonable tradeoff.
    setInterval(applyTimeToAnims, 15000);
}
