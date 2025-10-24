'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

export default function AuthReady() {
    const searchParams = useSearchParams()
    const redirect = searchParams.get('redirect') || '/'

    useEffect(() => {
        // Envia mensagem para o window.opener (página que abriu o popup)
        if (window.opener) {
            window.opener.postMessage('auth-completed', '*')
            setTimeout(() => {
                window.close()
            }, 50)
        } else {
            // Se não houver opener (usuário abriu diretamente), redireciona
            window.location.href = redirect
        }
    }, [redirect])

    return (
        <div className="px-4 py-1 my-1 mt-5 text-center">
            <div className="col-lg-6 mx-auto">
                <p className="alert alert-success">Autenticação realizada com sucesso!</p>
            </div>
        </div>
    )
}
