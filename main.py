from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import uvicorn
import os

app = FastAPI(title="Adaptive Learning Agent API")

# API Routes
@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "Python backend is running!"}

# Serve static files
# We mount the current directory to serve css and js files.
# But we serve index.html on the root path.
app.mount("/static", StaticFiles(directory=".", html=False), name="static")

@app.get("/")
def serve_index():
    return FileResponse("index.html")

@app.get("/{filename}")
def serve_files(filename: str):
    if os.path.exists(filename):
        return FileResponse(filename)
    return FileResponse("index.html")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
