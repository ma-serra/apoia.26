import React from 'react'
import { ClientIFrameTest } from './client'

const KeycloakIFrameTest = async ({ searchParams }) => {
    const url = process.env.NEXT_PUBLIC_URL
    console.log('Base URL:', url)
    return <ClientIFrameTest baseUrl={url} />
}
export default KeycloakIFrameTest
