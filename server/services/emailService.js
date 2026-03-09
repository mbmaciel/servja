/**
 * Serviço de email via Brevo SMTP (nodemailer).
 * Variáveis de ambiente: SMTP_USER, SMTP_PASS, SMTP_FROM (opcional).
 */

import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST || 'smtp-relay.brevo.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER || 'a3b4ef001@smtp-brevo.com';
const SMTP_PASS = process.env.SMTP_PASS || 'NCGDhIn0QpxjwVXH';
const SMTP_FROM = process.env.SMTP_FROM || 'servirja2026@gmail.com';

const isConfigured = () => Boolean(SMTP_USER && SMTP_PASS);

const createTransporter = () =>
  nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: false,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

// ─── Bloco HTML reutilizável ──────────────────────────────────────────────────
const headerHtml = (appUrl) => {
  const logoUrl = `${appUrl}/uploads/logo-sevja.jpg`;
  return `
    <div style="background:linear-gradient(135deg,#3b82f6 0%,#22c55e 100%);border-radius:12px 12px 0 0;padding:28px 20px;text-align:center;">
      <img src="${logoUrl}" alt="SeviJa" width="80" height="80"
           style="border-radius:18px;display:block;margin:0 auto 14px;" />
      <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">SeviJa</h1>
      <p style="margin:4px 0 0;color:rgba(255,255,255,.85);font-size:13px;">Serviços na sua região</p>
    </div>`;
};

const footerHtml = (appUrl) => `
  <div style="background:#f1f5f9;border-radius:0 0 12px 12px;padding:14px 28px;text-align:center;">
    <p style="margin:0;color:#94a3b8;font-size:12px;">
      © 2026 SeviJa &nbsp;·&nbsp;
      <a href="${appUrl}" style="color:#3b82f6;text-decoration:none;">${appUrl.replace('https://', '')}</a>
    </p>
  </div>`;

const wrapHtml = (appUrl, body) => `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;">
    ${headerHtml(appUrl)}
    <div style="padding:28px;">
      ${body}
    </div>
    ${footerHtml(appUrl)}
  </div>`;

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Envia email de boas-vindas ao novo usuário com suas credenciais.
 * Para prestadores envia um email específico com próximos passos.
 */
export async function sendWelcomeEmail(user, plainPassword) {
  if (!isConfigured()) {
    console.warn('[emailService] SMTP não configurado. Email de boas-vindas ignorado.');
    return;
  }

  const appUrl = process.env.APP_URL || 'https://sevija.com';
  const transporter = createTransporter();

  if (user.tipo === 'prestador') {
    // ── Email personalizado para prestadores ──────────────────────────────────
    const body = `
      <h2 style="margin:0 0 6px;color:#1e293b;font-size:20px;">Olá, ${user.full_name}! 🎉</h2>
      <p style="color:#475569;line-height:1.7;margin:0 0 20px;">
        Seu cadastro como <strong>Prestador de Serviços</strong> no SeviJa foi realizado com sucesso!
        Agora você faz parte da nossa rede de profissionais e já pode começar a receber solicitações de clientes da sua região.
      </p>

      <!-- Credenciais -->
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:18px;margin-bottom:24px;">
        <p style="margin:0 0 10px;color:#64748b;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Seus dados de acesso</p>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:7px 0;color:#64748b;font-size:13px;width:70px;">Email</td>
            <td style="padding:7px 0;color:#1e293b;font-weight:600;">${user.email}</td>
          </tr>
          <tr style="border-top:1px solid #e2e8f0;">
            <td style="padding:7px 0;color:#64748b;font-size:13px;">Senha</td>
            <td style="padding:7px 0;color:#1e293b;font-weight:600;">${plainPassword}</td>
          </tr>
        </table>
      </div>

      <!-- Próximos passos -->
      <p style="color:#1e293b;font-weight:600;font-size:15px;margin:0 0 12px;">📋 Próximos passos para se destacar:</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr>
          <td style="padding:8px 0;vertical-align:top;width:32px;font-size:18px;">📷</td>
          <td style="padding:8px 0;color:#475569;font-size:14px;line-height:1.5;">
            <strong style="color:#1e293b;">Adicione sua foto de perfil</strong> — transmite confiança e aumenta as solicitações recebidas.
          </td>
        </tr>
        <tr style="border-top:1px solid #f1f5f9;">
          <td style="padding:8px 0;vertical-align:top;font-size:18px;">🖼️</td>
          <td style="padding:8px 0;color:#475569;font-size:14px;line-height:1.5;">
            <strong style="color:#1e293b;">Publique fotos dos seus trabalhos</strong> — clientes escolhem profissionais que mostram resultados.
          </td>
        </tr>
        <tr style="border-top:1px solid #f1f5f9;">
          <td style="padding:8px 0;vertical-align:top;font-size:18px;">✍️</td>
          <td style="padding:8px 0;color:#475569;font-size:14px;line-height:1.5;">
            <strong style="color:#1e293b;">Escreva uma descrição dos seus serviços</strong> — conte sua experiência e diferenciais.
          </td>
        </tr>
        <tr style="border-top:1px solid #f1f5f9;">
          <td style="padding:8px 0;vertical-align:top;font-size:18px;">💰</td>
          <td style="padding:8px 0;color:#475569;font-size:14px;line-height:1.5;">
            <strong style="color:#1e293b;">Defina seu preço base</strong> — ajuda os clientes a encontrarem você na busca.
          </td>
        </tr>
      </table>

      <div style="text-align:center;margin-bottom:24px;">
        <a href="${appUrl}/perfil"
           style="display:inline-block;background:linear-gradient(135deg,#3b82f6 0%,#22c55e 100%);
                  color:#fff;text-decoration:none;padding:14px 36px;
                  border-radius:50px;font-size:15px;font-weight:700;">
          Completar meu perfil agora
        </a>
      </div>

      <p style="color:#94a3b8;font-size:12px;text-align:center;margin:0;">
        Qualquer dúvida, responda este email ou acesse ${appUrl.replace('https://', '')}
      </p>`;

    await transporter.sendMail({
      from: `"SeviJa" <${SMTP_FROM}>`,
      to: user.email,
      subject: `Bem-vindo ao SeviJa, ${user.full_name}! Seu perfil aguarda você 🚀`,
      html: wrapHtml(appUrl, body),
    });

  } else {
    // ── Email genérico para clientes ──────────────────────────────────────────
    const body = `
      <h2 style="margin:0 0 6px;color:#1e293b;font-size:20px;">Bem-vindo, ${user.full_name}!</h2>
      <p style="color:#475569;line-height:1.7;margin:0 0 20px;">
        Sua conta de <strong>Cliente</strong> foi criada com sucesso.
        Encontre os melhores profissionais próximos a você com facilidade.
      </p>

      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:18px;margin-bottom:24px;">
        <p style="margin:0 0 10px;color:#64748b;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Seus dados de acesso</p>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:7px 0;color:#64748b;font-size:13px;width:70px;">Email</td>
            <td style="padding:7px 0;color:#1e293b;font-weight:600;">${user.email}</td>
          </tr>
          <tr style="border-top:1px solid #e2e8f0;">
            <td style="padding:7px 0;color:#64748b;font-size:13px;">Senha</td>
            <td style="padding:7px 0;color:#1e293b;font-weight:600;">${plainPassword}</td>
          </tr>
        </table>
      </div>

      <div style="text-align:center;margin-bottom:24px;">
        <a href="${appUrl}"
           style="display:inline-block;background:linear-gradient(135deg,#3b82f6 0%,#22c55e 100%);
                  color:#fff;text-decoration:none;padding:14px 36px;
                  border-radius:50px;font-size:15px;font-weight:700;">
          Buscar prestadores
        </a>
      </div>

      <p style="color:#94a3b8;font-size:12px;text-align:center;margin:0;">
        Por segurança, recomendamos alterar sua senha após o primeiro acesso.
      </p>`;

    await transporter.sendMail({
      from: `"SeviJa" <${SMTP_FROM}>`,
      to: user.email,
      subject: `Bem-vindo ao SeviJa, ${user.full_name}!`,
      html: wrapHtml(appUrl, body),
    });
  }
}

/**
 * Notifica o cliente que seu serviço foi concluído e o convida a avaliar.
 */
export async function sendAvaliacaoEmail({ cliente_email, cliente_nome, prestador_nome, categoria_nome }) {
  if (!isConfigured()) {
    console.warn('[emailService] SMTP não configurado. Email de avaliação ignorado.');
    return;
  }

  try {
    const appUrl = process.env.APP_URL || 'https://sevija.com';
    const transporter = createTransporter();

    await transporter.sendMail({
      from: `"SeviJa" <${SMTP_FROM}>`,
      to: cliente_email,
      subject: 'Seu serviço foi concluído — avalie o atendimento',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb;">Serviço concluído!</h2>
          <p>Olá${cliente_nome ? `, <strong>${cliente_nome}</strong>` : ''}!</p>
          <p>
            O prestador <strong>${prestador_nome || 'contratado'}</strong>
            ${categoria_nome ? `(${categoria_nome})` : ''}
            marcou seu serviço como concluído.
          </p>
          <p>Sua opinião é muito importante. Avalie o atendimento e ajude outros clientes a escolherem os melhores profissionais.</p>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${appUrl}/cliente"
               style="background: #2563eb; color: #fff; text-decoration: none;
                      padding: 14px 28px; border-radius: 8px; font-size: 16px; font-weight: bold;">
              Avaliar Atendimento
            </a>
          </div>

          <p style="color: #6b7280; font-size: 13px;">
            Acesse <em>Meus Serviços → aba Concluídos → botão Avaliar</em> para registrar sua avaliação com estrelas, comentário e fotos.
          </p>

          <p style="color: #9ca3af; font-size: 12px; margin-top: 30px;">
            Este é um email automático do SeviJa. Não responda a este email.
          </p>
        </div>
      `,
    });
  } catch (err) {
    console.error('[emailService] Erro ao enviar email de avaliação:', err.message);
  }
}

/**
 * Notifica todos os admins quando uma nova solicitação é criada.
 */
export async function sendNewSolicitacaoEmail(pool, solicitacao) {
  if (!isConfigured()) {
    console.warn('[emailService] SMTP não configurado. Notificação de solicitação ignorada.');
    return;
  }

  try {
    const [adminRows] = await pool.query(
      "SELECT email, full_name FROM users WHERE tipo = 'admin' AND email IS NOT NULL AND ativo = TRUE"
    );

    if (!adminRows.length) return;

    const transporter = createTransporter();
    const adminEmails = adminRows.map((a) => a.email);
    const appUrl = process.env.APP_URL || 'https://sevija.com';

    const body = `
      <h2 style="margin:0 0 6px;color:#1e293b;font-size:20px;">Nova solicitação recebida!</h2>
      <p style="color:#475569;line-height:1.7;margin:0 0 20px;">
        Um cliente acabou de solicitar um serviço na plataforma.
      </p>

      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:18px;margin-bottom:24px;">
        <p style="margin:0 0 10px;color:#64748b;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Detalhes da solicitação</p>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:7px 0;color:#64748b;font-size:13px;width:110px;">Cliente</td>
            <td style="padding:7px 0;color:#1e293b;font-weight:600;">${solicitacao.cliente_nome || '-'}</td>
          </tr>
          <tr style="border-top:1px solid #e2e8f0;">
            <td style="padding:7px 0;color:#64748b;font-size:13px;">Email</td>
            <td style="padding:7px 0;color:#1e293b;">${solicitacao.cliente_email || '-'}</td>
          </tr>
          <tr style="border-top:1px solid #e2e8f0;">
            <td style="padding:7px 0;color:#64748b;font-size:13px;">Prestador</td>
            <td style="padding:7px 0;color:#1e293b;font-weight:600;">${solicitacao.prestador_nome || '-'}</td>
          </tr>
          <tr style="border-top:1px solid #e2e8f0;">
            <td style="padding:7px 0;color:#64748b;font-size:13px;">Categoria</td>
            <td style="padding:7px 0;color:#1e293b;">${solicitacao.categoria_nome || '-'}</td>
          </tr>
          ${solicitacao.descricao ? `
          <tr style="border-top:1px solid #e2e8f0;">
            <td style="padding:7px 0;color:#64748b;font-size:13px;vertical-align:top;">Descrição</td>
            <td style="padding:7px 0;color:#1e293b;">${solicitacao.descricao}</td>
          </tr>` : ''}
          ${solicitacao.preco_proposto ? `
          <tr style="border-top:1px solid #e2e8f0;">
            <td style="padding:7px 0;color:#64748b;font-size:13px;">Oferta</td>
            <td style="padding:7px 0;color:#1e293b;font-weight:600;">R$ ${Number(solicitacao.preco_proposto).toFixed(2)}</td>
          </tr>` : ''}
        </table>
      </div>

      <div style="text-align:center;margin-bottom:24px;">
        <a href="${appUrl}/admin"
           style="display:inline-block;background:linear-gradient(135deg,#3b82f6 0%,#22c55e 100%);
                  color:#fff;text-decoration:none;padding:14px 36px;
                  border-radius:50px;font-size:15px;font-weight:700;">
          Ver no painel admin
        </a>
      </div>`;

    await transporter.sendMail({
      from: `"SeviJa" <${SMTP_FROM}>`,
      to: adminEmails,
      subject: `[SeviJa] Nova solicitação: ${solicitacao.cliente_nome || 'Cliente'} → ${solicitacao.prestador_nome || 'Prestador'}`,
      html: wrapHtml(appUrl, body),
    });
  } catch (err) {
    console.error('[emailService] Erro ao notificar admins sobre solicitação:', err.message);
  }
}

/**
 * Notifica todos os admins sobre um novo cadastro na plataforma.
 */
export async function notifyAdmins(pool, newUser) {
  if (!isConfigured()) {
    console.warn('[emailService] SMTP não configurado. Notificação para admins ignorada.');
    return;
  }

  const [adminRows] = await pool.query(
    "SELECT email, full_name FROM users WHERE tipo = 'admin' AND email IS NOT NULL AND ativo = TRUE"
  );

  if (!adminRows.length) return;

  const tipoLabel = newUser.tipo === 'prestador' ? 'Prestador' : 'Cliente';
  const transporter = createTransporter();
  const adminEmails = adminRows.map((a) => a.email);

  await transporter.sendMail({
    from: `"SeviJa" <${SMTP_FROM}>`,
    to: adminEmails,
    subject: `[SeviJa] Novo ${tipoLabel} cadastrado: ${newUser.full_name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h3 style="color: #2563eb;">Novo cadastro na plataforma</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 6px 0; color: #6b7280;">Tipo</td><td><strong>${tipoLabel}</strong></td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280;">Nome</td><td>${newUser.full_name}</td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280;">Email</td><td>${newUser.email}</td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280;">Telefone</td><td>${newUser.telefone || '-'}</td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280;">Cidade</td><td>${newUser.cidade ? `${newUser.cidade}/${newUser.estado}` : '-'}</td></tr>
        </table>
        <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">
          Este é um email automático do SeviJa.
        </p>
      </div>
    `,
  });
}
