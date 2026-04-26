'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type AuthMode = 'login' | 'signup'
type FeedbackType = 'error' | 'success' | 'warning'

function mapAuthError(
    err: any,
    mode: AuthMode
): { message: string; type: Exclude<FeedbackType, 'success'> } {
    const rawMessage =
        typeof err?.message === 'string' && err.message.trim().length > 0
            ? err.message
            : 'Authentication failed. Please try again.'

    const isRateLimited =
        err?.status === 429 ||
        /rate limit/i.test(rawMessage) ||
        /too many requests/i.test(rawMessage)

    if (mode === 'signup' && isRateLimited) {
        return {
            type: 'warning',
            message:
                'Signup is temporarily rate-limited by Supabase email limits. Wait about 60 seconds and try again. If it still fails, this project may have hit the built-in email quota (2 emails/hour), which requires custom SMTP in Supabase Dashboard > Authentication > Rate Limits.',
        }
    }

    if (mode === 'signup' && /user already registered/i.test(rawMessage)) {
        return {
            type: 'warning',
            message: 'This email is already registered. Try signing in instead.',
        }
    }

    return {
        type: 'error',
        message: rawMessage,
    }
}

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [feedbackType, setFeedbackType] = useState<FeedbackType>('error')
    const [mode, setMode] = useState<AuthMode>('login')

    const router = useRouter()
    // Lazy init — only create client on the browser, never during SSR/prerender
    const supabase = useMemo(() => {
        if (typeof window === 'undefined') return null as any
        return createClient()
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)
        setFeedbackType('error')

        try {
            if (mode === 'signup') {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                })
                if (error) throw error
                // Show success message for signup
                setError('Check your email for the confirmation link!')
                setFeedbackType('success')
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                })
                if (error) throw error
                router.push('/assessment')
                router.refresh()
            }
        } catch (err: any) {
            // Network-level failures (ISP / Supabase down)
            if (
                err.message === 'Failed to fetch' ||
                err.name === 'AuthRetryableFetchError'
            ) {
                setError(
                    'Unable to reach the server — please check your internet connection and try again.'
                )
                setFeedbackType('error')
            } else {
                const mappedError = mapAuthError(err, mode)
                setError(mappedError.message)
                setFeedbackType(mappedError.type)
            }
        } finally {
            setIsLoading(false)
        }
    }


    return (
        <div className="min-h-screen flex items-center justify-center bg-[#F4F4F0] p-4">
            <div className="brutalist-card p-12 w-full max-w-md">
                <h1 className="text-6xl font-black text-black mb-2 text-center tracking-tighter">
                    STREETS
                </h1>
                <p className="text-black font-medium text-center mb-12 uppercase tracking-widest text-xs border-b-2 border-black pb-4">
                    {mode === 'login' ? 'Authentication Required' : 'New User Registration'}
                </p>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-black mb-2 uppercase">
                            Email Address
                        </label>
                        <input
                            type="email"
                            name="email"
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="brutalist-input w-full"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-black mb-2 uppercase">
                            Password
                        </label>
                        <input
                            type="password"
                            name="password"
                            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="brutalist-input w-full"
                            required
                            minLength={6}
                        />
                    </div>

                    {error && (
                        <div className={`p-4 border-2 border-black font-bold ${feedbackType === 'success'
                            ? 'bg-green-300 text-black'
                            : feedbackType === 'warning'
                                ? 'bg-yellow-300 text-black'
                                : 'bg-red-500 text-white'
                            }`}>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="brutalist-button w-full"
                    >
                        {isLoading ? 'PROCESSING...' : mode === 'login' ? 'ENTER SYSTEM' : 'CREATE ACCOUNT'}
                    </button>
                </form>

                <div className="mt-8 text-center pt-8 border-t-2 border-black">
                    <button
                        onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                        className="text-black hover:bg-black hover:text-white px-2 py-1 transition-colors font-bold uppercase text-xs tracking-widest"
                    >
                        {mode === 'login'
                            ? "Provide Credentials? Sign up"
                            : 'Have Credentials? Sign in'}
                    </button>
                </div>
            </div>
        </div>
    )
}
