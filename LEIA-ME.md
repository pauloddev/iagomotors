# Iago Motors RJ — Landing page

Site estático (HTML + CSS + JS puro, sem dependências). Suba a pasta inteira em qualquer hospedagem com HTTPS (Netlify, Vercel, Hostinger, cPanel…).

## Estrutura
- `index.html` — landing page (gerada a partir de `index.src.html`; edite o `index.html` direto se não for usar o build)
- `obrigado.html` — página de obrigado (conversão)
- `privacidade.html`, `termos.html` — modelos LGPD para revisão jurídica
- `assets/css/style.css` — design tokens no `:root` + todos os estilos
- `assets/js/main.js` — UTMs, WhatsApp dinâmico, dataLayer, consentimento, carrosséis, formulário
- `assets/img/` — imagens WebP otimizadas (legendas removidas, enquadramento 4:5 no carrossel)
- `robots.txt`, `sitemap.xml`

## Antes de publicar (obrigatório)
1. **Domínio**: troque `SEU-DOMINIO.com.br` em `index.html` (canonical, Open Graph, JSON-LD), `robots.txt` e `sitemap.xml`.
2. **LGPD**: preencha `[PREENCHER]` (razão social e CNPJ) no rodapé de todas as páginas e os campos `[...]` em `privacidade.html` e `termos.html`. Peça revisão jurídica.
3. **GTM**: em `index.html`, troque `GTM-XXXXXXX` em `window.IAGO_CONFIG.gtmId`. O GTM só carrega depois que o visitante aceita os cookies (Consent Mode v2 começa negado).
4. **Pixel / Google Ads**: configure dentro do GTM usando os eventos do `dataLayer`.
5. **Leads**: para salvar os leads em CRM/planilha, preencha `leadEndpoint` com uma URL HTTPS que receba `POST` JSON. Com endpoint, o visitante vai para `obrigado.html`; sem endpoint, a página mostra o próximo passo e abre o WhatsApp com a mensagem pronta. Valide e sanitize os dados também no receptor.

## Eventos do dataLayer
| Evento | Quando |
|---|---|
| `cta_click` | clique em qualquer botão com `data-track` (traz `cta_id`) |
| `whatsapp_click` | clique em link do WhatsApp (traz `cta_id`) |
| `lead_form_submitted` | formulário enviado com sucesso (traz interesse e UTMs) |
| `lead_form_error` / `lead_form_failed` | validação falhou / envio falhou |
| `lead_thank_you_view` | visualização da página de obrigado |
| `ritmo_select`, `faq_open`, `carousel_nav`, `consent_update` | microinterações |

## UTMs
`utm_source, utm_medium, utm_campaign, utm_content, utm_term, gclid, fbclid` são capturados da URL, guardados no navegador, enviados em campos ocultos do formulário e anexados ao final da mensagem do WhatsApp.

## Seção de manutenção / fotos
Para trocar ou adicionar fotos, exporte em WebP e mantenha as proporções: carrossel de clientes 4:5, oficina (1 grande 4:5 + 2 quadradas), localização 3:4.
