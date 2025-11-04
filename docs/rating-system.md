# Sistema de Rating de Prompts

Sistema completo de avaliação de prompts com estrelas (1-5), incluindo estatísticas sofisticadas.

## Componentes

### StarsWidget
Widget interativo para avaliar prompts com 1-5 estrelas.

**Props:**
- `promptBaseId: number` - ID base do prompt
- `initialRating?: number | null` - Rating inicial (opcional)
- `onRatingChange?: (stats: RatingStats) => void` - Callback opcional quando o rating muda

**Uso:**
```tsx
import { StarsWidget } from '@/components/StarsWidget'

<StarsWidget 
  promptBaseId={123}
  initialRating={4}
  onRatingChange={(stats) => devLog('Novo rating:', stats)}
/>
```

**Características:**
- **Carregamento lazy**: Carrega o rating do usuário apenas no hover ou click
- Mostra estrelas vazias/preenchidas baseado no hover e rating atual
- Salva o rating via API ao clicar
- Animação de fade out após salvar
- Tooltip com informação do rating atual

### RatingStatsDisplay
Componente para mostrar estatísticas de rating de forma visual.

**Props:**
- `voterCount: number` - Número de votantes
- `avgLaplace: number` - Média com Laplace smoothing
- `wilsonScore: number` - Wilson score
- `showDetails?: boolean` - Mostrar detalhes técnicos (padrão: false)

**Uso:**
```tsx
import { RatingStatsDisplay } from '@/components/RatingStatsDisplay'

<RatingStatsDisplay 
  voterCount={15}
  avgLaplace={4.2}
  wilsonScore={3.8}
  showDetails={true}
/>
```

## API Endpoints

### GET /api/v1/prompt/[base_id]/rating
Retorna o rating do usuário atual e estatísticas do prompt.

**Resposta:**
```json
{
  "userRating": {
    "stars": 4,
    "createdAt": "2025-11-03T...",
    "updatedAt": "2025-11-03T..."
  },
  "stats": {
    "voter_count": 15,
    "avg_laplace": 4.2,
    "wilson_score": 3.8
  }
}
```

### POST /api/v1/prompt/[base_id]/rating
Cria ou atualiza o rating do usuário.

**Body:**
```json
{
  "stars": 4
}
```

**Resposta:**
```json
{
  "success": true,
  "stats": {
    "voter_count": 16,
    "avg_laplace": 4.3,
    "wilson_score": 3.9
  }
}
```

### DELETE /api/v1/prompt/[base_id]/rating
Remove o rating do usuário.

**Resposta:**
```json
{
  "success": true
}
```

### GET /api/v1/prompt/ratings
Lista estatísticas de todos os prompts com ratings.

**Resposta:**
```json
{
  "stats": [
    {
      "prompt_base_id": 123,
      "voter_count": 15,
      "avg_laplace": 4.2,
      "wilson_score": 3.8
    }
  ]
}
```

## Métodos do DAO

### Dao.upsertPromptRating(prompt_base_id, stars)
Insere ou atualiza o rating do usuário atual.

### Dao.getUserPromptRating(prompt_base_id)
Retorna o rating do usuário atual para um prompt.

### Dao.deletePromptRating(prompt_base_id)
Remove o rating do usuário atual.

### Dao.getPromptRatings(prompt_base_id)
Lista todos os ratings de um prompt.

### Dao.getPromptRatingStats(prompt_base_id)
Calcula estatísticas para um prompt específico.

### Dao.getAllPromptRatingStats()
Calcula estatísticas para todos os prompts com ratings.

## Métricas

### voter_count
Número de usuários que avaliaram o prompt.

### avg_laplace
Média com Laplace smoothing: `(sum_stars + 2.5) / (voter_count + 1)`

**Propósito:** Estabiliza médias de prompts com poucos votos, adicionando um voto "neutro" de 2.5 estrelas.

**Exemplo:** Um prompt com 1 voto de 5 estrelas terá avg_laplace = (5 + 2.5) / 2 = 3.75, ao invés de 5.0

### wilson_score
Lower bound do Wilson score confidence interval.

**Propósito:** Métrica de confiança estatística que penaliza prompts com poucos votos. Considera tanto a média quanto o número de avaliações.

**Referência:** https://www.evanmiller.org/how-not-to-sort-by-average-rating.html

**Uso recomendado:** Para ordenar prompts por qualidade, use wilson_score ao invés de média simples.

## Banco de Dados

### Tabela: ia_prompt_rating

```sql
CREATE TABLE ia_prompt_rating (
  id SERIAL PRIMARY KEY,
  prompt_base_id INT NOT NULL,
  user_id INT NOT NULL,
  stars INT NOT NULL CHECK (stars >= 1 AND stars <= 5),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (prompt_base_id, user_id),
  FOREIGN KEY (prompt_base_id) REFERENCES ia_prompt (id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES ia_user (id) ON DELETE CASCADE
);
```

### Migrations

- **PostgreSQL:** `migrations/postgres/migration-009.sql`
- **MySQL:** `migrations/mysql/migration-014.sql`

Para aplicar as migrations, execute:
```bash
npm run migrate
```

## Integração com Tabelas

O sistema está integrado em `lib/ui/table-specs.tsx` na tabela de prompts.

**Como funciona:**
1. `server-contents.tsx` carrega todos os ratings via `Dao.getAllPromptRatingStats()`
2. Os ratings são agregados aos prompts usando um `Map` por `prompt_base_id`
3. A tabela mostra as estatísticas de rating usando `RatingStatsDisplay`
4. O `StarsWidget` permite ao usuário avaliar (carrega rating do usuário apenas no hover/click)

**Exemplo de código em server-contents.tsx:**
```tsx
// Carrega todos os ratings e agrega aos prompts
const ratingsStats = await Dao.getAllPromptRatingStats()
const ratingsMap = new Map(ratingsStats.map(stat => [stat.prompt_base_id, stat]))

// Adiciona informação de rating a cada prompt
const promptsWithRatings = prompts.map(prompt => ({
    ...prompt,
    rating: ratingsMap.get(prompt.base_id || prompt.id) || null
}))
```

**Exemplo de uso em table-specs.tsx:**
```tsx
{
  header: <FontAwesomeIcon icon={faStar} />,
  accessorKey: 'rating.avg_laplace',
  enableSorting: true,
  style: { textAlign: "center" },
  cell: data => {
    const rating = data.row.original.rating
    
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        {rating ? (
          <RatingStatsDisplay
            voterCount={rating.voter_count}
            avgLaplace={rating.avg_laplace}
            wilsonScore={rating.wilson_score}
            showDetails={false}
          />
        ) : (
          <span style={{ fontSize: '0.85em', color: '#999' }}>-</span>
        )}
        <StarsWidget 
          promptBaseId={data.row.original.base_id}
          onRatingChange={(stats) => {
            devLog('Rating atualizado:', stats)
          }}
        />
      </div>
    )
  }
}
```

**Benefícios desta abordagem:**
- ✅ Performance: Um único query para todos os ratings (N+1 evitado)
- ✅ UX: Rating do usuário carregado apenas quando necessário (lazy loading)
- ✅ Visual: Estatísticas visíveis, widget interativo ao lado
- ✅ Ordenação: Coluna pode ser ordenada por `rating.avg_laplace`

## Segurança

- Todos os endpoints requerem autenticação via `assertCurrentUser()`
- Usuários só podem manipular seus próprios ratings
- Constraint CHECK no banco garante stars entre 1-5
- Foreign keys com CASCADE mantêm integridade referencial
- Unique constraint garante um voto por usuário por prompt
