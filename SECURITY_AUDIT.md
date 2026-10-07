# Auditoría de seguridad — Airtek TV (Android)

| Campo | Valor |
|---|---|
| Documento | Auditoría técnica y de seguridad, versión 1.0 |
| Fecha | 6 de octubre de 2026 |
| Aplicación | Airtek TV (`com.airtek.tv`) |
| Plataforma auditada | Android (`targetSdk 36`, `minSdk 24`) |
| Stack | Expo SDK 57 · React Native 0.86 · React 19.2 · expo-video 57 (Media3/ExoPlayer 1.9.0) · Hermes · New Architecture |
| Componentes nativos propios | `modules/airtek-crypto` (Kotlin) |
| Estado del código | Árbol de trabajo posterior a la Fase 1 de refactorización (sin commit) |

---

## 1. Resumen ejecutivo

La aplicación reproduce un canal en vivo por HLS y permite grabar hasta 5 minutos de la transmisión en el dispositivo. Las grabaciones se cifran segmento a segmento con **AES-128-CBC** en el momento de la descarga. La clave de cada grabación se guarda protegida por el **Android Keystore**.

**Veredicto.** La protección de las grabaciones locales es **sólida frente a usuarios sin privilegios**. Impide extraerlas por USB, desde el gestor de archivos, la Galería, otras apps y las copias de seguridad, y el contenido nunca toca el disco en claro. **No es un DRM comercial.** No resiste a un atacante con root o con herramientas de instrumentación, y no impide capturar la pantalla.

**La amenaza más grave no está en la app, sino en el origen.** El stream en vivo se sirve **sin ningún control de acceso**. Cualquier persona con la URL puede descargarlo con `ffmpeg` sin pasar por la app, lo que hace irrelevante el cifrado local frente a ese vector.

### Hallazgos por severidad

| ID | Severidad | Hallazgo | Estado |
|---|---|---|---|
| SEC-01 | **Crítica** | Stream HLS en vivo accesible sin autenticación | Abierto |
| SEC-02 | **Alta** | Build de release firmado con el keystore de depuración | Abierto |
| SEC-03 | **Alta** | Sin protección contra captura y grabación de pantalla (`FLAG_SECURE`) | Abierto |
| SEC-04 | **Alta** | Tráfico HTTP en claro permitido para todos los dominios | Abierto |
| SEC-05 | Media | Ofuscación y reducción de código (R8) desactivadas en release | Abierto |
| SEC-06 | Media | Clave AES presente en la memoria del proceso durante grabación y reproducción | Riesgo aceptado |
| SEC-07 | Media | Sin verificación de integridad del dispositivo (root / Play Integrity) | Abierto |
| SEC-08 | Media | Permisos declarados que la app no usa | Abierto |
| SEC-09 | Baja | Segmentos cifrados sin autenticación de integridad (CBC sin MAC) | Riesgo aceptado |
| SEC-10 | Baja | Grabaciones anteriores al cifrado permanecen en claro | Abierto |
| SEC-11 | Baja | Vulnerabilidades conocidas en dependencias de la cadena de build | Abierto |
| SEC-12 | Baja | Parche local mantenido sobre `expo-video` | Seguimiento |
| SEC-13 | Info | Mensajes de error en release pueden incluir URLs del stream | Aceptado |
| SEC-14 | Info | Las variables `EXPO_PUBLIC_*` quedan embebidas en el bundle | Informativo |

---

## 2. Alcance y metodología

**Dentro del alcance**

- Código JavaScript en `src/` (reproductor, motor DVR, biblioteca de grabaciones y vistas).
- Módulo nativo `modules/airtek-crypto` (`AirtekCryptoModule.kt`).
- Configuración: `app.json`, `AndroidManifest.xml` generado por `expo prebuild` y `android/app/build.gradle`.
- Comportamiento de las dependencias críticas, verificado leyendo su código fuente:
  - Media3 1.9.0: `DefaultDataSource`, `DataSchemeDataSource`, `HlsChunkSource`, `Aes128DataSource`, `DefaultHlsExtractorFactory` y `HlsPlaylistParser`.
  - `expo-secure-store` 57: generación de claves y reglas de backup.
  - `expo-file-system`: ubicación de `Paths.document`.

**Métodos**

1. Revisión manual de código y del manifest final.
2. Lectura de las fuentes de terceros mencionadas, sin suposiciones sobre su comportamiento.
3. Batería automatizada de 26 pruebas del motor de grabación con cifrado real (AES de Node como sustituto del módulo nativo). Verifica:
   - que no hay texto plano en disco;
   - que la clave no aparece en ningún archivo;
   - el descifrado byte a byte;
   - que los IV son únicos;
   - la entrega de la clave por `data:` URI;
   - el ciclo de vida de las claves.
4. `npm audit --omit=dev`.
5. Peticiones HTTP directas al origen del stream sin credenciales.

**Fuera del alcance**

- Servidor de origen (FFmpeg, nginx, red interna).
- iOS: no está soportado; ver §8.
- Pruebas dinámicas de intrusión con root, Frida o hooking. Lo descrito en esas categorías es un análisis de diseño, no una explotación demostrada.

---

## 3. Arquitectura de seguridad

```
                 HTTPS (sin autenticación, ver SEC-01)
 Origen HLS ────────────────────────────────────────────┐
 (FFmpeg + nginx)                                       │
                                                        ▼
                                  ┌──────────────────────────────────────┐
                                  │ AirtekCrypto (Kotlin, hilo IO)       │
                                  │  HttpURLConnection → CipherOutput-   │
                                  │  Stream(AES-128-CBC) → *.part → mv   │
                                  └──────────────────┬───────────────────┘
                                                     │ solo bytes cifrados
                                                     ▼
            filesDir/grabaciones/<id>/            (almacenamiento interno)
              ├─ master.m3u8 · video.m3u8 · audio.m3u8   (sin la clave)
              ├─ video/seg_00000.airtek …                (cifrados)
              ├─ thumbnail.airtek                        (cifrado)
              └─ info.json                               (metadatos, IV de miniatura)

 Clave por grabación: SecureRandom(128 bits) ──► expo-secure-store
                      (SharedPreferences cifradas con AES-256-GCM,
                       clave maestra no exportable en AndroidKeyStore)

 Reproducción: SecureStore ─► memoria JS ─► playlists en memoria
               (clave como data: URI) ─► ExoPlayer Aes128DataSource ─► decodificador
```

**Decisiones de diseño clave**

| Decisión | Motivo |
|---|---|
| Cifrar **durante** la descarga, en streaming | El segmento en claro nunca se escribe en disco. Se escribe un `.part` ya cifrado y se renombra al terminar. |
| Clave como **`data:` URI** construida en memoria | Los `.m3u8` en disco solo contienen un marcador (`airtek-key://<id>`), así que no hay ningún archivo de clave. Se verificó que Media3 resuelve la clave con `DefaultDataSource` (`C.DATA_TYPE_DRM`), que acepta el esquema `data:`. |
| Miniatura generada en RAM | El primer segmento se descifra en memoria, se extrae un fotograma con `MediaMetadataRetriever` y una `MediaDataSource` en memoria, y el JPEG se cifra antes de escribirse. |
| Extensión `.airtek` y `.nomedia` | Defensa en profundidad frente a indexadores de medios. ExoPlayer detecta el formato inspeccionando el contenido y no se fía de la extensión (`DefaultHlsExtractorFactory`). |

---

## 4. Modelo de amenazas

### 4.1 Activos

| Activo | Valor | Ubicación |
|---|---|---|
| Contenido grabado | Alto (derechos de emisión) | `filesDir/grabaciones` (cifrado) |
| Claves de grabación | Alto | expo-secure-store / Keystore; memoria durante el uso |
| Stream en vivo | Alto | Servidor de origen |
| Firma de la aplicación | Crítico | Keystore de firma del equipo |

### 4.2 Actores

| Actor | Capacidades |
|---|---|
| A1 · Usuario curioso | Gestor de archivos, Galería, conexión USB (MTP) |
| A2 · Usuario técnico sin root | ADB, `adb backup`, apps de terceros, captura de pantalla |
| A3 · Atacante con root | Lectura de cualquier directorio, Frida, Xposed, volcado de memoria |
| A4 · Malware sin root | Otra app instalada en el mismo dispositivo |
| A5 · Atacante en la red | Intercepción y manipulación del tráfico (MITM) |
| A6 · Tercero con el dispositivo | Teléfono perdido o robado, desbloqueado |
| A7 · Copias y migraciones | Google Drive Auto Backup, transferencia entre dispositivos |
| A8 · Cualquiera con la URL | Acceso directo al origen HLS |

### 4.3 Matriz de amenazas y mitigaciones

| # | Amenaza | Actor | Mitigación implementada | Estado |
|---|---|---|---|---|
| T1 | Copiar grabaciones por USB (MTP) | A1 | `filesDir` es almacenamiento interno, nunca expuesto por MTP | ✅ Mitigado |
| T2 | Verlas desde el gestor de archivos o la Galería | A1 | Sandbox de la app, más `.nomedia` y extensión `.airtek` como segunda capa | ✅ Mitigado |
| T3 | Lectura desde otra app | A4 | Aislamiento por UID de Android; sin `FileProvider` exportado para las grabaciones | ✅ Mitigado |
| T4 | `adb backup` | A2 | `allowBackup="false"`; además `targetSdk ≥ 31` excluye los datos de apps no depurables | ✅ Mitigado |
| T5 | Google Drive Auto Backup | A7 | `allowBackup="false"` y `dataExtractionRules`: solo se incluye `sharedpref`, excluyendo `SecureStore`; el dominio `file` (grabaciones) no está incluido | ✅ Mitigado |
| T6 | Transferencia a otro dispositivo (Android 12+) | A7 | La sección `<device-transfer>` incluye solo `sharedpref` sin `SecureStore`. Ni grabaciones ni claves viajan. Aunque viajaran, la clave maestra del Keystore no sale del dispositivo. | ✅ Mitigado |
| T7 | `adb shell run-as` | A2 | Solo funciona en builds depurables. El build de release no lo es. | ⚠️ Mitigado solo en release |
| T8 | Lectura de archivos con root | A3 | Los segmentos están cifrados, pero el atacante puede leer SecureStore y pedirle al Keystore que descifre desde el UID de la app | ❌ Riesgo aceptado (§7) |
| T9 | Extracción de la clave de la memoria con Frida | A3 | Ninguna. La clave existe como cadena en el heap de Hermes y en ExoPlayer. | ❌ Riesgo aceptado (SEC-06) |
| T10 | Captura o grabación de pantalla | A2 | Ninguna | ❌ **SEC-03** |
| T11 | Grabar el stream directamente del origen | A8 | Ninguna | ❌ **SEC-01** |
| T12 | Intercepción del stream | A5 | HTTPS hacia el origen, pero `usesCleartextTraffic="true"` y sin *pinning* | ⚠️ Parcial (SEC-04) |
| T13 | Manipular segmentos en disco | A3 | Ninguna (CBC no autentica) | ⚠️ Riesgo aceptado (SEC-09) |
| T14 | Reproducir grabaciones con el teléfono desbloqueado | A6 | Ninguna autenticación local | ⚠️ Riesgo aceptado |
| T15 | Ingeniería inversa del módulo y del bundle | A2/A3 | Ninguna (R8 desactivado) | ⚠️ SEC-05 |

---

## 5. Análisis criptográfico

### 5.1 Primitivas

| Elemento | Implementación | Evaluación |
|---|---|---|
| Generación de claves | `java.security.SecureRandom`, 16 bytes por grabación | ✅ CSPRNG del sistema |
| Cifrado de contenido | AES-128-CBC con relleno PKCS#7 (`AES/CBC/PKCS5Padding`, equivalente a PKCS#7 con bloques de 16 bytes) | ✅ Es lo que exige HLS `METHOD=AES-128` (RFC 8216 §4.3.2.4) para que ExoPlayer descifre de forma nativa |
| Vector de inicialización | 16 bytes aleatorios **por segmento** y por miniatura, publicados en `#EXT-X-KEY:…,IV=0x…` | ✅ Únicos e impredecibles; el IV no es secreto. Las pruebas confirmaron la unicidad. |
| Almacenamiento de la clave | `expo-secure-store`: el valor se cifra con **AES-256-GCM** usando una clave del `AndroidKeyStore` (`KeyGenParameterSpec`, no exportable) | ✅ La clave maestra se protege por hardware (TEE) en dispositivos que lo soportan |
| Exclusión de backups | Reglas `secure_store_backup_rules` y `secure_store_data_extraction_rules` | ✅ Correcto: un valor restaurado sería indescifrable de todos modos |
| Integridad | Ninguna | ⚠️ SEC-09 |

### 5.2 Ciclo de vida de la clave

1. **Creación:** al iniciar la grabación, antes de descargar el primer segmento. Si SecureStore falla, la grabación se aborta y se borra la carpeta.
2. **Uso durante la grabación:** la clave vive en la instancia de `HlsRecorder` y se pasa como hex al módulo nativo en cada segmento.
3. **Fin de la grabación:** `keyHex = null` en la instancia (verificado por prueba). Las cadenas de JS son inmutables, así que la copia en el heap persiste hasta que actúa el recolector de basura (ver SEC-06).
4. **Reproducción:** se lee de SecureStore y se inyecta como `data:application/octet-stream;base64,…` dentro de playlists construidas en memoria. **Nunca se escribe en disco.**
5. **Eliminación:** al borrar una grabación o descartar una vacía se eliminan juntas la carpeta, la entrada de SecureStore y la miniatura en caché (verificado por prueba).
6. **Desinstalación o "Borrar datos":** Android elimina juntos `filesDir`, las SharedPreferences y las claves del Keystore de la app.

### 5.3 Fortalezas

- No hay **ningún archivo de clave**. Copiar la carpeta completa de una grabación no permite reproducirla.
- **Una clave por grabación**: comprometer una no expone las demás.
- La miniatura recibe la misma protección que el video.
- Los registros de la app ocultan cualquier `data:` URI antes de escribir un error, para que la clave no aparezca en `logcat`.

### 5.4 Debilidades

- **Clave accesible para el proceso.** Por diseño, la app debe conocer la clave para pasársela a ExoPlayer. Esa es la diferencia esencial con un DRM de hardware (§6).
- **CBC sin MAC.** Un atacante con acceso de escritura (root) puede alterar segmentos sin que se detecte. El impacto se limita a reproducir contenido corrupto o alterado. Hay que añadir HMAC-SHA256 por segmento si se requiere integridad.
- **Respaldo por hardware no garantizado.** En dispositivos sin TEE o StrongBox, el Keystore se respalda por software. No se solicita StrongBox ni se verifica la *key attestation*.
- **Sin vinculación al usuario.** No se usa `requireAuthentication` (biometría o PIN) de SecureStore.

---

## 6. Comparativa con Widevine

| Capacidad | Solución actual (AES-128 local + Keystore) | Widevine L3 | Widevine L1 |
|---|---|---|---|
| Dónde se descifra | Proceso de la app (ExoPlayer, Java) | CDM por software ofuscado | Entorno de ejecución confiable (TEE) |
| ¿La app ve la clave? | **Sí** | No | No |
| Fotogramas descifrados | Memoria normal del proceso | Memoria normal | Ruta de video segura (*secure decoder*); la app nunca accede |
| Protección contra captura de pantalla | No (SEC-03) | No por sí mismo | **Sí**, por superficie segura |
| Protección de la salida (HDCP) | No | No | **Sí** |
| Servidor de licencias (caducidad, revocación, políticas) | No existe; la clave no caduca | Sí | Sí |
| Licencias offline con duración limitada | No; la grabación es válida indefinidamente | Sí | Sí |
| Atestación del dispositivo | No | Parcial | Sí |
| Resistencia a root | Baja | Baja–media | Alta (la clave nunca sale del TEE) |
| Requisito habitual de los dueños de contenido para HD | **No cumple** | Generalmente solo SD | **Sí** |
| Coste e infraestructura | Ninguno adicional | Servidor de licencias y proveedor DRM | Servidor de licencias y proveedor DRM |

**Conclusión.** La solución equivale a una *protección de contenido a nivel de aplicación*. Es adecuada para evitar la copia casual y la extracción por usuarios sin privilegios, pero **no sustituye un DRM certificado**. Si los contratos de emisión exigen DRM, como suele pasar con el contenido premium en HD, este diseño no es suficiente.

**Ruta de migración, si fuera necesaria**

1. Empaquetar el canal con cifrado CENC (esquema `cbcs` para HLS/CMAF) usando Shaka Packager o el empaquetador del proveedor.
2. Contratar un servidor de licencias Widevine (EZDRM, Axinom, PallyCon, etc.).
3. **Vivo:** `expo-video` ya acepta `drm: { type: 'widevine', licenseServer, headers }` en `VideoSource`.
4. **Grabaciones:** requiere licencias *offline* y `DownloadManager` de Media3, que expo-video no expone. Implica trabajo nativo adicional en Kotlin.

---

## 7. Hallazgos detallados

### SEC-01 · Crítica · Stream en vivo sin control de acceso
**Evidencia.** El 6 de octubre de 2026 se pidió `GET https://dev.airtek.tv/livestream/master.m3u8` y su variante `stream_limpio_1080.m3u8` sin credenciales. Ambas respondieron **HTTP 200**.

**Impacto.** Cualquiera con la URL graba el canal completo con `ffmpeg -i <url> -c copy salida.ts`, sin límite de 5 minutos y sin cifrado. Todos los controles de la app quedan eludidos.

**Recomendación**
- URLs firmadas con caducidad corta, por ejemplo `secure_link` de nginx con HMAC y expiración, emitidas por un backend autenticado.
- Como mínimo, cifrado AES-128 del propio stream con un servidor de claves que exija token.
- Evaluar Widevine (§6).

### SEC-02 · Alta · Release firmado con el keystore de depuración
**Evidencia.** En `android/app/build.gradle`, el `buildType release` usa `signingConfig signingConfigs.debug`, la configuración que genera `expo prebuild`.

**Impacto.** La clave de depuración es pública. Cualquiera puede firmar una versión maliciosa que se instale como actualización.

**Recomendación**
- Firmar con EAS Build (credenciales gestionadas) o con una *upload key* propia, más Play App Signing.
- No modificar `android/` a mano: el proyecto usa generación nativa continua.

### SEC-03 · Alta · Sin protección contra captura de pantalla
**Evidencia.** No hay `FLAG_SECURE` ni `expo-screen-capture` en el proyecto.

**Impacto.** Una app de grabación de pantalla o `adb shell screenrecord` capturan el vivo y las grabaciones con su audio.

**Recomendación**
- Usar `usePreventScreenCapture()` de `expo-screen-capture` (módulo oficial) en la pantalla del reproductor y en "Mis grabaciones".
- Validar su interacción con el modo imagen en imagen (PiP).

### SEC-04 · Alta · Tráfico en claro permitido globalmente
**Evidencia.** `app.json` → `expo-build-properties.android.usesCleartextTraffic: true`, y el manifest final tiene `android:usesCleartextTraffic="true"`.

**Impacto.** Se habilitó como contingencia para servir el stream por HTTP. Permite tráfico sin cifrar hacia cualquier dominio y la manipulación de playlists en redes hostiles.

**Recomendación**
- Retirarlo, ya que el origen funciona por HTTPS.
- Si se necesita HTTP en la red interna, restringirlo con un `network_security_config` limitado a ese dominio.
- Opcional: *certificate pinning* del dominio de streaming.

### SEC-05 · Media · R8 desactivado en release
**Evidencia.** `android.enableMinifyInReleaseBuilds` no está definido, así que `minifyEnabled false`.

**Impacto.** El módulo Kotlin y los nombres de clases quedan legibles, y el APK pesa más.

**Recomendación**
- Activar `enableMinifyInReleaseBuilds` y `enableShrinkResourcesInReleaseBuilds` en el plugin `expo-build-properties`.
- Hacer una prueba completa de regresión, sobre todo de los módulos nativos.

### SEC-06 · Media · Clave en memoria del proceso
Es inherente al diseño (§5.4). Con root e instrumentación se puede interceptar la clave en `decryptToBase64Async`, en la construcción de la `data:` URI o en `Aes128DataSource`.

**Mitigación posible:** mover la construcción de playlists al lado nativo para reducir las copias en el heap de JS. No elimina el riesgo, solo lo dificulta.

**Estado:** riesgo aceptado hasta adoptar DRM.

### SEC-07 · Media · Sin verificación de integridad del dispositivo
**Recomendación:** antes de habilitar la grabación, obtener un veredicto de **Play Integrity API** y validarlo en el servidor. En dispositivos que no lo superen, bloquear la grabación o reducir funcionalidades.

### SEC-08 · Media · Permisos innecesarios
**Evidencia.** El manifest final declara `SYSTEM_ALERT_WINDOW`, `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE` (hasta API 32) y `VIBRATE`, que vienen de dependencias.

**Impacto.** La app no los usa: aumentan la superficie de ataque y la desconfianza en la ficha de Play Store.

**Recomendación:** declararlos en `android.blockedPermissions` de `app.json`.

### SEC-09 · Baja · Sin integridad de segmentos
Ver §5.4. **Riesgo aceptado:** requiere acceso de escritura (root) y no permite extraer el contenido.

### SEC-10 · Baja · Grabaciones anteriores al cifrado
Las grabaciones creadas antes de implantar el cifrado conservan segmentos `.ts` y una miniatura `thumbnail.jpg` **en claro**, siempre dentro del almacenamiento interno.

**Recomendación:** en la primera ejecución de la versión de producción, migrarlas (cifrarlas con una clave nueva) o eliminarlas.

### SEC-11 · Baja · Vulnerabilidades en dependencias
**Evidencia.** `npm audit --omit=dev` reporta 1 crítica (`shell-quote`), 17 altas (`metro`, `@expo/cli`, `node-forge`, `micromatch`/`braces`, `source-map-js`…) y 7 moderadas.

**Impacto.** Afectan a herramientas de build y del servidor de desarrollo, que no forman parte del runtime incluido en el APK. El riesgo recae en las máquinas de desarrollo y de CI (cadena de suministro).

**Recomendación**
- Aplicar las versiones de parche de Expo SDK 57 (`npx expo install --fix`).
- Ejecutar `npm audit` en CI y activar Dependabot o Renovate.

### SEC-12 · Baja · Parche local sobre expo-video
`patches/expo-video+57.0.5.patch` modifica la MediaSession, `liveTargetOffset` y `seekToLiveEdge`, y obliga a compilar el paquete desde el código fuente (`buildFromSource`).

**Recomendación:** revalidar el parche en cada actualización de expo-video y proponer los cambios upstream.

### SEC-13 · Info · Contenido de los registros en release
El logger solo emite errores en release. Algunos pueden incluir URLs del stream. Las `data:` URIs con la clave siempre se ocultan. **Aceptado.**

### SEC-14 · Info · Variables `EXPO_PUBLIC_*`
Se incrustan en texto plano en el bundle de JavaScript. Sirven para configuración, no para secretos. **Nunca** deben contener tokens ni claves.

---

## 8. Deuda técnica y limitaciones conocidas

| Área | Limitación | Consecuencia | Propuesta |
|---|---|---|---|
| Grabación en segundo plano | El bucle de descarga depende de temporizadores de JavaScript, que Android suspende con la app en segundo plano y en PiP | Huecos en la grabación (marcados como `#EXT-X-DISCONTINUITY`). Tras 30 s sin éxito se cierra como "incompleta". | Mover el motor DVR a un *Foreground Service* nativo con notificación persistente |
| Ventana del servidor | El origen publica unos 12 s (`hls_list_size 3` × 4 s) | Cualquier pausa del proceso mayor a 12 s pierde contenido irrecuperablemente | Ampliar la ventana del origen a 30–60 s |
| **iOS** | El módulo `airtek-crypto` solo declara Android, y `requireNativeModule` falla al importarse | **La app no arrancaría en iOS** en su estado actual. Además, AVPlayer necesita un `AVAssetResourceLoaderDelegate` para entregar claves desde memoria, y el llavero de iOS conserva las entradas tras desinstalar (claves huérfanas). | Implementar el módulo en Swift con un *resource loader* propio, o aislar la grabación en Android con `Platform.OS` |
| Gestos | 3 `PanResponder` con la regla `react-hooks/refs` suprimida | Incompatible con React Compiler | Migrar a `react-native-gesture-handler` y Reanimated |
| Miniaturas | `MediaMetadataRetriever` sobre MPEG-TS depende del decodificador del fabricante | En algunos modelos no habrá miniatura (se muestra el degradado de respaldo) | Extraer con Media3 `FrameExtractor` |
| Pruebas | Las 26 pruebas del motor viven fuera del repositorio | Sin protección automática frente a regresiones | Portarlas a Jest dentro del repo y ejecutarlas en CI |
| Resolución DNS | `dev.airtek.tv` solo resuelve con DNS interno o el archivo `hosts` | La app no funciona fuera de la red corporativa | Publicar el registro DNS y servir el origen con un certificado válido |

---

## 9. Riesgos aceptados

| Riesgo | Justificación | Condición de revisión |
|---|---|---|
| SEC-06 · Clave en memoria del proceso | Inherente a un esquema sin DRM de hardware; exige root e instrumentación | Contratos que exijan DRM certificado |
| SEC-09 · CBC sin MAC | Requiere root y no permite extraer contenido | Requisito de integridad forense |
| T8 · Acceso con root | Ningún esquema de software resiste a root | Ídem SEC-06 |
| T14 · Teléfono desbloqueado en manos de un tercero | Equivalente al resto de apps de video | Exigencia de autenticación local |

> Firma de aceptación del riesgo: ____________________ (responsable de producto) · Fecha: ____________

---

## 10. Plan de remediación

| Prioridad | Acción | Hallazgos |
|---|---|---|
| **Bloqueante para producción** | Control de acceso al origen (URLs firmadas o tokens) | SEC-01 |
| **Bloqueante para producción** | Firma de release con credenciales propias (EAS / Play App Signing) | SEC-02 |
| **Bloqueante para producción** | `usePreventScreenCapture` en reproductor y grabaciones | SEC-03 |
| **Bloqueante para producción** | Retirar `usesCleartextTraffic` | SEC-04 |
| Antes del lanzamiento | Activar R8, bloquear permisos y migrar o eliminar las grabaciones antiguas | SEC-05, SEC-08, SEC-10 |
| Siguiente iteración | Play Integrity, HMAC por segmento, *Foreground Service* para el DVR y pruebas en CI | SEC-07, SEC-09, §8 |
| Estratégico | Evaluar Widevine si los contratos lo exigen | SEC-06, §6 |

---

## 11. Lista de verificación previa al release

- [ ] El origen HLS rechaza peticiones sin token válido (SEC-01).
- [ ] `./gradlew signingReport` muestra la *upload key* corporativa y no la de depuración (SEC-02).
- [ ] Capturar la pantalla durante la reproducción produce una imagen negra (SEC-03).
- [ ] El manifest final no contiene `usesCleartextTraffic="true"` (SEC-04).
- [ ] `minifyEnabled true` en release y prueba de regresión completa superada (SEC-05).
- [ ] El manifest final no declara `SYSTEM_ALERT_WINDOW` ni permisos de almacenamiento (SEC-08).
- [ ] La URL del stream proviene de `EXPO_PUBLIC_STREAM_URL` y no está fija en `src/config/stream.js`.
- [ ] `.claude/` y `skills-lock.json` están excluidos en `.gitignore`.
- [ ] El build de release no es depurable (`run-as` falla).
- [ ] `npm run lint` sin errores y las pruebas del motor DVR en verde.

---

## 12. Referencias

- RFC 8216 — HTTP Live Streaming, §4.3.2.4 `EXT-X-KEY`.
- Android Developers — Android Keystore System; Data backup and transfer (`dataExtractionRules`, Android 12+).
- Código fuente de Media3 1.9.0: `DataSchemeDataSource.java`, `HlsChunkSource.java`, `Aes128DataSource.java`, `DefaultHlsExtractorFactory.java`.
- Documentación de Expo SDK 57: `expo-secure-store`, `expo-file-system`, `expo-video` (DRM), `expo-screen-capture`, `expo-build-properties`.
- Google Widevine — niveles de seguridad L1/L3 y licencias offline.
