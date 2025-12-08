'use client'

import AiContent from "@/components/ai-content"
import { getInternalPrompt } from "@/lib/ai/prompt"
import { ContentType, GeneratedContent } from "@/lib/ai/prompt-types"
import { P } from "@/lib/proc/combinacoes"
import { FormHelper } from "@/lib/ui/form-support"
import { calcMd5 } from "@/lib/utils/hash"
import { labelToName, maiusculasEMinusculas } from "@/lib/utils/utils"
import { Button } from "react-bootstrap"

export const PedidosViabilidadeRecurso = ({ pedidos, request, nextRequest, Frm, dossierCode, onBusy, onReady }: { pedidos: { proximoPrompt: string, pedidos: any[] }, request: GeneratedContent, nextRequest: GeneratedContent, Frm: FormHelper, dossierCode: string, onBusy?: () => void, onReady?: (content: ContentType) => void }) => {
    const tiposDeDispositivo = [
        { id: '', name: '' },
        { id: 'SUSPENDER', name: 'Suspender' }, // tema
        { id: 'NEGAR_SEGUIMENTO', name: 'Negar Seguimento' }, // tema
        { id: 'ENCAMINHAR_PARA_RETRATACAO', name: 'Encaminhar para Retratação' }, // tema
        { id: 'ADMITIR', name: 'Admitir' },
        { id: 'INADIMITIR', name: 'Inadmitir' }, // motivoDaInadimissao
        { id: 'DESCONSIDERAR', name: 'Desconsiderar' },
    ]

    const motivoDaInadimissao = [
        { id: '', name: '' },
        { id: 'FATICA_PROBATORIA', name: 'Súmula 7/STJ e Súmula 279/STF (Fático-probatório)' },
        { id: 'CONFORMIDADE_JURISPRUDENCIA', name: 'Súmula 83/STJ (Conformidade Jurisprudência)' },
        { id: 'FUNDAMENTO_AUTONOMO', name: 'Súmula 283/STF (Fundamento autônomo)' },
        { id: 'DEFICIENCIA_FUNDAMENTACAO', name: 'Súmula 284/STF (Deficiência fundamentação)' },
        { id: 'AUSENCIA_PREQUESTIONAMENTO', name: 'Súmulas 282/STF e 356/STF (Ausência Prequestionamento)' },
        { id: 'NAO_EXAURIMENTO', name: 'Súmula 281/STF (Não exaurimento)' },
        { id: 'INTEMPESTIVIDADE', name: 'Intempestividade' },
        { id: 'DESERCAO', name: 'Deserção' },
        { id: 'FALTA_DE_INTERESSE_RECURSAL', name: 'Falta de Interesse Recursal' },
        { id: 'CLAUSULA_CONTRATUAL', name: 'Súmula 5/STJ (Cláusula Contratual)' },
        { id: 'FUNDAMENTO_CONST_INFRACONST', name: 'Súmula 126/STJ (Fundamento Const/Infraconst)' },
        { id: 'ATOS_NORMATIVOS_INFRALEGAIS', name: 'Atos Normativos Infralegais' },
    ]

    const pedidosAnalisados = Frm.get('pedidosAnalisados')
    if (pedidosAnalisados) {
        const aPedidos = [...Frm.get('pedidos').pedidos].filter(p => p.dispositivo && p.dispositivo !== 'DESCONSIDERAR')
        const data = { ...request.data }
        data.textos = [...request.data.textos, { numeroDoProcesso: data?.numeroDoProcesso || '', slug: 'pedidos', descr: 'Pedidos', texto: JSON.stringify(aPedidos), sigilo: '0' }]
        const prompt = getInternalPrompt(nextRequest.produto === P.DECISAO_VIABILIDADE_RECURSO_EXTRAORDINARIO ? 'decisao-viabilidade-recurso-extraordinario' : 'decisao-viabilidade-recurso-especial')
        const aiContentKey = `prompt: ${prompt}, data: ${calcMd5(data)}}`

        return <>
            <h2>{maiusculasEMinusculas(request.title)}</h2>
            <div className="mb-4">
                <div className="alert alert-success pt-4 pb-2">
                    <ol>
                        {aPedidos.map((pedido, i) =>
                            <li className={`mb-1 ${!pedido.dispositivo ? 'opacity-25' : ''}`} key={i}>
                                <span>{pedido.texto}</span>
                                <span> <b>{tiposDeDispositivo.find(o => o.id === pedido.dispositivo)?.name}</b></span>
                                {pedido.fundamentacoes && pedido.fundamentacoes.filter(f => f.selecionada).length > 0 && <span> - {pedido.fundamentacoes.filter(f => f.selecionada).map(f => f.texto).join(' - ')}</span>}
                                {pedido.fundamentacao && <span> - {pedido.fundamentacao}</span>}
                            </li>
                        )}
                    </ol>
                </div>
            </div>
            <div className="row h-print">
                <div className="col">
                    <Button className="float-end" variant="primary" onClick={() => Frm.set('pedidosAnalisados', false)} >
                        Alterar Fundamentações e Dispositivos
                    </Button>
                </div>
            </div>
            <h2>{nextRequest.produto === P.DECISAO_VIABILIDADE_RECURSO_EXTRAORDINARIO ? 'Decisão de Viabilidade de Recurso Extraordinário' : 'Decisão de Viabilidade de Recurso Especial'}</h2>
            <AiContent definition={prompt} data={data} key={aiContentKey} dossierCode={dossierCode} onBusy={onBusy} onReady={onReady} />
        </>
    }

    return <>
        <h2>{maiusculasEMinusculas(request.title)}</h2>
        <div className="alert alert-warning pt-2 pb-0">
            {pedidos.pedidos.map((pedido, i) =>
                <div className="mb-3" key={i}>
                    <div className="row mt-1">
                        <div className="col"><span><strong>{i + 1}{')'}</strong></span>{` ${Frm.get(`pedidos.pedidos[${i}].texto`)}`}</div>
                    </div>
                    {/* <div className="row">
                        <Frm.TextArea label={`${i + 1}) Pedido`} name={`pedidos.pedidos[${i}].texto`} width={''} />
                    </div> */}
                    <div className="row mt-1">
                        <Frm.TextArea label="Fundamentação (opcional)" name={`pedidos.pedidos[${i}].fundamentacao`} width={'col-12 col-sm-8'} />
                        <Frm.Select label="Dispositivo" name={`pedidos.pedidos[${i}].dispositivo`} options={tiposDeDispositivo} width={'col-12 col-sm-4'} />
                        {Frm.get(`pedidos.pedidos[${i}].dispositivo`) === 'INADIMITIR' && <Frm.Select label="Motivo" name={`pedidos.pedidos[${i}].motivo`} options={motivoDaInadimissao} width={'col-12 col-sm-4'} />}
                    </div>
                </div>
            )}
        </div>
        {Frm.get('pedidos')?.pedidos.length > 0 &&
            <div className="row h-print mb-3">
                <div className="col">
                    <Button className="float-end" variant="primary" onClick={() => Frm.set('pedidosAnalisados', true)} disabled={Frm.get('pedidos')?.pedidos?.some(p => !p.dispositivo)}>
                        Gerar {nextRequest.produto === P.DECISAO_VIABILIDADE_RECURSO_EXTRAORDINARIO ? 'Decisão' : 'Decisão'}
                    </Button>
                </div>
            </div>
        }
    </>
}