'use client'

import { AuthCompletedMessageType } from '@/lib/utils/messaging'
import { useEffect } from 'react'

export default function AuthReady() {

    useEffect(() => {
        // Envia mensagem para o window.opener (página que abriu o popup)
        if (window.opener) {
            window.opener.postMessage({ type: 'auth-completed' } satisfies AuthCompletedMessageType, '*')
            setTimeout(() => {
                window.close()
            }, 50)
        }
    }, [])

    return (
        <div className="px-4 py-1 my-1 mt-5 text-center">
            <div className="col-lg-6 mx-auto">
                <p className="alert alert-success">Autenticação realizada com sucesso!</p>
            </div>
        </div>
    )
}
