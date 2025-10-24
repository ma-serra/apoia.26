'use client'

import { signIn } from "next-auth/react"
import { redirect } from "next/navigation"
import { useEffect, useState } from 'react'

const Wait = (props: { callbackUrl: string, isPopup?: boolean }) => {
    const [isInIframe, setIsInIframe] = useState(false)
    const [authCheckInterval, setAuthCheckInterval] = useState<NodeJS.Timeout | null>(null)

    useEffect(() => {
        // Detecta se está em iframe
        const inIframe = window.self !== window.top
        setIsInIframe(inIframe)

        // Se estiver em iframe e não for popup, abre popup para autenticação
        if (inIframe && !props.isPopup) {
            const currentUrl = new URL(window.location.href)
            currentUrl.searchParams.set('popup', 'true')
            
            const popup = window.open(
                currentUrl.toString(),
                'keycloak-auth',
                'width=600,height=700,left=100,top=100'
            )

            if (!popup) {
                alert('Por favor, habilite popups para este site para realizar a autenticação.')
                return
            }

            // Listener para mensagem do popup
            const handleMessage = (event: MessageEvent) => {
                if (event.data === 'auth-completed') {
                    // Recarrega a página principal para verificar autenticação
                    window.location.reload()
                }
            }

            window.addEventListener('message', handleMessage)

            // Verifica periodicamente se o popup foi fechado
            const checkPopupClosed = setInterval(() => {
                if (popup.closed) {
                    clearInterval(checkPopupClosed)
                    window.removeEventListener('message', handleMessage)
                    // Verifica se foi autenticado
                    window.location.reload()
                }
            }, 1000)

            setAuthCheckInterval(checkPopupClosed)

            return () => {
                clearInterval(checkPopupClosed)
                window.removeEventListener('message', handleMessage)
            }
        } else {
            // Realiza login normalmente (não está em iframe ou já é o popup)
            signIn('keycloak', { callbackUrl: props.callbackUrl })
        }
    }, [props.callbackUrl, props.isPopup])

    useEffect(() => {
        return () => {
            if (authCheckInterval) {
                clearInterval(authCheckInterval)
            }
        }
    }, [authCheckInterval])

    if (isInIframe && !props.isPopup) {
        redirect('/auth/wait')
    }

    return (
        <div className="px-4 py-1 my-1 mt-5 text-center">
            <div className="col-lg-6 mx-auto">
                <p className="alert alert-light">Você será redirecionado para o sistema de autenticação...</p>
            </div>
        </div>
    )
}

export default Wait