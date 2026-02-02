import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { Modal, Spinner } from "react-bootstrap";
import { TreeView, type TreeNode } from "@/components/tree-view";
import { PecaType } from "@/lib/proc/process-types";

interface TreeModalProps {
    show: boolean;
    onClose: () => void;
    pieces: PecaType[];
    onSave: (pieces: string[]) => void;
}

export function TreeModal({ show, onClose, pieces, onSave }: TreeModalProps) {
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [data, setData] = useState<string | null>(null);
    const [isVisible, setIsVisible] = useState<boolean>(true);
    const [checkedNodes, setCheckedNodes] = useState<Set<string | number>>(new Set());
    const [isLoading, setIsLoading] = useState<boolean>(false);

    // Agrupar peças por número do evento
    const groupedByEvent = pieces.reduce((acc, piece) => {
        const eventNumber = piece.numeroDoEvento || 'Sem Evento';
        if (!acc[eventNumber]) {
            acc[eventNumber] = [];
        }
        acc[eventNumber].push(piece);
        return acc;
    }, {} as Record<string, PecaType[]>);

    // Construir tree data a partir das peças
    const treeData: TreeNode[] = Object.entries(groupedByEvent).map(([eventNumber, piecesInEvent], eventIndex) => ({
        id: `evento-${eventIndex}`,
        label: `Evento ${eventNumber}`,
        children: piecesInEvent.map((piece) => ({
            id: piece.id,
            label: piece.descr,
            url: `/api/v1/process/${piece.numeroDoProcesso}/piece/${piece.id}/binary`,
            piece: piece
        }))
    }));

    async function fetchAndDisplayPDF(url: string) {
        try {
            setIsLoading(true);
            setData(null);

            // Construir URL absoluta para passar ao proxy
            const absoluteUrl = `${window.location.origin}${url}`;
            const response = await axios.get(`/api/pdf-proxy?url=${encodeURIComponent(absoluteUrl)}#toolbar=1&navpanes=1&scrollbar=1`, { 
                responseType: 'arraybuffer'
            });

            // Convert buffer to Blob URL
            const uint8Array = new Uint8Array(response.data);
            const blob = new Blob([uint8Array], { type: response.headers["content-type"] });
            const blobUrl = URL.createObjectURL(blob);

            // Get visibility flag from response header
            const isVisibleFlag = response.headers['x-visible']

            if(isVisibleFlag === 'false') {
                setData(null);
                setIsVisible(false);
            } else {
                setData(blobUrl);
                setIsVisible(true);
            }
        } catch (error) {
            console.error('Erro ao carregar PDF:', error);
            setIsVisible(false);
        } finally {
            setIsLoading(false);
        }
    }

    const handleNodeClick = (node: TreeNode) => {
        if (node.url) {
            setPdfUrl(node.url);
            fetchAndDisplayPDF(node.url);
        }
    };

    const handleCheckboxChange = (nodeId: string | number, checked: boolean) => {
        setCheckedNodes(prevChecked => {
            const newCheckedNodes = new Set(prevChecked);
            if (checked) {
                newCheckedNodes.add(nodeId);
            } else {
                newCheckedNodes.delete(nodeId);
            }
            return newCheckedNodes;
        });
    };

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
                        <h5>Processo {pieces.length > 0 ? pieces[0].numeroDoProcesso : ''}</h5>
                        <TreeView 
                            data={treeData}
                            onNodeClick={handleNodeClick}
                            onCheckboxChange={handleCheckboxChange}
                            checkedNodes={checkedNodes}
                            renderLabel={(node) => (
                                <span style={{
                                    fontWeight: node.url ? 'normal' : 'bold',
                                    color: pdfUrl === node.url ? '#0d6efd' : 'inherit',
                                    cursor: node.url ? 'pointer' : 'default'
                                }}>
                                    {node.children && node.children.length > 0 
                                        ? `(${node.label.replace(/\D/g, '')}) - ${node.children[0].label.toLowerCase()} - 
                                        ${new Intl.DateTimeFormat('pt-BR', { 
                                            day: '2-digit', 
                                            month: '2-digit', 
                                            year: 'numeric', 
                                            hour: '2-digit', 
                                            minute: '2-digit' 
                                        }).format(new Date(node.children[0].piece.dataHora))}`
                                        : `${node.label}`
                                    }
                                </span>
                            )}
                        />
                    </div>

                    {/* Seção Direita - PDF Viewer */}
                    <div style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        backgroundColor: '#f8f9fa'
                    }}>
                        {isLoading ? (
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: '100%',
                                padding: '2rem'
                            }}>
                                <p className="text-muted mb-3">Carregando documento...</p>
                                <Spinner animation="border" role="status" />
                            </div>
                        ) : pdfUrl ? 
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