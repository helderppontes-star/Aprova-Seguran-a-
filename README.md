# Aprova Segurança — pacote PWA para Replit

Este ZIP contém a base do aplicativo web instalável (PWA), preparada para importar no Replit. O projeto usa React, Vite e Supabase.

## Importar no Replit
1. No Replit, escolha **Import code** / **Import a ZIP**.
2. Selecione este arquivo ZIP.
3. Aguarde a extração e a instalação das dependências.
4. Use o botão **Run**. O comando configurado é `npm run dev -- --host 0.0.0.0`.

## Configuração do Supabase
No painel **Secrets** do Replit, cadastre as variáveis abaixo (sem aspas):
- `VITE_SUPABASE_URL` — URL do projeto Supabase.
- `VITE_SUPABASE_ANON_KEY` — chave pública anon/publishable do projeto.
- `VITE_PIX_COPIA_COLA` — código PIX copia e cola completo gerado pelo banco/PSP, com valor de R$ 1,99.
- `VITE_PIX_CHAVE_EXIBICAO` — opcional, chave PIX exibida como texto.
- `VITE_PIX_TITULAR` — opcional, nome do titular.
- `VITE_PIX_CIDADE` — opcional, cidade do titular.

Depois, no Supabase, execute todo o arquivo `supabase/schema.sql` no SQL Editor. Para tornar a conta do proprietário administradora, siga o passo específico descrito no final desse SQL.

**Segurança:** nunca coloque senha bancária, `service_role`, tokens privados ou códigos de autenticação nas variáveis do navegador. A chave anon/publishable é pública e deve ser protegida pelas políticas RLS do banco.

## O que esta versão já contém
- Cadastro e login por e-mail e senha.
- Perfil individual do candidato.
- Área Premium de R$ 1,99 por 30 dias.
- Solicitação de liberação Premium e painel administrativo.
- Liberação manual pelo proprietário após conferir o crédito no banco; comprovante não libera acesso automaticamente.
- Estrutura PWA para instalação na tela inicial de iPhone e Android.

## O que ainda precisa ser concluído antes de divulgar
- Conectar as variáveis reais do Supabase e publicar o app.
- Testar cadastro, login, solicitação PIX e aprovação manual em contas separadas.
- Implementar o banco completo de questões, simulados, redação, editais e cronograma de estudos; nesta base, esses módulos ainda são apresentados como áreas em construção.
- Revisar privacidade/LGPD, termos, segurança, backup e monitoramento.

O ZIP é um ponto de partida importável, não significa que o aplicativo já esteja publicado ou pronto para receber pagamentos.
