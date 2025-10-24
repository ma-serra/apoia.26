'use client'

import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from 'react'

const Redirecting = (props: { callbackUrl: string }) => {
    const router = useRouter()

    useEffect(() => {
        signIn('keycloak', { callbackUrl: props.callbackUrl })
    }, [props.callbackUrl, router])

    return (
        <div className="px-4 py-1 my-1 mt-5 text-center">
            <div className="col-lg-6 mx-auto">
                <p className="alert alert-light">Você será redirecionado para o sistema de autenticação...</p>
            </div>
        </div>
    )
}

export default Redirecting