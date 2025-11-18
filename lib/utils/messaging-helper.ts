import { ContentType } from "../ai/prompt-types"
import { devLog } from "./log"
import { ApproveMessageToParentType } from "./messaging"

// O Eproc não utiliza blockquote, mas sim parágrafos com classe "citacao". 
// Também não usa títulos, mas sim parágrafos com classes "titulo" e "subtitulo".

const formatHtmlToEprocStandard = (html: string) => {

    // Os parágrafos entre <blockquote> e </blockquote>, marcados com <p> viram <p class="citacao">
    const blockquoteRegex = /<blockquote>([\s\S]*?)<\/blockquote>/g
    html = html.replace(blockquoteRegex, (match, p1) => {
        const formattedContent = p1.replace(/<p>/g, '<p class="citacao">')
        return formattedContent
    })
    html = html.replace(/<p>/g, '<p class="paragrafoPadrao">')
    html = html.replace(/<h1>/g, '<p class="titulo">')
    html = html.replace(/<h2>/g, '<p class="titulo">')
    html = html.replace(/<h3>/g, '<p class="subtitulo">')
    html = html.replace(/<\/h1>/g, '</p>')
    html = html.replace(/<\/h2>/g, '</p>')
    html = html.replace(/<\/h3>/g, '</p>')
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
