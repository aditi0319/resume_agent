from fastapi import FastAPI, UploadFile, File, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles

from PyPDF2 import PdfReader
from docx import Document  # type:ignore

import tempfile
import os
import uvicorn

# Import your custom modules
from ats import mock_ats_score
from enhance import enhance_resume
from gen_resume import generate_resume_files


app = FastAPI(title="AI Resume Agent")

# ------------------------------------------------------
# CORS
# ------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # allow all (safe for Render deployment)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------------------------------
# SERVE STATIC FRONTEND
# ------------------------------------------------------
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/", response_class=HTMLResponse)
async def serve_home():
    """Serve index.html from /static"""
    with open("static/index.html", "r", encoding="utf-8") as f:
        return f.read()


# ------------------------------------------------------
# PDF/DOCX TEXT EXTRACTION HELPERS
# ------------------------------------------------------
def extract_text_from_pdf(path):
    text = ""
    try:
        reader = PdfReader(path)
        for page in reader.pages:
            t = page.extract_text()
            if t:
                text += t + "\n"
    except Exception as e:
        return f"[PDF extraction error] {e}"
    return text


def extract_text_from_docx(path):
    try:
        doc = Document(path)
        return "\n".join([p.text for p in doc.paragraphs])
    except Exception as e:
        return f"[DOCX extraction error] {e}"


# ------------------------------------------------------
# PARSE RESUME ENDPOINT
# ------------------------------------------------------
@app.post("/api/parse")
async def parse_resume(file: UploadFile = File(...)):
    ext = file.filename.split(".")[-1].lower()
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=f".{ext}")
    tmp.write(await file.read())
    tmp.close()

    if ext == "pdf":
        text = extract_text_from_pdf(tmp.name)
    elif ext in ["doc", "docx"]:
        text = extract_text_from_docx(tmp.name)
    else:
        return JSONResponse({"error": "Unsupported file format"}, 400)

    os.unlink(tmp.name)
    return {"text": text}


# ------------------------------------------------------
# ATS SCORE
# ------------------------------------------------------
@app.post("/api/ats-score")
async def ats_score(payload: dict = Body(...)):
    resume = payload.get("resume", {})
    jd = payload.get("job_description", "")
    score, gaps = mock_ats_score(resume, jd)
    return {"score": score, "gaps": gaps}


# ------------------------------------------------------
# ENHANCE RESUME
# ------------------------------------------------------
@app.post("/api/enhance")
async def enhance(resume: dict = Body(...)):
    enhanced = enhance_resume(resume)
    return {"enhanced": enhanced}


# ------------------------------------------------------
# GENERATE FILES (PDF + DOCX)
# ------------------------------------------------------
@app.post("/api/generate")
async def generate(payload: dict = Body(...)):
    pdf_path, docx_path = generate_resume_files(payload)
    return {"pdf_path": pdf_path, "docx_path": docx_path}


# ------------------------------------------------------
# DOWNLOAD FILE
# ------------------------------------------------------
@app.get("/api/download/")
async def download(file_path: str):
    if not os.path.exists(file_path):
        return JSONResponse({"error": "File not found"}, 404)
    return FileResponse(file_path)


# ------------------------------------------------------
# RENDER SERVER START
# ------------------------------------------------------
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=10000)
