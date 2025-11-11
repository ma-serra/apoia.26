import { IAPromptList } from "@/lib/db/mysql-types"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faEdit } from "@fortawesome/free-solid-svg-icons"

interface PromptHeaderProps {
    prompt: IAPromptList
    onPromptChange: () => void
    variant?: 'title' | 'header'
}

export function PromptHeader({ prompt, onPromptChange, variant = 'title' }: PromptHeaderProps) {
    if (variant === 'header') {
        return (
            <div className="text-center">
                <span className="h3">{prompt.name}</span> -{' '}
                <span onClick={onPromptChange} className="text-primary" style={{ cursor: 'pointer' }}>
                    <FontAwesomeIcon icon={faEdit} /> Alterar
                </span>
            </div>
        )
    }

    return (
        <div className="text-body-tertiary text-center h-print">
            Prompt: {prompt.name} -{' '}
            <span onClick={onPromptChange} className="text-primary" style={{ cursor: 'pointer' }}>
                <FontAwesomeIcon icon={faEdit} /> Alterar
            </span>
        </div>
    )
}
