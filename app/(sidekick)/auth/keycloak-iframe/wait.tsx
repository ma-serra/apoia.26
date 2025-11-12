'use client'

import { AuthPopupMessageType, MessageWithType } from '@/lib/utils/messaging'
import { useEffect, useRef, useState } from 'react'

const Wait = (props: { baseUrl: string }) => {
    const [authCheckInterval, setAuthCheckInterval] = useState<NodeJS.Timeout | null>(null)
    const hasRun = useRef(false)

    useEffect(() => {
        // Previne execução dupla em desenvolvimento (React 18 Strict Mode)
        if (hasRun.current) return
        hasRun.current = true
        if (true) {
            parent.postMessage({ type: 'auth-popup', payload: { url: `${props.baseUrl}/auth/keycloak?popup=true&redirect=/auth/ready` } } satisfies AuthPopupMessageType, '*')
        } else {
            const popup = window.open('/auth/keycloak?popup=true&redirect=/auth/ready', '_blank')
            if (!popup) {
                alert('Por favor, habilite popups para este site para realizar a autenticação.')
                return
            }
        }

        // Listener para mensagem do popup
        const handleMessage = (event: MessageEvent) => {
            const data = event.data as MessageWithType
            switch (data.type) {
                case 'auth-completed': {
                    window.removeEventListener('message', handleMessage)
                    // Recarrega a página principal para verificar autenticação
                    window.location.reload()
                    break
                }
            }
        }
        window.addEventListener('message', handleMessage)
        return () => {
            window.removeEventListener('message', handleMessage)
        }
    }, [])

    return (
        <div className="px-4 py-1 my-1 mt-5 text-center">
            <div className="col-lg-6 mx-auto">
                <p className="alert alert-light">Foi aberto um popup para o sistema de autenticação. Por favor, complete a autenticação no popup.</p>
            </div>
        </div>
    )
}

export default Wait