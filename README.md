# Aprova Segurança

Aplicativo PWA responsivo para preparação de concursos de segurança pública, em português do Brasil.

## Tecnologias

- React + TypeScript + Vite
- Supabase Auth e Postgres (opcional por ambiente)
- Layout responsivo com manifesto PWA

## Executar localmente

```bash
npm install
cp .env.example .env.local
npm run dev
```

Configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no `.env.local` para habilitar cadastro, login e leitura do perfil. Sem essas variáveis, a interface continua disponível, mas não finge autenticação ou pagamento.

## Supabase

Execute `supabase/schema.sql` no SQL Editor do seu projeto. O schema cria perfis vinculados ao Auth, controles de acesso, concursos e conteúdo. Não coloque `service_role` no frontend.

O painel administrativo usa o papel `owner` armazenado em `profiles.role`, protegido por RLS; não há e-mail administrativo ou segredo embutido no cliente. Defina o primeiro proprietário de forma segura no SQL Editor, associando o UUID do usuário autenticado. O Premium só é ativado após confirmação manual pelo proprietário, via atualização protegida de `profiles.premium`. Nenhum pagamento ou PIX é processado pelo aplicativo.

## Conteúdo

Nenhum concurso, questão oficial, edital ou resultado é inventado ou pré-carregado. Inclua dados somente após validação e com a fonte apropriada.
