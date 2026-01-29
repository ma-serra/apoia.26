import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const url = request.nextUrl.searchParams.get('url');

        if (!url) {
            return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
        }

        console.log('=== PDF PROXY REQUEST ===');
        console.log('Target URL:', url);

        // Get authentication headers
        const cookie = request.headers.get('cookie');
        const authorization = request.headers.get('authorization');

        const headers: HeadersInit = {};
        if (cookie) headers['Cookie'] = cookie;
        if (authorization) headers['Authorization'] = authorization;

        console.log('Request headers:', headers);

        // Fetch the document
        const response = await fetch(url, { headers });

        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
            return NextResponse.json({ error: 'Failed to fetch document' }, { status: response.status });
        }

        const buffer = await response.arrayBuffer();
        
        return new NextResponse(buffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'inline',
            },
        });
    } catch (error) {
        console.error('Proxy error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
