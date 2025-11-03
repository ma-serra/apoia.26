'use client'

import React, { useState, useEffect } from 'react'
import { faStar } from '@fortawesome/free-regular-svg-icons'
import { faStar as faStarSolid } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { OverlayTrigger, Tooltip, Row, Col } from 'react-bootstrap'

interface RatingTooltipProps {
    avgLaplace: number
    voterCount: number
    userRating: number | null
    showDetails?: boolean
    minVotes: number
    promptBaseId: number
    children: React.ReactNode
}

export const RatingTooltip: React.FC<RatingTooltipProps> = ({
    avgLaplace,
    voterCount,
    userRating,
    showDetails = false,
    minVotes = 1,
    promptBaseId,
    children
}) => {
    const [starDistribution, setStarDistribution] = useState<{ [key: number]: number }>({
        5: 0, 4: 0, 3: 0, 2: 0, 1: 0
    })
    const [loadingDistribution, setLoadingDistribution] = useState(false)
    const [distributionLoaded, setDistributionLoaded] = useState(false)

    // Função para formatar números com vírgula (padrão brasileiro)
    const formatNumber = (num: number, decimals: number = 1): string => {
        return num.toFixed(decimals).replace('.', ',')
    }

    // Carrega a distribuição de votos quando necessário
    const loadDistribution = () => {
        if (voterCount > 0 && !loadingDistribution && !distributionLoaded) {
            setLoadingDistribution(true)
            fetch(`/api/v1/prompt/${promptBaseId}/rating/distribution`)
                .then(res => res.json())
                .then(data => {
                    if (data.distribution) {
                        setStarDistribution(data.distribution)
                        setDistributionLoaded(true)
                    }
                })
                .catch(err => console.error('Error loading distribution:', err))
                .finally(() => setLoadingDistribution(false))
        }
    }

    const renderStars = (rating: number) => {
        const stars = []
        for (let i = 1; i <= 5; i++) {
            stars.push(
                <FontAwesomeIcon
                    key={i}
                    icon={i <= rating ? faStarSolid : faStar}
                    style={{
                        color: i <= rating ? '#ffc107' : '#cfcfcf',
                        fontSize: '0.9em',
                        marginRight: '2px'
                    }}
                />
            )
        }
        return stars
    }

    const renderStarBar = (starCount: number, count: number, total: number) => {
        const percentage = total > 0 ? (count / total) * 100 : 0
        return (
            <Row key={starCount} className="align-items-center">
                <Col xs="4" style={{ textAlign: 'right', fontSize: '0.85em' }}>
                    {starCount} {starCount === 1 ? 'estrela' : 'estrelas'}
                </Col>
                <Col xs="6">
                    <div style={{
                        height: '8px',
                        backgroundColor: '#e0e0e0',
                        borderRadius: '4px',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            height: '100%',
                            width: `${percentage}%`,
                            backgroundColor: '#ffc107',
                            transition: 'width 0.3s ease'
                        }} />
                    </div>
                </Col>
                <Col xs="2" style={{ textAlign: 'right', fontSize: '0.85em' }}>
                    {count}
                </Col>
            </Row>
        )
    }

    const renderTooltipContent = () => {
        if (voterCount === 0) {
            return (
                <div style={{ padding: '4px 8px' }}>
                    <div style={{ marginBottom: '8px', fontSize: '0.9em' }}>
                        Nenhum voto até o momento.
                    </div>
                    <div style={{ fontSize: '0.8em', color: '#ccc' }}>
                        Clique para avaliar
                    </div>
                </div>
            )
        }

        return (
            <div style={{ padding: '.5em' }}>
                <Row>
                    <Col xs="4" className="text-center">
                        <div className="mb-1" style={{ fontSize: '2.5em', fontWeight: 'bold', lineHeight: 1 }}>
                            {formatNumber(avgLaplace)}
                        </div>
                        <div className="mb-1">
                            {renderStars(Math.round(avgLaplace))}
                        </div>
                        <div style={{ fontSize: '0.85em', color: '#ccc' }}>
                            {voterCount} {voterCount === 1 ? 'avaliação' : 'avaliações'}
                        </div>
                    </Col>
                    {/* Distribuição de estrelas */}
                    <Col xs="8">
                        {[5, 4, 3, 2, 1].map(stars =>
                            renderStarBar(stars, starDistribution[stars] || 0, voterCount)
                        )}
                    </Col>
                </Row>
                {/* Avaliação do usuário */}
                {userRating && (
                    <Row className="mt-3 pt-2 align-items-center" style={{ borderTop: '1px solid #555' }}>
                        <Col style={{ fontSize: '0.9em' }}>
                            Sua avaliação: {renderStars(userRating)}
                        </Col>
                    </Row>
                )}

                {/* Clique para avaliar */}
                <div style={{
                    fontSize: '0.8em',
                    color: '#ccc',
                    marginTop: '12px',
                    textAlign: 'center'
                }}>
                    Clique para {userRating ? 'alterar sua avaliação' : 'avaliar'}
                </div>
            </div>
        )
    }

    return (
        <OverlayTrigger
            placement="auto"
            onEnter={loadDistribution}
            popperConfig={{
                modifiers: [
                    {
                        name: 'preventOverflow',
                        options: {
                            boundary: 'viewport',
                        },
                    },
                ],
            }}
            overlay={(props) => (
                <Tooltip
                    id={`rating-tooltip-${promptBaseId}`}
                    {...props}
                    className="rating-tooltip-large"
                >
                    {renderTooltipContent()}
                </Tooltip>
            )}
        >
            <span style={{ display: 'inline-block' }}>
                {children}
            </span>
        </OverlayTrigger>
    )
}
