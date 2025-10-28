import React from 'react'
import { ClientIFrameTest } from './client'

const KeycloakIFrameTest = async ({ searchParams }) => {
    console.log('Base URL:', process.env.NEXT_PUBLIC_BASE_URL)
    return <ClientIFrameTest baseUrl={process.env.NEXT_PUBLIC_BASE_URL} />
}
export default KeycloakIFrameTest
