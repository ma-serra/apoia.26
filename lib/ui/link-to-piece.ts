import { TextoType } from "../ai/prompt-types";

export function addLinkToPieces(html: string, textos: TextoType[]) {
    return html.replace(/evento\s+(\d+)([^;)]*)/gmi, (match, eventNumber, rest) => {
        const eventNum = parseInt(eventNumber);

        // Find all uppercase labels followed by numbers (e.g., EMENDAINIC1, PET1, INIC1)
        const labelRegex = /\b([A-Z]+\d+)\b/g;
        let labelMatch;
        let replacedRest = rest;

        while ((labelMatch = labelRegex.exec(rest)) !== null) {
            const label = labelMatch[1];
            const foundTexto = textos?.find((texto) =>
                texto.event === String(eventNum) &&
                texto.label?.toLowerCase().includes(label.toLowerCase())
            );

            if (foundTexto) {
                // const link = `<a href="/api/v1/process/${params.data.numeroDoProcesso}/piece/${foundTexto.id}/binary" target="_blank" title="${foundTexto.label}">${label}</a>`;
                const splited = foundTexto.id.split('_', 2)
                let id = splited[0]
                if (splited.length === 2)
                    id = splited[1]
                const link = `<span class="widgetlinkdocumento" data-idpiece="${foundTexto.id}" data-iddocumento="${id}" data-target="_blank" data-is2g="" data-numprocesso="${foundTexto.numeroDoProcesso}" data-mimetype="" data-uf="">${foundTexto.label}</span>`
                //const link = `<span class="cke_widget_wrapper cke_widget_inline cke_widget_widgetlinkdocumento cke_widget_wrapper_widgetlinkdocumento" contenteditable="false" data-cke-filter="off"><span class="widgetlinkdocumento" data-iddocumento="511631026724981731315583503898" data-is2g="false" data-mimetype="pdf" data-numprocesso="50123935320214025104" data-page="" data-target="" data-uf="RJ" data-widget="widgetlinkdocumento">evento 1, INIC1</span></span>`
                replacedRest = replacedRest.replace(label, link);
            }
        }

        return `evento ${eventNumber}${replacedRest}`;
    })
}