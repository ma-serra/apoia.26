'use client'

import React, { useState, useEffect, useRef } from 'react'
import { RatingStatsDisplay, MIN_VOTES_TO_SHOW_RATING } from './RatingStatsDisplay'
import { StarsWidget } from './StarsWidget'

interface RatingCellProps {
    promptBaseId: number
    rating: {
        voter_count: number
        avg_laplace: number
        wilson_score: number
    } | null
    onRatingUpdate?: (stats: any) => void
}

export const RatingCell: React.FC<RatingCellProps> = ({ 
    promptBaseId, 
    rating,
    onRatingUpdate 
}) => {
    const [isWidgetOpen, setIsWidgetOpen] = useState(false)
    const [userRating, setUserRating] = useState<number | null>(null)
    const [currentStats, setCurrentStats] = useState(rating)
    const [loadingUserRating, setLoadingUserRating] = useState(false)
    const [userRatingLoaded, setUserRatingLoaded] = useState(false)
    const [isHovering, setIsHovering] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    // Carrega o rating do usuário no hover (para mostrar no tooltip)
    useEffect(() => {
        if (!isHovering || userRatingLoaded || loadingUserRating) return

        const loadUserRating = async () => {
            setLoadingUserRating(true)
            try {
                const response = await fetch(`/api/v1/prompt/${promptBaseId}/rating`)
                if (response.ok) {
                    const data = await response.json()
                    if (data.userRating) {
                        setUserRating(data.userRating.stars)
                    }
                    setUserRatingLoaded(true)
                }
            } catch (error) {
                console.error('Error loading user rating:', error)
            } finally {
                setLoadingUserRating(false)
            }
        }

        loadUserRating()
    }, [isHovering, promptBaseId, userRatingLoaded, loadingUserRating])

    // Fecha o widget ao pressionar ESC ou clicar fora
    useEffect(() => {
        if (!isWidgetOpen) return

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsWidgetOpen(false)
            }
        }

        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsWidgetOpen(false)
            }
        }

        document.addEventListener('keydown', handleEscape)
        document.addEventListener('mousedown', handleClickOutside)

        return () => {
            document.removeEventListener('keydown', handleEscape)
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isWidgetOpen])

    const handleClick = async () => {
        setIsWidgetOpen(true)
        
        // Garante que o rating do usuário foi carregado antes de abrir o widget
        if (!userRatingLoaded && !loadingUserRating) {
            setLoadingUserRating(true)
            try {
                const response = await fetch(`/api/v1/prompt/${promptBaseId}/rating`)
                if (response.ok) {
                    const data = await response.json()
                    if (data.userRating) {
                        setUserRating(data.userRating.stars)
                    }
                    setUserRatingLoaded(true)
                }
            } catch (error) {
                console.error('Error loading user rating:', error)
            } finally {
                setLoadingUserRating(false)
            }
        }
    }

    const handleRatingChange = (stats: any) => {
        setCurrentStats(stats)
        setIsWidgetOpen(false)
        // Reseta o userRating para forçar recarregamento na próxima vez
        setUserRating(null)
        setUserRatingLoaded(false)
        if (onRatingUpdate) {
            onRatingUpdate(stats)
        }
    }

    return (
        <div 
            ref={containerRef}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
        >
            {!isWidgetOpen ? (
                <RatingStatsDisplay
                    voterCount={currentStats?.voter_count || 0}
                    avgLaplace={currentStats?.avg_laplace || 0}
                    wilsonScore={currentStats?.wilson_score || 0}
                    userRating={userRating}
                    showDetails={false}
                    onClick={handleClick}
                    promptBaseId={promptBaseId}
                />
            ) : (
                <StarsWidget 
                    promptBaseId={promptBaseId}
                    initialRating={userRating}
                    isOpen={true}
                    onRatingChange={handleRatingChange}
                    onClose={() => setIsWidgetOpen(false)}
                />
            )}
        </div>
    )
}

export { MIN_VOTES_TO_SHOW_RATING }
