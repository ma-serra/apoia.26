'use client'

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Container } from "react-bootstrap"

export const ClientIFrameTest = (props: { baseUrl: string; callbackUrl: string }) => {
    const router = useRouter()

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data.startsWith('auth-popup:')) {
                const url = event.data.substring('auth-popup:'.length)
                window.open(url, '_blank')
                // window.removeEventListener('message', handleMessage)
            } else if (event.data === 'auth-completed') {
                // Recarrega a página principal para verificar autenticação
                const iframe = document.getElementById('authFrame') as HTMLIFrameElement | null
                if (iframe?.contentWindow) {
                    try {
                        const targetOrigin = new URL(props.baseUrl).origin
                        iframe.contentWindow.postMessage('auth-completed', targetOrigin)
                    } catch {
                        iframe.contentWindow.postMessage('auth-completed', '*')
                    }
                }
                router.push(props.callbackUrl)
            }
        }
        window.addEventListener('message', handleMessage)
        return () => {
            window.removeEventListener('message', handleMessage)
        }
    }, [])

    const src = `${props.baseUrl}/auth/keycloak-iframe?redirect=/sidekick`

    return <Container className="mt-3 text-center">
        <h1>Keycloak Authentication Test Page</h1>
        <iframe id="authFrame" style={{ "width": "500px", "height": "800px", border: "1px solid black" }} src={src}></iframe>
    </Container>
}