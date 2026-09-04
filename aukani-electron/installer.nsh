; Página custom del instalador: pide la URL del backend, el host de acceso remoto
; (opcional), y si aceptar certificados HTTPS autofirmados, durante la instalación —
; y la deja lista para que la app arranque ya configurada, sin pasar por la pantalla
; de "Configuración inicial".
;
; El archivo se escribe en resources\app.asar.unpacked\electron\default-config.json,
; que "electron/main.js" (readConfig -> defaultConfigPath) ya sabe leer transparentemente
; aunque el resto de la app viva empacada dentro de app.asar (ver "asarUnpack" en package.json).
;
; Actualizaciones automáticas: NSIS salta automáticamente TODAS las páginas (incluida
; esta) cuando corre en modo silencioso (/S) — que es como electron-updater ejecuta el
; instalador en un auto-update (ver quitAndInstall(true, true) en electron/main.js).
; Como la página se salta, $AukaniServerUrlValue queda vacío y customInstall no
; sobreescribe default-config.json — la config ya guardada en config.json (userData)
; queda intacta y la app abre directo con lo que ya tenía. Esta página solo se ve en
; una instalación manual real (doble clic al .exe), nunca en un auto-update.

; Todo esto solo aplica a la pasada de compilación del INSTALADOR — electron-builder
; compila este mismo script dos veces (una para el uninstaller, con BUILD_UNINSTALLER
; definido, y otra para el instalador real). Sin este !ifndef, las Function quedarían
; declaradas también en la pasada del uninstaller sin que nada las referencie ahí
; (el "Page custom" solo se inserta en la rama del instalador), y NSIS aborta el
; build por warning-as-error ("function not referenced").
!ifndef BUILD_UNINSTALLER

!include "nsDialogs.nsh"
!include "LogicLib.nsh"

Var AukaniDialog
Var AukaniServerUrlInput
Var AukaniRemoteHostInput
Var AukaniIgnoreCertCheckbox
Var AukaniServerUrlValue
Var AukaniRemoteHostValue
Var AukaniIgnoreCertValue

!macro customPageAfterChangeDir
  Page custom AukaniConfigPageCreate AukaniConfigPageLeave
!macroend

Function AukaniConfigPageCreate
  nsDialogs::Create 1018
  Pop $AukaniDialog

  ${If} $AukaniDialog == error
    Abort
  ${EndIf}

  ${NSD_CreateLabel} 0 0u 100% 24u "Configura la conexión al servidor de Aukani POS. Puedes dejarlo en blanco y configurarlo después desde la app."
  Pop $0

  ${NSD_CreateLabel} 0 30u 100% 10u "URL del servidor (ej: http://192.168.0.101/api):"
  Pop $0
  ${NSD_CreateText} 0 41u 100% 12u ""
  Pop $AukaniServerUrlInput

  ${NSD_CreateLabel} 0 60u 100% 10u "Host de acceso remoto SSH (opcional):"
  Pop $0
  ${NSD_CreateText} 0 71u 100% 12u ""
  Pop $AukaniRemoteHostInput

  ${NSD_CreateCheckbox} 0 90u 100% 10u "Aceptar certificados HTTPS autofirmados (redes locales)"
  Pop $AukaniIgnoreCertCheckbox

  nsDialogs::Show
FunctionEnd

Function AukaniConfigPageLeave
  ${NSD_GetText} $AukaniServerUrlInput $AukaniServerUrlValue
  ${NSD_GetText} $AukaniRemoteHostInput $AukaniRemoteHostValue
  ${NSD_GetState} $AukaniIgnoreCertCheckbox $AukaniIgnoreCertValue
FunctionEnd

!macro customInstall
  ${If} $AukaniServerUrlValue != ""
    CreateDirectory "$INSTDIR\resources\app.asar.unpacked\electron"
    FileOpen $4 "$INSTDIR\resources\app.asar.unpacked\electron\default-config.json" w
    FileWrite $4 "{$\r$\n"
    FileWrite $4 '  "serverUrl": "$AukaniServerUrlValue"'
    ${If} $AukaniRemoteHostValue != ""
      FileWrite $4 ",$\r$\n"
      FileWrite $4 '  "remoteAccess": { "host": "$AukaniRemoteHostValue", "port": "22" }'
    ${EndIf}
    ${If} $AukaniIgnoreCertValue == ${BST_CHECKED}
      FileWrite $4 ",$\r$\n"
      FileWrite $4 '  "ignoreCertErrors": true$\r$\n'
    ${Else}
      FileWrite $4 "$\r$\n"
    ${EndIf}
    FileWrite $4 "}$\r$\n"
    FileClose $4
  ${EndIf}
!macroend

!endif ; BUILD_UNINSTALLER
