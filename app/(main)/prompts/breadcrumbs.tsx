import { IAPrompt, IAPromptList } from "@/lib/db/mysql-types";
import { faHome } from "@fortawesome/free-regular-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Breadcrumb } from "react-bootstrap";

export default function BreadCrumbs({ numeroDoProcesso, resetToHome, resetProcess, prompt, resetPrompt }: { numeroDoProcesso: string, resetToHome: () => void, resetProcess: () => void, prompt: IAPromptList, resetPrompt: () => void }) {
    if (!numeroDoProcesso && !prompt) return null
    return (
        <Breadcrumb className="mt-2" style={{ fontSize: '1em' }}>
            <Breadcrumb.Item onClick={resetToHome}><FontAwesomeIcon icon={faHome} /></Breadcrumb.Item>
            {numeroDoProcesso && (
                <Breadcrumb.Item onClick={resetPrompt} active={!prompt}>{numeroDoProcesso}</Breadcrumb.Item>
            )}
            {prompt && (
                <Breadcrumb.Item active>{prompt.name}</Breadcrumb.Item>
            )}
        </Breadcrumb>
    );
}