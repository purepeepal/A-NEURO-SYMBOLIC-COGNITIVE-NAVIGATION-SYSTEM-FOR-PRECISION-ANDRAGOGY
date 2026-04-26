'use client'
import { OnboardingModal } from '@/components/assessment/OnboardingModal'
import { EnhancedCurriculumExplorer } from '@/components/kg/EnhancedCurriculumExplorer'

export default function AssessmentDashboard() {
    return (
        <>
            <OnboardingModal />
            <EnhancedCurriculumExplorer />
        </>
    )
}
