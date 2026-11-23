import React, { useState } from 'react';
import { CheckCircle2, ClipboardCheck, HelpCircle, RefreshCw, XCircle } from 'lucide-react';
import { QuizData, QuizQuestion, ShortAnswerGrade, StudySource } from '../types/study';
import { gradeShortAnswer } from '../utils/tutorApi';

interface QuizTabProps {
  source: StudySource | null;
  quiz: QuizData | null;
  loading: boolean;
  onGenerate: (count: number, mode: 'mixed' | 'mcq' | 'short') => void;
  onAnswerResult: (isCorrect: boolean, allAnswered: boolean, totalCorrect: number, totalQuestions: number) => void;
}

interface AnswerState {
  selectedOption?: number;
  shortText?: string;
  grading?: boolean;
  submitted: boolean;
  isCorrect: boolean;
  gradeFeedback?: ShortAnswerGrade;
  error?: string;
}

export const QuizTab: React.FC<QuizTabProps> = ({
  source,
  quiz,
  loading,
  onGenerate,
  onAnswerResult,
}) => {
  const [count, setCount] = useState<number>(5);
  const [mode, setMode] = useState<'mixed' | 'mcq' | 'short'>('mixed');
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [quizKey, setQuizKey] = useState<string>('');

  // Reset per-question answers whenever a new quiz arrives
  const currentSignature = quiz ? `${quiz.quizTitle}:${quiz.questions.length}:${quiz.questions[0]?.id ?? ''}` : '';
  if (currentSignature !== quizKey) {
    setQuizKey(currentSignature);
    setAnswers({});
  }

  const submittedCount = Object.values(answers).filter((a) => a.submitted).length;
  const correctCount = Object.values(answers).filter((a) => a.submitted && a.isCorrect).length;
  const totalQuestions = quiz?.questions.length ?? 0;

  const commitAnswer = (qId: string, nextEntry: AnswerState) => {
    const nextAnswers = { ...answers, [qId]: nextEntry };
    setAnswers(nextAnswers);
    const nextSubmitted = Object.values(nextAnswers).filter((a) => a.submitted).length;
    const nextCorrect = Object.values(nextAnswers).filter((a) => a.submitted && a.isCorrect).length;
    onAnswerResult(
      nextEntry.isCorrect,
      totalQuestions > 0 && nextSubmitted === totalQuestions,
      nextCorrect,
      totalQuestions
    );
  };

  const handleSelectMcq = (q: QuizQuestion, optIndex: number) => {
    if (answers[q.id]?.submitted) return;
    const isCorrect = optIndex === q.correctIndex;
    commitAnswer(q.id, {
      selectedOption: optIndex,
      submitted: true,
      isCorrect,
    });
  };

  const handleSubmitShort = async (q: QuizQuestion) => {
    const existing = answers[q.id];
    const studentAnswer = (existing?.shortText || '').trim();
    if (!studentAnswer || existing?.submitted || existing?.grading) return;

    setAnswers((prev) => ({
      ...prev,
      [q.id]: { ...prev[q.id], shortText: studentAnswer, grading: true, submitted: false, isCorrect: false, error: undefined },
    }));

    try {
      const grade = await gradeShortAnswer({
        question: q.question,
        sampleAnswer: q.sampleAnswer || q.explanation,
        keyPoints: q.keyPoints,
        studentAnswer,
      });
      commitAnswer(q.id, {
        shortText: studentAnswer,
        grading: false,
        submitted: true,
        isCorrect: grade.isCorrect,
        gradeFeedback: grade,
      });
    } catch (err) {
      setAnswers((prev) => ({
        ...prev,
        [q.id]: {
          ...prev[q.id],
          shortText: studentAnswer,
          grading: false,
          submitted: false,
          isCorrect: false,
          error: err instanceof Error ? err.message : 'Grading failed. Try again.',
        },
      }));
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Controls Row */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <select
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            aria-label="Number of quiz questions"
            className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#182127] border border-[#D4DCE3] dark:border-[#30404B] text-xs font-mono tabular-nums text-[#182026] dark:text-[#F1F3F5]"
          >
            <option value={5}>5 Qs</option>
            <option value={7}>7 Qs</option>
            <option value={10}>10 Qs</option>
          </select>

          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as 'mixed' | 'mcq' | 'short')}
            aria-label="Question format"
            className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#182127] border border-[#D4DCE3] dark:border-[#30404B] text-xs text-[#182026] dark:text-[#F1F3F5]"
          >
            <option value="mixed">Mixed</option>
            <option value="mcq">Multiple Choice</option>
            <option value="short">Short Answer</option>
          </select>
        </div>

        <button
          type="button"
          onClick={() => onGenerate(count, mode)}
          disabled={!source || loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#E86A33] hover:bg-[#D95C26] dark:hover:bg-[#F27944] disabled:opacity-50 text-white dark:text-[#11171C] font-semibold text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Creating...' : quiz ? 'New Quiz' : 'Generate Quiz'}</span>
        </button>
      </div>

      {/* Live Score Strip when Quiz is Active */}
      {quiz && !loading && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#EFF3F6] dark:bg-[#151D23] border border-[#DFE5EB] dark:border-[#293741] text-xs">
          <span className="font-medium text-[#182026] dark:text-[#F1F3F5] truncate">
            {quiz.quizTitle}
          </span>
          <span className="font-mono tabular-nums text-[#2F8F63] dark:text-[#74C69D] shrink-0">
            {correctCount}/{submittedCount} correct · {submittedCount}/{totalQuestions} done
          </span>
        </div>
      )}

      {!quiz && !loading && (
        <div className="rounded-xl border border-[#DFE5EB] dark:border-[#293741] bg-white dark:bg-[#182127] p-5 text-center flex flex-col items-center gap-2">
          <ClipboardCheck className="w-6 h-6 text-[#E86A33]" />
          <p className="text-xs font-medium text-[#182026] dark:text-[#F1F3F5]">
            Test your recall for Pet XP
          </p>
          <p className="text-[11px] text-[#5C6B77] dark:text-[#8E9EA9] max-w-[290px]">
            Every right answer awards +10 XP &amp; +1 Study Treat, and mistakes include a step-by-step walkthrough.
          </p>
        </div>
      )}

      {loading && (
        <div className="flex flex-col gap-3 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-[#DFE5EB] dark:border-[#293741] bg-white dark:bg-[#182127] p-4 h-32"
            />
          ))}
        </div>
      )}

      {/* Question Cards */}
      {quiz && !loading && (
        <div className="flex flex-col gap-3 animate-panel-enter">
          {quiz.questions.map((q, idx) => {
            const state = answers[q.id];
            const isShort = q.type === 'short' || !q.options || q.options.length === 0;

            return (
              <div
                key={q.id || idx}
                className="rounded-xl border border-[#DFE5EB] dark:border-[#293741] bg-white dark:bg-[#182127] p-4 flex flex-col gap-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold text-[#182026] dark:text-[#F1F3F5] leading-relaxed">
                    <span className="font-mono text-[#5C6B77] dark:text-[#8E9EA9] mr-1.5">
                      Q{idx + 1}.
                    </span>
                    {q.question}
                  </p>
                  <span className="text-[10.5px] font-mono text-[#6B7B87] dark:text-[#8394A0] shrink-0">
                    {isShort ? 'Short' : 'MCQ'}
                  </span>
                </div>

                {!isShort && q.options ? (
                  <div className="flex flex-col gap-1.5">
                    {q.options.map((option, optIdx) => {
                      const isSelected = state?.selectedOption === optIdx;
                      const isCorrectOpt = optIdx === q.correctIndex;
                      let optClasses =
                        'bg-[#F6F8FA] dark:bg-[#131B21] border-[#DCE2E8] dark:border-[#2B3943] text-[#182026] dark:text-[#E2E8EE] hover:border-[#E86A33]';
                      if (state?.submitted) {
                        if (isCorrectOpt) {
                          optClasses =
                            'bg-[#ECF8F1] dark:bg-[#192F26] border-[#3D9E71] text-[#14432D] dark:text-[#9BE2BE]';
                        } else if (isSelected) {
                          optClasses =
                            'bg-[#FEF2F0] dark:bg-[#2F1C1B] border-[#D64531] text-[#8E2418] dark:text-[#F5A398]';
                        } else {
                          optClasses =
                            'bg-[#F6F8FA] dark:bg-[#131B21] border-[#E5EAEF] dark:border-[#232F37] text-[#7A8994] dark:text-[#6D7D88]';
                        }
                      }

                      return (
                        <button
                          key={optIdx}
                          type="button"
                          disabled={Boolean(state?.submitted)}
                          onClick={() => handleSelectMcq(q, optIdx)}
                          className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition-colors flex items-start gap-2 ${optClasses} ${
                            state?.submitted ? 'cursor-default' : 'cursor-pointer'
                          }`}
                        >
                          <span className="font-mono font-semibold shrink-0">
                            {String.fromCharCode(65 + optIdx)}.
                          </span>
                          <span className="leading-snug">{option}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <textarea
                      rows={2}
                      disabled={Boolean(state?.submitted || state?.grading)}
                      value={state?.shortText || ''}
                      onChange={(e) =>
                        setAnswers((prev) => ({
                          ...prev,
                          [q.id]: {
                            ...(prev[q.id] || { submitted: false, isCorrect: false }),
                            shortText: e.target.value,
                          },
                        }))
                      }
                      placeholder="Write a concise 1–2 sentence explanation..."
                      className="w-full p-2.5 rounded-lg bg-[#F6F8FA] dark:bg-[#131B21] border border-[#D4DCE3] dark:border-[#2E3D48] text-xs text-[#182026] dark:text-[#F1F3F5] resize-none"
                    />
                    {!state?.submitted && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] text-[#C93B2B] dark:text-[#F06455]">
                          {state?.error || ''}
                        </span>
                        <button
                          type="button"
                          disabled={Boolean(state?.grading) || !(state?.shortText || '').trim()}
                          onClick={() => handleSubmitShort(q)}
                          className="px-3 py-1.5 rounded-lg bg-[#233039] dark:bg-[#2B3B46] hover:bg-[#31424E] disabled:opacity-50 text-white text-xs font-medium cursor-pointer disabled:cursor-not-allowed"
                        >
                          {state?.grading ? 'Grading...' : 'Grade Answer'}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Immediate Graded Feedback & Step-by-Step Explanation */}
                {state?.submitted && (
                  <div
                    className={`mt-1 p-3 rounded-lg border text-xs leading-relaxed ${
                      state.isCorrect
                        ? 'bg-[#EEF8F2] dark:bg-[#162721] border-[#BCE3CE] dark:border-[#2A493C] text-[#183829] dark:text-[#C5E9D6]'
                        : 'bg-[#FFF6F4] dark:bg-[#241A18] border-[#F0C8C0] dark:border-[#4A302B] text-[#4A201B] dark:text-[#E9CFCB]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-semibold mb-1">
                      {state.isCorrect ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#2F8F63] dark:text-[#52B788] shrink-0" />
                          <span>
                            Correct{state.gradeFeedback ? ` (${state.gradeFeedback.scorePct}%)` : ''} · +10 XP &amp; +1 treat
                          </span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3.5 h-3.5 text-[#C93B2B] dark:text-[#F06455] shrink-0" />
                          <span>
                            Not quite{state.gradeFeedback ? ` (${state.gradeFeedback.scorePct}%)` : ''} — here’s the walkthrough
                          </span>
                        </>
                      )}
                    </div>

                    {state.gradeFeedback ? (
                      <>
                        <p>{state.gradeFeedback.feedback}</p>
                        <p className="mt-1 opacity-90">{state.gradeFeedback.stepByStep}</p>
                      </>
                    ) : (
                      <p>{q.explanation}</p>
                    )}

                    {isShort && q.sampleAnswer && (
                      <p className="mt-1.5 pt-1.5 border-t border-black/10 dark:border-white/10 text-[11px] opacity-90">
                        <HelpCircle className="w-3 h-3 inline mr-1" />
                        Model answer: {q.sampleAnswer}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
