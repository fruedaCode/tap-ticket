import type { LegalDocs } from './index'
import { COMPANY } from './company'

const AEPD = (
  <a href="https://www.aepd.es" target="_blank" rel="noreferrer">
    www.aepd.es
  </a>
)

export const es: LegalDocs = {
  privacy: {
    title: 'Política de privacidad',
    body: (
      <>
        <p>
          Esta política explica qué datos personales recoge TapTicket, para qué y qué puedes hacer al
          respecto. Está redactada conforme al Reglamento General de Protección de Datos (RGPD) y a
          la Ley Orgánica 3/2018 (LOPDGDD).
        </p>

        <h2>1. Quién responde de tus datos</h2>
        <p>
          Responsable del tratamiento: {COMPANY.name}, NIF {COMPANY.taxId}, {COMPANY.address}.
          Contacto de privacidad:{' '}
          <a href={`mailto:${COMPANY.privacyEmail}`}>{COMPANY.privacyEmail}</a>.
        </p>

        <h2>2. Qué datos recogemos</h2>
        <ul>
          <li>
            <strong>Cuenta:</strong> tu correo electrónico, nombre visible, avatar (tomado de tu
            cuenta de Google si accedes con Google) y el idioma que hayas elegido.
          </li>
          <li>
            <strong>Tickets:</strong> la foto que haces del ticket y el restaurante, los artículos,
            los precios y los totales extraídos de ella.
          </li>
          <li>
            <strong>Reparto:</strong> a qué tickets perteneces, qué artículos has reclamado y el
            saldo que debes o que te deben.
          </li>
          <li>
            <strong>Liquidaciones:</strong> los pagos que marcas como realizados y el justificante de
            pago que subas, si lo subes.
          </li>
          <li>
            <strong>Facturación:</strong> tu plan y los identificadores de cliente y suscripción de
            Stripe. Los números de tarjeta nunca llegan a nuestros servidores: los recoge y los
            custodia Stripe.
          </li>
          <li>
            <strong>Analítica, solo si la aceptas:</strong> páginas visitadas, acciones dentro de la
            app, tipo de navegador y dispositivo, ubicación aproximada derivada de tu dirección IP y
            un identificador seudónimo. Si la rechazas, no se recoge nada de esto.
          </li>
          <li>
            <strong>Registros técnicos:</strong> el servidor guarda errores y metadatos de las
            peticiones necesarios para mantener el servicio en funcionamiento y seguro.
          </li>
        </ul>

        <h2>3. Para qué los usamos y con qué base legal</h2>
        <ul>
          <li>
            Para crear tu cuenta, leer tus tickets, repartir cuentas y permitirte compartirlas con
            otras personas: <strong>ejecución de un contrato</strong> (art. 6.1.b RGPD).
          </li>
          <li>
            Para cobrar los planes de pago y emitir los registros correspondientes:{' '}
            <strong>contrato</strong> y <strong>obligación legal</strong> (art. 6.1.b y 6.1.c).
          </li>
          <li>
            Para medir cómo se usa la app y mejorarla: <strong>tu consentimiento</strong> (art.
            6.1.a), que puedes retirar cuando quieras.
          </li>
          <li>
            Para mantener el servicio seguro, prevenir abusos y depurar fallos:{' '}
            <strong>interés legítimo</strong> (art. 6.1.f).
          </li>
        </ul>

        <h2>4. Quién más trata tus datos</h2>
        <p>
          Utilizamos los siguientes proveedores. Cada uno actúa como encargado del tratamiento
          siguiendo nuestras instrucciones y al amparo de un contrato de encargo del tratamiento:
        </p>
        <ul>
          <li>
            <strong>Supabase</strong>: base de datos, autenticación y almacenamiento de archivos
            (región UE).
          </li>
          <li>
            <strong>Mistral AI (Francia)</strong>: lee la foto de tu ticket con un modelo documental
            de IA. Solo se envían la foto y una instrucción fija; no se envían tu nombre, tu correo
            ni el identificador de tu cuenta. Mistral declara que los datos enviados a través de su
            API no se usan para entrenar sus modelos.
          </li>
          <li>
            <strong>Stripe</strong>: procesamiento de pagos de los planes de pago.
          </li>
          <li>
            <strong>PostHog (nube UE)</strong>: analítica de producto. Solo funciona si aceptas la
            analítica.
          </li>
          <li>
            <strong>Google</strong>: solo si eliges acceder con Google.
          </li>
          <li>
            <strong>Fly.io</strong>: alojamiento de la aplicación, región de París.
          </li>
        </ul>
        <p>
          Nunca vendemos tus datos ni los cedemos con fines publicitarios. Las personas con las que
          compartes un ticket ven tu nombre visible, tu avatar, los artículos que has reclamado y tu
          saldo en ese ticket; no ven tu dirección de correo electrónico.
        </p>

        <h2>5. Dónde se tratan tus datos</h2>
        <p>
          Todo el tratamiento se realiza dentro de la Unión Europea, incluida la lectura de tu ticket
          por IA. No transferimos tus datos personales fuera de la UE ni del EEE.
        </p>

        <h2>6. Cuánto tiempo los conservamos</h2>
        <ul>
          <li>
            Tickets, repartos y liquidaciones: hasta que los borres o hasta que elimines tu cuenta.
          </li>
          <li>Datos de cuenta: hasta que elimines tu cuenta, momento en el que se suprimen.</li>
          <li>
            Registros de facturación: durante el plazo que exijan la normativa fiscal y contable
            española.
          </li>
          <li>Analítica: según los plazos de conservación estándar de PostHog.</li>
        </ul>

        <h2>7. Tus derechos</h2>
        <p>
          Tienes derecho a acceder, rectificar, suprimir, limitar y oponerte al tratamiento de tus
          datos, derecho a la portabilidad y derecho a retirar tu consentimiento en cualquier momento,
          sin que ello afecte al tratamiento ya realizado.
        </p>
        <ul>
          <li>
            <strong>Acceso y portabilidad:</strong> en Cuenta → <em>Descargar mis datos</em> obtienes
            al instante una copia en JSON legible por máquina.
          </li>
          <li>
            <strong>Rectificación:</strong> edita tu nombre visible en Cuenta; edita cualquier ticket
            desde su pantalla.
          </li>
          <li>
            <strong>Supresión:</strong> en Cuenta → <em>Eliminar cuenta</em> se borran de forma
            permanente tu cuenta, tus tickets, tus imágenes y tus justificantes de pago.
          </li>
          <li>
            <strong>Retirar el consentimiento de analítica:</strong> en la{' '}
            <a href="/legal/cookies">política de cookies</a>.
          </li>
          <li>
            <strong>Cualquier otra cosa:</strong> escribe a{' '}
            <a href={`mailto:${COMPANY.privacyEmail}`}>{COMPANY.privacyEmail}</a>.
          </li>
        </ul>
        <p>
          Si crees que hemos tratado mal tus datos, puedes reclamar ante la Agencia Española de
          Protección de Datos, C/ Jorge Juan 6, 28001 Madrid ({AEPD}).
        </p>

        <h2>8. Inteligencia artificial</h2>
        <p>
          TapTicket usa un modelo de visión por IA para leer la foto de tu ticket y convertirla en una
          lista de artículos y precios. La extracción es automática y{' '}
          <strong>puede equivocarse</strong>: puedes revisar y editar cada artículo antes de compartir
          un ticket, y conviene que lo hagas. No se toma de forma automatizada ninguna decisión con
          efectos jurídicos o similares sobre ti (art. 22 RGPD). En la pantalla de escaneo te
          avisamos, antes de enviar la foto, de que la procesará una IA.
        </p>

        <h2>9. Edad</h2>
        <p>TapTicket no está dirigido a menores de 14 años.</p>

        <h2>10. Cambios</h2>
        <p>
          Si modificamos esta política actualizaremos la fecha que aparece al principio de la página
          y, en cambios relevantes, te avisaremos dentro de la app.
        </p>
      </>
    ),
  },

  terms: {
    title: 'Términos del servicio',
    body: (
      <>
        <h2>1. Con quién contratas</h2>
        <p>
          TapTicket está operado por {COMPANY.name}, NIF {COMPANY.taxId}, {COMPANY.address}, contacto{' '}
          <a href={`mailto:${COMPANY.contactEmail}`}>{COMPANY.contactEmail}</a>. Al usar TapTicket
          aceptas estos términos.
        </p>

        <h2>2. El servicio</h2>
        <p>
          TapTicket te permite fotografiar un ticket de restaurante, extrae sus líneas mediante un
          modelo de IA y te deja compartir el resultado para que las personas que te acompañaban
          reclamen lo que tomaron y vean cuánto debe cada una.
        </p>

        <h2>3. Tu cuenta</h2>
        <p>
          Necesitas una cuenta, creada con un correo válido o con acceso mediante Google. Debes tener
          al menos 14 años. Mantén el acceso a tu correo protegido: quien lo tenga puede entrar como
          tú.
        </p>

        <h2>4. Planes y pago</h2>
        <p>
          El plan gratuito tiene un límite semanal de escaneos. Los planes de pago se facturan
          mensualmente a través de Stripe y se renuevan automáticamente hasta que los canceles. Puedes
          cancelar cuando quieras desde la pantalla de Cuenta; la cancelación surte efecto al final del
          periodo ya pagado y no reembolsamos el resto de un periodo iniciado. Los precios incluyen el
          IVA cuando corresponda.
        </p>
        <p>
          Al suscribirte solicitas que la prestación comience de inmediato y reconoces que pierdes el
          derecho de desistimiento de 14 días una vez el servicio se ha prestado por completo en ese
          periodo.
        </p>

        <h2>5. Uso aceptable</h2>
        <p>Te comprometes a no:</p>
        <ul>
          <li>subir imágenes que no sean un ticket o un justificante de pago;</li>
          <li>subir datos personales de terceros sin un motivo para hacerlo;</li>
          <li>
            intentar acceder a tickets a los que no te han invitado ni sondear el servicio en busca de
            vulnerabilidades;
          </li>
          <li>usar el servicio para infringir la ley o de forma que lo degrade para los demás.</li>
        </ul>

        <h2>6. Tu contenido</h2>
        <p>
          Los tickets e imágenes que subes siguen siendo tuyos. Nos concedes únicamente el permiso
          necesario para almacenarlos y tratarlos con el fin de que el servicio funcione —incluido el
          envío de la foto del ticket a nuestro proveedor de IA— y para mostrarlos a las personas con
          las que compartes el ticket.
        </p>

        <h2>7. Precisión de la IA: revisa el resultado</h2>
        <p>
          La extracción de artículos la realiza automáticamente un modelo de IA y{' '}
          <strong>puede contener errores</strong>: precios equivocados, líneas ausentes, cantidades mal
          leídas. Los totales y saldos que muestra TapTicket son tan buenos como esa extracción. Eres
          responsable de revisar y corregir un ticket antes de fiarte de él o compartirlo, y TapTicket
          no responde del dinero liquidado sobre la base de un resultado no revisado.
        </p>

        <h2>8. Disponibilidad</h2>
        <p>
          Trabajamos para mantener TapTicket disponible, pero no garantizamos un servicio
          ininterrumpido. Las funcionalidades pueden cambiar y podemos suspender o discontinuar el
          servicio, avisando cuando sea razonable.
        </p>

        <h2>9. Responsabilidad</h2>
        <p>
          En la medida en que lo permita la ley, no respondemos de daños indirectos o consecuenciales
          ni de pérdidas derivadas de tu uso del servicio. Nada de lo aquí dispuesto limita la
          responsabilidad que no puede limitarse legalmente, incluidas el dolo y la culpa grave, ni
          tus derechos como consumidor.
        </p>

        <h2>10. Fin del contrato</h2>
        <p>
          Puedes dejar de usar TapTicket y eliminar tu cuenta cuando quieras desde la pantalla de
          Cuenta. Podemos suspender o cerrar una cuenta que incumpla estos términos.
        </p>

        <h2>11. Ley aplicable y controversias</h2>
        <p>
          Estos términos se rigen por la legislación española. Si eres consumidor, puedes demandar
          ante los tribunales de tu lugar de residencia y también puedes acudir a la plataforma de
          resolución de litigios en línea de la Comisión Europea en{' '}
          <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noreferrer">
            ec.europa.eu/consumers/odr
          </a>
          .
        </p>
      </>
    ),
  },

  cookies: {
    title: 'Política de cookies',
    body: (
      <>
        <p>
          TapTicket guarda una pequeña cantidad de datos en tu navegador. Casi todos son
          estrictamente necesarios para que la app funcione y no requieren tu consentimiento. La
          analítica es la única parte opcional y solo se activa si la aceptas.
        </p>

        <h2>Estrictamente necesarias</h2>
        <ul>
          <li>
            <strong>Cookies de sesión (<code>sb-*</code>)</strong>: las establece Supabase para
            mantenerte con la sesión iniciada. Se eliminan al cerrar sesión o al caducar.
          </li>
          <li>
            <strong><code>lang</code> (almacenamiento local)</strong>: recuerda el idioma que has
            seleccionado.
          </li>
          <li>
            <strong><code>tt-consent</code> (almacenamiento local)</strong>: recuerda si aceptaste o
            rechazaste la analítica, junto con la fecha en que lo elegiste, para no volver a
            preguntártelo. Caduca a los 24 meses. Tu elección se conserva 24
            meses; después te lo volvemos a preguntar.
          </li>
          <li>
            <strong>Caché del service worker</strong>: guarda la estructura de la app para que
            TapTicket cargue rápido y funcione sin conexión. No contiene datos personales.
          </li>
        </ul>

        <h2>Analítica: opcional</h2>
        <ul>
          <li>
            <strong>PostHog (<code>ph_*</code>)</strong>: registra qué pantallas visitas y qué
            acciones realizas para que sepamos qué mejorar. Alojado en la UE. No se envía nada hasta
            que lo aceptas, y al rechazarlo se borra lo que PostHog haya guardado en tu navegador.
          </li>
        </ul>

        <h2>Tu elección</h2>
        <p>
          Puedes cambiar de opinión cuando quieras con los botones de abajo. Rechazar es tan fácil
          como aceptar, y rechazar no limita ninguna parte de la app. Tu elección no dura para
          siempre: pasados 24 meses volveremos a preguntártela, y mientras tanto no se activa
          ninguna analítica.
        </p>
      </>
    ),
  },

  'aviso-legal': {
    title: 'Aviso legal',
    body: (
      <>
        <p>
          Información exigida por el artículo 10 de la Ley 34/2002 de servicios de la sociedad de la
          información y de comercio electrónico (LSSI-CE).
        </p>

        <h2>Titular</h2>
        <ul>
          <li>Denominación: {COMPANY.name}</li>
          <li>NIF: {COMPANY.taxId}</li>
          <li>Domicilio: {COMPANY.address}</li>
          <li>
            Correo electrónico:{' '}
            <a href={`mailto:${COMPANY.contactEmail}`}>{COMPANY.contactEmail}</a>
          </li>
          {COMPANY.registry && <li>Datos registrales: {COMPANY.registry}</li>}
        </ul>

        <h2>Objeto</h2>
        <p>
          Este sitio web y aplicación web progresiva prestan el servicio TapTicket: digitalizar
          tickets de restaurante y repartir la cuenta entre las personas que la compartieron.
        </p>

        <h2>Propiedad intelectual</h2>
        <p>
          El nombre TapTicket, su logotipo, su interfaz, sus textos y su código fuente pertenecen a{' '}
          {COMPANY.name} o a sus licenciantes. No se permite reproducirlos, distribuirlos ni
          transformarlos sin autorización por escrito. Los tickets e imágenes subidos por los usuarios
          siguen siendo de estos.
        </p>

        <h2>Responsabilidad</h2>
        <p>
          No respondemos del contenido de los sitios de terceros enlazados desde TapTicket ni del uso
          que los usuarios hagan del servicio. El uso del servicio se rige por nuestros{' '}
          <a href="/legal/terms">términos del servicio</a> y nuestra{' '}
          <a href="/legal/privacy">política de privacidad</a>.
        </p>

        <h2>Legislación aplicable</h2>
        <p>Este aviso y el uso de este sitio se rigen por la legislación española.</p>
      </>
    ),
  },
}
