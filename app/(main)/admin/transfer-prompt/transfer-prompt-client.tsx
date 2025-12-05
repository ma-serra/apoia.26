'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button, Container, Form, Table, Alert, Spinner, Card, InputGroup } from 'react-bootstrap'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSearch, faExchangeAlt, faCheck } from '@fortawesome/free-solid-svg-icons'
import { formatBrazilianDateTime } from '@/lib/utils/utils'

interface PromptVersion {
    id: number
    base_id: number
    name: string
    created_at: string
    created_by: number | null
    is_latest: number | boolean
    share: string
    kind: string
}

interface Owner {
    id: number
    username: string
    name: string | null
    cpf: string | null
}

interface User {
    id: number
    username: string
    name: string | null
    cpf: string | null
    court_name: string | null
}

interface PromptInfo {
    base_id: number
    versions: PromptVersion[]
    owner: Owner | null
    latest: PromptVersion
}

export default function TransferPromptClient() {
    const [baseId, setBaseId] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [promptInfo, setPromptInfo] = useState<PromptInfo | null>(null)
    
    // User search
    const [userSearch, setUserSearch] = useState('')
    const [searchingUsers, setSearchingUsers] = useState(false)
    const [users, setUsers] = useState<User[]>([])
    const [selectedUser, setSelectedUser] = useState<User | null>(null)
    
    // Transfer
    const [transferring, setTransferring] = useState(false)

    const fetchPromptInfo = async () => {
        if (!baseId.trim()) {
            setError('Informe o base_id do prompt')
            return
        }

        setLoading(true)
        setError(null)
        setSuccess(null)
        setPromptInfo(null)
        setSelectedUser(null)
        setUsers([])
        setUserSearch('')

        try {
            const res = await fetch(`/api/v1/admin/prompt/${baseId.trim()}`)
            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.errormsg || 'Erro ao buscar prompt')
            }
            const data = await res.json()
            setPromptInfo(data)
        } catch (err: any) {
            setError(err.message || 'Erro ao buscar prompt')
        } finally {
            setLoading(false)
        }
    }

    const searchUsers = useCallback(async (query: string) => {
        if (query.trim().length < 2) {
            setUsers([])
            return
        }

        setSearchingUsers(true)
        try {
            const res = await fetch(`/api/v1/admin/user/search?q=${encodeURIComponent(query.trim())}`)
            if (!res.ok) {
                throw new Error('Erro ao buscar usuários')
            }
            const data = await res.json()
            setUsers(data.users || [])
        } catch (err: any) {
            console.error('Erro ao buscar usuários:', err)
        } finally {
            setSearchingUsers(false)
        }
    }, [])

    // Debounce user search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (userSearch.trim().length >= 2) {
                searchUsers(userSearch)
            } else {
                setUsers([])
            }
        }, 300)
        return () => clearTimeout(timer)
    }, [userSearch, searchUsers])

    const handleTransfer = async () => {
        if (!promptInfo || !selectedUser) return

        setTransferring(true)
        setError(null)
        setSuccess(null)

        try {
            const res = await fetch(`/api/v1/admin/prompt/${promptInfo.base_id}/transfer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newOwnerId: selectedUser.id })
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.errormsg || 'Erro ao transferir prompt')
            }

            const data = await res.json()
            setSuccess(`Prompt transferido com sucesso para ${data.newOwner.name || data.newOwner.username}. ${data.updated} versões atualizadas.`)
            
            // Refresh prompt info
            fetchPromptInfo()
        } catch (err: any) {
            setError(err.message || 'Erro ao transferir prompt')
        } finally {
            setTransferring(false)
        }
    }

    const formatCpf = (cpf: string | null) => {
        if (!cpf) return '-'
        // Format CPF: 000.000.000-00
        const cleaned = cpf.replace(/\D/g, '')
        if (cleaned.length === 11) {
            return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`
        }
        return cpf
    }

    return (
        <Container className="mt-5">
            <h1 className="mb-4">Transferir Prompt</h1>

            {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}
            {success && <Alert variant="success" dismissible onClose={() => setSuccess(null)}>{success}</Alert>}

            {/* Search Prompt */}
            <Card className="mb-4">
                <Card.Header>Buscar Prompt</Card.Header>
                <Card.Body>
                    <Form onSubmit={(e) => { e.preventDefault(); fetchPromptInfo(); }}>
                        <InputGroup>
                            <Form.Control
                                type="number"
                                placeholder="Informe o base_id do prompt"
                                value={baseId}
                                onChange={(e) => setBaseId(e.target.value)}
                            />
                            <Button variant="primary" type="submit" disabled={loading}>
                                {loading ? <Spinner animation="border" size="sm" /> : <FontAwesomeIcon icon={faSearch} />}
                                <span className="ms-2">Buscar</span>
                            </Button>
                        </InputGroup>
                    </Form>
                </Card.Body>
            </Card>

            {/* Prompt Info */}
            {promptInfo && (
                <>
                    <Card className="mb-4">
                        <Card.Header>Informações do Prompt</Card.Header>
                        <Card.Body>
                            <div className="row mb-3">
                                <div className="col-md-6">
                                    <strong>Base ID:</strong> {promptInfo.base_id}
                                </div>
                                <div className="col-md-6">
                                    <strong>Nome:</strong> {promptInfo.latest.name}
                                </div>
                            </div>
                            <div className="row mb-3">
                                <div className="col-md-6">
                                    <strong>Tipo:</strong> {promptInfo.latest.kind}
                                </div>
                                <div className="col-md-6">
                                    <strong>Compartilhamento:</strong> {promptInfo.latest.share}
                                </div>
                            </div>
                            <div className="mb-3">
                                <strong>Dono Atual:</strong>{' '}
                                {promptInfo.owner ? (
                                    <>
                                        [ID: {promptInfo.owner.id}] {promptInfo.owner.name || promptInfo.owner.username}
                                        {promptInfo.owner.cpf && ` (CPF: ${formatCpf(promptInfo.owner.cpf)})`}
                                    </>
                                ) : (
                                    <span className="text-muted">Sem dono definido</span>
                                )}
                            </div>

                            <h6 className="mt-4">Versões ({promptInfo.versions.length})</h6>
                            <Table striped bordered hover size="sm" responsive>
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Nome</th>
                                        <th>Data de Criação</th>
                                        <th>Atual</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {promptInfo.versions.map(version => (
                                        <tr key={version.id}>
                                            <td>{version.id}</td>
                                            <td>{version.name}</td>
                                            <td>{formatBrazilianDateTime(new Date(version.created_at))}</td>
                                            <td className="text-center">
                                                {Boolean(version.is_latest) && <FontAwesomeIcon icon={faCheck} className="text-success" />}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>

                    {/* Select New Owner */}
                    <Card className="mb-4">
                        <Card.Header>Selecionar Novo Dono</Card.Header>
                        <Card.Body>
                            <Form.Group className="mb-3">
                                <Form.Label>Buscar usuário por nome ou CPF</Form.Label>
                                <InputGroup>
                                    <Form.Control
                                        type="text"
                                        placeholder="Digite pelo menos 2 caracteres..."
                                        value={userSearch}
                                        onChange={(e) => setUserSearch(e.target.value)}
                                    />
                                    {searchingUsers && (
                                        <InputGroup.Text>
                                            <Spinner animation="border" size="sm" />
                                        </InputGroup.Text>
                                    )}
                                </InputGroup>
                            </Form.Group>

                            {users.length > 0 && (
                                <Table striped bordered hover size="sm" responsive className="mb-3">
                                    <thead>
                                        <tr>
                                            <th>Selecionar</th>
                                            <th>ID</th>
                                            <th>Nome</th>
                                            <th>Username</th>
                                            <th>CPF</th>
                                            <th>Tribunal</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.map(user => (
                                            <tr 
                                                key={user.id} 
                                                className={selectedUser?.id === user.id ? 'table-primary' : ''}
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => setSelectedUser(user)}
                                            >
                                                <td className="text-center">
                                                    <Form.Check
                                                        type="radio"
                                                        name="selectedUser"
                                                        checked={selectedUser?.id === user.id}
                                                        onChange={() => setSelectedUser(user)}
                                                    />
                                                </td>
                                                <td>{user.id}</td>
                                                <td>{user.name || '-'}</td>
                                                <td>{user.username}</td>
                                                <td>{formatCpf(user.cpf)}</td>
                                                <td>{user.court_name || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            )}

                            {userSearch.length >= 2 && users.length === 0 && !searchingUsers && (
                                <Alert variant="info">Nenhum usuário encontrado</Alert>
                            )}

                            {selectedUser && (
                                <Alert variant="info">
                                    <strong>Usuário selecionado:</strong> [ID: {selectedUser.id}] {selectedUser.name || selectedUser.username}
                                    {selectedUser.cpf && ` (CPF: ${formatCpf(selectedUser.cpf)})`}
                                </Alert>
                            )}
                        </Card.Body>
                    </Card>

                    {/* Transfer Button */}
                    <Card className="mb-4">
                        <Card.Body>
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    {promptInfo.owner && selectedUser && (
                                        <span>
                                            Transferir de <strong>{promptInfo.owner.name || promptInfo.owner.username}</strong> para{' '}
                                            <strong>{selectedUser.name || selectedUser.username}</strong>
                                        </span>
                                    )}
                                </div>
                                <Button 
                                    variant="warning" 
                                    size="lg"
                                    onClick={handleTransfer}
                                    disabled={!selectedUser || transferring || selectedUser.id === promptInfo.owner?.id}
                                    title={
                                        !selectedUser 
                                            ? 'Selecione um usuário' 
                                            : selectedUser.id === promptInfo.owner?.id 
                                                ? 'O usuário selecionado já é o dono do prompt'
                                                : ''
                                    }
                                >
                                    {transferring ? (
                                        <Spinner animation="border" size="sm" />
                                    ) : (
                                        <FontAwesomeIcon icon={faExchangeAlt} />
                                    )}
                                    <span className="ms-2">Transferir Prompt</span>
                                </Button>
                            </div>
                        </Card.Body>
                    </Card>
                </>
            )}
        </Container>
    )
}
