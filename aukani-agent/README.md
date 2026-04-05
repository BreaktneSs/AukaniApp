# Aukani Agent

Agente local que permite a Aukani POS controlar la impresora térmica y el cajón de efectivo.

## Instalación

### Windows
1. Descarga `aukani-agent-windows.exe` desde Aukani POS > Configuración > Impresora
2. Ejecuta el archivo (doble clic)
3. Permite el acceso en el firewall de Windows si lo pide
4. Deja la ventana abierta mientras usas el sistema

### Linux
```bash
chmod +x aukani-agent-linux
./aukani-agent-linux
```

Para ejecutar como servicio (systemd):
```bash
sudo cp aukani-agent-linux /usr/local/bin/aukani-agent
sudo nano /etc/systemd/system/aukani-agent.service
```

Contenido del servicio:
```ini
[Unit]
Description=Aukani POS Agent
After=network.target

[Service]
ExecStart=/usr/local/bin/aukani-agent
Restart=always
User=tu-usuario

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable aukani-agent
sudo systemctl start aukani-agent
```

## Permisos de impresora en Linux

```bash
# Agregar tu usuario al grupo lp (impresora)
sudo usermod -a -G lp $USER

# Dar acceso al puerto USB
sudo chmod 666 /dev/usb/lp0
```

## Configuración

El agente detecta la impresora automáticamente. Si no la detecta, configúrala desde:
**Aukani POS > Configuración > Impresora**

El archivo de configuración se guarda en: `~/.aukani-agent.json`

## Puerto

El agente corre en `http://localhost:9876` y solo acepta conexiones locales.

## API

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /status | Estado del agente |
| POST | /open-drawer | Abrir cajón de efectivo |
| POST | /print | Enviar HTML a imprimir |
| GET | /printers | Listar impresoras del sistema |
| POST | /config | Guardar configuración |