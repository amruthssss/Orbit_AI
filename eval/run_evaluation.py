import json

from eval.evaluator import evaluate_answer
from backend.app.llm import generate_response


def load_dataset():

    with open(
        "eval/dataset.json",
        "r",
        encoding="utf-8"
    ) as file:

        return json.load(file)


def main():

    dataset = load_dataset()

    results = []

    for item in dataset:

        question = item["question"]
        expected_answer = item["expected_answer"]

        actual_answer = generate_response(
            session_id=f"eval-{item['id']}",
            message=question
        )

        evaluation = evaluate_answer(
            question=question,
            expected_answer=expected_answer,
            actual_answer=actual_answer
        )

        result = {
            "id": item["id"],
            "question": question,
            "actual_answer": actual_answer,
            "evaluation": evaluation
        }

        results.append(result)

        print("\nQuestion:")
        print(question)

        print("\nAnswer:")
        print(actual_answer)

        print("\nEvaluation:")
        print(evaluation)

    total_correctness = 0
    total_relevance = 0
    total_instruction = 0

    for result in results:

        evaluation = result["evaluation"]

        total_correctness += evaluation["correctness"]
        total_relevance += evaluation["relevance"]
        total_instruction += evaluation["instruction_following"]


    count = len(results)

    print("\n==============================")
    print("EVALUATION SUMMARY")
    print("==============================")

    print(
        f"Average Correctness: "
        f"{total_correctness / count:.2f}/5"
    )

    print(
        f"Average Relevance: "
        f"{total_relevance / count:.2f}/5"
    )

    print(
        f"Average Instruction Following: "
        f"{total_instruction / count:.2f}/5"
    )

    with open(
        "eval/results.json",
        "w",
        encoding="utf-8"
    ) as file:

        json.dump(
            results,
            file,
            indent=2,
            ensure_ascii=False
        )


if __name__ == "__main__":
    main()