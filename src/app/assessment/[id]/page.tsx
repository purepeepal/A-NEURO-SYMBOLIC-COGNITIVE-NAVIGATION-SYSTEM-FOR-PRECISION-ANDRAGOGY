'use client'
import { use } from 'react'
import { QuestionCard } from '@/components/assessment/QuestionCard'
import { ChatFloatingButton } from '@/components/assessment/ChatFloatingButton'
import { QuizLoadingScreen } from '@/components/assessment/QuizLoadingScreen'
import { FeedbackPanel } from '@/components/assessment/FeedbackPanel'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { useQuizSession } from '@/hooks/useQuizSession'

export default function AssessmentSession({ params }: { params: Promise<{ id: string }> }) {
    const { id: assessmentId } = use(params)
    const {
        loading, submitting, question, feedback, lastAnswer,
        progress, confidenceValue,
        showTerminateDialog, terminateMessage, terminateVariant,
        setShowTerminateDialog,
        handleSubmit, fetchNextCallback,
        requestTerminate, confirmTerminate,
    } = useQuizSession(assessmentId)

    if (loading && !question) return <QuizLoadingScreen />

    return (
        <ErrorBoundary context="quiz-session" onReset={() => window.location.reload()}>
            <div className="min-h-screen py-12 px-4 relative flex flex-col items-center overflow-hidden">
                <div className="absolute inset-0 bg-surface z-[-2]"></div>
                <div className="absolute inset-0 bg-scanning-grid opacity-30 z-[-1] pointer-events-none"></div>



                <div className="max-w-2xl mx-auto mb-8">
                    <div className="flex justify-between text-xs text-gray-500 mb-2 uppercase font-bold tracking-wider">
                        <span>Question {progress.current}</span>
                        <span>System Confidence: {Math.round(confidenceValue)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ease-out ${confidenceValue >= 80 ? 'bg-fuchsia-500 shadow-[0_0_10px_rgba(217,70,239,0.8)]' : 'bg-blue-600'}`}
                            style={{ width: `${confidenceValue}%` }}
                        ></div>
                    </div>
                </div>

                {question && !feedback && !loading && (
                    <QuestionCard question={question} onSubmit={handleSubmit} submitting={submitting} />
                )}

                {/* Inline loading between feedback→question transition */}
                {!feedback && loading && question && (
                    <div className="max-w-2xl mx-auto bg-white p-12 border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-center animate-fade-in">
                        <div className="w-10 h-10 border-4 border-black border-t-transparent animate-spin mx-auto mb-6"></div>
                        <p className="font-black uppercase tracking-widest text-sm text-gray-500">Generating next question...</p>
                    </div>
                )}

                {feedback && <FeedbackPanel feedback={feedback} onNext={fetchNextCallback} />}

                <ChatFloatingButton
                    assessmentId={assessmentId}
                    currentQuestionId={question?.id}
                    clientContext={question ? {
                        question: question.questionText || '',
                        userAnswer: lastAnswer,
                        concept: question.concept,
                        explanation: feedback?.explanation || null
                    } : null}
                    isLastAnswerWrong={feedback?.correct === false}
                    hasEvaluation={!!feedback}
                    onTerminate={requestTerminate}
                />

                <ConfirmDialog
                    open={showTerminateDialog}
                    title="End Session"
                    message={terminateMessage}
                    confirmLabel="End Session"
                    cancelLabel="Keep Going"
                    variant={terminateVariant}
                    onCancel={() => setShowTerminateDialog(false)}
                    onConfirm={confirmTerminate}
                />
            </div>
        </ErrorBoundary>
    )
}

