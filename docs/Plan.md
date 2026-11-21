# todo-notes-app v2 — Plan de ejecución y estado final del proyecto

> **Estado del proyecto:** ✅ **COMPLETADO Y ENTREGADO** (mergeado a `main` vía PR #1, tag `entrega-u2`).
> Rutas y referencias clave:
> - Repositorio GitHub: `https://github.com/aincatoni/todo-notes-app` (`main` actualizado, PR #1 mergeado en `0fb6cbc`, tags `entrega-u1` y `entrega-u2`)
> - Repositorio local: `/Users/aincatoni/Universidad/2026/T3/DESARROLLO DE APLICACIONES MÓVILES/Unidad1/Eva1/Entrega/todo-notes-app`
> - Documentos sincronizados: `docs/` en el repositorio y `/Users/aincatoni/Universidad/2026/T3/DESARROLLO DE APLICACIONES MÓVILES/Unidad2/eva/entrega/`
> - Capturas seleccionadas para el informe: `Capturas/u2/` (18 capturas iPhone + OnePlus)
> - Video demostrativo en iPhone (YouTube): `https://youtube.com/shorts/jEDO7ZyLbK8`

---

## 1. Metodología aplicada

1. **Desarrollo fase por fase con TDD estricto (`Red → Green → Refactor`)** en `domain/`, `services/`, `storage/` y `api/`, respaldado por pares de commits `test(...):` → `feat(...):` en Git.
2. **Validación End-to-End (E2E) en dos dispositivos físicos reales** (**iPhone con iOS** y **OnePlus con Android**, Expo Go SDK 58) antes de commitear cada fase.
3. **Alcance de la Unidad 2:** integración completa con **APIs internas y periféricos del dispositivo** (cámara, galería, sistema de archivos privado, GPS/Mapas, permisos nativos, `AsyncStorage` aislado por usuario y `expo-secure-store`), operando **100 % en el dispositivo** incluso en Modo Avión.

---

## 2. Registro final de fases completadas

| Fase | Estado | Commits | Pruebas acumuladas | Evidencia en dispositivo |
|---|---|---|---|---|
| **Preparación** (SDK 58, plugins `app.json`, ESLint 9, `bunfig.toml`) | `[x]` Completada | `733eccc` | Base lista | — |
| **Fase 0 — Red de seguridad sobre la U1** (`taskRules.ts`, `TaskModalContent`, puertos base) | `[x]` Completada | `75b802c` | 13 / 13 | `capturas/fase 0 y fase 1/` |
| **Fase 1 — Núcleo de dominio y almacenamiento** (`validators`, `errors`, `taskStorage v2`, migración U1, puertos) | `[x]` Completada | `4398136` (`test`), `9139c9b` (`feat`) | 81 / 81 | `capturas/fase 0 y fase 1/` |
| **Fase 2 — Permisos incrementales** (`permissionService`, `expoPermissions` con check OS Android, `PermissionRationale` overlay, `usePermissions`) | `[x]` Completada | `8375258` (`test`), `d111a0d` (`feat`) | 91 / 91 | `capturas/fase 2/` (iPhone + OnePlus) |
| **Fase 3 — Cámara, Galería y FileSystem** (`photoService`, `expoCamera`, `fileSystemPhotos`, `PhotoPicker`, `PhotoPreviewModal`) | `[x]` Completada | `dacfb1b` (`test`), `b533362` (`feat`) | 106 / 106 | `capturas/fase 3/iphone/` y `android/` |
| **Fase 4 — GPS, Precisión y Mapas** (`locationService`, `taskEnricher`, `expoLocation` con `enableNetworkProviderAsync` + `watchPositionAsync`, `LocationBadge`) | `[x]` Completada | `2ab4c5f` (`test`), `6414658` (`feat`) | 119 / 119 | `capturas/fase 4/iphone/` y `android/` |
| **Fase 5 — Autenticación local, «Crear cuenta» y multiusuario** (`createLocalAuthApi`, `users_v1`, `authService.register`, `SecureStore`, `LoginScreen` dual) | `[x]` Completada | `36d125b` (`test`), `5f5ade8` (`feat`) | 155 / 155 (97.80 % líneas) | `capturas/fase 5/iphone/` y `android/` |
| **Fase 6 — Pulido, optimización (`React.memo`), accesibilidad y regresión** (`TaskItem`, `FlatList`, áreas `>= 44 pt`, `SafeAreaView`, badge limpio, auditoría seguridad) | `[x]` Completada | `0edc8ca` (`perf`) | 155 / 155 (97.80 % líneas) | `capturas/fase 6/iphone/` y `android/` |
| **Fase 7 — Evidencia final, Informe en `README.md`, PR #1 y tag `entrega-u2`** | `[x]` Completada | `5361d2a` (`docs`), `0fb6cbc` (PR #1) | 155 / 155 + 18 capturas en `Capturas/u2/` | `README.md` + video YouTube |

---

## 3. Métricas finales de verificación

- **`bun test --coverage`**: **155 pass / 0 fail** (10 suites, 527 aserciones `expect()`), **98.29 % funciones / 97.80 % líneas** (umbral exigido: 80 %).
- **`bun --bun x tsc --noEmit`**: **0 errores**.
- **`bun --bun x expo lint`**: **0 errores, 0 advertencias**.
- **Auditoría de seguridad**: 0 usos de `console.*` en producción, 0 URLs `http://` fuera de pruebas unitarias, 0 filtraciones de tokens en `AsyncStorage`.
- **Pruebas E2E en hardware real**: 7 flujos completos (`E2E-01` a `E2E-07`) aprobados en **iPhone (iOS)** y **OnePlus (Android)**, incluyendo Modo Avión.
