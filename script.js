
// =====================================
// J.A.R.V.I.S - MOBILE EDITION
// =====================================

// 1. GEMINI API KEY
let API_KEY = localStorage.getItem("jarvis_key");

if (!API_KEY) {
  API_KEY = prompt("Enter your Gemini API Key:");

  if (API_KEY) {
    localStorage.setItem("jarvis_key", API_KEY);
  }
}

// 2. GEMINI MODELS
const MODELS = [
  "gemini-3.8-flash",
  "gemini-3.6-flash"
];

// 3. HTML ELEMENTS
const chat = document.getElementById("chat");
const input = document.getElementById("msg");
const sendBtn = document.getElementById("send");
const micBtn = document.getElementById("mic-btn");

// 4. CHAT MESSAGE FUNCTION
function add(message, sender) {
  const div = document.createElement("div");

  div.className = "msg " + sender;
  div.innerText = message;

  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;

  return div;
}

// 5. GEMINI API CONNECTION
async function callGemini(promptText) {

  if (!API_KEY) {
    throw new Error("API Key missing. Reload and enter your key.");
  }

  let lastError;

  for (const model of MODELS) {

    try {

      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/" +
        model +
        ":generateContent?key=" +
        encodeURIComponent(API_KEY),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: promptText }
                ]
              }
            ]
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error?.message || "Gemini API error: " + response.status
        );
      }

      const reply =
        data.candidates?.[0]?.content?.parts
          ?.map(part => part.text || "")
          .join("")
          .trim();

      if (!reply) {
        throw new Error("Gemini returned an empty response.");
      }

      return reply;

    } catch (error) {

      lastError = error;

      // Try the next model if this model fails.
      if (
        /404|429|500|502|503|504|not found|quota|rate limit|unavailable/i
          .test(error.message)
      ) {
        continue;
      }

      throw error;
    }
  }

  throw lastError || new Error("All Gemini models failed.");
}

// 6. ASK JARVIS
async function askGemini(promptText) {

  const thinking = add("J.A.R.V.I.S: Thinking...", "ai");

  sendBtn.disabled = true;

  try {

    const reply = await callGemini(promptText);

    thinking.innerText = "J.A.R.V.I.S: " + reply;

    speak(reply);

  } catch (error) {

    thinking.innerText =
      "J.A.R.V.I.S ERROR: " + error.message;

    console.error("JARVIS ERROR:", error);

  } finally {

    sendBtn.disabled = false;
    chat.scrollTop = chat.scrollHeight;

  }
}

// 7. SEND BUTTON
function sendMessage() {

  const text = input.value.trim();

  if (!text) return;

  add("YOU: " + text, "user");

  input.value = "";

  askGemini(text);
}

sendBtn.addEventListener("click", sendMessage);

// Press Enter to send
input.addEventListener("keydown", function(event) {

  if (event.key === "Enter") {
    sendMessage();
  }

});

// 8. SPEECH RECOGNITION
const SpeechRecognition =
  window.SpeechRecognition ||
  window.webkitSpeechRecognition;

let recognition = null;

if (SpeechRecognition) {

  recognition = new SpeechRecognition();

  recognition.lang = "te-IN";
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onstart = function() {
    micBtn.innerText = "LISTENING...";
  };

  recognition.onresult = function(event) {

    const spokenText =
      event.results[0][0].transcript;

    add("YOU: " + spokenText, "user");

    askGemini(spokenText);
  };

  recognition.onerror = function(event) {

    add("VOICE ERROR: " + event.error, "ai");

  };

  recognition.onend = function() {
    micBtn.innerText = "🎙️";
  };

  micBtn.addEventListener("click", function() {

    try {
      recognition.start();
    } catch (error) {
      console.log(error);
    }

  });

} else {

  micBtn.disabled = true;
  micBtn.innerText = "NOT SUPPORTED";

}

// 9. TEXT TO SPEECH
function speak(text) {

  if (!("speechSynthesis" in window)) return;

  speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);

  utterance.rate = 1.05;
  utterance.pitch = 0.9;

  const voices = speechSynthesis.getVoices();

  const voice =
    voices.find(v => v.lang === "te-IN") ||
    voices.find(v => v.lang.startsWith("en"));

  if (voice) {
    utterance.voice = voice;
  }

  speechSynthesis.speak(utterance);
}
