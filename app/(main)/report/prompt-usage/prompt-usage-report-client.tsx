'use client'

import React, { useState, useMemo, useEffect } from 'react'
import dayjs from 'dayjs'
import { Container, Row, Col, Form, Button, Table, Spinner, Modal } from 'react-bootstrap'
import ErrorMessage from '@/components/error-message'

interface PromptUsageRow {
    prompt_key: string
    prompt_name: string
    month: number
    year: number
    usage_count: number
}

interface PromptUsageDetailRow {
    user_id: number
    user_name: string | null
    username: string | null
    usage_count: number
}

interface CellData {
    prompt_name: string
    prompt_key: string
    month: number
    year: number
    count: number
}

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

export default function PromptUsageReportClient() {
    const [courtId, setCourtId] = useState('')
    const [startDate, setStartDate] = useState(() => {
        // Default: 12 months ago
        return dayjs().subtract(12, 'months').format('YYYY-MM-DD')
    })
    const [endDate, setEndDate] = useState(() => {
        // Default: today
        return dayjs().format('YYYY-MM-DD')
    })
    const [loading, setLoading] = useState(false)
    const [rows, setRows] = useState<PromptUsageRow[]>([])
    const [error, setError] = useState<string | null>(null)

    // Modal state for details
    const [showModal, setShowModal] = useState(false)
    const [modalData, setModalData] = useState<CellData | null>(null)
    const [detailRows, setDetailRows] = useState<PromptUsageDetailRow[]>([])
    const [detailLoading, setDetailLoading] = useState(false)
    const [detailError, setDetailError] = useState<string | null>(null)



    async function load(e?: React.FormEvent) {
        e?.preventDefault()
        setLoading(true)
        setError(null)
        setRows([])
        try {
            const params = new URLSearchParams()
            if (courtId) params.set('court_id', courtId)
            if (startDate) params.set('startDate', startDate)
            if (endDate) params.set('endDate', endDate)

            const res = await fetch(`/api/v1/report/prompt-usage?${params.toString()}`)
            if (!res.ok) throw new Error(await res.text())
            const data = await res.json()
            setRows(data.rows || [])
        } catch (e: any) {
            setError(e.message)
        } finally {
            setLoading(false)
        }
    }

    async function loadDetail(cellData: CellData) {
        setModalData(cellData)
        setShowModal(true)
        setDetailLoading(true)
        setDetailError(null)
        setDetailRows([])
        try {
            const res = await fetch('/api/v1/report/prompt-usage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt_key: cellData.prompt_key,
                    month: cellData.month,
                    year: cellData.year,
                    court_id: courtId || undefined,
                }),
            })
            if (!res.ok) throw new Error(await res.text())
            const data = await res.json()
            setDetailRows(data.rows || [])
        } catch (e: any) {
            setDetailError(e.message)
        } finally {
            setDetailLoading(false)
        }
    }

    // Calculate unique months from data
    const months = useMemo(() => {
        const uniqueMonths = new Set<string>()
        rows.forEach(r => {
            uniqueMonths.add(`${r.year}-${r.month}`)
        })
        return Array.from(uniqueMonths)
            .map(m => {
                const [year, month] = m.split('-').map(Number)
                return { year, month, key: m }
            })
            .sort((a, b) => {
                if (a.year !== b.year) return a.year - b.year
                return a.month - b.month
            })
    }, [rows])

    // Group data by prompt
    const promptGroups = useMemo(() => {
        const groups = new Map<string, Map<string, { count: number, prompt_key: string }>>()
        
        rows.forEach(r => {
            if (!groups.has(r.prompt_name)) {
                groups.set(r.prompt_name, new Map())
            }
            const monthKey = `${r.year}-${r.month}`
            groups.get(r.prompt_name)!.set(monthKey, { 
                count: r.usage_count,
                prompt_key: r.prompt_key
            })
        })

        return Array.from(groups.entries()).map(([prompt_name, monthMap]) => {
            const total = Array.from(monthMap.values()).reduce((sum, m) => sum + m.count, 0)
            return { prompt_name, monthMap, total }
        }).sort((a, b) => b.total - a.total)
    }, [rows])

    // Calculate column totals
    const columnTotals = useMemo(() => {
        const totals = new Map<string, number>()
        rows.forEach(r => {
            const monthKey = `${r.year}-${r.month}`
            totals.set(monthKey, (totals.get(monthKey) || 0) + r.usage_count)
        })
        return totals
    }, [rows])

    const grandTotal = useMemo(() => {
        return rows.reduce((sum, r) => sum + r.usage_count, 0)
    }, [rows])

    return (
        <Container fluid className="py-4">
            <h1 className="mb-4">Relatório de Uso de Prompts</h1>

            <Form onSubmit={load} className="mb-4">
                <Row className="g-3 align-items-end">
                    <Col md={3}>
                        <Form.Group>
                            <Form.Label>Court ID</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="Filtrar por Court ID"
                                value={courtId}
                                onChange={e => setCourtId(e.target.value)}
                            />
                        </Form.Group>
                    </Col>
                    <Col md={3}>
                        <Form.Group>
                            <Form.Label>Data Início</Form.Label>
                            <Form.Control
                                type="date"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                            />
                        </Form.Group>
                    </Col>
                    <Col md={3}>
                        <Form.Group>
                            <Form.Label>Data Fim</Form.Label>
                            <Form.Control
                                type="date"
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                            />
                        </Form.Group>
                    </Col>
                    <Col md={3}>
                        <Button type="submit" disabled={loading} className="w-100">
                            {loading ? <Spinner animation="border" size="sm" /> : 'Buscar'}
                        </Button>
                    </Col>
                </Row>
            </Form>

            {error && <ErrorMessage message={error} />}

            {!loading && rows.length > 0 && (
                <div className="table-responsive">
                    <Table bordered hover size="sm">
                        <thead>
                            <tr>
                                <th className="sticky-col">Prompt</th>
                                {months.map(m => (
                                    <th key={m.key} className="text-center">
                                        {MONTH_NAMES[m.month - 1]}/{m.year}
                                    </th>
                                ))}
                                <th className="text-center bg-light fw-bold">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {promptGroups.map(group => (
                                <tr key={group.prompt_name}>
                                    <td className="sticky-col">{group.prompt_name}</td>
                                    {months.map(m => {
                                        const cellData = group.monthMap.get(m.key)
                                        return (
                                            <td
                                                key={m.key}
                                                className="text-center"
                                                style={{
                                                    cursor: cellData ? 'pointer' : 'default',
                                                    backgroundColor: cellData ? '#f8f9fa' : 'transparent',
                                                }}
                                                onClick={() => {
                                                    if (cellData) {
                                                        loadDetail({
                                                            prompt_name: group.prompt_name,
                                                            prompt_key: cellData.prompt_key,
                                                            month: m.month,
                                                            year: m.year,
                                                            count: cellData.count,
                                                        })
                                                    }
                                                }}
                                                title={cellData ? 'Clique para ver detalhes por usuário' : ''}
                                            >
                                                {cellData ? cellData.count.toLocaleString('pt-BR') : '-'}
                                            </td>
                                        )
                                    })}
                                    <td className="text-center bg-light fw-bold">
                                        {group.total.toLocaleString('pt-BR')}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="fw-bold">
                                <td className="sticky-col bg-light">Total por Mês</td>
                                {months.map(m => (
                                    <td key={m.key} className="text-center bg-light">
                                        {(columnTotals.get(m.key) || 0).toLocaleString('pt-BR')}
                                    </td>
                                ))}
                                <td className="text-center bg-light">
                                    {grandTotal.toLocaleString('pt-BR')}
                                </td>
                            </tr>
                        </tfoot>
                    </Table>
                </div>
            )}

            {!loading && rows.length === 0 && !error && (
                <p className="text-muted">Nenhum dado disponível. Clique em &quot;Buscar&quot; para carregar o relatório.</p>
            )}

            <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>
                        Detalhes de Uso - {modalData?.prompt_name}
                        <br />
                        <small className="text-muted">
                            {modalData && `${MONTH_NAMES[modalData.month - 1]}/${modalData.year} - ${modalData.count.toLocaleString('pt-BR')} usos`}
                        </small>
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {detailLoading && (
                        <div className="text-center py-4">
                            <Spinner animation="border" />
                        </div>
                    )}

                    {detailError && <ErrorMessage message={detailError} />}

                    {!detailLoading && !detailError && detailRows.length > 0 && (
                        <Table striped bordered hover size="sm">
                            <thead>
                                <tr>
                                    <th>Nome do Usuário</th>
                                    <th>Username</th>
                                    <th className="text-center">Quantidade</th>
                                </tr>
                            </thead>
                            <tbody>
                                {detailRows.map((row, idx) => (
                                    <tr key={idx}>
                                        <td>{row.user_name || '-'}</td>
                                        <td>{row.username || '-'}</td>
                                        <td className="text-center">{row.usage_count.toLocaleString('pt-BR')}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="fw-bold">
                                    <td colSpan={2}>Total</td>
                                    <td className="text-center">
                                        {detailRows.reduce((sum, r) => sum + r.usage_count, 0).toLocaleString('pt-BR')}
                                    </td>
                                </tr>
                            </tfoot>
                        </Table>
                    )}

                    {!detailLoading && !detailError && detailRows.length === 0 && (
                        <p className="text-muted">Nenhum detalhe disponível.</p>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModal(false)}>
                        Fechar
                    </Button>
                </Modal.Footer>
            </Modal>

            <style jsx>{`
                .sticky-col {
                    position: sticky;
                    left: 0;
                    background-color: white;
                    z-index: 1;
                    min-width: 200px;
                }
                .table-responsive {
                    max-height: 70vh;
                    overflow: auto;
                }
                thead th {
                    position: sticky;
                    top: 0;
                    background-color: white;
                    z-index: 2;
                }
                thead th.sticky-col {
                    z-index: 3;
                }
            `}</style>
        </Container>
    )
}
