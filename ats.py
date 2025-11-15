import re

def extract_keywords(text):
    return set([w.lower() for w in re.findall(r"\b[a-zA-Z]{4,}\b", text)])


def mock_ats_score(resume_json, job_description=""):
    # Convert resume content into text
    resume_blob = " ".join([str(v) for v in resume_json.values()])
    resume_kw = extract_keywords(resume_blob)

    # Extract job description keywords
    jd_kw = extract_keywords(job_description)

    # ---------------- KEYWORD SCORE (50) ----------------
    if len(jd_kw) > 0:
        matched = resume_kw.intersection(jd_kw)
        keyword_score = int((len(matched) / len(jd_kw)) * 50)
    else:
        keyword_score = 10  # if no job description provided

    # ---------------- SECTION SCORE (30) ----------------
    important_sections = ["skills", "experience", "education", "projects"]
    section_score = 0
    gaps = []

    for s in important_sections:
        if resume_json.get(s):
            section_score += 7
        else:
            gaps.append(f"Missing: {s}")

    # ---------------- QUALITY SCORE (20) ----------------
    summary = resume_json.get("summary", "")
    clarity = 0

    if len(summary) > 120:
        clarity += 8
    if any(w in summary.lower() for w in ["skilled", "project", "engineer", "experienced"]):
        clarity += 6
    if len(resume_blob) > 800:
        clarity += 6

    total = keyword_score + section_score + clarity
    return min(total, 100), gaps
