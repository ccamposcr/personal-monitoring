# Configuración de Nombres del Mixer

Este directorio contiene la configuración personalizable para los nombres de canales y auxiliares del XR18.

## Archivo: `mixer-names.json`

### Estructura del archivo:

```json
{
  "channels": {
    "1": "Vocal Principal",
    "2": "Vocal 2",
    "3": "Guitarra 1",
    // ... hasta canal 16
  },
  "auxiliaries": {
    "1": "Monitor Vocal",
    "2": "Monitor Guitarra", 
    "3": "Monitor Batería",
    // ... hasta auxiliar 6
  }
}
```

## Cómo personalizar:

1. **Edita el archivo `mixer-names.json`**
2. **Cambia los nombres** a los que uses en tu setup
3. **Guarda el archivo** - los cambios se aplicarán automáticamente
4. **No reinicies** la aplicación - los nombres se actualizan en vivo

## Ejemplos de nombres comunes:

### Canales:
- `"1": "Vocal Líder"`
- `"2": "Vocal Armonías"`
- `"3": "Guitarra Acústica"`
- `"4": "Guitarra Eléctrica"`
- `"5": "Bajo Directo"`
- `"6": "Kick"`
- `"7": "Snare"`
- `"8": "Hi-Hat"`
- `"9": "Tom Alto"`
- `"10": "Tom Medio"`
- `"11": "Floor Tom"`
- `"12": "Overhead L"`
- `"13": "Overhead R"`
- `"14": "Piano L"`
- `"15": "Piano R"`
- `"16": "Playback"`

### Auxiliares:
- `"1": "Monitor Cantante"`
- `"2": "Monitor Guitarra"`
- `"3": "Monitor Batería"`
- `"4": "Monitor Bajo"`
- `"5": "Monitor General"`
- `"6": "In-Ear"`

## Notas importantes:

- Los números deben ser strings (`"1"`, no `1`)
- Usa nombres descriptivos y cortos (máximo 20 caracteres recomendado)
- Si no especificas un nombre, se usará el predeterminado (ej: "Canal 5")
- Los cambios se detectan automáticamente sin reiniciar la aplicación