import logging
import numpy as np
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)

# Initialize the model globally
model = SentenceTransformer('all-MiniLM-L6-v2')

def compute_cosine_similarity(vec_a: np.ndarray, vec_b: np.ndarray) -> float:
    """Calculates the cosine similarity between two 1D numpy arrays."""
    norm_a = np.linalg.norm(vec_a)
    norm_b = np.linalg.norm(vec_b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(vec_a, vec_b) / (norm_a * norm_b))

async def run_semantic_matching(student_concepts: list[str], supabase_client, course_id_uuid: str, semester_id_uuid: str, section_id_uuid: str, week_number: int):
    """
    Semantically match student concepts against uncovered syllabus topics 
    and update is_covered = True and covered_in_week = week_number in section_coverage if match score >= 0.60.
    """
    try:
        resp = (
            supabase_client.table("section_coverage")
            .select("id, topic_name, material_context")
            .eq("course_id", course_id_uuid)
            .eq("semester_id", semester_id_uuid)
            .eq("section_id", section_id_uuid)
            .eq("is_covered", False)
            .execute()
        )
        rows = resp.data or []
    except Exception as exc:
        logger.error(f"Failed to fetch section_coverage rows: {exc}")
        return

    if not rows:
        return

    for concept in student_concepts:
        vec_E = model.encode(concept)

        best_score = 0.0
        best_row_id = None
        best_topic_name = None

        for row in rows:
            row_id = row["id"]
            topic_name = row.get("topic_name", "")
            material_context = row.get("material_context") or ""

            vec_T = model.encode(topic_name)

            S1 = compute_cosine_similarity(vec_E, vec_T)

            contexts = [ctx.strip() for ctx in material_context.split(',') if ctx.strip()]
            S2 = 0.0
            if contexts:
                ctx_embeddings = model.encode(contexts)
                if len(contexts) == 1:
                    ctx_embeddings = [ctx_embeddings]
                similarities = [compute_cosine_similarity(vec_E, c_emb) for c_emb in ctx_embeddings]
                S2 = max(similarities)

            V = (0.3 * S1) + (0.7 * S2)

            if V > best_score:
                best_score = V
                best_row_id = row_id
                best_topic_name = topic_name

        if best_score >= 0.60 and best_row_id is not None:
            try:
                percentage = round(best_score * 100, 2)
                supabase_client.table("section_coverage").update({
                    "is_covered": True, 
                    "covered_in_week": week_number,
                    "match_score": percentage
                }).eq("id", best_row_id).execute()
                logger.info(f"Best Match: '{concept}' → '{best_topic_name}' (Score: {best_score:.2f})")
            except Exception as exc:
                logger.error(f"Failed to update section_coverage for id {best_row_id}: {exc}")

