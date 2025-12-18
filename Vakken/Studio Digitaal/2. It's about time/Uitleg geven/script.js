// Load and play Lottie animations

// Load LichaamAnimatie (body animation)
const lichaamAnimation = lottie.loadAnimation({
    container: document.getElementById('lichaam-container'),
    renderer: 'svg',
    loop: true,
    autoplay: true,
    path: 'LichaamAnimatie.json'
});

// Load OogAnimatie (eye animation) - don't autoplay, don't loop
const oogAnimation = lottie.loadAnimation({
    container: document.getElementById('oog-container'),
    renderer: 'svg',
    loop: false,
    autoplay: false,
    path: 'OogAnimatie.json'
});

// Play eye animation on click (blink)
const oogContainer = document.getElementById('oog-container');
oogContainer.style.cursor = 'pointer';
oogContainer.addEventListener('click', () => {
    oogAnimation.goToAndPlay(0); // Start from beginning and play
});

// Speed slider control for body animation
const speedSlider = document.getElementById('speed-slider');
const speedValue = document.getElementById('speed-value');

speedSlider.addEventListener('input', (e) => {
    const speed = parseFloat(e.target.value);
    lichaamAnimation.setSpeed(speed);
    speedValue.textContent = speed.toFixed(1) + 'x';
});

// Make eye follow cursor
const animationStack = document.querySelector('.animation-stack');

animationStack.addEventListener('mousemove', (e) => {
    const rect = animationStack.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Calculate mouse position relative to center
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Calculate offset (limit the movement to 15% of container size)
    const maxOffset = 15; // percentage
    const offsetX = ((mouseX - centerX) / centerX) * maxOffset;
    const offsetY = ((mouseY - centerY) / centerY) * maxOffset;
    
    // Apply transform to eye container
    oogContainer.style.transform = `translate(${offsetX}%, ${offsetY}%)`;
});

// Reset eye position when mouse leaves
animationStack.addEventListener('mouseleave', () => {
    oogContainer.style.transform = 'translate(0, 0)';
});
