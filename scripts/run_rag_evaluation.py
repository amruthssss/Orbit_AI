"""Run a deterministic retrieval evaluation and write the measured JSON results."""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path

os.environ["TESTING"] = "1"
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.services import retrieve
from app.storage import add_document, delete_document, init_db


DATASET = ROOT / "tests" / "data" / "rag_golden_dataset.json"


def normalized(value: str) -> str:
    return " ".join(value.casefold().split())


def evaluate(dataset: dict) -> dict:
    init_db()
    collection = "rag-eval-" + dataset["dataset_id"]
    stored: dict[str, str] = {}
    try:
        for document in dataset["documents"]:
            saved = add_document(document["name"], document["text"], collection, 1)
            stored[document["id"]] = saved["id"]

        answerable = []
        unanswerable_correct = []
        latencies = []
        cases = []
        for case in dataset["cases"]:
            start = time.perf_counter()
            results = retrieve(case["question"], collection, limit=5)
            latency_ms = (time.perf_counter() - start) * 1000
            latencies.append(latency_ms)
            expected_texts = [normalized(item) for item in case["expected_evidence"]]
            relevant_ranks = [
                rank for rank, result in enumerate(results, 1)
                if any(evidence in normalized(result["text"]) for evidence in expected_texts)
            ]
            is_answerable = case["answerable"]
            if is_answerable:
                answerable.append({"hit": bool(relevant_ranks), "reciprocal_rank": 1 / relevant_ranks[0] if relevant_ranks else 0,
                                   "precision": sum(1 for result in results if any(
                                       evidence in normalized(result["text"]) for evidence in expected_texts
                                   )) / max(len(results), 1),
                                   "recall": len(relevant_ranks) / max(len(expected_texts), 1)})
            else:
                unanswerable_correct.append(not results)
            cases.append({
                "id": case["id"],
                "answerable": is_answerable,
                "retrieved": [{"document_id": result["document_id"], "chunk_id": result.get("chunk_id"),
                               "chunk": result["chunk"], "score": result["score"], "name": result["name"]}
                              for result in results],
                "relevant_ranks": relevant_ranks,
                "latency_ms": round(latency_ms, 3),
            })
        count = max(len(answerable), 1)
        return {
            "dataset_id": dataset["dataset_id"],
            "mode": "deterministic lexical retrieval (TESTING=1; no Gemini calls)",
            "k": 5,
            "case_count": len(cases),
            "answerable_case_count": len(answerable),
            "unanswerable_case_count": len(unanswerable_correct),
            "metrics": {
                "hit_rate_at_5": round(sum(item["hit"] for item in answerable) / count, 4),
                "recall_at_5": round(sum(item["recall"] for item in answerable) / count, 4),
                "mean_reciprocal_rank_at_5": round(sum(item["reciprocal_rank"] for item in answerable) / count, 4),
                "context_precision_at_5": round(sum(item["precision"] for item in answerable) / count, 4),
                "unanswerable_rejection_accuracy": round(sum(unanswerable_correct) / max(len(unanswerable_correct), 1), 4),
                "mean_retrieval_latency_ms": round(sum(latencies) / max(len(latencies), 1), 3),
            },
            "not_measured": ["answer faithfulness", "answer relevance", "LLM-generated citation accuracy", "real Gemini embeddings"],
            "cases": cases,
        }
    finally:
        for document_id in stored.values():
            delete_document(document_id)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=ROOT / "docs" / "RAG_EVALUATION_RESULTS.json")
    args = parser.parse_args()
    dataset = json.loads(DATASET.read_text(encoding="utf-8"))
    result = evaluate(dataset)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result["metrics"], indent=2))
    print(f"Saved report to {args.output}")


if __name__ == "__main__":
    main()
