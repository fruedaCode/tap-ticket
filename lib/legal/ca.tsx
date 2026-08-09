import type { LegalDocs } from './index'
import { COMPANY } from './company'

const AEPD = (
  <a href="https://www.aepd.es" target="_blank" rel="noreferrer">
    www.aepd.es
  </a>
)

export const ca: LegalDocs = {
  privacy: {
    title: 'Política de privacitat',
    body: (
      <>
        <p>
          Aquesta política explica quines dades personals recull TapTicket, per a què i què hi pots
          fer. Està redactada d&apos;acord amb el Reglament General de Protecció de Dades (RGPD) i la
          Llei Orgànica 3/2018 (LOPDGDD).
        </p>

        <h2>1. Qui respon de les teves dades</h2>
        <p>
          Responsable del tractament: {COMPANY.name}, NIF {COMPANY.taxId}, {COMPANY.address}.
          Contacte de privacitat:{' '}
          <a href={`mailto:${COMPANY.privacyEmail}`}>{COMPANY.privacyEmail}</a>.
        </p>

        <h2>2. Quines dades recollim</h2>
        <ul>
          <li>
            <strong>Compte:</strong> el teu correu electrònic, nom visible, avatar (pres del teu
            compte de Google si hi accedeixes amb Google) i l&apos;idioma que hagis triat.
          </li>
          <li>
            <strong>Tiquets:</strong> la foto que fas del tiquet i el restaurant, els articles, els
            preus i els totals que se n&apos;extreuen.
          </li>
          <li>
            <strong>Repartiment:</strong> a quins tiquets pertanys, quins articles has reclamat i el
            saldo que deus o que et deuen.
          </li>
          <li>
            <strong>Liquidacions:</strong> els pagaments que marques com a fets i el justificant de
            pagament que hi pugis, si en puges cap.
          </li>
          <li>
            <strong>Facturació:</strong> el teu pla i els identificadors de client i subscripció de
            Stripe. Els números de targeta no arriben mai als nostres servidors: els recull i els
            custodia Stripe.
          </li>
          <li>
            <strong>Analítica, només si l&apos;acceptes:</strong> pàgines visitades, accions dins de
            l&apos;app, tipus de navegador i dispositiu, ubicació aproximada derivada de la teva
            adreça IP i un identificador pseudònim. Si la rebutges, no se&apos;n recull res.
          </li>
          <li>
            <strong>Registres tècnics:</strong> el servidor desa errors i metadades de les peticions
            necessaris per mantenir el servei en funcionament i segur.
          </li>
        </ul>

        <h2>3. Per a què les fem servir i amb quina base legal</h2>
        <ul>
          <li>
            Per crear el teu compte, llegir els teus tiquets, repartir comptes i deixar-te
            compartir-los amb altres persones: <strong>execució d&apos;un contracte</strong> (art.
            6.1.b RGPD).
          </li>
          <li>
            Per cobrar els plans de pagament i emetre&apos;n els registres corresponents:{' '}
            <strong>contracte</strong> i <strong>obligació legal</strong> (art. 6.1.b i 6.1.c).
          </li>
          <li>
            Per mesurar com es fa servir l&apos;app i millorar-la:{' '}
            <strong>el teu consentiment</strong> (art. 6.1.a), que pots retirar quan vulguis.
          </li>
          <li>
            Per mantenir el servei segur, prevenir abusos i depurar errors:{' '}
            <strong>interès legítim</strong> (art. 6.1.f).
          </li>
        </ul>

        <h2>4. Qui més tracta les teves dades</h2>
        <p>
          Fem servir els proveïdors següents. Cadascun actua com a encarregat del tractament seguint
          les nostres instruccions i a l&apos;empara d&apos;un contracte d&apos;encàrrec del
          tractament:
        </p>
        <ul>
          <li>
            <strong>Supabase</strong>: base de dades, autenticació i emmagatzematge de fitxers (regió
            UE).
          </li>
          <li>
            <strong>Groq (Estats Units)</strong>: llegeix la foto del teu tiquet amb un model de visió
            per IA. Només s&apos;hi envien la foto i una instrucció fixa; no s&apos;hi envien el teu
            nom, el teu correu ni l&apos;identificador del teu compte.
          </li>
          <li>
            <strong>Stripe</strong>: processament de pagaments dels plans de pagament.
          </li>
          <li>
            <strong>PostHog (núvol UE)</strong>: analítica de producte. Només funciona si acceptes
            l&apos;analítica.
          </li>
          <li>
            <strong>Google</strong>: només si tries accedir amb Google.
          </li>
          <li>
            <strong>Fly.io</strong>: allotjament de l&apos;aplicació, regió de París.
          </li>
        </ul>
        <p>
          No venem mai les teves dades ni les cedim amb finalitats publicitàries. Les persones amb qui
          comparteixes un tiquet veuen el teu nom visible, el teu avatar, els articles que has
          reclamat i el teu saldo en aquell tiquet; no veuen la teva adreça de correu electrònic.
        </p>

        <h2>5. Transferències fora de la UE</h2>
        <p>
          Les fotos dels tiquets s&apos;envien a Groq, que les processa als Estats Units. La garantia
          adequada d&apos;aquesta transferència, d&apos;acord amb el Capítol V del RGPD, són les
          Clàusules Contractuals Tipus de la Comissió Europea (Decisió d&apos;Execució (UE) 2021/914,
          mòdul responsable-encarregat), incorporades al contracte d&apos;encàrrec del tractament
          subscrit amb Groq. Pots consultar aquest contracte, amb les clàusules mateixes, a{' '}
          <a
            href="https://console.groq.com/docs/legal/customer-data-processing-addendum"
            target="_blank"
            rel="noreferrer"
          >
            console.groq.com/docs/legal/customer-data-processing-addendum
          </a>
          . La resta del tractament es fa dins de la UE.
        </p>

        <h2>6. Quant de temps les conservem</h2>
        <ul>
          <li>
            Tiquets, repartiments i liquidacions: fins que els esborris o fins que eliminis el teu
            compte.
          </li>
          <li>Dades del compte: fins que eliminis el teu compte, moment en què se suprimeixen.</li>
          <li>
            Registres de facturació: durant el termini que exigeixi la normativa fiscal i comptable
            espanyola.
          </li>
          <li>Analítica: segons els terminis de conservació estàndard de PostHog.</li>
        </ul>

        <h2>7. Els teus drets</h2>
        <p>
          Tens dret a accedir, rectificar, suprimir, limitar i oposar-te al tractament de les teves
          dades, dret a la portabilitat i dret a retirar el teu consentiment en qualsevol moment, sense
          que això afecti el tractament ja fet.
        </p>
        <ul>
          <li>
            <strong>Accés i portabilitat:</strong> a Compte → <em>Baixa les meves dades</em> obtens
            a l&apos;instant una còpia en JSON llegible per màquina.
          </li>
          <li>
            <strong>Rectificació:</strong> edita el teu nom visible a Compte; edita qualsevol tiquet
            des de la seva pantalla.
          </li>
          <li>
            <strong>Supressió:</strong> a Compte → <em>Elimina el compte</em> s&apos;esborren de
            manera permanent el teu compte, els teus tiquets, les teves imatges i els teus
            justificants de pagament.
          </li>
          <li>
            <strong>Retirar el consentiment d&apos;analítica:</strong> a la{' '}
            <a href="/legal/cookies">política de galetes</a>.
          </li>
          <li>
            <strong>Qualsevol altra cosa:</strong> escriu a{' '}
            <a href={`mailto:${COMPANY.privacyEmail}`}>{COMPANY.privacyEmail}</a>.
          </li>
        </ul>
        <p>
          Si creus que hem tractat malament les teves dades, pots reclamar davant l&apos;Agencia
          Española de Protección de Datos, C/ Jorge Juan 6, 28001 Madrid ({AEPD}).
        </p>

        <h2>8. Intel·ligència artificial</h2>
        <p>
          TapTicket fa servir un model de visió per IA per llegir la foto del teu tiquet i
          convertir-la en una llista d&apos;articles i preus. L&apos;extracció és automàtica i{' '}
          <strong>es pot equivocar</strong>: pots revisar i editar cada article abans de compartir un
          tiquet, i convé que ho facis. No es pren de manera automatitzada cap decisió amb efectes
          jurídics o similars sobre tu (art. 22 RGPD). A la pantalla d&apos;escaneig t&apos;avisem,
          abans d&apos;enviar la foto, que la processarà una IA.
        </p>

        <h2>9. Edat</h2>
        <p>TapTicket no s&apos;adreça a menors de 14 anys.</p>

        <h2>10. Canvis</h2>
        <p>
          Si modifiquem aquesta política n&apos;actualitzarem la data que apareix al principi de la
          pàgina i, en canvis rellevants, t&apos;avisarem dins de l&apos;app.
        </p>
      </>
    ),
  },

  terms: {
    title: 'Termes del servei',
    body: (
      <>
        <h2>1. Amb qui contractes</h2>
        <p>
          TapTicket està operat per {COMPANY.name}, NIF {COMPANY.taxId}, {COMPANY.address}, contacte{' '}
          <a href={`mailto:${COMPANY.contactEmail}`}>{COMPANY.contactEmail}</a>. En fer servir
          TapTicket acceptes aquests termes.
        </p>

        <h2>2. El servei</h2>
        <p>
          TapTicket et permet fotografiar un tiquet de restaurant, n&apos;extreu les línies mitjançant
          un model d&apos;IA i et deixa compartir el resultat perquè les persones que t&apos;acompanyaven
          reclamin el que van prendre i vegin quant deu cadascuna.
        </p>

        <h2>3. El teu compte</h2>
        <p>
          Necessites un compte, creat amb un correu vàlid o amb accés mitjançant Google. Has de tenir
          com a mínim 14 anys. Mantén protegit l&apos;accés al teu correu: qui el tingui pot entrar
          com tu.
        </p>

        <h2>4. Plans i pagament</h2>
        <p>
          El pla gratuït té un límit setmanal d&apos;escanejos. Els plans de pagament es facturen
          mensualment a través de Stripe i es renoven automàticament fins que els cancel·lis. Pots
          cancel·lar quan vulguis des de la pantalla de Compte; la cancel·lació té efecte al final del
          període ja pagat i no reemborsem la resta d&apos;un període iniciat. Els preus inclouen
          l&apos;IVA quan correspongui.
        </p>
        <p>
          En subscriure&apos;t demanes que la prestació comenci immediatament i reconeixes que perds el
          dret de desistiment de 14 dies un cop el servei s&apos;ha prestat completament en aquell
          període.
        </p>

        <h2>5. Ús acceptable</h2>
        <p>Et compromets a no:</p>
        <ul>
          <li>pujar imatges que no siguin un tiquet o un justificant de pagament;</li>
          <li>pujar dades personals de tercers sense un motiu per fer-ho;</li>
          <li>
            intentar accedir a tiquets als quals no t&apos;han convidat ni sondejar el servei buscant
            vulnerabilitats;
          </li>
          <li>fer servir el servei per infringir la llei o de manera que el degradi per als altres.</li>
        </ul>

        <h2>6. El teu contingut</h2>
        <p>
          Els tiquets i les imatges que puges continuen sent teus. Ens concedeixes únicament el permís
          necessari per emmagatzemar-los i tractar-los perquè el servei funcioni —inclòs l&apos;enviament
          de la foto del tiquet al nostre proveïdor d&apos;IA— i per mostrar-los a les persones amb qui
          comparteixes el tiquet.
        </p>

        <h2>7. Precisió de la IA: revisa el resultat</h2>
        <p>
          L&apos;extracció d&apos;articles la fa automàticament un model d&apos;IA i{' '}
          <strong>pot contenir errors</strong>: preus equivocats, línies absents, quantitats mal
          llegides. Els totals i saldos que mostra TapTicket són tan bons com aquella extracció. Ets
          responsable de revisar i corregir un tiquet abans de fiar-te&apos;n o compartir-lo, i
          TapTicket no respon dels diners liquidats a partir d&apos;un resultat no revisat.
        </p>

        <h2>8. Disponibilitat</h2>
        <p>
          Treballem per mantenir TapTicket disponible, però no garantim un servei ininterromput. Les
          funcionalitats poden canviar i podem suspendre o discontinuar el servei, avisant-ne quan
          sigui raonable.
        </p>

        <h2>9. Responsabilitat</h2>
        <p>
          En la mesura que ho permeti la llei, no responem de danys indirectes o conseqüencials ni de
          pèrdues derivades del teu ús del servei. Res del que s&apos;hi disposa limita la
          responsabilitat que no es pot limitar legalment, incloses el dol i la culpa greu, ni els
          teus drets com a consumidor.
        </p>

        <h2>10. Fi del contracte</h2>
        <p>
          Pots deixar de fer servir TapTicket i eliminar el teu compte quan vulguis des de la pantalla
          de Compte. Podem suspendre o tancar un compte que incompleixi aquests termes.
        </p>

        <h2>11. Llei aplicable i controvèrsies</h2>
        <p>
          Aquests termes es regeixen per la legislació espanyola. Si ets consumidor, pots demandar
          davant els tribunals del teu lloc de residència i també pots acudir a la plataforma de
          resolució de litigis en línia de la Comissió Europea a{' '}
          <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noreferrer">
            ec.europa.eu/consumers/odr
          </a>
          .
        </p>
      </>
    ),
  },

  cookies: {
    title: 'Política de galetes',
    body: (
      <>
        <p>
          TapTicket desa una petita quantitat de dades al teu navegador. Gairebé totes són
          estrictament necessàries perquè l&apos;app funcioni i no requereixen el teu consentiment.
          L&apos;analítica és l&apos;única part opcional i només s&apos;activa si l&apos;acceptes.
        </p>

        <h2>Estrictament necessàries</h2>
        <ul>
          <li>
            <strong>Galetes de sessió (<code>sb-*</code>)</strong>: les estableix Supabase per
            mantenir-te amb la sessió iniciada. S&apos;eliminen en tancar la sessió o en caducar.
          </li>
          <li>
            <strong><code>lang</code> (emmagatzematge local)</strong>: recorda l&apos;idioma que has
            seleccionat.
          </li>
          <li>
            <strong><code>tt-consent</code> (emmagatzematge local)</strong>: recorda si has acceptat o
            rebutjat l&apos;analítica, i la data en què ho vas triar, per no tornar-t&apos;ho a
            preguntar. Caduca al cap de 24 mesos. La teva elecció es
            conserva 24 mesos; després t&apos;ho tornem a preguntar.
          </li>
          <li>
            <strong>Memòria cau del service worker</strong>: desa l&apos;estructura de l&apos;app
            perquè TapTicket carregui ràpid i funcioni sense connexió. No conté dades personals.
          </li>
        </ul>

        <h2>Analítica: opcional</h2>
        <ul>
          <li>
            <strong>PostHog (<code>ph_*</code>)</strong>: registra quines pantalles visites i quines
            accions fas perquè sapiguem què millorar. Allotjat a la UE. No s&apos;hi envia res fins
            que ho acceptes, i en rebutjar-ho s&apos;esborra el que PostHog hagi desat al teu
            navegador.
          </li>
        </ul>

        <h2>La teva elecció</h2>
        <p>
          Pots canviar d&apos;opinió quan vulguis amb els botons de sota. Rebutjar és tan fàcil com
          acceptar, i rebutjar no limita cap part de l&apos;app. La teva elecció no dura per sempre:
          passats 24 mesos t&apos;ho tornarem a preguntar, i mentrestant no s&apos;activa cap
          analítica.
        </p>
      </>
    ),
  },

  'aviso-legal': {
    title: 'Avís legal',
    body: (
      <>
        <p>
          Informació exigida per l&apos;article 10 de la Llei 34/2002 de serveis de la societat de la
          informació i de comerç electrònic (LSSI-CE).
        </p>

        <h2>Titular</h2>
        <ul>
          <li>Denominació: {COMPANY.name}</li>
          <li>NIF: {COMPANY.taxId}</li>
          <li>Domicili: {COMPANY.address}</li>
          <li>
            Correu electrònic:{' '}
            <a href={`mailto:${COMPANY.contactEmail}`}>{COMPANY.contactEmail}</a>
          </li>
          {COMPANY.registry && <li>Dades registrals: {COMPANY.registry}</li>}
        </ul>

        <h2>Objecte</h2>
        <p>
          Aquest lloc web i aplicació web progressiva presten el servei TapTicket: digitalitzar
          tiquets de restaurant i repartir el compte entre les persones que el van compartir.
        </p>

        <h2>Propietat intel·lectual</h2>
        <p>
          El nom TapTicket, el seu logotip, la seva interfície, els seus textos i el seu codi font
          pertanyen a {COMPANY.name} o als seus llicenciadors. No se&apos;n permet la reproducció, la
          distribució ni la transformació sense autorització per escrit. Els tiquets i les imatges
          pujats pels usuaris continuen sent seus.
        </p>

        <h2>Responsabilitat</h2>
        <p>
          No responem del contingut dels llocs de tercers enllaçats des de TapTicket ni de l&apos;ús
          que els usuaris facin del servei. L&apos;ús del servei es regeix pels nostres{' '}
          <a href="/legal/terms">termes del servei</a> i la nostra{' '}
          <a href="/legal/privacy">política de privacitat</a>.
        </p>

        <h2>Legislació aplicable</h2>
        <p>Aquest avís i l&apos;ús d&apos;aquest lloc es regeixen per la legislació espanyola.</p>
      </>
    ),
  },
}
