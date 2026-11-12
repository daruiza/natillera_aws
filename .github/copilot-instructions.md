# Instrucciones de Copilot

## Estado del repositorio

Fase previa a la implementación. `backend/` y `frontend/` están vacíos; aún no hay comandos de build, test ni lint. El contenido real es:

- `documentation/requerimientos/requerimientos-natillera.md`: requisitos (alcance, releases, RF-01..RF-14, matriz de permisos, criterios de aceptación). **Fuente de verdad del comportamiento.**
- `documentation/diagramas/natillera-mongo-schema.js` y `natillera-mongo-schema-diagram.md`: esquema MongoDB y diagrama ER. Mantener ambos sincronizados al cambiar el esquema.
- `openspec/`: flujo spec-driven (`openspec/config.yaml`, `schema: spec-driven`). Los cambios van en `openspec/changes/` y las specs principales en `openspec/specs/`.

Los prompts/skills de OpenSpec (`/opsx-propose`, `/opsx-apply`, `/opsx-explore`, `/opsx-archive`, `/opsx-sync`, `/opsx-update`) están replicados en `.github/`, `.kiro/` y `.opencode/`; la CLI es `@fission-ai/openspec` (`openspec --version`). Preferir proponer funcionalidades mediante este flujo. La documentación se escribe en español.

## Arquitectura del dominio (según los requisitos)

"Natillera" = grupo de ahorro. Aplicación multi-natillera en AWS con MongoDB y S3 privado para evidencias.

- **Usuarios**: exactamente un rol *global* (administrador, miembro, prestatario). El administrador accede a todas las natilleras; los permisos son por módulo/opción (listar, crear, editar, eliminar).
- **Membresías**: vinculan un usuario con una natillera (un usuario puede tener varias, independientes). Cada membresía tiene exactamente una **cuenta** de ahorros interna.
- Cada natillera tiene su configuración (aporte mínimo, día de vencimiento por defecto 16, día de notificación) y una o varias **cuentas bancarias propias**, distintas de las cuentas internas y de las cuentas externas de los usuarios.
- Operaciones: aportes, retiros (solicitud → aprobación/rechazo del admin → ejecución manual), préstamos (solicitado → aprobado/rechazado → desembolsado), pagos y transferencias internas (solo dentro de la misma natillera).
- Evidencias: en S3 privado; MongoDB guarda solo la clave del objeto y metadatos.
- Release 1 es manual: la app no ejecuta movimientos bancarios; las integraciones (Bancolombia, luego Nequi, luego Bre-B; DaviPlata después) se agregan una por release.

## Convenciones e invariantes clave

- Moneda **COP**, montos como **enteros en centavos** (máx. dos decimales, p. ej. `minimum_contribution_minor`); nunca usar floats.
- Los saldos se **calculan desde el historial de operaciones confirmadas**, no se almacenan. Las operaciones pendientes o rechazadas no afectan el saldo.
- Los registros financieros nunca se borran físicamente: "eliminar" significa **anular** conservando el historial.
- Toda operación registra quién la hizo y cuándo; referencia/nota opcional. Evidencias: JPG/PNG/PDF, máx. 5 por operación, 10 MiB por archivo y 50 MiB en total.
- Los préstamos usan el **sistema francés** (tasa mensual fija durante todo el plazo, cuota fija). La primera cuota vence un mes después del desembolso; las siguientes el mismo día de cada mes, ajustado al último día en meses cortos (misma regla para los días de vencimiento/notificación del aporte). Sin intereses de mora.
- Recordatorios in-app y por SMS; aviso de cuota un día antes; avisos de mora repetidos hasta el pago. Un préstamo tiene como máximo una prenda opcional con código de barras único, ubicación de custodia y registros de recepción/devolución; se devuelve solo cuando la deuda está saldada.
- Un retiro no puede superar el saldo disponible (aportes/recaudos menos retiros ejecutados).
- Los listados se limitan a la natillera seleccionada y a los permisos del usuario; nunca mezclar datos entre natilleras. Miembros y prestatarios son de solo lectura y ven únicamente sus propios datos. Quien recibe un préstamo debe tener usuario (prestatario).
