# Decisiones arquitectónicas: Natillera

Este documento registra las decisiones técnicas de la aplicación. El comportamiento funcional sigue definido en [requerimientos-natillera.md](../requerimientos/requerimientos-natillera.md) y el modelo de datos en [natillera-mongo-schema.js](../diagramas/natillera-mongo-schema.js).

Estados: **Aceptada** (decidida), **Propuesta** (recomendación pendiente de confirmar) y **Pendiente** (sin decidir).

## Resumen

| ID | Decisión | Estado |
|---|---|---|
| AD-01 | AWS serverless en `us-east-1`, un solo ambiente | Aceptada |
| AD-02 | Backend con Lambdas en Go, una Lambda por módulo | Propuesta |
| AD-03 | API con API Gateway HTTP API (REST/JSON) | Aceptada |
| AD-04 | App móvil Android con Angular Native (Expo) | Aceptada |
| AD-05 | Autenticación con Amazon Cognito y Google como proveedor federado | Aceptada |
| AD-06 | Base de datos MongoDB Atlas | Aceptada |
| AD-07 | Evidencias en S3 privado con URLs prefirmadas | Propuesta |
| AD-08 | Recordatorios con EventBridge Scheduler, SNS (SMS) y notificaciones push | Aceptada |
| AD-09 | Infraestructura como código con AWS CDK | Aceptada |
| AD-10 | CI/CD del backend; app Android con compilación local | Parcial (app: Aceptada; CI/CD: Propuesta) |
| AD-11 | Desarrollo en dos fases: AWS real para la autenticación y LocalStack después | Aceptada |
| AD-12 | Restricciones de costo | Aceptada |

## AD-01: AWS serverless, `us-east-1`, un solo ambiente

- **Decisión:** toda la infraestructura propia corre en AWS con servicios serverless, en la región `us-east-1`. Habrá un único ambiente.
- **Motivo:** pago por uso y sin servidores que administrar, adecuado para una carga baja y un presupuesto reducido.
- **Consecuencias:** no hay un ambiente de pruebas separado; la infraestructura se puede desplegar y destruir bajo demanda (AD-11), y los cambios se validan primero en local y en CI antes de desplegar. Si más adelante se crea un ambiente de pruebas, el CDK debe parametrizarse por ambiente.

## AD-02: Backend con Lambdas en Go

- **Decisión:** el backend se implementa con funciones AWS Lambda en Go, con el runtime `provided.al2023` y arquitectura `arm64`.
- **Organización recomendada: una Lambda por módulo.** Cada Lambda agrupa las rutas de un módulo funcional y las atiende con un router interno pequeño. Se descartan las otras dos opciones:
  - *Una Lambda por endpoint*: más aislamiento, pero decenas de funciones, permisos y despliegues que aumentan la complejidad sin beneficio a esta escala.
  - *Una sola Lambda con todo*: simple, pero mezcla permisos de todos los módulos y cada cambio redespliega todo.
- **Módulos iniciales (ajustables):** usuarios y permisos, natilleras y membresías, operaciones (aportes, retiros, transferencias y pagos), préstamos y prendas, evidencias y notificaciones.
- **Lambdas adicionales:** una función programada para los recordatorios (AD-08) y los *triggers* de Cognito (AD-05).
- **Estructura del código:** la lógica de dominio vive en paquetes internos compartidos (`internal/`); cada `main.go` solo conecta la Lambda con ese código. Así el dominio se prueba sin AWS y se puede dividir un módulo en otro si crece.
- **Motivo:** Go tiene arranques en frío cortos y binarios pequeños, lo que reduce latencia y costo. Esta granularidad permite aprender el modelo de Lambda sin un exceso de piezas.
- **Reglas del dominio en el backend:** los montos se manejan como enteros en centavos, los saldos se calculan desde las operaciones confirmadas y toda consulta se filtra por la natillera seleccionada y los permisos del usuario, como indican los requisitos.

## AD-03: API Gateway HTTP API (REST/JSON)

- **Decisión:** la app consume una API REST/JSON expuesta con API Gateway HTTP API, que invoca las Lambdas.
- **Autorización:** un *JWT authorizer* valida los tokens emitidos por Cognito (AD-05). La autorización por rol, módulo y natillera se verifica dentro de cada Lambda, porque depende de los datos de la aplicación.
- **Motivo:** HTTP API es más barato y simple que REST API y cubre lo que se necesita.
- **Límites a considerar:** API Gateway limita la carga a 10 MB y Lambda a 6 MB por solicitud síncrona, por lo que los archivos no pasan por la API (AD-07).

## AD-04: App móvil con Angular Native

- **Decisión:** la app es móvil, solo Android en esta fase, construida con [Angular Native](https://ng-native.com/). Angular Native renderiza componentes Angular como vistas nativas reales (sin *web view*) sobre Expo, con Angular Router, signals y CSS/Tailwind.
- **Riesgo principal:** la tecnología está en **alfa**. Pueden cambiar las APIs, faltar paquetes o aparecer errores sin solución documentada.
- **Mitigaciones:**
  - Fijar las versiones exactas de Angular Native, Angular y Expo.
  - Validar al inicio, con una prueba de concepto, el inicio de sesión con Cognito/Google, las notificaciones push y la carga de archivos antes de construir el resto de la app.
  - Mantener la lógica de negocio y los servicios HTTP separados de la capa de vistas para poder cambiar de tecnología de interfaz (por ejemplo, Ionic/Capacitor con Angular) si el riesgo se materializa.
- **iOS:** queda fuera de alcance por ahora, aunque la tecnología lo soporta.
- **A verificar:** si las notificaciones push y el inicio de sesión funcionan en una compilación de desarrollo local (*development build*, `expo run:android`) en lugar de Expo Go; no se usará EAS (AD-10).

## AD-05: Autenticación con Amazon Cognito y Google

Implementa [RF-15](../requerimientos/requerimientos-natillera.md).

- **Decisión:** un *user pool* de Cognito con Google como proveedor federado. La app abre el *Hosted UI* de Cognito en el navegador del sistema y usa el flujo de código de autorización con PKCE. La API valida los tokens de Cognito (AD-03).
- **Solo usuarios existentes:** Cognito crea un usuario en su *pool* al primer ingreso con Google. Para cumplir que solo ingresen usuarios creados por un administrador, un *trigger* *pre sign-up* de Cognito consulta MongoDB y rechaza el ingreso si el correo no pertenece a un usuario activo. Un usuario desactivado también debe rechazarse en la API.
- **Roles y permisos:** siguen en la aplicación (`users.role_id`); Cognito solo autentica.
- **Sesión:** la app conserva los tokens de forma segura en el dispositivo y los renueva con el *refresh token*.
- **Extensibilidad:** otros proveedores se agregan como proveedores federados adicionales.
- **Identificador del usuario:** la API recibe el `sub` de Cognito, no el de Google. En el primer ingreso se guarda ese `sub` en `users.auth_providers.subject` (con `provider: "google"`) y se usa para identificar al usuario en los ingresos posteriores, como establece RF-15.

## AD-06: MongoDB Atlas

- **Decisión:** MongoDB Atlas desplegado en AWS `us-east-1`, con el nivel gratuito o de menor costo mientras alcance.
- **Conexión desde Lambda:** las funciones **no** se colocan en una VPC, para evitar el costo de NAT Gateway. El cliente de MongoDB se crea una vez fuera del *handler* para reutilizar conexiones, con un *pool* pequeño para no saturar el límite de conexiones del clúster.
- **Seguridad:** Lambda no tiene IP fija sin NAT, por lo que el acceso de red a Atlas queda abierto (`0.0.0.0/0`) y la protección recae en usuario con privilegios mínimos, TLS y credenciales en AWS Systems Manager Parameter Store (`SecureString`). Alternativas más seguras pero más costosas (PrivateLink o NAT con IP fija) quedan descartadas por costo; la autenticación con IAM de AWS que ofrece Atlas puede evaluarse para eliminar la contraseña.
- **Respaldos:** definir según el nivel de Atlas elegido, dado que los datos financieros no se borran físicamente.

## AD-07: Evidencias en S3 privado

- **Decisión:** la app sube y descarga las evidencias directamente a S3 con URLs prefirmadas de corta duración, que genera la API. MongoDB guarda solo la clave y los metadatos.
- **Motivo:** el límite de 10 MiB por archivo supera lo que admiten Lambda y API Gateway por solicitud.
- **Validaciones:** tipos JPG, PNG y PDF, hasta 5 archivos por operación, 10 MiB por archivo y 50 MiB en total. El tipo y el tamaño por archivo se restringen en la URL prefirmada; el límite de cantidad y total lo valida la API al registrar la evidencia.
- **Seguridad:** bucket privado, con bloqueo de acceso público y cifrado en reposo.

## AD-08: Recordatorios y notificaciones

Implementa RF-09 y RF-12.

- **Decisión:** EventBridge Scheduler ejecuta cada día una Lambda en la zona horaria `America/Bogota`. Esa Lambda calcula los avisos del día (aportes por vencer, cuotas de mañana, cuotas vencidas) y los envía por tres canales: notificación in-app (guardada en MongoDB), SMS con Amazon SNS y notificación push.
- **Cálculo de fechas:** se programa una ejecución diaria, y no una regla por día de mes, porque la Lambda aplica la regla del último día del mes para días inexistentes.
- **Idempotencia:** el envío debe registrarse para no repetir un aviso si la función se reintenta.
- **Push:** Amazon SNS con Firebase Cloud Messaging (FCM) para Android. Requiere un proyecto de Firebase y registrar el token del dispositivo en el backend.
- **A verificar antes de implementar:**
  - SNS SMS parte en modo *sandbox* y exige salir de él; hay que confirmar los requisitos de registro y el costo de enviar SMS a números de Colombia (+57).
  - Dónde se almacenan los tokens push de los dispositivos; el esquema actual no los contempla.

## AD-09: Infraestructura como código con AWS CDK

- **Decisión:** toda la infraestructura (API Gateway, Lambdas, Cognito, S3, EventBridge Scheduler, SNS y permisos) se define con AWS CDK.
- **Lenguaje:** el CDK se escribe en TypeScript, por ser el lenguaje con más documentación, ejemplos y soporte de la comunidad, lo que facilita el aprendizaje, y por coincidir con el lenguaje de la app móvil. Se descartó Go para el CDK porque Node.js es necesario de todas formas y la API de Go es más verbosa y menos documentada.
- **Consecuencias:**
  - El repositorio usa Go (Lambdas) y TypeScript (infraestructura y app móvil). Node.js es necesario para el CLI de CDK (`cdk`) y para `cdklocal` (AD-11).
  - Los binarios de las Lambdas en Go se compilan antes del `synth` (`GOOS=linux GOARCH=arm64`, ejecutable `bootstrap`) y se empaquetan como *asset* en el runtime `provided.al2023`. `NodejsFunction` no aplica; se usa `lambda.Function` con `Code.fromAsset` sobre el binario compilado, sin el módulo alfa `aws-lambda-go-alpha`.
  - No se reutilizan tipos entre las Lambdas y el CDK; los nombres de recursos se pasan a las Lambdas como variables de entorno.

## AD-10: CI/CD

- **Decisión:** habrá integración y despliegue continuos para el backend y la infraestructura. La app Android **no** se compila en CI: se compila de forma local.
- **Propuesta (backend e infraestructura):** GitHub Actions con autenticación hacia AWS mediante OIDC (sin claves de larga duración). En cada *pull request*: pruebas y análisis de Go, y `cdk synth`. Al fusionar a `main`: despliegue al único ambiente, idealmente con una aprobación manual por tratarse de datos financieros.
- **App Android (decidido): compilación local.** La app se construye en la máquina del desarrollador con el flujo de compilación nativa de Expo (`expo prebuild` / `expo run:android`) y las herramientas de Android (Android SDK y Gradle). No se usa EAS Build, lo que evita su costo y dependencia externa.
- **Consecuencias:**
  - Cada desarrollador que compile necesita instalar el Android SDK, un JDK compatible y Node.js.
  - La clave de firma (*keystore*) de la app no se versiona en el repositorio; se guarda fuera de él en un lugar seguro y con copia de respaldo, porque perderla impide publicar actualizaciones de la misma app.
  - Las compilaciones no son reproducibles en CI; la versión y el número de compilación se registran manualmente al generar cada entrega.
  - En CI solo podrían ejecutarse las pruebas de componentes de la app (en Node, sin simulador), sin generar el APK.
- **Pendiente:** cómo se entrega la app a los usuarios (instalación directa del APK o publicación en Google Play) y la estrategia de versiones.

## AD-11: Desarrollo en dos fases: AWS real para la autenticación y LocalStack después

- **Decisión:** el desarrollo avanza en dos fases, y el CDK (AD-09) es el mecanismo común: la misma infraestructura debe poder **desplegarse, probarse y destruirse** con un comando, tanto en AWS como en LocalStack.
  1. **Fase 1: autenticación en AWS real.** Mientras se desarrolla el inicio de sesión (AD-05) se trabaja contra AWS (`us-east-1`), porque Cognito con Google, el *Hosted UI* y el *trigger* *pre sign-up* no se pueden validar de extremo a extremo en un emulador. En esta fase MongoDB es Atlas, porque el *trigger* necesita consultar los usuarios.
  2. **Fase 2: LocalStack.** Cuando la autenticación esté estable, el resto del desarrollo continúa en local con [LocalStack](https://www.localstack.cloud/), desplegando el mismo CDK con `cdklocal` y MongoDB en un contenedor. Esto evita costos y no depende de la red.
- **Principio de diseño del CDK:** desde el inicio debe permitir desplegar, probar y destruir sin intervención manual.
  - Comandos equivalentes para AWS y para local (`cdk deploy` / `cdk destroy` y `cdklocal deploy` / `cdklocal destroy`), expuestos como scripts del repositorio.
  - Los recursos con datos (bucket S3 de evidencias, grupos de logs) se crean con política de eliminación `DESTROY` y borrado automático de objetos en la fase de desarrollo, para que `destroy` no deje residuos que sigan cobrando.
  - Sin pasos manuales dentro de AWS que se pierdan al destruir. La configuración externa que el CDK no controla (cliente OAuth de Google, clúster de Atlas) queda documentada y sus secretos fuera del repositorio.
  - Los valores propios de cada entorno (nombre de dominio de Cognito, URLs de retorno, endpoints) se parametrizan; no se escriben fijos en los *stacks*.
- **Qué se prueba en local (fase 2):** API Gateway, Lambdas, S3, SNS y EventBridge Scheduler. En local, la autenticación se sustituye por tokens de prueba o un *authorizer* simulado.
- **Consideraciones sobre destruir y recrear:**
  - **El `sub` de Cognito cambia si se recrea el *user pool*.** AD-05 y RF-15 guardan ese `sub` en `users.auth_providers.subject`, así que tras recrear el *pool* los usuarios vinculados dejarían de coincidir. Mientras el entorno sea de desarrollo, se acepta volver a vincular en el primer ingreso (por correo); si el sistema pasa a producción, el *user pool* debe separarse en un *stack* propio con política `RETAIN` para que no se destruya con el resto.
  - **El dominio de Cognito debe ser estable.** Google exige registrar la URL de retorno del *Hosted UI* (`https://<prefijo>.auth.us-east-1.amazoncognito.com/oauth2/idpresponse`). Si el prefijo cambia en cada despliegue, hay que actualizar el cliente de Google; se usa un prefijo fijo (único por región) para que no cambie.
  - **MongoDB Atlas no lo gestiona el CDK:** `destroy` no lo elimina ni lo vacía; sigue activo en su nivel gratuito o de menor costo (AD-06).
- **Limitaciones de LocalStack:**
  - Requiere una cuenta y un *auth token*; el uso no comercial corresponde al plan Hobby, y el plan define qué servicios están disponibles.
  - Hay que **confirmar la cobertura de Cognito, EventBridge Scheduler y SNS** en el plan que se use.
  - El envío real de SMS y push no se emula con fidelidad; se prueba contra AWS.

## AD-12: Restricciones de costo

- **Decisión:** priorizar servicios de pago por uso y de bajo costo.
- **Medidas:**
  - Lambdas `arm64` con la memoria mínima suficiente.
  - Sin VPC ni NAT Gateway (AD-06).
  - Retención corta de logs de CloudWatch (por ejemplo, 14 días).
  - HTTP API en lugar de REST API.
  - Parameter Store en lugar de Secrets Manager para credenciales.
  - AWS Budgets con alertas.
  - MongoDB Atlas en el nivel más bajo que cubra la carga.
  - Desplegar en AWS solo cuando haga falta y destruir al terminar (AD-11).
- **A estimar:** el costo mensual de SMS, que depende del número de miembros y de avisos de mora repetidos.

## Decisiones pendientes

1. Detalle de CI/CD del backend y entrega de la app Android a los usuarios (AD-10).
2. Requisitos y costo del SMS a Colombia con SNS, y almacenamiento de tokens push (AD-08).
3. Cobertura de LocalStack para Cognito, Scheduler y SNS según el plan (AD-11).
4. Si el *user pool* de Cognito se separa en un *stack* persistente antes de producción (AD-11).
5. Confirmar la organización de Lambdas por módulo (AD-02) y la estrategia de URLs prefirmadas para evidencias (AD-07).
