'use client'

import { useEffect, useState } from 'react'
import { Button, Container, Form, Modal, Table, Alert, Spinner } from 'react-bootstrap'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPenToSquare, faTrash, faPlus, faRefresh } from '@fortawesome/free-solid-svg-icons'

interface Court {
    id: number
    sigla: string
    nome: string
    tipo: string | null
    seq_tribunal_pai: number | null
    uf: string | null
    created_at: string
    updated_at: string | null
}

interface FormData {
    id: string
    sigla: string
    nome: string
    tipo: string
    seq_tribunal_pai: string
    uf: string
}

const emptyForm: FormData = {
    id: '',
    sigla: '',
    nome: '',
    tipo: '',
    seq_tribunal_pai: '',
    uf: ''
}

export default function CourtCrudClient() {
    const [courts, setCourts] = useState<Court[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [showModal, setShowModal] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [selectedCourt, setSelectedCourt] = useState<Court | null>(null)
    const [formData, setFormData] = useState<FormData>(emptyForm)
    const [saving, setSaving] = useState(false)
    const [isEditing, setIsEditing] = useState(false)

    const fetchCourts = async () => {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch('/api/v1/admin/court')
            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.errormsg || 'Erro ao carregar tribunais')
            }
            const data = await res.json()
            setCourts(data.items || [])
        } catch (err: any) {
            setError(err.message || 'Erro ao carregar tribunais')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchCourts()
    }, [])

    const handleNew = () => {
        setFormData(emptyForm)
        setIsEditing(false)
        setShowModal(true)
    }

    const handleEdit = (court: Court) => {
        setFormData({
            id: String(court.id),
            sigla: court.sigla,
            nome: court.nome,
            tipo: court.tipo || '',
            seq_tribunal_pai: court.seq_tribunal_pai ? String(court.seq_tribunal_pai) : '',
            uf: court.uf || ''
        })
        setIsEditing(true)
        setShowModal(true)
    }

    const handleDelete = (court: Court) => {
        setSelectedCourt(court)
        setShowDeleteModal(true)
    }

    const confirmDelete = async () => {
        if (!selectedCourt) return
        setSaving(true)
        try {
            const res = await fetch(`/api/v1/admin/court/${selectedCourt.id}`, { method: 'DELETE' })
            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.errormsg || 'Erro ao excluir tribunal')
            }
            setShowDeleteModal(false)
            setSelectedCourt(null)
            fetchCourts()
        } catch (err: any) {
            setError(err.message || 'Erro ao excluir tribunal')
        } finally {
            setSaving(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        
        if (!formData.id || !formData.sigla || !formData.nome) {
            setError('ID, Sigla e Nome são obrigatórios')
            return
        }

        setSaving(true)
        setError(null)

        try {
            const url = isEditing 
                ? `/api/v1/admin/court/${formData.id}` 
                : '/api/v1/admin/court'
            const method = isEditing ? 'PUT' : 'POST'

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: Number(formData.id),
                    sigla: formData.sigla,
                    nome: formData.nome,
                    tipo: formData.tipo || null,
                    seq_tribunal_pai: formData.seq_tribunal_pai ? Number(formData.seq_tribunal_pai) : null,
                    uf: formData.uf || null
                })
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.errormsg || 'Erro ao salvar tribunal')
            }

            setShowModal(false)
            setFormData(emptyForm)
            fetchCourts()
        } catch (err: any) {
            setError(err.message || 'Erro ao salvar tribunal')
        } finally {
            setSaving(false)
        }
    }

    const handleChange = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [field]: e.target.value }))
    }

    return (
        <Container className="mt-5">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h1>Tribunais</h1>
                <div>
                    <Button variant="outline-secondary" className="me-2" onClick={fetchCourts} disabled={loading}>
                        <FontAwesomeIcon icon={faRefresh} spin={loading} />
                    </Button>
                    <Button variant="primary" onClick={handleNew}>
                        <FontAwesomeIcon icon={faPlus} className="me-2" />
                        Novo Tribunal
                    </Button>
                </div>
            </div>

            {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}

            {loading ? (
                <div className="text-center py-5">
                    <Spinner animation="border" />
                </div>
            ) : courts.length === 0 ? (
                <Alert variant="info">Nenhum tribunal cadastrado</Alert>
            ) : (
                <Table striped bordered hover responsive>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Sigla</th>
                            <th>Nome</th>
                            <th>Tipo</th>
                            <th>Tribunal Pai</th>
                            <th>UF</th>
                            <th style={{ width: '100px' }}>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {courts.map(court => (
                            <tr key={court.id}>
                                <td>{court.id}</td>
                                <td>{court.sigla}</td>
                                <td>{court.nome}</td>
                                <td>{court.tipo || '-'}</td>
                                <td>{court.seq_tribunal_pai || '-'}</td>
                                <td>{court.uf || '-'}</td>
                                <td>
                                    <Button variant="outline-primary" size="sm" className="me-1" onClick={() => handleEdit(court)} title="Editar">
                                        <FontAwesomeIcon icon={faPenToSquare} />
                                    </Button>
                                    <Button variant="outline-danger" size="sm" onClick={() => handleDelete(court)} title="Excluir">
                                        <FontAwesomeIcon icon={faTrash} />
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            )}

            {/* Modal de Criação/Edição */}
            <Modal show={showModal} onHide={() => setShowModal(false)}>
                <Form onSubmit={handleSubmit}>
                    <Modal.Header closeButton>
                        <Modal.Title>{isEditing ? 'Editar Tribunal' : 'Novo Tribunal'}</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <Form.Group className="mb-3">
                            <Form.Label>ID (seq_orgao) *</Form.Label>
                            <Form.Control
                                type="number"
                                value={formData.id}
                                onChange={handleChange('id')}
                                disabled={isEditing}
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Sigla *</Form.Label>
                            <Form.Control
                                type="text"
                                value={formData.sigla}
                                onChange={handleChange('sigla')}
                                maxLength={20}
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Nome *</Form.Label>
                            <Form.Control
                                type="text"
                                value={formData.nome}
                                onChange={handleChange('nome')}
                                maxLength={255}
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Tipo</Form.Label>
                            <Form.Control
                                type="text"
                                value={formData.tipo}
                                onChange={handleChange('tipo')}
                                maxLength={50}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>ID do Tribunal Pai</Form.Label>
                            <Form.Control
                                type="number"
                                value={formData.seq_tribunal_pai}
                                onChange={handleChange('seq_tribunal_pai')}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>UF</Form.Label>
                            <Form.Control
                                type="text"
                                value={formData.uf}
                                onChange={handleChange('uf')}
                                maxLength={2}
                            />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowModal(false)} disabled={saving}>
                            Cancelar
                        </Button>
                        <Button variant="primary" type="submit" disabled={saving}>
                            {saving ? <Spinner animation="border" size="sm" /> : 'Salvar'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            {/* Modal de Confirmação de Exclusão */}
            <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Confirmar Exclusão</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    Deseja realmente excluir o tribunal <strong>{selectedCourt?.sigla}</strong> ({selectedCourt?.nome})?
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowDeleteModal(false)} disabled={saving}>
                        Cancelar
                    </Button>
                    <Button variant="danger" onClick={confirmDelete} disabled={saving}>
                        {saving ? <Spinner animation="border" size="sm" /> : 'Excluir'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    )
}
