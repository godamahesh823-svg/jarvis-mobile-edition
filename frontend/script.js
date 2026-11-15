document.addEventListener('DOMContentLoaded', () => {
  const chat = document.getElementById('chat');
  const input = document.getElementById('msg');
  const sendBtn = document.getElementById('send');

  if (!chat || !input || !sendBtn) {
    console.error("J.A.R.V.I.S elements not found!");
    return;
  }

  function handleSend() {
    const t = input.value.trim();
    if (!t) return;
    
    // Add user message
    addMessage('YOU: ' + t, 'user');
    input.value = '';
    
    // Add processing state
    const processingId = addMessage('J.A.R.V.I.S: Processing...', 'ai');
    
    // Simulate smart response
    setTimeout(() => {
      processingId.innerText = `J.A.R.V.I.S: Command received. Running diagnostics for: "${t}"`;
      chat.scrollTop = chat.scrollHeight;
    }, 1000);
  }

  // Button click trigger
  sendBtn.addEventListener('click', handleSend);

  // Enter key trigger (crucial for mobile/desktop typing)
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  });

  function addMessage(text, who) {
    const d = document.createElement('div');
    d.className = 'msg ' + who;
    d.innerText = text;
    chat.appendChild(d);
    chat.scrollTop = chat.scrollHeight;
    return d; // Returns element so we can update it directly if needed
  }
});
