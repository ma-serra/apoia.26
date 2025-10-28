'use client'

import { envString } from '@/lib/utils/env'
import { useEffect, useRef, useState } from 'react'

const Wait = () => {
    const [authCheckInterval, setAuthCheckInterval] = useState<NodeJS.Timeout | null>(null)
    const hasRun = useRef(false)

    useEffect(() => {
        // Previne execução dupla em desenvolvimento (React 18 Strict Mode)
        if (hasRun.current) return
        hasRun.current = true
        if (true) {
            parent.postMessage(`auth-popup:${process.env.NEXT_PUBLIC_BASE_URL}/auth/keycloak?popup=true&redirect=/auth/ready`, '*')
        } else {
            const popup = window.open('/auth/keycloak?popup=true&redirect=/auth/ready', '_blank')
            if (!popup) {
                alert('Por favor, habilite popups para este site para realizar a autenticação.')
                return
            }
        }

        // Listener para mensagem do popup
        const handleMessage = (event: MessageEvent) => {
            if (event.data === 'auth-completed') {
                window.removeEventListener('message', handleMessage)
                // Recarrega a página principal para verificar autenticação
                window.location.reload()
            }
        }

        window.addEventListener('message', handleMessage)
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