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
| Box Misteriosa VIP: caixa 3D, perfil de curadoria inteligente, planos recorrentes | `assinatura.html`, `js/v3d/vip.js`, `js/v3d/vipbox.js` |
| Meu tamanho gravado: destaque dourado na galeria e no closet, filtro "No meu tamanho" | `js/v3d/common.js` (mySize), `js/v3d/atelier.js` |
| Modo claro premium (pérola rosada) e modo escuro, com a cena 3D acompanhando | `js/theme.js`, `css/v3d.css` |
| Checkout com Pix (QR Code e copia e cola com valor exato) e dinheiro na entrega; cartão desativado | `js/v3d/pix.js`, `js/v3d/shop.js`, `js/config.js` → `PAYMENTS` |
| Estoque por tamanho (esgotado, "últimas unidades", limite na sacola e no pedido) | `js/v3d/shop.js`, `supabase/estoque_avaliacoes.sql` |
| Avise-me quando chegar: fila por tamanho, aviso pronto quando o tamanho volta | `js/v3d/shop.js`, painel → Avise-me |
| Avaliações com foto, só de quem comprou, com moderação e resposta da Maison | `js/v3d/reviews.js`, painel → Avaliações |
| Busca instantânea (tecla /), cupom, vistos recentemente, compartilhar peça, concierge flutuante | `js/v3d/main.js`, `js/v3d/shop.js` |
| Privacidade (LGPD), políticas de trocas e entregas, SEO (sitemap, robots, dados estruturados) | `js/lgpd.js`, `politicas.html`, `sitemap.xml`, `robots.txt` |
| App instalável no iPhone e Android (PWA) | `manifest.webmanifest`, `sw.js`, `assets/icons/` |
| E-mails da conta com a identidade da Maison | `supabase/emails/` |
| Painel administrativo (Supabase) | `admin.html` |
| Loja antiga, mantida só como referência | `legado.html` |

## Configurar

0. **Pix:** em `js/config.js` → `PAYMENTS`, preencha `PIX_KEY` (sua chave), `PIX_NAME` e `PIX_CITY`. Com a chave preenchida, o checkout gera o QR Code e o copia e cola com o valor exato e o número do pedido. Sem chave, a concierge envia o Pix pelo WhatsApp. Dinheiro na entrega fica ligado em `CASH: true`; o cartão volta quando `CARD: true`.

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
5. **Box Misteriosa VIP:** rode `supabase/assinatura_vip.sql` no SQL Editor (cria os 6 planos e ajusta a cobrança por frequência). Preços, benefícios e dia de envio ficam em `js/config.js` → `VIP`.
   - **Cobrança recorrente:** no Mercado Pago, em *Seu negócio → Assinaturas → Criar plano*, crie um plano para cada combinação (Essencial e Duo × mensal, trimestral, semestral), copie o link de checkout de cada um e cole em `VIP.PAY_LINKS`. Enquanto estiver vazio, a assinatura é registrada e a concierge envia o pagamento pelo WhatsApp.
   - Pausar, pular mês e cancelar na área da cliente atualizam a assinatura no Supabase. Se o plano estiver no Mercado Pago, faça o mesmo ajuste lá (ou peça para automatizarmos com uma Edge Function e o webhook do Mercado Pago).
6. **Estoque por tamanho, Avise-me e Avaliações:** rode `supabase/estoque_avaliacoes.sql` no SQL Editor (depois dos anteriores). Ele reparte o estoque atual de cada peça entre os tamanhos, cria a lista de espera, as avaliações e o espaço para as fotos delas.
   - **Estoque:** no painel, em Produtos, cada peça tem a grade por tamanho (com + e −). O total é a soma. Pedido cancelado devolve as peças ao tamanho certo.
   - **Avise-me:** quando um tamanho esgota, a loja troca o botão por "Avise-me quando chegar". Ao repor o tamanho (no produto ou direto na aba Avise-me), a fila fica pronta: avise pelo WhatsApp de cada cliente ou copie os e-mails em cópia oculta, e marque como avisadas. Para o aviso sair sozinho por e-mail, dá para ligar uma Edge Function com o seu SMTP.
   - **Avaliações:** só clientes com pedido pago daquela peça conseguem avaliar (o banco confere). Toda avaliação entra como "para revisar" e só aparece na loja depois que você aprova. A nota média vai para o Google junto com os dados da peça.
7. **Publicar:** GitHub Pages servindo a branch `main` na raiz. A loja fica em `https://hfa90.github.io/vellure/`.

## Desempenho e acessibilidade

- Resolução dinâmica: se o aparelho não sustentar a cena, a nitidez baixa um pouco automaticamente (e o brilho é desligado em último caso), para manter tudo fluido.
- Em celulares, menos partículas, pétalas e polígonos; a joia acompanha o giroscópio do celular e os toques vibram no Android.
- Instale como app: no Android aparece "Instalar o app" no menu; no iPhone, Compartilhar → Adicionar à Tela de Início.
- Sem WebGL, o site abre direto no closet (sem a galeria 3D).
- Com "reduzir movimento" ativado no sistema, a entrada é um fade simples e a rolagem é nativa.
