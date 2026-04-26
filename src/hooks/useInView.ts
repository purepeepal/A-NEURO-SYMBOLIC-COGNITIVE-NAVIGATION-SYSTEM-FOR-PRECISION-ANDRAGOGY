'use client'
import { useEffect, useState, useRef } from 'react'

export function useInView(options?: IntersectionObserverInit) {
    const ref = useRef<HTMLDivElement>(null)
    const [isInView, setIsInView] = useState(false)

    useEffect(() => {
        if (!ref.current) return
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setIsInView(true)
                observer.disconnect()
            }
        }, { threshold: 0.15, ...options })
        observer.observe(ref.current)
        return () => observer.disconnect()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return { ref, isInView }
}
