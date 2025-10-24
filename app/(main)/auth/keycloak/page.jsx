import { getServerSession } from "next-auth/next"
import React from 'react'
import { redirect } from 'next/navigation'
import authOptions from '@/app/api/auth/[...nextauth]/options'
import Redirecting from "./redirecting"

const AuthKeycloak = async ({ searchParams }) => {
    const sp = await searchParams
    const raw = sp?.redirect || sp?.callbackUrl
    const callbackUrl = (typeof raw === 'string' && /^(\/|http:\/\/|https:\/\/)\S+$/.test(raw)) ? raw : '/'
    const isPopup = sp?.popup === 'true'

    const session = await getServerSession(authOptions)
    if (session && session.user) {
        // Se estiver autenticado e for popup, redireciona para página de callback
        if (isPopup) {
            redirect(`/auth/ready`)
        }
        // Senão, redireciona normalmente
        redirect(callbackUrl)
    }

    if (!authOptions.providers.find(provider => provider.name === "Keycloak"))
        throw new Error("Keycloak provider not found")

    return (
        <Redirecting callbackUrl={callbackUrl} isPopup={isPopup} />
    )
}
export default AuthKeycloak
