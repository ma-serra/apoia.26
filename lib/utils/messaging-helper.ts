import { ContentType } from "../ai/prompt-types"
import { devLog } from "./log"
import { ApproveMessageToParentType } from "./messaging"

// O Eproc não utiliza blockquote, mas sim parágrafos com classe "citacao". 
// Também não usa títulos, mas sim parágrafos com classes "titulo" e "subtitulo".

const formatHtmlToEprocStandard = (html: string) => {
    html = html.replace(/<p>/g, '<p class="paragrafoPadrao">')
    html = html.replace(/<h1>/g, '<p class="titulo">')
    html = html.replace(/<h2>/g, '<p class="subtitulo">')
    html = html.replace(/<blockquote>/g, '<p class="citacao">')
    html = html.replace(/<\/h1>/g, '</p>')
    html = html.replace(/<\/h2>/g, '</p>')
    html = html.replace(/<\/blockquote>/g, '</p>')
    return html
}

export const sendApproveMessageToParent = (content: ContentType) => {
    devLog('onApprove content:', content)
    if (content) {
        let htmlContent = formatHtmlToEprocStandard(content.formatted || '')
        window.parent.postMessage({
            type: 'approved',
            payload: {
                markdownContent: content.raw,
                htmlContent,
            }
        } satisfies ApproveMessageToParentType, '*')
    }
}
