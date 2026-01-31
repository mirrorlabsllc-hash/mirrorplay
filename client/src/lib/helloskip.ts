// Dynamically loaded HelloSkip loader. This file is only imported when
// VITE_SKIP_ENABLED is 'true' to avoid bundling HelloSkip into the main bundle.
export function loadHelloSkip() {
  const timeoutId = setTimeout(() => {
    console.warn('HelloSkip initialization timed out, continuing app load');
  }, 3000);

  try {
    const script = document.createElement('script');
    script.src = 'https://helloskip.com/agent.js';
    script.setAttribute('data-agent-id', 'Peg1BLQyFb8lqkSQkoto');

    script.onload = () => {
      clearTimeout(timeoutId);
      console.log('HelloSkip loaded successfully');
    };

    script.onerror = () => {
      clearTimeout(timeoutId);
      console.warn('HelloSkip script failed to load, continuing app load');
    };

    document.head.appendChild(script);
  } catch (e) {
    clearTimeout(timeoutId);
    console.warn('HelloSkip initialization failed, continuing app load', e);
  }
}
