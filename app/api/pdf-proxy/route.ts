import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const url = request.nextUrl.searchParams.get('url');

        if (!url) {
            return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
        }

        // Get authentication headers
        const cookie = request.headers.get('cookie');
        const authorization = request.headers.get('authorization');

        const headers: HeadersInit = {};
        if (cookie) headers['Cookie'] = cookie;
        if (authorization) headers['Authorization'] = authorization;

        // Fetch the document
        const response = await fetch(url, { headers });

        if (!response.ok) {
            return NextResponse.json({ error: 'Failed to fetch document' }, { status: response.status });
        }

        const buffer = await response.arrayBuffer();
        
        // Detect PDF by magic bytes (%PDF-)
        const uint8Array = new Uint8Array(buffer);
        const isPDF = uint8Array.length >= 4 &&
            uint8Array[0] === 0x25 && // %
            uint8Array[1] === 0x50 && // P
            uint8Array[2] === 0x44 && // D
            uint8Array[3] === 0x46;   // F

        const responseContentType = response.headers.get('content-type') || '';
        let finalContentType = responseContentType;

        // Override incorrect Content-Type when PDF detected
        if (isPDF && !responseContentType.includes('application/pdf')) {
            // console.log('Content-Type mismatch detected!');
            // console.log('Server returned:', responseContentType);
            // console.log('Actual content: PDF (detected by magic bytes)');
            // console.log('Overriding Content-Type to application/pdf');
            finalContentType = 'application/pdf';
        }

        const isVisible = response.headers.get('content-type') === 'application/octet-stream' ? false : true
        
        return new NextResponse(buffer, {
            status: 200,
            headers: {
                'Content-Type': finalContentType,
                'Content-Disposition': 'inline',
                'X-Visible': isVisible ? 'true' : 'false'
            },
        });
    } catch (error) {
        console.error('Proxy error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
