import React from 'react';
import { Shield, Lock, Eye, FileText, Users, Camera, Mail, Phone } from 'lucide-react';

const VERSAO = '1.0';
const DATA_VIGENCIA = '05 de março de 2026';
const CONTROLADOR = 'ServiJá Tecnologia Ltda.';
const EMAIL_DPO = 'contato@jonaspacheco.cloud';

function Section({ icon: Icon, title, children }) {
  return (
    <section className="mb-8">
      <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900 mb-3 pb-2 border-b border-gray-200">
        {Icon && <Icon className="w-5 h-5 text-blue-600 shrink-0" />}
        {title}
      </h2>
      <div className="text-gray-700 text-sm leading-relaxed space-y-2">{children}</div>
    </section>
  );
}

export default function Termos() {
  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-3xl mx-auto px-4">
        {/* Cabeçalho */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Termos de Uso e Política de Privacidade
              </h1>
              <p className="text-sm text-gray-500">
                Versão {VERSAO} — vigente desde {DATA_VIGENCIA}
              </p>
            </div>
          </div>
          <p className="text-sm text-gray-600 bg-blue-50 border border-blue-100 rounded-lg p-4">
            Este documento rege a relação entre você e o <strong>ServiJá</strong> e foi elaborado em
            conformidade com a <strong>Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018)</strong>,
            o Código de Defesa do Consumidor (Lei nº 8.078/1990) e o Marco Civil da Internet
            (Lei nº 12.965/2014). Ao se cadastrar, você declara ter lido, compreendido e aceitado
            integralmente os termos abaixo.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-0">

          {/* 1. Identificação do Controlador */}
          <Section icon={FileText} title="1. Identificação do Controlador de Dados">
            <p>
              <strong>Controlador:</strong> {CONTROLADOR}<br />
              <strong>Plataforma:</strong> ServiJá (sevija.com)<br />
              <strong>Encarregado de Dados (DPO):</strong>{' '}
              <a href={`mailto:${EMAIL_DPO}`} className="text-blue-600 underline">{EMAIL_DPO}</a>
            </p>
            <p>
              O ServiJá é uma plataforma digital que conecta prestadores de serviços a clientes
              que buscam profissionais qualificados. Atuamos como controlador dos dados pessoais
              coletados durante o uso da plataforma.
            </p>
          </Section>

          {/* 2. Dados Coletados */}
          <Section icon={Eye} title="2. Dados Pessoais Coletados">
            <p><strong>Para todos os usuários (clientes e prestadores):</strong></p>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li>Nome completo</li>
              <li>Endereço de e-mail</li>
              <li>Número de telefone / WhatsApp</li>
              <li>Endereço completo (CEP, rua, bairro, cidade, estado)</li>
              <li>Senha (armazenada em formato criptografado — hash bcrypt)</li>
              <li>Data e hora do aceite destes termos (registro de consentimento)</li>
              <li>Dados de uso da plataforma (páginas acessadas, solicitações realizadas)</li>
            </ul>
            <p className="mt-2"><strong>Exclusivamente para prestadores de serviços:</strong></p>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li>Foto de perfil (imagem do profissional)</li>
              <li>Fotos dos serviços realizados (portfólio profissional)</li>
              <li>Categoria de atuação e descrição profissional</li>
              <li>Preço médio dos serviços oferecidos</li>
              <li>Coordenadas geográficas (latitude/longitude) geradas a partir do CEP, para
                exibição no mapa da plataforma</li>
              <li>Avaliações e comentários recebidos de clientes</li>
            </ul>
          </Section>

          {/* 3. Finalidade e Base Legal */}
          <Section icon={Lock} title="3. Finalidade do Tratamento e Base Legal (LGPD)">
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse border border-gray-200 rounded">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-3 py-2 text-left font-semibold">Finalidade</th>
                    <th className="border border-gray-200 px-3 py-2 text-left font-semibold">Base Legal (LGPD)</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Criação e autenticação de conta', 'Execução de contrato (Art. 7º, V)'],
                    ['Conexão entre clientes e prestadores', 'Execução de contrato (Art. 7º, V)'],
                    ['Exibição pública do perfil do prestador', 'Consentimento (Art. 7º, I)'],
                    ['Exibição pública das fotos de serviços', 'Consentimento (Art. 7º, I)'],
                    ['Localização no mapa (a partir do CEP)', 'Consentimento (Art. 7º, I)'],
                    ['Envio de e-mails transacionais (cadastro, avaliações)', 'Execução de contrato (Art. 7º, V)'],
                    ['Prevenção a fraudes e segurança', 'Legítimo interesse (Art. 7º, IX)'],
                    ['Cumprimento de obrigação legal', 'Obrigação legal (Art. 7º, II)'],
                  ].map(([fin, base], i) => (
                    <tr key={i} className={i % 2 === 0 ? '' : 'bg-gray-50'}>
                      <td className="border border-gray-200 px-3 py-2">{fin}</td>
                      <td className="border border-gray-200 px-3 py-2">{base}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          {/* 4. Uso de Fotos */}
          <Section icon={Camera} title="4. Uso de Imagens e Fotos">
            <p>
              Ao cadastrar foto de perfil ou fotos de serviços realizados, o prestador concede ao
              ServiJá uma <strong>licença não exclusiva, gratuita e revogável</strong> para:
            </p>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li>Exibir as imagens publicamente na plataforma (cards de busca, mapa, modal de solicitação)</li>
              <li>Redimensionar e otimizar as imagens para carregamento eficiente</li>
              <li>Armazenar as imagens em nossos servidores pelo período necessário</li>
            </ul>
            <p>
              As imagens <strong>não serão</strong> compartilhadas com terceiros para fins
              comerciais, utilizadas em publicidade externa ou cedidas a outras empresas sem
              consentimento expresso adicional.
            </p>
            <p>
              O prestador pode remover suas fotos a qualquer momento acessando <em>Meu Perfil</em>.
              A remoção implica a exclusão da imagem dos servidores em até 30 dias.
            </p>
          </Section>

          {/* 5. Compartilhamento de Dados */}
          <Section icon={Users} title="5. Compartilhamento de Dados com Terceiros">
            <p>Seus dados pessoais podem ser compartilhados <strong>apenas</strong> nas seguintes situações:</p>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li>
                <strong>Outros usuários da plataforma:</strong> dados públicos do prestador (nome,
                foto, categoria, avaliação, cidade) são visíveis a clientes logados ou não.
                Dados do cliente (nome, e-mail) são visíveis ao prestador vinculado a uma solicitação.
              </li>
              <li>
                <strong>Provedor de e-mail (Brevo):</strong> utilizado exclusivamente para envio de
                e-mails transacionais. Não realiza marketing sem consentimento.
              </li>
              <li>
                <strong>Autoridades públicas:</strong> quando exigido por lei, ordem judicial ou
                investigação de fraude.
              </li>
            </ul>
            <p>
              O ServiJá <strong>não vende, não aluga e não comercializa</strong> dados pessoais de
              seus usuários.
            </p>
          </Section>

          {/* 6. Retenção */}
          <Section icon={Lock} title="6. Retenção e Exclusão de Dados">
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li>
                Dados de conta são mantidos enquanto a conta estiver ativa.
              </li>
              <li>
                Após solicitação de exclusão, os dados são anonimizados ou deletados em até
                <strong> 30 dias</strong>, exceto quando houver obrigação legal de retenção
                (ex: registros fiscais — 5 anos).
              </li>
              <li>
                Logs de acesso são mantidos por <strong>6 meses</strong>, conforme exigência
                do Marco Civil da Internet (Art. 15).
              </li>
              <li>
                Fotos são excluídas dos servidores em até 30 dias após a remoção pelo usuário.
              </li>
            </ul>
          </Section>

          {/* 7. Direitos do Titular */}
          <Section icon={Shield} title="7. Seus Direitos como Titular de Dados (Art. 18, LGPD)">
            <p>Você tem direito a:</p>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li><strong>Confirmação</strong> da existência de tratamento dos seus dados</li>
              <li><strong>Acesso</strong> aos dados que temos sobre você</li>
              <li><strong>Correção</strong> de dados incompletos, inexatos ou desatualizados</li>
              <li><strong>Anonimização, bloqueio ou eliminação</strong> de dados desnecessários</li>
              <li><strong>Portabilidade</strong> dos seus dados a outro fornecedor</li>
              <li><strong>Eliminação</strong> dos dados tratados com base no consentimento</li>
              <li><strong>Revogação do consentimento</strong> a qualquer momento</li>
              <li><strong>Oposição</strong> ao tratamento realizado com base em legítimo interesse</li>
              <li>
                <strong>Reclamação</strong> à Autoridade Nacional de Proteção de Dados (ANPD) em{' '}
                <a href="https://www.gov.br/anpd" target="_blank" rel="noopener noreferrer"
                  className="text-blue-600 underline">www.gov.br/anpd</a>
              </li>
            </ul>
            <p>
              Para exercer seus direitos, entre em contato com nosso DPO:{' '}
              <a href={`mailto:${EMAIL_DPO}`} className="text-blue-600 underline">{EMAIL_DPO}</a>
            </p>
          </Section>

          {/* 8. Segurança */}
          <Section icon={Lock} title="8. Segurança da Informação">
            <p>Adotamos medidas técnicas e organizacionais para proteger seus dados:</p>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li>Senhas armazenadas com hash bcrypt (fator de custo 10)</li>
              <li>Autenticação via token JWT com expiração configurada</li>
              <li>Comunicação protegida por HTTPS/TLS</li>
              <li>Acesso ao banco de dados restrito por credenciais e rede interna</li>
              <li>Uploads de imagens validados por tipo MIME e tamanho máximo</li>
            </ul>
            <p>
              Em caso de incidente de segurança que possa afetar seus dados, você será notificado
              conforme previsto no Art. 48 da LGPD, dentro do prazo de 72 horas.
            </p>
          </Section>

          {/* 9. Uso Aceitável */}
          <Section icon={Users} title="9. Termos de Uso da Plataforma">
            <p>Ao utilizar o ServiJá, você concorda em:</p>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li>Fornecer informações verdadeiras, completas e atualizadas</li>
              <li>Não utilizar a plataforma para fins ilegais ou fraudulentos</li>
              <li>Não publicar conteúdo ofensivo, discriminatório ou que viole direitos de terceiros</li>
              <li>Não tentar acessar contas ou dados de outros usuários</li>
              <li>Manter a confidencialidade de sua senha de acesso</li>
              <li>Honrar os acordos firmados com outros usuários através da plataforma</li>
            </ul>
            <p>
              O ServiJá reserva-se o direito de suspender ou encerrar contas que violem estes
              termos, sem aviso prévio, em casos graves.
            </p>
          </Section>

          {/* 10. Contato */}
          <Section icon={Mail} title="10. Contato e Canal de Privacidade">
            <p>Para dúvidas, exercício de direitos ou reclamações relacionadas à privacidade:</p>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-600" />
                <a href={`mailto:${EMAIL_DPO}`} className="text-blue-600 underline">{EMAIL_DPO}</a>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-blue-600" />
                <span>Disponível no site: sevija.com</span>
              </div>
            </div>
            <p>
              Respondemos solicitações em até <strong>15 dias úteis</strong>, conforme Art. 18,
              §5º da LGPD.
            </p>
          </Section>

          {/* 11. Alterações */}
          <Section icon={FileText} title="11. Alterações neste Documento">
            <p>
              Este documento pode ser atualizado periodicamente. Alterações substanciais serão
              comunicadas por e-mail ou notificação na plataforma com pelo menos <strong>15 dias
              de antecedência</strong>. O uso continuado da plataforma após a vigência das
              alterações implica aceitação das novas condições.
            </p>
            <p>
              A versão atual ({VERSAO}) entrou em vigor em <strong>{DATA_VIGENCIA}</strong>.
            </p>
          </Section>

        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          ServiJá — Conectando pessoas a serviços de qualidade · Versão {VERSAO} · {DATA_VIGENCIA}
        </p>
      </div>
    </div>
  );
}
