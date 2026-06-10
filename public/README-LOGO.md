# Instruções para adicionar o Logo

## Arquivo necessário

Para que o logo apareça corretamente em todo o sistema, você precisa adicionar o arquivo de imagem do logo na pasta `public/`.

## Passos

1. **Salvar a imagem do logo** que você enviou como:
   ```
   public/logo.png
   ```

2. **Recomendações de formato**:
   - Formato: PNG (com transparência) ou WEBP
   - Tamanho ideal: 200x200 pixels ou maior (o sistema redimensiona automaticamente)
   - Nome do arquivo: `logo.png`

3. **Após adicionar o arquivo**, reinicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

## Onde o logo aparece

O logo agora aparece automaticamente em:

- ✅ Página inicial (`/`)
- ✅ Login (`/login`)
- ✅ Recuperar senha (`/recuperar-senha`)
- ✅ Nova senha (`/nova-senha`)
- ✅ Tipo de registro (`/register/tipo`)
- ✅ Header em todas as páginas logadas (dashboard, perfil, etc.)

## Componente criado

Foi criado o componente `src/components/logo.tsx` que oferece:

- **Tamanhos**: `sm`, `md`, `lg`, `xl`
- **Variantes**:
  - `dark`: fundo escuro (dashboard, telas com gradiente)
  - `light`: fundo claro (cartões, modais)
  - `color`: logo colorido original

## Exemplo de uso

```tsx
import Logo from '@/components/logo';

// Logo padrão com link para home
<Logo size="md" variant="dark" href="/" />

// Apenas o ícone do logo (sem texto)
<LogoIcon size="sm" />
```

---

**Nota**: Sem o arquivo `logo.png` na pasta `public/`, o logo não será exibido e aparecerá um erro 404 no console do navegador.
