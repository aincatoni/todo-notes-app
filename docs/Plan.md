# todo-notes-app v2 — Plan de ejecución y estado del proyecto

> **Documento maestro para continuar el trabajo en la siguiente sesión.**
> Rutas clave:
> - Repositorio Expo: `/Users/aincatoni/Universidad/2026/T3/DESARROLLO DE APLICACIONES MÓVILES/Unidad1/Eva1/Entrega/todo-notes-app` (rama `unidad2`, tag base U1: `entrega-u1`)
> - Documentos de referencia: `/Users/aincatoni/Universidad/2026/T3/DESARROLLO DE APLICACIONES MÓVILES/Unidad2/eva/entrega/` y copia en `todo-notes-app/docs/`
> - Capturas en bruto por fase: `/Users/aincatoni/Universidad/2026/T3/DESARROLLO DE APLICACIONES MÓVILES/Unidad2/eva/entrega/capturas/`
> - Comandos de verificación (usar `--bun` con Bun en lugar de `npx`):
>   - `bun test --coverage`
>   - `bun --bun x tsc --noEmit`
>   - `bun --bun x expo lint`

---

## 1. Metodología obligatoria de trabajo

1. **Avance fase por fase con revisión humana en dispositivos físicos (iPhone y OnePlus Android)**:
   - Aplicar TDD estricto (`Red → Green → Refactor`) en `domain/`, `services/`, `storage/` y `api/`.
   - Dejar los cambios de la fase **sin commitear** hasta que el usuario pruebe en ambos teléfonos reales, tome capturas y apruebe el comportamiento.
   - Al aprobar, hacer los commits siguiendo convención `test(...): ...` y `feat(...): ...` como evidencia de TDD en el historial de Git.
2. **Alcance confirmado por el docente (19–20 nov 2026)**:
   - Se evalúa **exclusivamente** la conexión con **APIs internas del dispositivo** (cámara, galería, sistema de archivos privado, GPS, permisos nativos, `AsyncStorage` y `expo-secure-store`), **no** la conexión con servicios web externos.
   - Se mantiene **Autenticación + Registro local de cuentas («Crear cuenta»)** operando **100 % en el dispositivo** sin depender de internet ni backends externos.
   - **Omitidas definitivamente:** sincronización remota REST, importación remota desde DummyJSON y clima Open-Meteo (antiguas Fases 6 y 7 del plan inicial).
   - El informe final se entrega integrado en el mismo `README.md` del repositorio con pantallazos reales de celular.

---

## 2. Registro de avances completados

| Fase | Estado | Commits | Pruebas acumuladas | Evidencia en dispositivo |
|---|---|---|---|---|
| **Preparación** (SDK 58, plugins `app.json`, ESLint 9, `bunfig.toml`) | `[x]` Completada | `733eccc` | Base lista | — |
| **Fase 0 — Red de seguridad sobre la U1** (`taskRules.ts`, `TaskModalContent`, puertos base) | `[x]` Completada | `75b802c` | 13 / 13 | `capturas/fase 0 y fase 1/` |
| **Fase 1 — Núcleo de dominio y almacenamiento** (`validators`, `errors`, `taskStorage v2`, migración U1, puertos) | `[x]` Completada | `4398136` (`test`), `9139c9b` (`feat`) | 81 / 81 | `capturas/fase 0 y fase 1/` |
| **Fase 2 — Permisos incrementales** (`permissionService`, `expoPermissions` con check OS Android, `PermissionRationale` overlay, `usePermissions`) | `[x]` Completada | `8375258` (`test`), `d111a0d` (`feat`) | 91 / 91 | `capturas/fase 2/` (iPhone + OnePlus) |
| **Fase 3 — Cámara, Galería y FileSystem** (`photoService`, `expoCamera`, `fileSystemPhotos`, `PhotoPicker`, `PhotoPreviewModal`) | `[x]` Completada | `dacfb1b` (`test`), `b533362` (`feat`) | 106 / 106 | `capturas/fase 3/iphone/` y `android/` |
| **Fase 4 — GPS, Precisión y Mapas** (`locationService`, `taskEnricher`, `expoLocation` con `enableNetworkProviderAsync` + `watchPositionAsync`, `LocationBadge`) | `[x]` Completada | `2ab4c5f` (`test`), `6414658` (`feat`) | 119 / 119 | `capturas/fase 4/iphone/` y `android/` |
| **Fase 5 — Autenticación local, «Crear cuenta» y multiusuario** | `[x]` Completada | `36d125b` (`test`), `5f5ade8` (`feat`) | 155 / 155 (97.80 % líneas) | `capturas/fase 5/iphone/` y `android/` |
| **Fase 6 — Pulido, optimización (`React.memo`), accesibilidad y regresión** | `[x]` Completada | `0edc8ca` (`perf`) | 155 / 155 (97.80 % líneas) | `capturas/fase 6/iphone/` y `android/` |
| **Fase 7 — Evidencia final y redactar informe en `README.md`** | `[x]` Completada | Pendiente commit final `docs:` | 155 / 155 + 18 capturas en `Capturas/u2/` | `Capturas/u2/` + `README.md` |

---

## 3. Detalle exacto de lo que YA está hecho en la Fase 5 (árbol de trabajo actual, sin commit)

Actualmente en el working tree (verificable con `git status --short`, **147 pruebas pasando, 97.57 % líneas**, `tsc` y `expo lint` en 0 errores):
- Fakes: `FakeSecureStore.ts`, `FakeNetwork.ts`, `fakeFetch.ts`.
- Pruebas en verde: `http.test.ts`, `authApi.test.ts` (incluye `enableLocalFallback`), `authService.test.ts`.
- Adaptadores y servicios: `http.ts`, `authApi.ts`, `authService.ts`, `secureSessionStore.ts`, `expoNetwork.ts`, `composition.ts`.
- UI / Hooks: `useAuth.ts`, `LoginScreen.tsx` (usuario, contraseña con botón mostrar/ocultar, validación previa, botones rápidos `emilys` y `michaelw`), `Header.tsx` (muestra `@username` y botón `Salir`), `useTasks.ts` y `TaskModal.tsx` (aislamiento por `userId`), y `App.tsx` (`AuthGate`).

---

## 4. Lo que falta por implementar paso a paso (para retomar en la nueva sesión)

### Fase 5 (continuación) — Agregar modo «Crear cuenta» 100 % local en el dispositivo (TDD)

1. **Ajuste de validación (`src/domain/validators.ts` + `src/__tests__/validators.test.ts`)** *(Red → Green)*:
   - Ampliar `USERNAME_PATTERN` en `src/domain/validators.ts` a `/^[a-zA-Z0-9._@-]{3,30}$/` para aceptar tanto alias (`emilys`) como formato correo (`ain@ipss.cl`, igual que mostró el docente en clase).
   - Agregar casos en `src/__tests__/validators.test.ts` (p. ej. acepta `ain@ipss.cl`, rechaza espacios o caracteres inválidos).

2. **Persistencia local de cuentas en `taskStorage` (`src/types/auth.ts`, `src/storage/taskStorage.ts`, `src/__tests__/taskStorage.test.ts`)** *(Red → Green)*:
   - Definir interfaz `LocalAccount` en `src/types/auth.ts` (`id`, `username`, `password`, `displayName?`, `createdAt`).
   - En `src/storage/taskStorage.ts`, agregar `getAccounts(): Promise<LocalAccount[]>` y `saveAccounts(accounts: LocalAccount[]): Promise<void>` bajo clave `users_v1`. Si no existe aún `users_v1`, inicializar con las 2 cuentas semilla (`id: '1'`, `emilys` / `emilyspass`, `Emily Johnson`; `id: '2'`, `michaelw` / `michaelwpass`, `Michael Williams`).
   - Escribir pruebas TDD en `src/__tests__/taskStorage.test.ts` verificando inicialización con semillas y guardado/lectura sin crash ante JSON corrupto.

3. **Autenticación y registro 100 % locales en el dispositivo (`src/services/authService.ts`, `src/api/authApi.ts`, `src/composition.ts`, `src/__tests__/authService.test.ts`)** *(Red → Green)*:
   - Agregar `register(input: { username: string; password: string; displayName?: string }): Promise<AuthSessionBundle>` en `authService.ts` (o repositorio local inyectado/opcional en `AuthServiceDeps` con `idGenerator` y `taskStorage`):
     - Valida `validateUsername` y `validatePassword` antes de escribir.
     - Verifica que no exista una cuenta con el mismo `username` (*case-insensitive*, incluidas `emilys` y `michaelw`); si ya existe, lanza un error tipado con mensaje claro en español (`"Este usuario ya está registrado"`).
     - Crea el nuevo `LocalAccount` (con `id` único generado por `IdGenerator` o `account-<timestamp>`), lo persiste en `users_v1`, genera su sesión (`userId`, `accessToken`, `refreshToken`, `expiresAt`), la guarda en `SecureStore` (`session_v1`) y actualiza `lastUser_v1`.
     - Asegurar que en dispositivo real (`composition.ts`) tanto **Iniciar sesión** como **Crear cuenta** y **refresh de sesión** operen **100 % en el dispositivo** contra `users_v1` (sin hacer requests HTTP externas a `dummyjson.com`). Nota: mantener el comportamiento de los tests existentes en `http.test.ts`, `authApi.test.ts` y `authService.test.ts` para conservar las pruebas de seguridad y contratos ya escritas.
   - Agregar pruebas TDD en `src/__tests__/authService.test.ts`:
     - `R4b / CU-01b`: `register` exitoso guarda la cuenta en `users_v1`, guarda tokens en `SecureStore` (nunca en `lastUser_v1`) e inicia sesión con el nuevo `userId`.
     - `R4b`: `register` rechaza usuario duplicado en mayúsculas/minúsculas (ej. `Emilys` o cuenta recién creada).
     - `R4b + R2`: el usuario recién creado puede cerrar sesión (`logout`), volver a iniciar sesión (`login`) offline con sus credenciales nuevas y conservar sus tareas aisladas en `tasks_v2:<userId>`.

4. **UI y Hook (`src/hooks/useAuth.ts` y `src/screens/LoginScreen.tsx`)**:
   - Exponer `register(username: string, password: string, displayName?: string): Promise<boolean>` en `useAuth.ts`.
   - Actualizar `LoginScreen.tsx` con:
     - Selector segmentado en la parte superior de la tarjeta: **`Iniciar sesión`** | **`Crear cuenta`**.
     - En modo **`Crear cuenta`**: mostrar campo opcional **«Nombre para mostrar»**, campo **«Usuario o correo»**, **«Contraseña»** (con ojito mostrar/ocultar) y **«Confirmar contraseña»** (validando coincidencia antes de enviar: `"Las contraseñas no coinciden"`).
     - En modo **`Iniciar sesión`**: mantener los campos de usuario/contraseña + ojito + chips de cuentas rápidas de prueba (`emilys` y `michaelw`).
   - Verificar `bun test --coverage`, `bun --bun x tsc --noEmit` y `bun --bun x expo lint`.

5. **Validación manual en iPhone y OnePlus + commits de la Fase 5**:
   - Probar en ambos dispositivos físicos:
     - Crear una cuenta nueva (ej. `ain@ipss.cl`), ver el badge `@ain@ipss.cl`, crear una tarea con foto y GPS.
     - Cerrar sesión (`Salir`), entrar con `emilys` (verificar aislamiento: cada usuario ve solo sus tareas), cerrar sesión y volver a entrar con la cuenta nueva.
     - Probar modo avión: cerrar app por completo y reabrir (entra directo gracias a `expo-secure-store`), además de hacer login offline.
     - Tomar capturas en `/Users/aincatoni/Universidad/2026/T3/DESARROLLO DE APLICACIONES MÓVILES/Unidad2/eva/entrega/capturas/fase 5`.
   - Tras aprobación del usuario, hacer commits TDD de la Fase 5:
     - `test(auth): agregar suites TDD de http, authApi, authService, registro local y multiusuario (Fase 5)`
     - `feat(auth): implementar autenticacion, registro local de cuentas y aislamiento en SecureStore (Fase 5)`

---

### Fase 6 — Pulido, optimización y verificación de regresión
- Envolver `TaskItem` con `React.memo` y ajustar props de rendimiento en `FlatList` (`initialNumToRender`, `removeClippedSubviews` si aplica sin afectar layout).
- Verificar áreas táctiles `>= 44 pt` y `accessibilityLabel` en todos los botones nuevos (`LoginScreen`, `Header`, `PhotoPicker`, `LocationBadge`, `PermissionRationale`, `PhotoPreviewModal`).
- Confirmar cero fugas de credenciales/tokens en `console.*`, `AsyncStorage` (`lastUser_v1`) ni URLs inseguras (`grep -rn "http://" src` solo en pruebas unitarias que verifican su rechazo).
- Verificar `bun test --coverage` (≥ 80 %, actualmente > 97 %), `bun --bun x tsc --noEmit`, `bun --bun x expo lint` y `bunx expo-doctor` (con permiso de red si se ejecuta en sandbox).
- Commit atómico: `perf(ui): optimizar rendimiento con React.memo, accesibilidad y regresion (Fase 6)`.

---

### Fase 7 — Evidencia final e Informe en `README.md`
- Seleccionar las mejores capturas de ambos teléfonos (`iPhone` y `OnePlus Android`) de `capturas/fase 0 y fase 1`, `fase 2`, `fase 3`, `fase 4` y `fase 5`, y copiarlas con nombres ordenados dentro de `todo-notes-app/Capturas/u2/` (sin reemplazar las capturas originales de la U1).
- Actualizar `README.md` como el informe completo de la Evaluación Sumativa Unidad 2 (con el mismo nivel visual y rigor del informe de la U1):
  1. Portada y datos IPSS (Ain Catoni, Pía Alarcón — Prof. Boris Marcelo Belmar Muñoz).
  2. Alcance confirmado (APIs internas del dispositivo) y declaración de equivalencia tecnológica (`Ionic/Capacitor` → `React Native + Expo SDK 58`).
  3. Arquitectura de **Puertos y Adaptadores** + diagrama Mermaid y estructura de módulos.
  4. **Autenticación y Almacenamiento Seguro**: `expo-secure-store` (Keychain/Keystore), cuentas locales (`users_v1`), migración U1→U2 y aislamiento por usuario (`tasks_v2:<userId>`, `photos/<userId>/...`) con pantallazos iOS/Android.
  5. **Permisos Nativos Incrementales**: ciclo `check → rationale → request → blocked → Ajustes` y comportamiento específico Android/iOS con pantallazos.
  6. **Periférico Cámara, Galería y Sistema de Archivos Privado**: compresión, visor ampliado, borrado seguro (`R7`) y pantallazos.
  7. **Periférico GPS, Precisión y Optimización**: UI optimista no bloqueante, timeout de `10 s`, enlace a Mapas del sistema y **tabla comparativa de lecturas GPS reales vs. Mapas** en iPhone (`±11 m`) y Android (`±14 m`) con pantallazos.
  8. **Metodología TDD y Pruebas Automatizadas**: explicación del ciclo `Red → Green → Refactor`, tabla completa de casos con ID de regla, salida real de `bun test --coverage` y evidencia de commits en Git.
  9. Checklist de verificación manual en dispositivos físicos (M1–M7), limitaciones y guía de instalación/usuarios de prueba (`emilys`, `michaelw` y registro en app).
  10. Video demostrativo en teléfono físico (cuando el usuario lo grabe y comparta el enlace).
- Commit final de documentación: `docs: actualizar README.md con informe final Unidad 2, capturas reales y evidencia TDD`.

---

## 5. Prompt sugerido para continuar en la nueva sesión

> Retomemos la implementación de la Unidad 2 de `todo-notes-app`. Lee los documentos actualizados en `/Users/aincatoni/Universidad/2026/T3/DESARROLLO DE APLICACIONES MÓVILES/Unidad2/eva/entrega/` (`Brief.md`, `Domain.md`, `Stack.md`, `Plan.md`). La Fase 4 ya está commiteada (`6414658`) y la Fase 5 tiene cambios sin commitear en el working tree (`git status`). Continúa desde la **Sección 4 del `Plan.md`**: implementa el modo **«Crear cuenta»** 100 % local en el dispositivo siguiendo TDD (`validators.ts`, `taskStorage.ts`, `authService.ts`, `composition.ts`, `useAuth.ts` y `LoginScreen.tsx`), verifica `bun test --coverage`, `bun --bun x tsc --noEmit` y `bun --bun x expo lint`, y detente antes de hacer commit para que pueda probar en mi iPhone y OnePlus.
