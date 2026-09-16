from fastapi import APIRouter

router = APIRouter()


@router.get("/briefings")
def briefings() -> dict:
    """Compatible with mobile researchApi.ts Briefing mapping."""
    try:
        from whats_new import db

        row = db.fetch_one(
            """
            SELECT title, content, created_at
            FROM reports
            WHERE type = 'morning'
            ORDER BY created_at DESC
            LIMIT 1
            """
        )
        if row:
            content = row["content"] or {}
            scenarios = content.get("scenarios") or {}
            evidence = content.get("evidence") or []
            if isinstance(evidence, list) and evidence and isinstance(evidence[0], str):
                evidence = [{"claim": e} for e in evidence]
            return {
                "items": [
                    {
                        "title": content.get("title") or row.get("title") or "Morning Brief",
                        "confidence": {"score": float(content.get("confidence") or 0.5)},
                        "evidence": evidence
                        or [{"claim": content.get("summary") or "No summary"}],
                        "scenarios": {
                            "strengthening": scenarios.get("strengthening")
                            or content.get("bull_case")
                            or "",
                            "weakening": scenarios.get("weakening")
                            or content.get("bear_case")
                            or "",
                        },
                        "risks": list(content.get("risks") or []),
                    }
                ]
            }
    except Exception:
        pass

    return {
        "items": [
            {
                "title": "Markets open with mixed signals",
                "confidence": {"score": 0.55},
                "evidence": [
                    {"claim": "Awaiting first scheduled morning report from the pipeline."}
                ],
                "scenarios": {
                    "strengthening": "Risk appetite improves on softer yields.",
                    "weakening": "Macro data surprises to the downside.",
                },
                "risks": ["Pipeline has not produced a live morning brief yet."],
            }
        ]
    }
