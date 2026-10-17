import type { Metadata } from "next";

export const metadata: Metadata = { title: "Política de Privacidade" };

export default function Page() {
  return (
    <>
      <h1>Política de Privacidade</h1>
      <p>Última atualização: outubro de 2026.</p>
      <h2>Quem somos</h2>
      <p>
        O AgendaFlow AI é uma plataforma de agendamento. Para os dados dos clientes finais de cada negócio, o negócio
        (barbearia, salão etc.) é o controlador e o AgendaFlow AI atua como operador, conforme a LGPD (Lei 13.709/2018).
      </p>
      <h2>Dados que coletamos</h2>
      <ul>
        <li>Donos de negócio: nome, e-mail e senha (armazenada apenas como hash).</li>
        <li>Clientes que reservam: nome e telefone, com consentimento marcado no momento da reserva.</li>
        <li>Segurança: endereço de rede convertido em hash, usado só para limitar abusos. Não guardamos o IP em texto.</li>
      </ul>
      <h2>Para que usamos</h2>
      <ul>
        <li>Gerenciar agendamentos e enviar lembretes do horário marcado.</li>
        <li>Mostrar indicadores ao dono do negócio.</li>
        <li>Proteger o serviço contra abuso.</li>
      </ul>
      <h2>Compartilhamento</h2>
      <p>
        Não vendemos dados. Se o negócio ativar o envio automático de lembretes, nome, horário e telefone são enviados à
        WhatsApp Cloud API (Meta) apenas para entregar a mensagem.
      </p>
      <h2>Seus direitos</h2>
      <p>
        Você pode pedir acesso, correção ou exclusão dos seus dados. Clientes finais devem pedir ao negócio onde
        reservaram; donos podem nos contatar pelo canal indicado no rodapé do site.
      </p>
      <h2>Retenção</h2>
      <p>Mantemos os dados enquanto a conta estiver ativa. Você pode pedir a exclusão dos dados do negócio a qualquer momento (ainda não há botão de exclusão na conta; o pedido é manual).</p>
    </>
  );
}
