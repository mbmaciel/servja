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

/**
 * Envia email de boas-vindas ao novo usuário com suas credenciais.
 */
export async function sendWelcomeEmail(user, plainPassword) {
  if (!isConfigured()) {
    console.warn('[emailService] SMTP não configurado. Email de boas-vindas ignorado.');
    return;
  }

  const tipoLabel = user.tipo === 'prestador' ? 'Prestador de Serviços' : 'Cliente';
  const transporter = createTransporter();

  await transporter.sendMail({
    from: `"ServiJá" <${SMTP_FROM}>`,
    to: user.email,
    subject: `Bem-vindo ao ServiJá, ${user.full_name}!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb;">Bem-vindo ao ServiJá! 🎉</h2>
        <p>Olá, <strong>${user.full_name}</strong>!</p>
        <p>Seu cadastro como <strong>${tipoLabel}</strong> foi realizado com sucesso.</p>

        <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <h3 style="margin: 0 0 12px; color: #374151;">Seus dados de acesso:</h3>
          <p style="margin: 4px 0;"><strong>Email:</strong> ${user.email}</p>
          <p style="margin: 4px 0;"><strong>Senha:</strong> ${plainPassword}</p>
        </div>

        <p>Acesse a plataforma e ${user.tipo === 'prestador'
          ? 'configure seu perfil profissional para começar a receber solicitações.'
          : 'encontre os melhores prestadores de serviços da sua região.'
        }</p>

        <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
          Por segurança, recomendamos que você altere sua senha após o primeiro acesso.
        </p>
      </div>
    `,
  });
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
      from: `"ServiJá" <${SMTP_FROM}>`,
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
            Este é um email automático do ServiJá. Não responda a este email.
          </p>
        </div>
      `,
    });
  } catch (err) {
    console.error('[emailService] Erro ao enviar email de avaliação:', err.message);
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
    from: `"ServiJá" <${SMTP_FROM}>`,
    to: adminEmails,
    subject: `[ServiJá] Novo ${tipoLabel} cadastrado: ${newUser.full_name}`,
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
          Este é um email automático do ServiJá.
        </p>
      </div>
    `,
  });
}
