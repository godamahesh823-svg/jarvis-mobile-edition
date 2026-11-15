
/* =====================================
   J.A.R.V.I.S - PERSONAL AI ASSISTANT
===================================== */

// 1. API KEY
let API_KEY = localStorage.getItem("jarvis_key");

if (!API_KEY) {
  API_KEY = prompt("Enter your Gemini API Key:");

  if (API_KEY) {
    localStorage.setItem("jarvis_key", API_KEY.trim());
    API_KEY = API_KEY.trim();
  }
}

// 2. GEMINI MODELS
const MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.8-flash"
];

// 3. HTML ELEMENTS
const chat = document.getElementById("chat");
const input = document.getElementById("msg");
const sendBtn = document.getElementById("send");
const micBtn = document.getElementById("mic-btn");
const camBtn = document.getElementById("cam-btn");
const imgInput = document.getElementById("img-input");
const clearBtn = document.getElementById("clear-btn");

// 4. MEMORY
let MEMORY = [];

try {
  MEMORY = JSON.parse(
    localStorage.getItem("jarvis_memory") || "[]"
  );
  if (!Array.isArray(MEMORY)) MEMORY = [];
} catch {
  MEMORY = [];
}

function saveMemory() {
  try {
    localStorage.setItem(
      "jarvis_memory",
      JSON.stringify(MEMORY.slice(-30))
    );
  } catch (error) {
    console.error("Memory save failed:", error);
  }
}

// 5. CHAT MESSAGE
function add(message, sender) {
  const div = document.createElement("div");

  div.className = "msg " + sender;
  div.innerText = message;

  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;

  return div;
}

// 6. RESTORE CHAT
MEMORY.forEach(item => {
  add(
    (item.role === "user" ? "YOU: " : "J.A.R.V.I.S: ") +
    item.text,
    item.role === "user" ? "user" : "ai"
  );
});

// 7. GEMINI API
async function callGemini(promptText, imageData = null) {

  if (!API_KEY) {
    throw new Error("Gemini API key is missing.");
  }

  const contents = MEMORY.slice(-12).map(item => ({
    role: item.role,
    parts: [{ text: item.text }]
  }));

  const parts = [{ text: promptText }];

  if (imageData) {
    parts.push({
      inline_data: {
        mime_type: imageData.mime,
        data: imageData.base64
      }
    });
  }

  contents.push({
    role: "user",
    parts: parts
  });

  let lastError;

  for (const model of MODELS) {
    try {

      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/" +
        model +
        ":generateContent",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": API_KEY
          },
          body: JSON.stringify({
            contents: contents,
            generationConfig: {
              maxOutputTokens: 256,
              temperature: 0.7
            }
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error?.message || "API Error " + response.status
        );
      }

      const reply = data.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "")
        .join("")
        .trim();

      if (!reply) {
        throw new Error("Gemini returned an empty response.");
      }

      return reply;

    } catch (error) {

      lastError = error;
      console.error(model, error.message);

      const retryable =
        /404|429|500|502|503|504|not found|quota|rate|unavailable|high demand|temporar|overload/i
          .test(error.message);

      if (retryable) continue;

      throw error;
    }
  }

  throw lastError || new Error("All Gemini models failed.");
}

// 8. SAVE CONVERSATION
function remember(userText, reply) {

  MEMORY.push(
    { role: "user", text: userText },
    { role: "model", text: reply }
  );

  MEMORY = MEMORY.slice(-30);
  saveMemory();
}

// 9. ASK JARVIS
async function askGemini(promptText, imageData = null) {

  const thinking = add(
    "J.A.R.V.I.S: Thinking...",
    "ai"
  );

  sendBtn.disabled = true;

  try {

    const reply = await callGemini(promptText, imageData);

    thinking.innerText = "J.A.R.V.I.S: " + reply;

    remember(promptText, reply);

    speak(reply);

  } catch (error) {

    thinking.innerText =
      "J.A.R.V.I.S ERROR: " + error.message;

    console.error("JARVIS:", error);

  } finally {

    sendBtn.disabled = false;
    chat.scrollTop = chat.scrollHeight;

  }
}

// 10. SEND MESSAGE
function sendMessage() {

  const text = input.value.trim();

  if (!text || sendBtn.disabled) return;

  add("YOU: " + text, "user");

  input.value = "";

  askGemini(text);
}

sendBtn.addEventListener("click", sendMessage);

input.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    sendMessage();
  }
});

// 11. CAMERA / IMAGE ANALYSIS
if (camBtn && imgInput) {

  camBtn.addEventListener("click", () => {
    imgInput.click();
  });

  imgInput.addEventListener("change", () => {

    const file = imgInput.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      add("Please select a valid image.", "ai");
      imgInput.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      add("Image is too large. Choose an image below 10 MB.", "ai");
      imgInput.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {

      const base64 = reader.result.split(",")[1];

      const question =
        input.value.trim() ||
        "Describe this image in detail.";

      add("YOU: [IMAGE] " + question, "user");

      input.value = "";

      askGemini(question, {
        base64: base64,
        mime: file.type
      });

      imgInput.value = "";
    };

    reader.onerror = () => {
      add("Could not read the selected image.", "ai");
    };

    reader.readAsDataURL(file);
  });
}

// 12. MICROPHONE / SPEECH RECOGNITION
const SR =
  window.SpeechRecognition ||
  window.webkitSpeechRecognition;

let recognition = null;

if (SR && micBtn) {

  recognition = new SR();

  recognition.lang = "te-IN";
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onstart = () => {
    micBtn.innerText = "LISTENING...";
  };

  recognition.onresult = event => {

    const spokenText =
      event.results[0][0].transcript;

    add("YOU: " + spokenText, "user");

    askGemini(spokenText);
  };

  recognition.onerror = event => {
    add("MIC ERROR: " + event.error, "ai");
  };

  recognition.onend = () => {
    micBtn.innerText = "🎙️";
  };

  micBtn.addEventListener("click", () => {

    try {
      recognition.start();
    } catch (error) {
      console.error("Microphone:", error);
    }

  });

} else if (micBtn) {

  micBtn.disabled = true;
  micBtn.title = "Speech recognition not supported in this browser.";

}

// 13. TEXT TO SPEECH
let voices = [];

function loadVoices() {
  voices = speechSynthesis.getVoices();
}

if ("speechSynthesis" in window) {
  loadVoices();
  speechSynthesis.onvoiceschanged = loadVoices;
}

function speak(text) {

  if (!("speechSynthesis" in window)) return;

  speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);

  utterance.rate = 1.05;
  utterance.pitch = 0.9;

  const voice =
    voices.find(v => v.lang === "te-IN") ||
    voices.find(v => v.lang.startsWith("en-IN")) ||
    voices.find(v => v.lang.startsWith("en"));

  if (voice) {
    utterance.voice = voice;
  }

  speechSynthesis.speak(utterance);
}

// 14. CLEAR MEMORY
if (clearBtn) {

  clearBtn.addEventListener("click", () => {

    MEMORY = [];
    saveMemory();

    chat.innerHTML = "";

    if ("speechSynthesis" in window) {
      speechSynthesis.cancel();
    }

    add("J.A.R.V.I.S: Memory cleared.", "ai");

  });
}

console.log("J.A.R.V.I.S SYSTEM INITIALIZED");
