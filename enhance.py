def enhance_resume(resume):
    # Simple fallback enhancement (non-AI)
    if "summary" in resume and len(resume["summary"]) < 50:
        resume["summary"] += " Passionate learner with strong interest in real-world project applications."

    if "skills" in resume and isinstance(resume["skills"], list):
        resume["skills"] = list(set(resume["skills"]))  # remove duplicates

    return resume
