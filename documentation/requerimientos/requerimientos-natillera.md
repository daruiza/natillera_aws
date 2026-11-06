# Requisitos iniciales: de Natillera

Estado: borrador para validar con el usuario.

## Objetivo

Construir una aplicación para administrar varias natilleras y sus operaciones básicas: miembros, aportes, retiros, préstamos, pagos y reportes.

## Alcance confirmado

- La aplicación podrá manejar varias natilleras.
- Cada usuario tendrá exactamente un rol global para toda la aplicación; se contemplan administrador, miembro y prestatario.
- El rol administrador tendrá acceso global a todas las natilleras.
- Toda persona que reciba un préstamo deberá tener un usuario y poder ingresar al sistema como prestatario.
- Los permisos de cada rol corresponderán a los módulos y opciones habilitados en la aplicación.
- Un usuario podrá pertenecer a varias natilleras mediante membresías independientes.
- Cada membresía tendrá exactamente una cuenta interna de ahorros dentro de esa natillera.
- Cada natillera tendrá una o varias cuentas bancarias propias donde recibe y mantiene el recaudo. Bancolombia será el primer banco para la integración transaccional.
- Cada natillera configurará su propio monto mínimo, día de vencimiento y día de notificación mensual para los aportes. El día de vencimiento predeterminado será el 16; ambos días podrán configurarse por natillera. Si un día configurado no existe en un mes corto, se usará el último día de ese mes. Los recordatorios se enviarán in-app y por SMS al teléfono del miembro.
- Los retiros se solicitarán al administrador, quien podrá aprobarlos o rechazarlos. Una solicitud aprobada se ejecutará después; en Release 1 la ejecución será manual.
- Los préstamos seguirán el flujo solicitado → aprobado o rechazado → desembolsado. Cada préstamo tendrá una tasa mensual fija durante todo su plazo; la tasa y el plazo se definirán individualmente. Se calculará con el sistema francés, de cuota periódica fija compuesta por intereses y abono a capital.
- Un préstamo podrá tener como máximo una prenda opcional. Al recibir el objeto, el sistema le asignará un código de barras único para identificarlo y localizarlo; se registrarán su descripción, ubicación de custodia, fecha y responsable de recepción. El objeto permanecerá en custodia hasta que la deuda quede saldada; se registrarán la fecha y el responsable de su devolución.
- Las cuotas de los préstamos serán mensuales. La primera vencerá un mes después de la fecha de desembolso y las siguientes en el mismo día del mes; si ese día no existe, vencerán el último día del mes. Se notificará al prestatario un día antes de cada vencimiento. Los avisos de cuotas vencidas se enviarán simultáneamente in-app y por SMS; podrán repetirse mientras el pago siga pendiente y se detendrán al registrarse el pago. Los atrasos no generarán intereses de mora.
- El usuario podrá registrar cuentas bancarias externas con banco y número de cuenta para usarlas en consignaciones desde la aplicación. Estas cuentas son distintas de las cuentas internas de la natillera.
- Los módulos iniciales serán usuarios, inicio (home), préstamos vigentes y cuenta de ahorros. En los módulos de gestión estarán disponibles las opciones listar, crear, editar y eliminar, según los permisos del rol. En operaciones financieras, eliminar significará anular conservando el historial.
- El MVP permitirá crear usuarios.
- El MVP permitirá asignar usuarios y cuentas.
- El MVP incluirá aportes, retiros, préstamos, pagos y listados de las entidades.
- La moneda de las operaciones será COP.
- Bancolombia será el primer banco priorizado para una integración futura; las integraciones se incorporarán una por una.
- Después de Bancolombia, las siguientes integraciones priorizadas serán Nequi y luego Bre-B.
- DaviPlata también se integrará en un release futuro; Davivienda no está contemplado.
- Los montos admitirán hasta dos cifras decimales y se almacenarán como enteros en centavos para evitar errores de redondeo.
- En Release 1, las operaciones de dinero se registrarán manualmente; los saldos se calcularán desde el historial de operaciones confirmadas.
- Se permitirán transferencias entre cuentas internas de una misma natillera. Cada transferencia identificará la cuenta de origen, la cuenta de destino y el monto; solo al confirmarse debitará el origen y acreditará el destino.
- No habrá métodos de pago integrados inicialmente. Las integraciones bancarias se agregarán de una en una en releases posteriores.

## Alcance por release

### Release 1: MVP manual

- Registrar manualmente aportes, retiros, préstamos y pagos/abonos.
- Para una operación realizada directamente en una cuenta bancaria y registrada después en la aplicación, adjuntar el comprobante en JPG, PNG o PDF.
- Mantener el historial de cada operación y calcular los saldos a partir de las operaciones confirmadas.
- Registrar quién hizo cada operación y cuándo; permitir una referencia o nota cuando exista. Para operaciones sin comprobante bancario, la referencia o nota será opcional.
- Permitir adjuntar una o varias evidencias JPG, PNG o PDF. Guardar los archivos en un bucket S3 privado y conservar en MongoDB solo la clave del objeto y sus metadatos.
- Permitir hasta 5 evidencias por operación, con un máximo de 10 MiB por archivo y 50 MiB en total por operación.
- Enviar recordatorios mensuales de aporte dentro de la aplicación y al teléfono del miembro.
- Gestionar solicitudes de retiro con aprobación o rechazo del administrador; registrar el retiro y afectar el saldo solo después de ejecutar y confirmar el movimiento manual.
- Registrar manualmente transferencias entre cuentas internas de una misma natillera, afectando ambas cuentas solo cuando la transferencia se confirme.
- Registrar prendas opcionales de préstamos, asignar un código de barras único, consultar el objeto por ese código y registrar su devolución cuando la deuda esté saldada.
- No ejecutar movimientos bancarios desde la aplicación.

### Releases posteriores: integraciones transaccionales

- Al inicio de cada release no habrá una integración nueva, salvo que se priorice explícitamente.
- Agregar como máximo un método de pago nuevo por release, empezando por el método que se priorice.
- Primera integración prevista: recibir aportes y abonos de usuarios en la cuenta Bancolombia propia de la natillera.
- Para desembolsar préstamos, la aplicación solicitará la transferencia desde esa cuenta Bancolombia hacia la cuenta externa del prestatario, sujeto a las capacidades y autorizaciones de la integración.
- Para futuras integraciones, permitir recaudos hacia una cuenta bancaria propia de la natillera y evaluar desembolsos desde esa cuenta a la cuenta externa del prestatario, según las capacidades del proveedor.
- Delegar en la pasarela correspondiente la autenticación y autorización del pagador; guardar la referencia de la operación y el estado final reportado.
- Al priorizar una pasarela, consultar su documentación oficial para verificar las capacidades de recaudo, desembolso y consulta o notificación de estado; implementar la integración de acuerdo con esa documentación.

## Requisitos funcionales iniciales

- **RF-01: Natilleras múltiples.** La aplicación permitirá registrar y administrar más de una natillera.
- **RF-02: Usuarios.** Un administrador podrá crear usuarios.
- **RF-03: Roles y permisos.** Cada usuario tendrá exactamente un rol global entre administrador, miembro y prestatario. Los permisos se asignarán por módulo y opción, incluyendo listar, crear, editar y eliminar cuando corresponda.
- **RF-04: Acceso de prestatarios.** Toda persona que reciba un préstamo deberá tener un usuario activo para ingresar al sistema y consultar las opciones autorizadas para su rol.
- **RF-05: Membresías.** Un usuario podrá pertenecer a varias natilleras. Cada pertenencia tendrá su estado y fecha de ingreso.
- **RF-06: Cuentas internas.** Cada membresía tendrá exactamente una cuenta de ahorros interna en su natillera.
- **RF-07: Cuentas bancarias de la natillera.** Cada natillera tendrá una o varias cuentas bancarias propias para recibir y mantener su recaudo. Las cuentas se podrán registrar desde Release 1; Bancolombia será el primer banco cuya integración se evaluará para operaciones desde la aplicación.
- **RF-08: Cuentas bancarias externas de usuarios.** Un usuario podrá registrar el banco y número de sus cuentas externas. En Release 1 serán datos de referencia; las operaciones desde o hacia esas cuentas se consideran para Release 2.
- **RF-09: Aportes.** Cada natillera configurará un monto mínimo, un día de vencimiento mensual y un día de notificación mensual para los aportes. El día de vencimiento predeterminado será el 16; ambos días serán configurables por natillera. Si el día configurado no existe en un mes corto, se usará el último día del mes. Los miembros recibirán recordatorios in-app y por SMS. En Release 1, el aporte se registrará manualmente; el recaudo integrado se incorporará en un release futuro.
- **RF-10: Retiros.** El miembro solicitará el retiro y un administrador lo aprobará o rechazará. El monto solicitado no podrá superar el saldo disponible de aportes/recaudos, descontando retiros ya ejecutados. En Release 1, una solicitud aprobada se ejecutará manualmente; el retiro afectará el saldo solo cuando se registre como ejecutado y confirmado.
- **RF-11: Préstamos.** En Release 1, un préstamo asociado a una membresía seguirá los estados solicitado, aprobado o rechazado y desembolsado. Cada préstamo tendrá una tasa mensual fija durante su plazo y un plazo definido individualmente. Podrá tener cero o una prenda; el sistema asignará al objeto recibido un código de barras único y registrará su descripción, ubicación, recepción y devolución. La prenda permanecerá en custodia hasta que el préstamo esté totalmente pagado. En una integración futura, la aplicación solicitará el desembolso desde la cuenta Bancolombia de la natillera hacia una cuenta externa del prestatario, sujeto a las capacidades y autorizaciones disponibles.
- **RF-12: Cuotas y pagos.** Las cuotas serán mensuales y se calcularán con el sistema francés: cada cuota tendrá un valor fijo e incluirá intereses del período y abono a capital. La aplicación notificará al prestatario un día antes de cada vencimiento. Si una cuota vence sin pago, enviará avisos simultáneamente in-app y por SMS; podrá repetirlos hasta que se registre el pago. No se cobrarán intereses de mora. En Release 1, los pagos se registrarán manualmente.
- **RF-13: Listados.** El MVP ofrecerá listados de las entidades, con acceso controlado por los permisos asignados a cada rol. No se requieren reportes analíticos en esta versión.
- **RF-14: Transferencias internas.** En Release 1, un administrador podrá registrar manualmente transferencias entre cuentas internas de una misma natillera. Cada transferencia identificará origen, destino y monto; al confirmarse debitará la cuenta de origen y acreditará la de destino. Las transferencias entre cuentas de natilleras distintas no estarán permitidas.

## Matriz inicial de permisos

| Módulo | Administrador | Miembro | Prestatario |
|---|---|---|---|
| Usuarios | Listar, crear, ver, editar y desactivar usuarios | Ver su propio perfil | Ver su propio perfil |
| Inicio (home) | Ver resumen de todas las natilleras y sus datos | Ver su propio resumen | Ver su propio resumen |
| Préstamos vigentes | Listar, crear, ver, editar y gestionar estados del préstamo | Ver sus propios préstamos | Ver sus propios préstamos |
| Cuenta de ahorros | Listar, crear, ver, editar y gestionar cuentas | Ver su propia cuenta | Ver su propia cuenta, si tiene una membresía asociada |

Los miembros y prestatarios tienen permisos de solo lectura y no pueden consultar registros de otras personas. En los registros financieros, las correcciones se realizan mediante anulación conservando el historial, no mediante borrado físico. Esta matriz es la configuración inicial; los permisos podrán ampliarse al agregar módulos y necesidades.

## Reglas y decisiones pendientes


## Criterios iniciales de aceptación

- Se pueden crear dos natilleras y administrar sus datos por separado.
- Un usuario tiene un único rol global y puede pertenecer a dos natilleras, con una cuenta interna independiente en cada membresía.
- El rol global del usuario se conserva al consultar sus membresías en distintas natilleras.
- Toda persona que recibe un préstamo puede iniciar sesión como prestatario y solo accede a módulos y opciones autorizados para su rol.
- El administrador puede gestionar los módulos de la matriz; miembros y prestatarios solo consultan sus propios datos.
- El administrador puede consultar y gestionar todas las natilleras; los miembros y prestatarios solo acceden a sus propios datos.
- En Release 1, un administrador puede registrar manualmente aportes, retiros, préstamos y pagos/abonos con fecha, monto, cuenta o membresía relacionada y usuario responsable.
- El mínimo, el día de vencimiento y el día de notificación del aporte pueden configurarse por natillera; el vencimiento predeterminado es el 16 y los días inexistentes en meses cortos se ajustan al último día del mes.
- Una solicitud de retiro aprobada o rechazada conserva su resultado; solo un retiro ejecutado y confirmado modifica el saldo.
- Cada préstamo conserva su solicitud y su resultado de aprobación o rechazo; solo pasa a desembolsado cuando se registra la entrega del dinero.
- Cada préstamo conserva su propia tasa mensual, fija durante todo su plazo.
- Un préstamo puede existir sin prenda o tener una sola; cada prenda tiene un código de barras único, puede localizarse por ese código y su devolución se registra solo cuando la deuda está saldada.
- La primera cuota vence un mes después del desembolso; las siguientes vencen mensualmente en el mismo día, ajustándose al último día en meses cortos. Las cuotas se calculan con el sistema francés; el prestatario recibe un aviso un día antes y los avisos de mora se envían simultáneamente in-app y por SMS, pueden repetirse hasta el pago y no generan intereses de mora.
- Un retiro no puede superar el saldo disponible formado por los aportes/recaudos recibidos menos los retiros ya ejecutados.
- Las operaciones registradas manualmente como realizadas directamente en una cuenta bancaria incluyen comprobante en formato JPG, PNG o PDF.
- Los archivos de evidencia se almacenan en S3 privado; MongoDB conserva referencias y metadatos, no el contenido binario.
- Cada operación admite hasta 5 evidencias, con un máximo de 10 MiB por archivo y 50 MiB en total.
- El saldo de una cuenta interna corresponde a sus operaciones confirmadas: aportes y otros abonos menos retiros y otros cargos aplicables.
- Los montos se aceptan con un máximo de dos cifras decimales y se conservan con esa precisión en el historial.
- Una operación pendiente o rechazada no cambia el saldo; las operaciones registradas conservan su historial y no se reemplazan al calcularlo.
- Las operaciones financieras corregidas o anuladas conservan su registro histórico y no se borran físicamente.
- En Release 1, una transferencia interna confirmada debita la cuenta de origen y acredita la cuenta de destino de la misma natillera; no se ejecutan movimientos bancarios desde la aplicación.
- Cada natillera puede registrar una o varias cuentas bancarias propias, diferenciadas de las cuentas de ahorro internas de los miembros y de las cuentas externas de los usuarios.
- Los listados muestran únicamente la información de la natillera seleccionada y respetan los permisos del usuario; no mezclan datos de distintas natilleras.

Estos criterios son preliminares y se deben completar cuando se definan las reglas pendientes.
