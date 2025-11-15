// ------------------------------
// CONFIG
// ------------------------------
const API_BASE = ""; // IMPORTANT: Leave empty so it auto-uses current domain


// ------------------------------
// ELEMENTS
// ------------------------------
const uploadForm = document.getElementById("uploadForm");
const fileInput = document.getElementById("fileInput");
const parseStatus = document.getElementById("parseStatus");
const parsedText = document.getElementById("parsedText");

const resumeJsonEl = document.getElementById("resumeJson");
const jobDescEl = document.getElementById("jobDescription");

const buildFromParsed = document.getElementById("buildFromParsed");
const runAts = document.getElementById("runAts");
const runEnhance = document.getElementById("runEnhance");
const runGenerate = document.getElementById("runGenerate");

const atsResult = document.getElementById("atsResult");
const enhancedResult = document.getElementById("enhancedResult");
const downloads = document.getElementById("downloads");


// ------------------------------
// MODE SWITCH
// ------------------------------
const uploadModeDiv = document.getElementById("uploadMode");
const manualModeDiv = document.getElementById("manualMode");

document.querySelectorAll("input[name='inputMode']").forEach(radio => {
    radio.addEventListener("change", () => {
        if (radio.value === "upload") {
            uploadModeDiv.style.display = "block";
            manualModeDiv.style.display = "none";
        } else {
            uploadModeDiv.style.display = "none";
            manualModeDiv.style.display = "block";

            // Reset upload UI when switching to manual
            if (parseStatus) parseStatus.textContent = "";
            if (parsedText) parsedText.textContent = "";
        }
    });
});


// ------------------------------
// SAFE JSON PARSE
// ------------------------------
function safeParse(txt) {
    if (!txt || !txt.trim()) return null;
    try { return JSON.parse(txt); }
    catch { return null; }
}


// ------------------------------
// BUILD RESUME OBJECT (priority: JSON → manual → parsed text)
// ------------------------------
function buildResumeObject() {
    // 1) Use JSON textarea if valid
    const existingJson = safeParse(resumeJsonEl?.value || "");
    if (existingJson && typeof existingJson === "object") return existingJson;

    // 2) Manual fields
    const name = document.getElementById("nameInput")?.value.trim() || "";
    const email = document.getElementById("emailInput")?.value.trim() || "";
    const phone = document.getElementById("phoneInput")?.value.trim() || "";
    const summary = document.getElementById("summaryInput")?.value.trim() || "";
    const skillsRaw = document.getElementById("skillsInput")?.value.trim() || "";
    const exp = document.getElementById("expInput")?.value.trim() || "";
    const edu = document.getElementById("eduInput")?.value.trim() || "";
    const proj = document.getElementById("projInput")?.value.trim() || "";

    const hasManualData = name || email || phone || summary || skillsRaw || exp || edu || proj;

    if (hasManualData) {
        const manualObj = {
            name,
            email,
            phone,
            summary,
            skills: skillsRaw ? skillsRaw.split(",").map(x => x.trim()).filter(Boolean) : [],
            experience: exp ? [exp] : [],
            education: edu ? [edu] : [],
            projects: proj ? [proj] : []
        };

        resumeJsonEl.value = JSON.stringify(manualObj, null, 2);
        return manualObj;
    }

    // 3) Parsed text fallback
    const parsed = parsedText?.textContent?.trim() || "";
    if (parsed) {
        const parsedObj = {
            name: "",
            email: "",
            phone: "",
            summary: parsed.slice(0, 600),
            skills: [],
            experience: [parsed],
            education: [],
            projects: []
        };

        resumeJsonEl.value = JSON.stringify(parsedObj, null, 2);
        return parsedObj;
    }

    return null;
}


// ------------------------------
// UPLOAD & PARSE
// ------------------------------
uploadForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!fileInput.files.length) {
        alert("Please choose a file first.");
        return;
    }

    const fd = new FormData();
    fd.append("file", fileInput.files[0]);

    parseStatus.textContent = "Parsing...";
    parsedText.textContent = "";

    try {
        const res = await fetch(`${API_BASE}/api/parse`, {
            method: "POST",
            body: fd
        });

        const js = await res.json();

        if (res.ok) {
            parseStatus.textContent = "Parsed successfully!";
            parsedText.textContent = js.text || "";
        } else {
            parseStatus.textContent = "Error: " + (js.error || "Unknown error");
        }

    } catch (err) {
        parseStatus.textContent = "Network error!";
        console.error(err);
    }
});


// ------------------------------
// USE PARSED TEXT AS JSON
// ------------------------------
buildFromParsed?.addEventListener("click", () => {
    const text = parsedText.textContent.trim();

    if (!text) {
        alert("Please upload and parse a resume first.");
        return;
    }

    const obj = {
        name: "",
        email: "",
        phone: "",
        summary: text.slice(0, 600),
        skills: [],
        experience: [text],
        education: [],
        projects: []
    };

    resumeJsonEl.value = JSON.stringify(obj, null, 2);
});


// ------------------------------
// MANUAL → JSON BUTTON
// ------------------------------
document.getElementById("convertToJson")?.addEventListener("click", () => {
    const name = document.getElementById("nameInput").value;
    const email = document.getElementById("emailInput").value;
    const phone = document.getElementById("phoneInput").value;
    const summary = document.getElementById("summaryInput").value;
    const skillsRaw = document.getElementById("skillsInput").value;
    const exp = document.getElementById("expInput").value;
    const edu = document.getElementById("eduInput").value;
    const proj = document.getElementById("projInput").value;

    const obj = {
        name,
        email,
        phone,
        summary,
        skills: skillsRaw.split(",").map(x => x.trim()).filter(Boolean),
        experience: exp ? [exp] : [],
        education: edu ? [edu] : [],
        projects: proj ? [proj] : []
    };

    resumeJsonEl.value = JSON.stringify(obj, null, 2);
});


// ------------------------------
// ATS SCORE
// ------------------------------
runAts?.addEventListener("click", async () => {
    const resumeObj = buildResumeObject();
    if (!resumeObj) return alert("Please provide resume details first!");

    atsResult.textContent = "Calculating...";

    const res = await fetch(`${API_BASE}/api/ats-score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            resume: resumeObj,
            job_description: jobDescEl.value || ""
        })
    });

    const js = await res.json();

    if (res.ok) {
        atsResult.textContent = `Score: ${js.score}\nGaps: ${js.gaps.join(", ") || "None"}`;
    } else {
        atsResult.textContent = "Error: " + (js.error || "Unknown error");
    }
});


// ------------------------------
// ENHANCE RESUME
// ------------------------------
runEnhance?.addEventListener("click", async () => {
    const resumeObj = buildResumeObject();
    if (!resumeObj) return alert("Please provide resume details first!");

    enhancedResult.textContent = "Enhancing...";

    const res = await fetch(`${API_BASE}/api/enhance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resumeObj)
    });

    const js = await res.json();

    if (res.ok) {
        enhancedResult.textContent = JSON.stringify(js.enhanced, null, 2);
        resumeJsonEl.value = JSON.stringify(js.enhanced, null, 2);
    } else {
        enhancedResult.textContent = "Error: " + (js.error || "Unknown error");
    }
});


// ------------------------------
// GENERATE (PDF + DOCX)
// ------------------------------
runGenerate?.addEventListener("click", async () => {
    const resumeObj = buildResumeObject();
    if (!resumeObj) return alert("Please provide resume details first!");

    downloads.textContent = "Generating...";

    const res = await fetch(`${API_BASE}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resumeObj)
    });

    const js = await res.json();

    if (res.ok) {
        downloads.innerHTML = `
            <a href="${API_BASE}/api/download/?file_path=${encodeURIComponent(js.pdf_path)}" target="_blank">Download PDF</a><br>
            <a href="${API_BASE}/api/download/?file_path=${encodeURIComponent(js.docx_path)}" target="_blank">Download DOCX</a>
        `;
    } else {
        downloads.textContent = "Error: " + (js.error || "Unknown error");
    }
});
