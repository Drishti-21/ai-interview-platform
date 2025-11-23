export function generateNextQuestion(
  resumeText,
  previousQuestions = [],
  totalQuestionsAllowed
) {
  const currentNumber = previousQuestions.length + 1;

  return `
    Resume: "${resumeText}"
    Question Number: ${currentNumber} of ${totalQuestionsAllowed}

    Generate ONLY one interview question.
    Do NOT generate multiple questions.
    Do NOT give answers.
    Return exactly ONE question only.
  `;
}

