# VELLURE · Maison de Lingerie (3D)

Loja imersiva em 3D: o monograma da Vellure em ouro se monta a partir de poeira dourada no loading, a cliente atravessa a logo para entrar, e a rolagem conduz uma cena WebGL com seda viva, pétalas e uma escadaria-galeria com as fotos reais das modelos.

HTML, CSS e JavaScript puros (módulos ES), Three.js r160, GSAP e Lenis, tudo servido pelo próprio repositório (sem build).

## O que tem

| Parte | Onde |
|---|---|
| Loading 3D (partículas formam a logo, aros armilares, joia de cristal) | `js/v3d/scene.js` |
| Entrada atravessando a logo, direção da rolagem, menu, som | `js/v3d/main.js` |
| Seda interativa (ondula com o cursor ou o dedo) | `js/v3d/scene.js` · shader da seda |
| Galeria em escadaria 3D (rolar, arrastar, passar o mouse troca a foto) | `js/v3d/scene.js` · escadaria |
| Closet completo, página da peça, sacola, pedido pelo WhatsApp | `js/v3d/shop.js` |
| Som ambiente gerado no navegador (botão "Som") | `js/v3d/sound.js` |
| Catálogo local com as 50 peças e 180 fotos | `js/catalog.js`, `assets/modelos/` |
| Área da cliente: pedidos com linha do tempo, favoritos, medidas, endereços, dados | `conta.html`, `js/v3d/conta.js` |
| Simulador de tamanho (manequim que se molda) e de frete (jornada do pacote) | `js/v3d/atelier.js` |
| App instalável no iPhone e Android (PWA) | `manifest.webmanifest`, `sw.js`, `assets/icons/` |
| E-mails da conta com a identidade da Maison | `supabase/emails/` |
| Painel administrativo (Supabase) | `admin.html` |
| Loja antiga, mantida só como referência | `legado.html` |

## Configurar

1. **WhatsApp da concierge:** troque `WHATSAPP` em `js/config.js` (formato `55DDDNÚMERO`). Os pedidos da sacola chegam nesse número já com peças, tamanhos e totais.
2. **Supabase (opcional, para o painel):** rode `supabase/schema.sql` e depois `supabase/produtos_reais.sql` no SQL Editor. O segundo cadastra as 50 peças reais com as fotos e esconde os produtos fictícios. A partir daí, produtos com foto cadastrados no painel aparecem automaticamente na loja 3D.
3. **Endereços de retorno do login:** em *Authentication → URL Configuration*, use `https://hfa90.github.io/vellure/conta.html` como **Site URL** e adicione `https://hfa90.github.io/vellure/**` em **Redirect URLs**.
4. **E-mails personalizados:** em *Authentication → Emails → Templates*, cole cada arquivo de `supabase/emails/` no modelo correspondente:

   | Modelo no Supabase | Arquivo | Assunto sugerido |
   |---|---|---|
   | Confirm signup | `confirmar-cadastro.html` | Bem-vinda à Maison Vellure |
   | Reset password | `redefinir-senha.html` | Sua senha nova na Vellure |
   | Magic link | `link-magico.html` | Seu acesso à Vellure |
   | Change email address | `alterar-email.html` | Confirme seu novo e-mail |
   | Invite user | `convite.html` | Um convite da Maison Vellure |

   Para o remetente aparecer como Vellure (e sem o limite de envios do servidor padrão), configure um SMTP próprio em *Authentication → Emails → SMTP Settings* (Resend, Brevo ou o e-mail do seu domínio).
5. **Publicar:** GitHub Pages servindo a branch `main` na raiz. A loja fica em `https://hfa90.github.io/vellure/`.

## Desempenho e acessibilidade

- Resolução dinâmica: se o aparelho não sustentar a cena, a nitidez baixa um pouco automaticamente (e o brilho é desligado em último caso), para manter tudo fluido.
- Em celulares, menos partículas, pétalas e polígonos; a joia acompanha o giroscópio do celular e os toques vibram no Android.
- Instale como app: no Android aparece "Instalar o app" no menu; no iPhone, Compartilhar → Adicionar à Tela de Início.
- Sem WebGL, o site abre direto no closet (sem a galeria 3D).
- Com "reduzir movimento" ativado no sistema, a entrada é um fade simples e a rolagem é nativa.
