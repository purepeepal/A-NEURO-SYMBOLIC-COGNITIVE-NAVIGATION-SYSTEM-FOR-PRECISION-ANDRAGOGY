'use client'
import { useInView } from '@/hooks/useInView'

export function RevealSection({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
    const { ref, isInView } = useInView()
    const prefersReducedMotion = typeof window !== 'undefined'
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false

    return (
        <div
            ref={ref}
            className={`${prefersReducedMotion ? '' : `transition-all duration-700 ${isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`
                } ${className}`}
            style={prefersReducedMotion ? {} : { transitionDelay: `${delay}ms` }}
        >
            {children}
        </div>
    )
}
