'use client'

import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from 'react'

const Redirecting = (props: { callbackUrl: string, isPopup?: boolean }) => {
    const [isInIframe, setIsInIframe] = useState(false)
    const [shouldRedirect, setShouldRedirect] = useState(false)
    const router = useRouter()

    useEffect(() => {
        const inIframe = window.self !== window.top
        setIsInIframe(inIframe)

        if (inIframe && !props.isPopup) {
            setShouldRedirect(true)
            router.push('/auth/wait?callbackUrl=' + encodeURIComponent(props.callbackUrl))
        } else {
            // Realiza login normalmente (não está em iframe ou já é o popup)
            signIn('keycloak', { callbackUrl: props.callbackUrl })
        }
    }, [props.callbackUrl, props.isPopup, router])

    return (
        <div className="px-4 py-1 my-1 mt-5 text-center">
            <div className="col-lg-6 mx-auto">
                <p className="alert alert-light">Você será redirecionado para o sistema de autenticação...</p>
            </div>
        </div>
    )
}

export default Redirecting