import { SuggestionContext, SuggestionActionResult } from './context'
import type { ComponentType } from 'react'
import AskProcessNumberModal from './modals/AskProcessNumberModal'
import { InstanceKeyType } from '@/lib/proc/process-types'

export abstract class Suggestion {
  constructor(public id: string, public label: string, public icon: any, public modalComponent: ComponentType<any> = AskProcessNumberModal, public instance?: InstanceKeyType[], public sidekick?: boolean) { }
  abstract resolve(ctx: SuggestionContext): SuggestionActionResult

  protected processAwarePrompt(ctx: SuggestionContext, prompt: string): SuggestionActionResult {
    if (ctx.processNumber || ctx.alreadyLoadedProcessMetadata) {
      return { type: 'immediate', prompt }
    }
    return {
      type: 'modal',
      key: 'ask-process-number',
      initial: {},
      onSubmit: (values, context) => {
        const numero = values?.processNumber?.trim()
        if (numero) {
          context.setProcessNumber(numero)
          context.sendPrompt(`Sobre o processo ${numero}, ${prompt.toLowerCase()}`)
        } else {
          // Se não informou número mas tem arquivos anexados, envia sem o número
          context.sendPrompt(prompt)
        }
      }
    }
  }
}
