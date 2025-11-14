'use client'

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Container } from "react-bootstrap"
import { SourceMessageFromParentType, MessageWithType, AuthPopupMessageType, SINK_PARAM_THAT_INDICATES_TO_SEND_AS_A_MESSAGE_TO_PARENT, SOURCE_PARAM_THAT_INDICATES_TO_RETRIEVE_USING_MESSAGE_TO_PARENT } from "@/lib/utils/messaging"
import devLog from "@/lib/utils/log"

export const ClientIFrameTest = (props: { baseUrl: string; callbackUrl: string }) => {
    const router = useRouter()

    useEffect(() => {
        const postMsgToIframe = (msg: any) => {
            const iframe = document.getElementById('authFrame') as HTMLIFrameElement | null
            if (iframe?.contentWindow) {
                try {
                    const targetOrigin = new URL(props.baseUrl).origin
                    iframe.contentWindow.postMessage(msg, targetOrigin)
                } catch {
                    iframe.contentWindow.postMessage(msg, '*')
                }
            }
        }

        const handleMessage = (event: MessageEvent) => {
            const data = event.data as MessageWithType

            switch ((data as MessageWithType).type) {
                case 'auth-popup': {
                    const url = (data as AuthPopupMessageType).payload.url
                    window.open(url, '_blank')
                    break
                }
                case 'auth-completed': {
                    devLog('Received auth-completed message from iframe.')
                    postMsgToIframe(data)
                    // Recarrega a página principal para verificar autenticação
                    router.push(props.callbackUrl)
                    break
                }
                case 'get-source': {
                    const htmlContent = `<h1>Quem encontra os <strong>erros</strong> deste texto?</h1><p>O Tomás não é uma criança mal comportada, mas sofre de um desiquilíbrio hormonal que o deixa por vezes obsecado com comida, como se estivesse sempre cheinho de fome..</p>`
                    postMsgToIframe({ type: 'set-source', payload: { htmlContent: htmlContent } } satisfies SourceMessageFromParentType)
                    break
                }
                case 'approved': {
                    const approvedMessage = data as any
                    devLog('Received approved message from iframe:', approvedMessage)
                    break
                }
            }

        }
        window.addEventListener('message', handleMessage)
        return () => {
            window.removeEventListener('message', handleMessage)
        }
    }, [])

    // const src = `${props.baseUrl}/auth/keycloak-iframe?redirect=/sidekick?prompt=refinamento-de-texto%26source=${SOURCE_PARAM_THAT_INDICATES_TO_RETRIEVE_USING_MESSAGE_TO_PARENT}%26sink=${SINK_PARAM_THAT_INDICATES_TO_SEND_AS_A_MESSAGE_TO_PARENT}%26sink-button-text=Enviar+para+o+Eproc`
    const src = `${props.baseUrl}/auth/keycloak-iframe?redirect=/sidekick?process=50016349520244025113%26prompt=minuta-de-sentenca%26sink=${SINK_PARAM_THAT_INDICATES_TO_SEND_AS_A_MESSAGE_TO_PARENT}%26sink-button-text=Enviar+para+o+Eproc`

    return <Container className="mt-3 text-center">
        <h1>Keycloak Authentication Test Page</h1>
        <iframe id="authFrame" style={{ "width": "500px", "height": "800px", border: "1px solid black" }} src={src} allow="clipboard-write"></iframe>
    </Container>
}