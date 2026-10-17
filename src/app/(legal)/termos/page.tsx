import type { Metadata } from "next";

export const metadata: Metadata = { title: "Termos de Uso" };

export default function Page() {
  return (
    <>
      <h1>Termos de Uso</h1>
      <p>Última atualização: outubro de 2026.</p>
      <h2>O serviço</h2>
      <p>O AgendaFlow AI oferece ferramentas de agenda online. O serviço está em desenvolvimento e pode mudar.</p>
      <h2>Sua conta</h2>
      <ul>
        <li>Você é responsável por manter sua senha segura e pelas informações cadastradas.</li>
        <li>Você deve ter autorização dos seus clientes para usar o contato deles, conforme a LGPD.</li>
      </ul>
      <h2>Uso permitido</h2>
      <p>Não é permitido usar o serviço para spam, fraude ou para tentar acessar dados de outros negócios.</p>
      <h2>Planos e cobrança</h2>
      <p>Os planos pagos ainda não foram lançados. Nenhuma cobrança será feita sem aviso prévio e aceite expresso.</p>
      <h2>Disponibilidade e responsabilidade</h2>
      <p>
        Trabalhamos para manter o serviço no ar, mas não garantimos funcionamento ininterrupto. Mantenha uma forma
        alternativa de consultar sua agenda.
      </p>
      <h2>Cancelamento</h2>
      <p>Você pode parar de usar o serviço e pedir a exclusão da conta a qualquer momento (o pedido é manual por enquanto).</p>
    </>
  );
}
