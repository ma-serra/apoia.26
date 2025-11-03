'use client'

export default function TermosDeUso(props: { onAccept: () => void }) {
    return (
        <div className="container mt-4">
            <div className="text-center">
                <img src="/apoia-logo-horiz-cor-fundo-claro.png" alt="Apoia Logo" height={50} className="mx-auto mb-4" />
            </div>
            <h2>Termos de Uso</h2>
            <p>Por favor, leia e aceite os termos de uso para continuar utilizando a aplicação.</p>

            <h4>1. Aceitação dos Termos</h4>
            <p>Ao utilizar este serviço, você concorda em cumprir estes termos de uso e todas as políticas associadas.</p>

            <h4>2. Requisito de Capacitação em IA</h4>
            <p>O acesso e uso da Apoia pressupõem que o usuário tenha concluído previamente um curso básico de formação em Inteligência Artificial (IA) reconhecido pela Apoia ou pela sua instituição. Esse requisito busca garantir uso responsável e entendimento das limitações e riscos das ferramentas de IA disponibilizadas.</p>

            <h4>3. Uso do Serviço</h4>
            <p>Você concorda em usar o serviço apenas para fins legais e de acordo com todas as leis aplicáveis. É responsabilidade do usuário assegurar que as atividades realizadas estejam dentro de sua competência técnica e jurídica.</p>

            <h4>4. Uso Custeado pelo Tribunal</h4>
            <p>Quando o uso da plataforma for financiado por órgãos públicos, como tribunais, esse uso deverá ser realizado com parcimônia e observando o princípio da eficiência administrativa. Recursos e solicitações devem ser adequados ao objetivo processual e economicamente justificáveis.</p>

            <h4>5. Modificações nos Termos</h4>
            <p>Reservamo-nos o direito de modificar estes termos a qualquer momento. Notificaremos você sobre alterações significativas e recomendamos a revisão periódica destes termos.</p>
            <button className="btn btn-primary" onClick={props.onAccept}>Aceitar</button>
        </div>
    )
}