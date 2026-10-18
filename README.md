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
| Painel administrativo (Supabase) | `admin.html` |
| Loja antiga, mantida só como referência | `legado.html` |

## Configurar

1. **WhatsApp da concierge:** troque `WHATSAPP` em `js/config.js` (formato `55DDDNÚMERO`). Os pedidos da sacola chegam nesse número já com peças, tamanhos e totais.
2. **Supabase (opcional, para o painel):** rode `supabase/schema.sql` e depois `supabase/produtos_reais.sql` no SQL Editor. O segundo cadastra as 50 peças reais com as fotos e esconde os produtos fictícios. A partir daí, produtos com foto cadastrados no painel aparecem automaticamente na loja 3D.
3. **Publicar:** GitHub Pages servindo a branch `main` na raiz. A loja fica em `https://hfa90.github.io/vellure/`.

## Desempenho e acessibilidade

- Em celulares, menos partículas, pétalas e polígonos; resolução limitada.
- Sem WebGL, o site abre direto no closet (sem a galeria 3D).
- Com "reduzir movimento" ativado no sistema, a entrada é um fade simples e a rolagem é nativa.
