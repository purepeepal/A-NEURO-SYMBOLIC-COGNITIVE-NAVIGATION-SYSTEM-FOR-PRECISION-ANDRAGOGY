'use client'

import { useState } from 'react'
import { FeedbackInterface } from './FeedbackInterface'
import { SocraticGuide } from './SocraticGuide'

interface ChatFloatingButtonProps {
    assessmentId: string
    currentQuestionId?: string
    clientContext?: {
        question: string
        userAnswer?: string | null
        concept: string
        explanation?: string | null
    } | null
    isLastAnswerWrong?: boolean
    /** When true, the user has received evaluation feedback — show evaluation chat. Otherwise show Socratic guide. */
    hasEvaluation?: boolean
    onTerminate: () => void
}

export function ChatFloatingButton({ assessmentId, currentQuestionId, clientContext, isLastAnswerWrong, hasEvaluation, onTerminate }: ChatFloatingButtonProps) {
    const [isOpen, setIsOpen] = useState(false)

    const isSocraticMode = !hasEvaluation

    return (
        <>
            {/* Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed bottom-6 right-6 w-14 h-14 text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] flex items-center justify-center transition-all z-50 border-2 border-black group ${isSocraticMode ? 'bg-amber-600' : 'bg-black'}`}
                aria-label={isSocraticMode ? 'Get a thinking nudge' : 'Give Feedback'}
            >
                {isOpen ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                ) : (
                    <div className="relative w-6 h-6 flex items-center justify-center">
                        {isSocraticMode ? (
                            <>
                                <svg className="absolute inset-0 w-6 h-6 transition-opacity duration-200 opacity-100 group-hover:opacity-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>
                                <span className="absolute inset-0 flex items-center justify-center text-2xl transition-opacity duration-200 opacity-0 group-hover:opacity-100 pb-1">💡</span>
                            </>
                        ) : (
                            <>
                                <svg className="absolute inset-0 w-6 h-6 transition-opacity duration-200 opacity-100 group-hover:opacity-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
                                <span className="absolute inset-0 flex items-center justify-center text-2xl transition-opacity duration-200 opacity-0 group-hover:opacity-100 pb-1">💬</span>
                            </>
                        )}
                    </div>
                )}
            </button>

            {/* Chat Interface Popover */}
            {isOpen && (
                <div className="fixed bottom-24 right-6 w-80 md:w-96 bg-white border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] z-50 animate-fade-in-up flex flex-col max-h-[500px] overflow-hidden">
                    <div className={`text-white p-4 font-bold flex justify-between items-center ${isSocraticMode ? 'bg-amber-700' : 'bg-black'}`}>
                        <span className="font-mono text-sm tracking-wide">
                            {isSocraticMode ? 'SOCRATIC_GUIDE.EXE' : 'FUTURES_FEEDBACK.EXE'}
                        </span>
                        <div className="flex items-center space-x-4">
                            <div className="flex space-x-2">
                                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            </div>
                            {/* Close Button */}
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>
                    </div>

                    <div className="p-0 flex-1 overflow-y-auto">
                        {isSocraticMode ? (
                            <SocraticGuide
                                assessmentId={assessmentId}
                                responseId={currentQuestionId}
                                clientContext={clientContext}
                                onClose={() => setIsOpen(false)}
                            />
                        ) : (
                            <FeedbackInterface
                                assessmentId={assessmentId}
                                responseId={currentQuestionId}
                                clientContext={clientContext}
                                onClose={() => setIsOpen(false)}
                                isLastAnswerWrong={isLastAnswerWrong}
                                onTerminate={onTerminate}
                            />
                        )}
                    </div>
                </div>
            )}
        </>
    )
}
