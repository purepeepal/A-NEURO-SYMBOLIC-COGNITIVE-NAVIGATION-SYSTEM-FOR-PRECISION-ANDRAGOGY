'use client'
import { useEffect, useState } from 'react'
import { useInView } from '@/hooks/useInView'

export function AnimatedNumber({ value, suffix = '', duration = 1500 }: { value: number; suffix?: string; duration?: number }) {
    const [display, setDisplay] = useState(0)
    const { ref, isInView } = useInView()

    useEffect(() => {
        if (!isInView) return
        let start = 0
        const step = value / (duration / 16)
        const timer = setInterval(() => {
            start += step
            if (start >= value) {
                setDisplay(value)
                clearInterval(timer)
            } else {
                setDisplay(Math.round(start))
            }
        }, 16)
        return () => clearInterval(timer)
    }, [isInView, value, duration])

    return <span ref={ref}>{Math.round(display)}{suffix}</span>
}
