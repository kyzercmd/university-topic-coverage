"""
worker/main.py
--------------
FastAPI worker for the AI Evaluation Backend.

Pipeline (POST /process-note)
------------------------------
1. Receive a validated WebhookPayload containing a file_url.
2. Download the student note image from that URL using requests.
3. Encode the raw bytes as a base64 data URI.
4. Send the image + prompt to Groq (meta-llama/llama-4-scout-17b-16e-instruct).
5. Parse the returned JSON array of concepts and return it in the response.

Dispatch (POST /dispatch-forms)
--------------------------------
1. Receive a DispatchRequest with course_id and week.
2. Query Supabase enrollments table for all student_ids in the course.
3. Fetch each student's email and name from the students table.
4. For each student, insert a row into upload_tokens and capture the UUID.
5. Send a personalised email via Resend containing a smart upload link.
6. Return a summary of emails sent.
"""

from __future__ import annotations

import base64
import json
import logging
import os
import re
import fitz
from typing import List, Optional

import requests
import httpx
import resend
from dotenv import load_dotenv
from fastapi import FastAPI, status, HTTPException, File, UploadFile, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from groq import Groq
from pydantic import BaseModel
from supabase import create_client, Client
from matcher import model, compute_cosine_similarity, run_semantic_matching

# Load variables from .env (if present) into os.environ before anything else
load_dotenv()

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger("worker")

# ---------------------------------------------------------------------------
# Groq client
# ---------------------------------------------------------------------------
client = Groq(api_key=os.environ["GROQ_API_KEY"])

# ---------------------------------------------------------------------------
# Supabase client
# ---------------------------------------------------------------------------
SUPABASE_URL: str = os.environ["SUPABASE_URL"]
SUPABASE_KEY: str = os.environ["SUPABASE_KEY"]
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ---------------------------------------------------------------------------
# Resend
# ---------------------------------------------------------------------------
resend.api_key = os.environ["RESEND_API_KEY"]

FRONTEND_BASE_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(
    title="AI Evaluation Worker",
    description="Downloads a student note image and extracts concepts using Groq vision.",
    version="0.4.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------
class WebhookPayload(BaseModel):
    """Expected body for the POST /process-note endpoint."""
    file_urls: list[str]
    token: str


class DispatchRequest(BaseModel):
    """Expected body for the POST /dispatch-forms endpoint."""
    course_id: str
    week: str

class VectorTestRequest(BaseModel):
    student_concept: str
    topic_name: str
    material_context: str

class ProcessNoteRequest(BaseModel):
    course_id: str
    semester_id: str
    section_id: str
    file_urls: List[str]
    week_number: int

class DashboardOverviewResponse(BaseModel):
    section_id: Optional[str] = None
    section_name: Optional[str] = None
    coverage_percentage: int
    weeks_covered_str: str
    covered_topics_count: int
    pending_topics_count: int
    confidence_score: int
    missing_topics: List[str]
    weekly_progress: List[dict]
    current_week: int

class FacultyDashboardResponse(BaseModel):
    faculty_id: str
    faculty_name: str
    total_sections: int
    sections: List[DashboardOverviewResponse]

# ---------------------------------------------------------------------------
# Prompt
# ---------------------------------------------------------------------------
_CONCEPT_PROMPT = 'Analyze these university student class notes. Identify the core academic topics, key theories, and primary concepts covered. The subject could be anything—STEM, Humanities, Business, Arts, or Social Sciences. Extract the most important high-level topics that would map directly to a course syllabus. Return ONLY a flat JSON array of strings (e.g., ["Supply and Demand", "Market Equilibrium"]). Do not include markdown blocks or any other text.'
_SYLLABUS_PROMPT = 'Analyze this university syllabus or course material image. Extract the main academic topics, chapters, or modules. For each topic, extract 3 to 5 highly specific context keywords. Return ONLY a flat JSON array of objects where each object has exactly two keys: "topic_title" (string) and "keywords" (array of strings). Do not include markdown blocks.'

# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.post("/ingest-syllabus", tags=["pipeline"])
async def ingest_syllabus(course_id: str = Form(...), semester_id: str = Form(...), section_id: str = Form(...), file: UploadFile = File(...)):
    """Phase 1 Ground Truth Ingestion: Upload a syllabus image and extract topics."""
    file_bytes = await file.read()
    base64_image = base64.b64encode(file_bytes).decode("utf-8")
    content_type = file.content_type or "image/png"
    data_uri = f"data:{content_type};base64,{base64_image}"

    prompt = (
        "Analyze this university syllabus image. Extract the main academic topics or modules. "
        "For each topic, extract a brief context string containing 3 to 5 highly specific keywords, "
        "course outcomes (like CO1), or concepts. Return ONLY a flat JSON array of objects. "
        'Each object must have exactly two keys: "topic_name" (string) and "material_context" '
        "(a single comma-separated string of keywords). Do not include markdown blocks."
    )

    content_list = [
        {"type": "text", "text": prompt},
        {"type": "image_url", "image_url": {"url": data_uri}}
    ]

    try:
        chat_completion = client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[{"role": "user", "content": content_list}],
        )
    except Exception as exc:
        logger.error("Groq API call failed: %s", exc)
        return JSONResponse(
            status_code=500,
            content={"error": f"Groq request failed: {exc}"},
        )

    raw_text: str = chat_completion.choices[0].message.content.strip()
    cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw_text, flags=re.DOTALL).strip()

    try:
        parsed_json = json.loads(cleaned)
        if not isinstance(parsed_json, list):
            raise ValueError(f"Expected a JSON array, got {type(parsed_json).__name__}")
    except (json.JSONDecodeError, ValueError) as exc:
        logger.error("Failed to parse Groq response: %s\nRaw: %s", exc, raw_text)
        return JSONResponse(
            status_code=500,
            content={"error": "Invalid JSON returned from Groq.", "raw_response": raw_text},
        )
        
    records = []
    for item in parsed_json:
        topic_name = item.get("topic_name", "")
        material_context = item.get("material_context", "")
        
        records.append({
            "course_id": course_id,
            "semester_id": semester_id,
            "section_id": section_id,
            "topic_name": topic_name,
            "material_context": material_context
        })

    if records:
        try:
            supabase.table("section_coverage").insert(records).execute()
            logger.info("Ingested %d syllabus topics for course %s", len(records), course_id)
        except Exception as exc:
            logger.error("Failed to insert topics: %s", exc)
            return JSONResponse(
                status_code=500,
                content={"error": f"Database insertion failed: {exc}"},
            )

    return {"status": "success", "topics_ingested": len(parsed_json)}

@app.post("/ingest-materials", tags=["pipeline"])
async def ingest_materials(course_id: str = Form(...), files: List[UploadFile] = File(...)):
    """Phase 1 Ground Truth Ingestion: Upload material PDFs and match them to syllabus topics."""

    # Fetch existing topics
    try:
        resp = supabase.table("section_coverage").select("topic_name, material_context").eq("course_id", course_id).execute()
        rows = resp.data or []
    except Exception as exc:
        logger.error("Failed to fetch section_coverage: %s", exc)
        return JSONResponse(status_code=500, content={"error": f"Database error: {exc}"})

    if not rows:
        return JSONResponse(status_code=400, content={"error": "No syllabus topics found for this course. Please ingest a syllabus first."})

    topic_names = [r["topic_name"] for r in rows]
    topic_list_str = ", ".join(topic_names)

    accumulated_data = {}

    for file in files:
        file_bytes = await file.read()
        
        # Read PDF text
        try:
            doc = fitz.Document(stream=file_bytes, filetype="pdf")
            extracted_text = ""
            for page in doc:
                extracted_text += page.get_text() + "\n"
        except Exception as exc:
            logger.error("Failed to read PDF file %s: %s", file.filename, exc)
            continue

        prompt = (
            f"Analyze this extracted course material text: \n\n"
            f"{extracted_text}\n\n"
            f"Here is the official syllabus topic list for this course: [{topic_list_str}]. "
            f"Match the content of this text to ONE OR MORE topics from this list. For each matched topic, extract 5 to 10 highly specific "
            f"technical keywords or concepts. Return ONLY a flat JSON array of objects. "
            f'Each object must have two keys: "matched_topic" (string, must exactly match one from the list) and "keywords" (array of strings). '
            f"Do not include markdown blocks."
        )

        content_list = [
            {"type": "text", "text": prompt}
        ]

        try:
            chat_completion = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": content_list}],
            )
        except Exception as exc:
            logger.error("Groq API call failed: %s", exc)
            continue

        raw_text: str = chat_completion.choices[0].message.content.strip()
        cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw_text, flags=re.DOTALL).strip()

        try:
            parsed_array = json.loads(cleaned)
            if not isinstance(parsed_array, list):
                raise ValueError(f"Expected JSON array, got {type(parsed_array).__name__}")
        except (json.JSONDecodeError, ValueError) as exc:
            logger.error("Failed to parse Groq response: %s\nRaw: %s", exc, raw_text)
            continue

        for parsed in parsed_array:
            matched_topic = parsed.get("matched_topic")
            keywords = parsed.get("keywords", [])
            
            if matched_topic not in topic_names:
                logger.warning("Matched topic '%s' is not in the official syllabus list. Skipping.", matched_topic)
                continue
                
            if matched_topic not in accumulated_data:
                accumulated_data[matched_topic] = []
            
            if isinstance(keywords, list):
                accumulated_data[matched_topic].extend(keywords)
            else:
                accumulated_data[matched_topic].append(str(keywords))
                
    # Update Supabase
    for matched_topic, new_keywords in accumulated_data.items():
        existing_context = ""
        for r in rows:
            if r["topic_name"] == matched_topic:
                existing_context = r.get("material_context") or ""
                break
                
        new_keywords_str = ", ".join(new_keywords)
        
        if existing_context:
            updated_context = f"{existing_context}, {new_keywords_str}"
        else:
            updated_context = new_keywords_str

        try:
            supabase.table("section_coverage").update({"material_context": updated_context}).eq("course_id", course_id).eq("topic_name", matched_topic).execute()
            logger.info("Updated material context for topic: %s", matched_topic)
        except Exception as exc:
            logger.error("Failed to update section_coverage for %s: %s", matched_topic, exc)

    return {
        "status": "success",
        "files_processed": len(files),
        "topics_updated": list(accumulated_data.keys())
    }

@app.get("/health", tags=["meta"])
async def health_check() -> dict[str, str]:
    """Simple liveness probe."""
    return {"status": "ok"}


@app.get("/list-models", tags=["meta"])
async def list_models() -> JSONResponse:
    """Debug endpoint: returns models available on the configured Groq API key."""
    try:
        models = [m.id for m in client.models.list().data]
        return JSONResponse(content={"models": sorted(models)})
    except Exception as exc:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"error": str(exc)},
        )

@app.get("/verify-token/{token}", tags=["verification"])
async def verify_token(token: str) -> dict:
    """Verify an upload token and return course details."""
    try:
        # 1. Fetch token record
        token_resp = (
            supabase.table("upload_tokens")
            .select("course_id, target_week, is_used, semester_id, section_id")
            .eq("token", token)
            .execute()
        )
    except Exception as exc:
        logger.error("Token verification failed: %s", exc)
        raise HTTPException(status_code=500, detail="Database error during token lookup")

    rows = token_resp.data or []
    if not rows:
        raise HTTPException(status_code=404, detail="Token not found")
        
    record = rows[0]
    if record.get("is_used"):
        raise HTTPException(status_code=403, detail="Token already used")

    course_id = record["course_id"]
    target_week = record["target_week"]

    # 2. Fetch course name
    try:
        course_resp = (
            supabase.table("courses")
            .select("course_name")
            .eq("id", course_id)
            .execute()
        )
    except Exception as exc:
        logger.error("Course lookup failed for %s: %s", course_id, exc)
        raise HTTPException(status_code=500, detail="Database error during course lookup")

    c_rows = course_resp.data or []
    course_name = c_rows[0]["course_name"] if c_rows else "Unknown Course"

    return {
        "course_id": course_id,
        "course_name": course_name,
        "target_week": target_week,
        "semester_id": record["semester_id"],
        "section_id": record["section_id"]
    }


@app.post("/process-note", tags=["pipeline"])
async def process_note(request: ProcessNoteRequest, background_tasks: BackgroundTasks):
    """Process uploaded student note images via URLs, extract concepts, and trigger async matching."""
    
    base64_images = []
    async with httpx.AsyncClient() as http:
        for url in request.file_urls:
            try:
                resp = await http.get(url, timeout=30)
                resp.raise_for_status()
                b64 = base64.b64encode(resp.content).decode("utf-8")
                base64_images.append(b64)
            except Exception as exc:
                logger.error("Image download failed for %s: %s", url, exc)
                return JSONResponse(status_code=502, content={"error": f"Image download failed for {url}: {exc}"})

    prompt = (
        'You are analyzing a batch of handwritten university notes to match against a high-level course syllabus. '
        'Evaluate ALL the provided images together as a single submission. '
        'Identify the primary overarching academic topics. '
        'If a main topic is explicitly written as a header or a diagram label (e.g., "Introduction to OOP", "UML Diagram", or "Variables"), extract it directly. '
        'Otherwise, synthesize the parent academic subject. '
        'Combine your findings into EXACTLY ONE unified, flat JSON array of strings. '
        'Deduplicate the list. DO NOT output multiple separate arrays. Do not output markdown.'
    )

    content_list = [{"type": "text", "text": prompt}]
    for b64 in base64_images:
        content_list.append({
            "type": "image_url",
            "image_url": {"url": f"data:image/jpeg;base64,{b64}"}
        })

    try:
        chat_completion = client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[{"role": "user", "content": content_list}],
        )
    except Exception as exc:
        logger.error("Groq API call failed: %s", exc)
        return JSONResponse(status_code=500, content={"error": f"Groq request failed: {exc}"})

    raw_text: str = chat_completion.choices[0].message.content.strip()
    cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw_text, flags=re.DOTALL).strip()
    
    # Fix multiple arrays if LLM hallucinates them (e.g. ["A"]\n["B"] -> ["A", "B"])
    cleaned = re.sub(r'\]\s*\[', ',', cleaned)

    try:
        student_concepts = json.loads(cleaned)
        if not isinstance(student_concepts, list):
            raise ValueError(f"Expected a JSON array, got {type(student_concepts).__name__}")
        student_concepts = [str(c) for c in student_concepts]
    except (json.JSONDecodeError, ValueError) as exc:
        logger.error("Failed to parse Groq response: %s\nRaw: %s", exc, raw_text)
        return JSONResponse(status_code=400, content={"error": "Invalid JSON returned from Groq."})
        
    background_tasks.add_task(
        run_semantic_matching,
        student_concepts,
        supabase,
        request.course_id,
        request.semester_id,
        request.section_id,
        request.week_number
    )

    return {
        "status": "success",
        "urls_processed": len(request.file_urls),
        "concepts_extracted": len(student_concepts),
        "matching_queued": True
    }


@app.post("/dispatch-forms", status_code=status.HTTP_200_OK, tags=["dispatch"])
async def dispatch_forms(body: DispatchRequest) -> JSONResponse:
    """
    Dispatch personalised upload-form emails to all students in a course.

    Steps
    -----
    1. Query ``enrollments`` for every ``student_id`` in the given course.
    2. Fetch ``email`` and ``name`` from the ``students`` table for those IDs.
    3. For each student:
       a. Insert a row into ``upload_tokens`` → capture the generated UUID.
       b. Build a smart link: ``http://localhost:3000/upload?token=<uuid>``.
       c. Send an email via Resend.
    4. Return a count of emails successfully dispatched.
    """
    course_id = body.course_id
    week      = body.week
    logger.info("Dispatching forms for course_id=%s week=%s", course_id, week)

    # ------------------------------------------------------------------
    # 1. Fetch enrolled student IDs
    # ------------------------------------------------------------------
    try:
        enrollment_resp = (
            supabase.table("enrollments")
            .select("student_id, semester_id")
            .eq("course_id", course_id)
            .execute()
        )
    except Exception as exc:
        logger.error("Supabase enrollments query failed: %s", exc)
        return JSONResponse(
            status_code=status.HTTP_502_BAD_GATEWAY,
            content={"error": f"Failed to query enrollments: {exc}"},
        )

    student_ids: list[str] = [
        row["student_id"] for row in (enrollment_resp.data or [])
    ]

    if not student_ids:
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"message": "No enrolled students found.", "emails_sent": 0},
        )

    logger.info("Found %d enrolled students.", len(student_ids))

    # ------------------------------------------------------------------
    # 2. Fetch student details (name, email, section_id)
    # ------------------------------------------------------------------
    try:
        students_resp = (
            supabase.table("students")
            .select("id, name, email, section_id")
            .in_("id", student_ids)
            .execute()
        )
    except Exception as exc:
        logger.error("Supabase students query failed: %s", exc)
        return JSONResponse(
            status_code=status.HTTP_502_BAD_GATEWAY,
            content={"error": f"Failed to query students: {exc}"},
        )

    students: list[dict] = students_resp.data or []

    # Build a map of student_id -> semester_id from enrollments
    semester_map: dict[str, str] = {
        row["student_id"]: row["semester_id"]
        for row in (enrollment_resp.data or [])
        if row.get("semester_id")
    }

    # ------------------------------------------------------------------
    # 3. Per-student: mint token → build link → send email
    # ------------------------------------------------------------------
    emails_sent   = 0
    emails_failed = 0

    for student in students:
        student_id    = student["id"]
        student_name  = student.get("name", "Student")
        student_email = student["email"]
        section_id    = student.get("section_id")
        semester_id   = semester_map.get(student_id)

        if not section_id or not semester_id:
            logger.warning("Missing section_id or semester_id for student %s — skipping.", student_id)
            emails_failed += 1
            continue

        # 3a. Insert upload token row and capture the generated UUID
        try:
            token_resp = (
                supabase.table("upload_tokens")
                .insert({
                    "student_id":  student_id,
                    "course_id":   course_id,
                    "target_week": week,
                    "semester_id": semester_id,
                    "section_id":  section_id,
                })
                .select()
                .execute()
            )
            logger.info("upload_tokens insert returned: %s", token_resp.data)
            token: str = token_resp.data[0]["token"]
        except Exception as exc:
            logger.error("Failed to mint token for student %s: %s", student_id, exc)
            emails_failed += 1
            continue

        # 3b. Build the smart upload link
        frontend_url = f"http://localhost:3000/upload?token={token}"

        # 3c. Send email via Resend
        try:
            resend.Emails.send({
                "from":    "onboarding@resend.dev",
                "to":      student_email,
                "subject": "Upload Assessment Notes",
                "html": (
                    f"<div style='font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; border: 1px solid #e4e4e7; border-radius: 12px; background-color: #ffffff;'>"
                    f"<h2 style='color: #09090b; margin-top: 0; font-size: 20px; font-weight: 600;'>Weekly Note Submission</h2>"
                    f"<p style='color: #27272a; font-size: 16px; margin-top: 24px;'>Hi {student_name},</p>"
                    f"<p style='color: #52525b; font-size: 15px; line-height: 1.6;'>"
                    f"Please upload your assessment notes for <strong>{week}</strong>. "
                    f"Your submission helps us dynamically track curriculum coverage and analyze class progress.</p>"
                    f"<div style='margin: 32px 0;'>"
                    f"<a href='{frontend_url}' style='background-color: #09090b; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 14px; display: inline-block;'>Upload My Notes</a>"
                    f"</div>"
                    f"<hr style='border: none; border-top: 1px solid #e4e4e7; margin: 32px 0 24px 0;' />"
                    f"<p style='color: #a1a1aa; font-size: 13px; margin: 0;'>"
                    f"This upload link is unique to your account. Please do not share it with others.</p>"
                    f"</div>"
                ),
            })
            emails_sent += 1
            logger.info("Email sent to %s (token: %s)", student_email, token)
        except Exception as exc:
            logger.error("Resend failed for %s: %s", student_email, exc)
            emails_failed += 1

    logger.info("Dispatch complete: %d sent, %d failed.", emails_sent, emails_failed)

    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "course_id":    course_id,
            "week":         week,
            "emails_sent":  emails_sent,
            "emails_failed": emails_failed,
        },
    )

@app.post("/test-vector-math", tags=["pipeline"])
async def test_vector_math(request: VectorTestRequest):
    vec_E = model.encode(request.student_concept)
    vec_T = model.encode(request.topic_name)
    
    S1 = compute_cosine_similarity(vec_E, vec_T)

    contexts = [ctx.strip() for ctx in request.material_context.split(',') if ctx.strip()]
    S2 = 0.0
    if contexts:
        ctx_embeddings = model.encode(contexts)
        if len(contexts) == 1:
            ctx_embeddings = [ctx_embeddings]
        similarities = [compute_cosine_similarity(vec_E, c_emb) for c_emb in ctx_embeddings]
        S2 = max(similarities)
    
    V = (0.3 * S1) + (0.7 * S2)
    
    return {
        "S1_topic_match": float(S1),
        "S2_context_match": float(S2),
        "V_final_score": float(V),
        "threshold_passed": bool(V >= 0.60),
        "inputs": {
            "student_concept": request.student_concept,
            "topic_name": request.topic_name,
            "material_context": request.material_context
        }
    }

@app.get("/api/dashboard/overview", response_model=DashboardOverviewResponse, tags=["dashboard"])
async def get_dashboard_overview(course_id: str, section_id: str):
    """Aggregate course coverage data."""
    try:
        resp = supabase.table("section_coverage").select("*").eq("course_id", course_id).eq("section_id", section_id).execute()
        rows = resp.data or []
    except Exception as exc:
        logger.error("Failed to fetch section_coverage: %s", exc)
        raise HTTPException(status_code=500, detail=f"Database error: {exc}")
        
    total_topics = len(rows)
    covered_topics_count = sum(1 for row in rows if row.get("is_covered") == True)
    pending_topics_count = total_topics - covered_topics_count
    
    if total_topics > 0:
        coverage_percentage = round((covered_topics_count / total_topics) * 100)
    else:
        coverage_percentage = 0
        
    missing_topics = [row.get("topic_name") for row in rows if row.get("is_covered") == False][:5]
    
    # Group by covered_in_week
    weeks_dict = {}
    for row in rows:
        week_num = row.get("covered_in_week")
        if week_num is None:
            week_num = "Unassigned"
        if week_num not in weeks_dict:
            weeks_dict[week_num] = {"topics": [], "completed": True}
            
        topic_name = row.get("topic_name", "")
        is_covered = row.get("is_covered", False)
        
        weeks_dict[week_num]["topics"].append(topic_name)
        if not is_covered:
            weeks_dict[week_num]["completed"] = False
            
    weekly_progress = []
    for w, data in weeks_dict.items():
        weekly_progress.append({
            "week_number": w,
            "topic_names": data["topics"],
            "completed": data["completed"]
        })
        
    total_weeks = 12
    covered_weeks_nums = [row.get("covered_in_week") for row in rows if row.get("covered_in_week") is not None]
    current_week = max(covered_weeks_nums) if covered_weeks_nums else 1
    
    weeks_covered_str = f"{current_week}/{total_weeks}"
    
    return DashboardOverviewResponse(
        coverage_percentage=coverage_percentage,
        weeks_covered_str=weeks_covered_str,
        covered_topics_count=covered_topics_count,
        pending_topics_count=pending_topics_count,
        confidence_score=94,
        missing_topics=missing_topics,
        weekly_progress=weekly_progress,
        current_week=current_week
    )

@app.get("/api/dashboard/faculty-overview", response_model=FacultyDashboardResponse, tags=["dashboard"])
async def get_faculty_overview(course_id: str, faculty_id: str):
    """Aggregate course coverage data for all sections taught by a faculty member."""
    # Fetch faculty name
    try:
        faculty_resp = supabase.table("faculty").select("name").eq("id", faculty_id).execute()
        faculty_data = faculty_resp.data
        faculty_name = faculty_data[0].get("name", "Unknown Faculty") if faculty_data else "Unknown Faculty"
    except Exception as exc:
        logger.error("Failed to fetch faculty: %s", exc)
        faculty_name = "Unknown Faculty"

    try:
        resp = supabase.table("sections").select("id, section_name").eq("course_id", course_id).eq("faculty_id", faculty_id).execute()
        sections_data = resp.data or []
    except Exception as exc:
        logger.error("Failed to fetch sections: %s", exc)
        raise HTTPException(status_code=500, detail=f"Database error: {exc}")
        
    section_responses = []
    
    for sec in sections_data:
        sec_id = sec.get("id")
        sec_name = sec.get("section_name", f"Section {sec_id}")
        
        try:
            cov_resp = supabase.table("section_coverage").select("*").eq("course_id", course_id).eq("section_id", sec_id).execute()
            rows = cov_resp.data or []
        except Exception as exc:
            logger.error("Failed to fetch section_coverage for section %s: %s", sec_id, exc)
            continue
            
        total_topics = len(rows)
        covered_topics_count = sum(1 for row in rows if row.get("is_covered") == True)
        pending_topics_count = total_topics - covered_topics_count
        
        if total_topics > 0:
            coverage_percentage = round((covered_topics_count / total_topics) * 100)
        else:
            coverage_percentage = 0
            
        missing_topics = [row.get("topic_name") for row in rows if row.get("is_covered") == False][:5]
        
        weeks_dict = {}
        for row in rows:
            week_num = row.get("covered_in_week")
            if week_num is None:
                week_num = "Unassigned"
            if week_num not in weeks_dict:
                weeks_dict[week_num] = {"topics": [], "completed": True}
                
            topic_name = row.get("topic_name", "")
            is_covered = row.get("is_covered", False)
            
            weeks_dict[week_num]["topics"].append(topic_name)
            if not is_covered:
                weeks_dict[week_num]["completed"] = False
                
        weekly_progress = []
        for w, data in weeks_dict.items():
            weekly_progress.append({
                "week_number": w,
                "topic_names": data["topics"],
                "completed": data["completed"]
            })
            
        total_weeks = 12
        covered_weeks_nums = [row.get("covered_in_week") for row in rows if row.get("covered_in_week") is not None]
        current_week = max(covered_weeks_nums) if covered_weeks_nums else 1
        weeks_covered_str = f"{current_week}/{total_weeks}"
        
        section_responses.append(
            DashboardOverviewResponse(
                section_id=str(sec_id),
                section_name=str(sec_name),
                coverage_percentage=coverage_percentage,
                weeks_covered_str=weeks_covered_str,
                covered_topics_count=covered_topics_count,
                pending_topics_count=pending_topics_count,
                confidence_score=94,
                missing_topics=missing_topics,
                weekly_progress=weekly_progress,
                current_week=current_week
            )
        )
        
    return FacultyDashboardResponse(
        faculty_id=faculty_id,
        faculty_name=faculty_name,
        total_sections=len(section_responses),
        sections=section_responses
    )


# ---------------------------------------------------------------------------
# Entry point (for local dev without uvicorn CLI)
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
