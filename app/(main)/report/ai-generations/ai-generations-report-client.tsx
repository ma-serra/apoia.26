'use client'

import React, { useState, useMemo, useEffect } from 'react'
import dayjs from 'dayjs'
import { Container, Row, Col, Form, Button, Spinner, Alert } from 'react-bootstrap'
import 'react-pivottable/pivottable.css'
import ErrorMessage from '@/components/error-message'

// Fix para compatibilidade do react-pivottable com React 18+
if (typeof window !== 'undefined') {
    const ReactDOM = require('react-dom')
    if (!ReactDOM.hasOwnProperty) {
        ReactDOM.hasOwnProperty = Object.prototype.hasOwnProperty.bind(ReactDOM)
    }
    if (!ReactDOM.findDOMNode) {
        ReactDOM.findDOMNode = (instance: any) => {
            if (instance == null) return null
            if (instance.nodeType === 1) return instance
            return instance.current || null
        }
    }
}

interface AIGenerationRow {
    id: number
    created_at: string
    user_id: number | null
    user_name: string | null
    username: string | null
    court_id: number | null
    prompt_key: string
    prompt_name: string
    model: string
    dossier_code: string | null
    cached_input_tokens: number | null
    input_tokens: number | null
    output_tokens: number | null
    reasoning_tokens: number | null
    total_tokens: number
    approximate_cost: number | null
}

interface PivotData {
    Data: string
    'Data (Mês)': string
    'Nome do Usuário': string
    Username: string
    'Court ID': string
    Prompt: string
    Modelo: string
    Processo: string
    'Tokens Cached': number
    'Tokens Entrada': number
    'Tokens Saída': number
    'Tokens Reasoning': number
    'Total Tokens': number
    'Custo (USD)': number
}

export default function AIGenerationsReportClient() {
    const [courtId, setCourtId] = useState('')
    const [startDate, setStartDate] = useState(() => {
        return dayjs().subtract(30, 'days').format('YYYY-MM-DD')
    })
    const [endDate, setEndDate] = useState(() => {
        return dayjs().format('YYYY-MM-DD')
    })
    const [limit, setLimit] = useState('5000')
    const [loading, setLoading] = useState(false)
    const [rows, setRows] = useState<AIGenerationRow[]>([])
    const [error, setError] = useState<string | null>(null)
    const [pivotState, setPivotState] = useState({})
    const [renderers, setRenderers] = useState<any>(null)
    const [PivotTableUI, setPivotTableUI] = useState<any>(null)

    // Carregar componentes dinamicamente
    useEffect(() => {
        if (typeof window !== 'undefined') {
            import('react-pivottable/PivotTableUI').then(module => {
                setPivotTableUI(() => module.default)
            })
            
            import('react-pivottable/TableRenderers').then(TableRend => {
                import('react-plotly.js').then(PlotModule => {
                    import('react-pivottable/PlotlyRenderers').then(createPlotlyRend => {
                        const PlotlyRend = createPlotlyRend.default(PlotModule.default)
                        setRenderers({ ...TableRend.default, ...PlotlyRend })
                    })
                })
            })
        }
    }, [])

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
            if (limit) params.set('limit', limit)

            const res = await fetch(`/api/v1/report/ai-generations?${params.toString()}`)
            if (!res.ok) throw new Error(await res.text())
            const data = await res.json()
            setRows(data.rows || [])
            
            if (data.rows.length === 0) {
                setError('Nenhum dado encontrado para os filtros selecionados.')
            } else if (data.rows.length >= parseInt(limit)) {
                setError(`Limite de ${limit} registros atingido. Refine os filtros para ver mais dados.`)
            }
        } catch (e: any) {
            setError(e.message)
        } finally {
            setLoading(false)
        }
    }

    const pivotData = useMemo<PivotData[]>(() => {
        return rows.map(r => ({
            Data: dayjs(r.created_at).format('DD/MM/YYYY HH:mm'),
            'Data (Mês)': dayjs(r.created_at).format('YYYY-MM'),
            'Nome do Usuário': r.user_name || '-',
            Username: r.username || '-',
            'Court ID': r.court_id?.toString() || '-',
            Prompt: r.prompt_name,
            Modelo: r.model,
            Processo: r.dossier_code || '-',
            'Tokens Cached': r.cached_input_tokens || 0,
            'Tokens Entrada': r.input_tokens || 0,
            'Tokens Saída': r.output_tokens || 0,
            'Tokens Reasoning': r.reasoning_tokens || 0,
            'Total Tokens': r.total_tokens,
            'Custo (USD)': r.approximate_cost || 0,
        }))
    }, [rows])

    const totalCost = useMemo(() => {
        return rows.reduce((sum, r) => sum + (r.approximate_cost || 0), 0)
    }, [rows])

    const totalTokens = useMemo(() => {
        return rows.reduce((sum, r) => sum + r.total_tokens, 0)
    }, [rows])

    return (
        <Container fluid className="py-4">
            <h1 className="mb-4">Relatório de Gerações de IA (Pivot Table)</h1>

            <Form onSubmit={load} className="mb-4">
                <Row className="g-3 align-items-end">
                    <Col md={2}>
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
                    <Col md={2}>
                        <Form.Group>
                            <Form.Label>Data Início</Form.Label>
                            <Form.Control
                                type="date"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                            />
                        </Form.Group>
                    </Col>
                    <Col md={2}>
                        <Form.Group>
                            <Form.Label>Data Fim</Form.Label>
                            <Form.Control
                                type="date"
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                            />
                        </Form.Group>
                    </Col>
                    <Col md={2}>
                        <Form.Group>
                            <Form.Label>Limite</Form.Label>
                            <Form.Control
                                type="number"
                                value={limit}
                                onChange={e => setLimit(e.target.value)}
                                min="1000"
                                max="200000"
                                step="1000"
                            />
                        </Form.Group>
                    </Col>
                    <Col md={2}>
                        <Button type="submit" disabled={loading} className="w-100">
                            {loading ? <Spinner animation="border" size="sm" /> : 'Carregar Dados'}
                        </Button>
                    </Col>
                </Row>
            </Form>

            {error && (
                <Alert variant={rows.length > 0 ? 'warning' : 'danger'} className="mb-3">
                    {error}
                </Alert>
            )}

            {!loading && rows.length > 0 && (
                <>
                    <Alert variant="info" className="mb-3">
                        <strong>Total de registros:</strong> {rows.length.toLocaleString('pt-BR')} | 
                        <strong> Total de tokens:</strong> {totalTokens.toLocaleString('pt-BR')} | 
                        <strong> Custo total:</strong> ${totalCost.toFixed(4)}
                    </Alert>

                    {PivotTableUI && renderers ? (
                        <div className="pivot-container">
                            <PivotTableUI
                                data={pivotData}
                                menuLimit={0}
                                onChange={s => setPivotState(s)}
                                renderers={renderers}
                                {...pivotState}
                            />
                        </div>
                    ) : (
                        <div className="text-center p-5">
                            <Spinner animation="border" />
                            <p className="mt-2 text-muted">Carregando componente pivot...</p>
                        </div>
                    )}
                </>
            )}

            {!loading && rows.length === 0 && !error && (
                <p className="text-muted">Nenhum dado disponível. Clique em &quot;Carregar Dados&quot; para buscar gerações de IA.</p>
            )}

            <style jsx global>{`
                .pivot-container {
                    background: white;
                    padding: 20px;
                    border-radius: 8px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                .pvtUi {
                    font-family: inherit;
                }
                .pvtTable {
                    font-size: 0.9rem;
                }
                .pvtAxisContainer, .pvtVals {
                    border: 1px solid #dee2e6;
                    background: #f8f9fa;
                    padding: 5px;
                }
                .pvtFilterBox {
                    max-width: 300px;
                }
            `}</style>
        </Container>
    )
}
