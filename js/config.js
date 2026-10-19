/* VELLURE · configuração do Supabase */
window.VELLURE_CONFIG = {
  SUPABASE_URL: 'https://kiohylypuuxtkfxiucfd.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtpb2h5bHlwdXV4dGtmeGl1Y2ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIyOTA0NDgsImV4cCI6MjEwNzg2NjQ0OH0.k521wSYoXn5iXGDrusdazb-e-Z--xtF2N472YtLGT1M',
  BRAND: 'Vellure',
  WHATSAPP: '5592995258724',
  FREE_SHIPPING_FROM: 299,
  ATELIER: { name: 'Atelier Jardins', address: 'Rua Oscar Freire, São Paulo · SP' },

  /* ---------- Pagamentos ---------- */
  PAYMENTS: {
    // Sua chave Pix (CPF, CNPJ, e-mail, telefone com +55 ou chave aleatória). Gera o QR Code com o valor exato do pedido.
    PIX_KEY: 'haydenfernandes.dev@gmail.com',
    PIX_NAME: 'VELLURE',        // nome do recebedor (até 25 letras, sem acento)
    PIX_CITY: 'MANAUS',      // cidade do recebedor (até 15 letras, sem acento)
    PIX_DISCOUNT: 0.05,         // 5% de desconto no Pix
    PIX_MINUTES: 30,            // prazo para pagar o Pix
    CASH: true,                 // dinheiro na entrega ou na retirada
    CARD: false                 // cartão de crédito: desativado por enquanto
  },

  /* ---------- Vendas (os mesmos valores ficam em supabase/vendas.sql → vendas_cfg) ---------- */
  VENDAS: {
    GIFT_FEE: 19.9,          // embalagem para presente com cartão escrito à mão
    GIFT_MAX: 240,           // letras do cartão
    BIRTHDAY_PERCENT: 15,    // cupom no mês do aniversário
    FRIEND_PERCENT: 10,      // desconto da amiga indicada na primeira compra
    REFERRER_PETALS: 500     // pétalas para quem indicou
  },

  /* ---------- Box Misteriosa VIP (assinatura) ---------- */
  VIP: {
    // dia do mês em que as boxes saem do ateliê
    SHIP_DAY: 10,
    CYCLES: {
      mensal: { label: 'Mensal', months: 1, note: 'cobrança todo mês, cancele quando quiser' },
      trimestral: { label: 'Trimestral', months: 3, note: 'cobrança a cada 3 meses' },
      semestral: { label: 'Semestral', months: 6, note: 'cobrança a cada 6 meses' }
    },
    PLANS: [
      {
        id: 'essencial', name: 'Box Essencial', desc: 'Uma lingerie surpresa por mês, escolhida para o seu estilo e o seu tamanho.',
        prices: { mensal: 89.9, trimestral: 79.9, semestral: 69.9 },
        perks: ['1 lingerie surpresa por mês', 'Curadoria pelo seu perfil e tamanho gravado', 'Frete da box por nossa conta', 'Troca de tamanho grátis', '10% off em tudo do closet']
      },
      {
        id: 'duo', name: 'Box Duo', desc: 'A lingerie do mês e mais uma peça para combinar: tanga, corset ou camisola.', highlight: true,
        prices: { mensal: 149.9, trimestral: 134.9, semestral: 119.9 },
        perks: ['Lingerie surpresa + 1 peça extra por mês', 'Curadoria pelo seu perfil e tamanho gravado', 'Frete da box por nossa conta', 'Troca de tamanho grátis', '15% off em tudo do closet', 'Pré-venda das coleções novas']
      }
    ],
    // Links de pagamento recorrente (Mercado Pago → Assinaturas → Planos → link de checkout).
    // Enquanto estiverem vazios, a assinatura é registrada e a concierge envia o pagamento pelo WhatsApp.
    PAY_LINKS: {
      'vip-essencial-mensal': '', 'vip-essencial-trimestral': '', 'vip-essencial-semestral': '',
      'vip-duo-mensal': '', 'vip-duo-trimestral': '', 'vip-duo-semestral': ''
    }
  }
};
