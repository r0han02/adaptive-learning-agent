from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import uvicorn
import os
import json
import google.generativeai as genai

# ===== GEMINI CONFIG =====
GEMINI_API_KEY = "AIzaSyB_wKKrGmcq2XOuzFhu4z3rxOjsZHDryLY"
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel("gemini-2.0-flash")

app = FastAPI(title="Adaptive Learning Agent API")

# ===== Request Models =====
class ChatRequest(BaseModel):
    message: str
    topic: str = "general"
    context: str = ""

class GenerateQuestionsRequest(BaseModel):
    topic: str
    difficulty: str = "medium"
    count: int = 5

class ExplainRequest(BaseModel):
    question: str
    correct_answer: str
    user_answer: str
    topic: str

# ===== API Routes =====
@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "Python backend with Gemini AI is running!"}

@app.post("/api/chat")
async def ai_chat(req: ChatRequest):
    """AI Tutor chat endpoint — answers student questions using Gemini."""
    try:
        system_prompt = f"""You are AdaptIQ AI Tutor, an expert and friendly educational assistant.
You help students learn about: {req.topic}.
Keep responses concise (2-4 paragraphs max), clear, and encouraging.
Use examples and analogies when helpful.
If the student asks something off-topic, gently redirect them.
Format your response with markdown for readability.
{f"Previous context: {req.context}" if req.context else ""}"""

        response = model.generate_content(
            f"{system_prompt}\n\nStudent question: {req.message}"
        )
        return {"reply": response.text, "status": "ok"}
    except Exception as e:
        return {"reply": f"Sorry, I couldn't process that request. Error: {str(e)}", "status": "error"}

@app.post("/api/generate-questions")
async def generate_questions(req: GenerateQuestionsRequest):
    """Generate quiz questions dynamically using Gemini AI."""
    try:
        prompt = f"""Generate exactly {req.count} multiple-choice quiz questions about {req.topic} at {req.difficulty} difficulty level.

Return ONLY a valid JSON array with this exact structure (no markdown, no code blocks, just the JSON):
[
  {{
    "q": "Question text here?",
    "opts": ["Option A", "Option B", "Option C", "Option D"],
    "ans": 0,
    "explain": "Brief explanation of the correct answer."
  }}
]

Rules:
- Each question must have exactly 4 options
- "ans" is the 0-based index of the correct answer
- Randomize the position of the correct answer (don't always put it first)
- Make questions educational and clear
- Explanations should be concise but informative
- For {req.difficulty} difficulty: {"basic concepts, straightforward" if req.difficulty == "easy" else "intermediate concepts, requires understanding" if req.difficulty == "medium" else "advanced concepts, requires deep knowledge"}"""

        response = model.generate_content(prompt)
        text = response.text.strip()

        # Clean up the response — remove markdown code blocks if present
        if text.startswith("```"):
            text = text.split("\n", 1)[1]  # Remove first line
            if text.endswith("```"):
                text = text[:-3]
            elif "```" in text:
                text = text[:text.rfind("```")]
        text = text.strip()

        questions = json.loads(text)
        return {"questions": questions, "status": "ok"}
    except json.JSONDecodeError:
        return {"questions": [], "status": "error", "message": "AI returned invalid format. Using fallback questions."}
    except Exception as e:
        return {"questions": [], "status": "error", "message": str(e)}

@app.post("/api/explain")
async def explain_answer(req: ExplainRequest):
    """Get a detailed AI explanation for a quiz question."""
    try:
        prompt = f"""A student answered a {req.topic} quiz question incorrectly.

Question: {req.question}
Correct answer: {req.correct_answer}
Student's answer: {req.user_answer}

Provide a brief, encouraging explanation (2-3 sentences) of:
1. Why the correct answer is right
2. Why their answer was wrong
3. A helpful tip to remember this concept

Be concise and supportive."""

        response = model.generate_content(prompt)
        return {"explanation": response.text, "status": "ok"}
    except Exception as e:
        return {"explanation": "Could not generate explanation.", "status": "error"}


# Serve static files
app.mount("/static", StaticFiles(directory=".", html=False), name="static")

@app.get("/")
def serve_index():
    response = FileResponse("index.html")
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    return response

@app.get("/{filename}")
def serve_files(filename: str):
    if os.path.exists(filename):
        response = FileResponse(filename)
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        return response
    response = FileResponse("index.html")
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    return response

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
