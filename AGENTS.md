# Notas para Agentes AI

## Limitações Conhecidas

### Simple Browser
- **Problema**: O Simple Browser não funciona com páginas que requerem autenticação
- **Contexto**: Aplicação usa NextAuth.js/Keycloak para autenticação
- **Solução**: Não usar `open_simple_browser` para testar páginas autenticadas
- **Alternativa**: Pedir ao usuário para testar manualmente no navegador
- **Status**: Limitação permanente da ferramenta

## Boas Práticas

### Debugging
- Usar console.log estratégicos para debugging
- Pedir ao usuário para verificar logs no navegador quando necessário
- Remover logs de debug após resolver problemas

### UI/UX
- Sempre informar ao usuário por que botões estão desabilitados
- Usar Bootstrap alerts para feedback visual claro
- Validar estados e dar feedback apropriado

### Estilo de Código
- **Não usar emoticons** no código, logs ou interface
- Manter mensagens profissionais e diretas
- Usar texto claro sem decorações desnecessárias