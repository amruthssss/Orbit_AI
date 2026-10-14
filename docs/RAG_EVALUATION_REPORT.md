# RAG evaluation report

**Date:** 2026-10-14
**Dataset:** `tests/data/rag_golden_dataset.json` (`orbit-rag-golden-v1`)
**Reproduce:** `python scripts/run_rag_evaluation.py`

The runner sets `TESTING=1`, stores the fixture in an in-memory SQLite database, exercises the active lexical retrieval implementation, computes metrics from returned chunks, removes the fixture records, and writes `docs/RAG_EVALUATION_RESULTS.json`. No Gemini calls are made.

## Measured result

| Metric | Result |
|---|---:|
| Cases | 3 (2 answerable, 1 unanswerable) |
| Hit Rate@5 | 1.0000 |
| Recall@5 | 1.0000 |
| Mean Reciprocal Rank@5 | 1.0000 |
| Context Precision@5 | 1.0000 |
| Unanswerable rejection accuracy | 1.0000 |
| Mean retrieval latency | 0.868 ms |

These are results on a deliberately small, single-document golden fixture. Context precision/recall are exact evidence-substring checks, not human judgments. The latency is one local run and is not a production performance claim.

## Citation and answer evaluation

An API integration test mocks the model output, runs retrieval against a real persisted test chunk, and confirms the server-added `[S1]` reference points to the actual document and chunk. This verifies reference provenance, not that a real model's claims are faithful to the evidence. Answer faithfulness, answer relevance, real-Gemini citation accuracy, real vector retrieval, and cross-document ranking quality were not measured.

## Baseline

The recorded fixture baseline is 100% for the measured retrieval and unanswerable-rejection metrics. It should not be treated as a generalized quality target until the dataset includes multiple documents, near-duplicate distractors, paraphrases, multi-chunk answers, and realistic unanswerable questions.
