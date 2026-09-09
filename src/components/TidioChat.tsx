import Script from "next/script";

const TIDIO_PUBLIC_KEY = "todf3wkwbrbh4qcq3tohho6urcron903";

export default function TidioChat() {
  return (
    <>
      <Script id="gray-jay-tidio-config" strategy="afterInteractive">
        {`document.tidioChatCode = ${JSON.stringify(TIDIO_PUBLIC_KEY)};`}
      </Script>
      <Script id="gray-jay-tidio-chat" src={`/api/integrations/tidio/${TIDIO_PUBLIC_KEY}.js`} strategy="lazyOnload" />
    </>
  );
}
