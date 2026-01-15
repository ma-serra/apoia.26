// Runtime config was removed in Next.js 16, using environment variable instead
const version = process.env.NEXT_PUBLIC_VERSION || '0.1.0'

export default function Version() {
    return (<>
        <div className="container-fluid mt-t mb-3"><div className="row">
            <div className="col-auto me-auto"></div>
            <div className="col-auto"><span style={{ color: "lightgrey", borderTop: "1px solid lightgrey" }}>v{version}</span></div>
        </div></div>
    </>
    )

}