'use client'

import { faHome } from "@fortawesome/free-regular-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Breadcrumb } from "react-bootstrap";
import { usePromptContext } from "./context/PromptContext";

export default function BreadCrumbs({ resetToHome, resetProcess, resetPrompt }: { resetToHome: () => void, resetProcess: () => void, resetPrompt: () => void }) {
    const { numeroDoProcesso, prompt } = usePromptContext()
    
    if (!numeroDoProcesso && !prompt) return null
    return (
        <Breadcrumb className="mt-2" style={{ fontSize: '1em' }}>
            {numeroDoProcesso
                ? <Breadcrumb.Item onClick={resetPrompt} title="Página inicial"><FontAwesomeIcon icon={faHome} /></Breadcrumb.Item>
                : <Breadcrumb.Item onClick={resetToHome} title="Página inicial"><FontAwesomeIcon icon={faHome} /></Breadcrumb.Item>}
            {prompt && (
                <Breadcrumb.Item active>{prompt.name}</Breadcrumb.Item>
            )}
        </Breadcrumb>
    );
}