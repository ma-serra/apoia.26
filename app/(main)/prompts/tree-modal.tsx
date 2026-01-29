import axios from "axios";
import { useState } from "react";
import { Modal } from "react-bootstrap";

export function TreeModal({ show, onClose }) {
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [data, setData] = useState<string | null>(null);
    const [isVisible, setIsVisible] = useState<boolean>(true);

    const documents = [
        {
            id: 1,
            title: 'Sentença (E.64)',
            url: 'http://localhost:8081/api/v1/process/50013566520224025113/piece/JFRJ_511689697247503551497996299901/binary'
        },
        {
            id: 2,
            title: 'Laudo Pericial (E.56)',
            url: 'http://localhost:8081/api/v1/process/50013566520224025113/piece/JFRJ_511686430340829713925176244142/binary'
        },
        {
            id: 3,
            title: 'Certidão (E.45)',
            url: 'http://localhost:8081/api/v1/process/50013566520224025113/piece/JFRJ_511677601065077174439716340625/binary'
        }
    ];

    async function fetchAndDisplayPDF(url: string) {
        const response = await axios.get(`/api/pdf-proxy?url=${encodeURIComponent(url)}#toolbar=1&navpanes=1&scrollbar=1`, { responseType: 'arraybuffer' });

        console.log(response.headers)

        // Convert buffer to Blob URL
        const uint8Array = new Uint8Array(response.data);
        const blob = new Blob([uint8Array], { type: response.headers["content-type"] });
        const blobUrl = URL.createObjectURL(blob);

        // Get visibility flag from response header
        const isVisibleFlag = response.headers['x-visible']

        console.log(isVisibleFlag)

        if(isVisibleFlag === 'false') {
            setData(null);
            setIsVisible(false);
            return;
        }

        setData(blobUrl);
        setIsVisible(true);
    }

    return (
        <Modal 
            show={show} 
            onHide={onClose}
            dialogClassName="position-fixed top-0 left-0 w-100 h-100 p-0 m-0"
            contentClassName="border-0"
            backdropClassName="show"
        >
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#fff',
                borderRadius: 0
            }}>
                <Modal.Header closeButton style={{ flexShrink: 0 }}>
                    <Modal.Title>Visualização de Documento</Modal.Title>
                </Modal.Header>
                
                <Modal.Body className="p-0" style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                    {/* Seção Esquerda */}
                    <div style={{
                        width: '400px',
                        borderRight: '1px solid #dee2e6',
                        overflowY: 'auto',
                        padding: '1rem'
                    }}>
                        <h5>Documentos</h5>
                        <div className="list-group">
                            {documents.map((doc) => (
                                <button
                                    key={doc.id}
                                    type="button"
                                    className={`list-group-item list-group-item-action ${pdfUrl === doc.url ? 'active' : ''}`}
                                    onClick={() => {
                                        setPdfUrl(doc.url);
                                        fetchAndDisplayPDF(doc.url);
                                    }}
                                >
                                    {doc.title}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Seção Direita - PDF Viewer */}
                    <div style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        backgroundColor: '#f8f9fa'
                    }}>
                        {pdfUrl ? 
                            (isVisible ? (
                                <iframe
                                    src={data}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        border: 'none'
                                    }}
                                    title="PDF Viewer"
                                />
                            ) : (
                                <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: '100%',
                                color: '#6c757d'
                            }}>
                                Não é possível visualizar este documento.
                            </div>
                            )
                        ) : (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: '100%',
                                color: '#6c757d'
                            }}>
                                Nenhum documento selecionado
                            </div>
                        )}
                    </div>
                </Modal.Body>
            </div>
        </Modal>
    )
}