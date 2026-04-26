'use client'
// ─── Subject Filter Tab Bar ─────────────────────────────────────────
// Brutalist-styled tab bar for filtering the KG by subject.

interface SubjectFilterProps {
    subjects: string[]
    currentSubject: string | null
    onFilter: (subject: string | null) => void
}

const SUBJECT_ICONS: Record<string, string> = {
    Mathematics: '◈',
    Science: '◉',
    'Social Science': '◆',
}

export function SubjectFilter({ subjects, currentSubject, onFilter }: SubjectFilterProps) {
    return (
        <div className="flex items-center gap-0 border-2 border-black bg-white overflow-hidden" style={{ borderRadius: 0 }}>
            <button
                onClick={() => onFilter(null)}
                className={`px-5 py-3 text-xs font-black uppercase tracking-widest transition-all border-r-2 border-black
          ${!currentSubject
                        ? 'bg-black text-white'
                        : 'bg-white text-black hover:bg-gray-100'
                    }`}
            >
                ALL
            </button>
            {subjects.map(subject => (
                <button
                    key={subject}
                    onClick={() => onFilter(subject)}
                    className={`px-5 py-3 text-xs font-black uppercase tracking-widest transition-all border-r-2 border-black last:border-r-0
            ${currentSubject === subject
                            ? 'bg-black text-white'
                            : 'bg-white text-black hover:bg-gray-100'
                        }`}
                >
                    <span className="mr-1.5">{SUBJECT_ICONS[subject] || '●'}</span>
                    {subject}
                </button>
            ))}
        </div>
    )
}
