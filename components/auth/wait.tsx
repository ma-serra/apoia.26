'use client'

import { signIn } from "next-auth/react"
import { redirect } from "next/navigation"
import { useEffect, useRef, useState } from 'react'

const Wait = () => {
    const [authCheckInterval, setAuthCheckInterval] = useState<NodeJS.Timeout | null>(null)
    const hasRun = useRef(false)

    useEffect(() => {
        // Previne execução dupla em desenvolvimento (React 18 Strict Mode)
        if (hasRun.current) return
        hasRun.current = true

        // Detecta se está em iframe
        const inIframe = window.self !== window.top

        const popup = window.open('/auth/keycloak?popup=true&redirect=/auth/ready', '_blank')

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
    }, [])

    useEffect(() => {
        return () => {
            if (authCheckInterval) {
                clearInterval(authCheckInterval)
            }
        }
    }, [authCheckInterval])

    return (
        <div className="px-4 py-1 my-1 mt-5 text-center">
            <div className="col-lg-6 mx-auto">
                <p className="alert alert-light">Foi aberto um popup para o sistema de autenticação. Por favor, complete a autenticação no popup.</p>
            </div>
        </div>
    )
}

export default Wait