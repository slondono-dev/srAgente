# Consulta asistida en Movilidad Envigado: el portal exige reCAPTCHA, lo resuelves tu.
param([string]$Placa = ((Get-Content "$PSScriptRoot\..\.env" | Where-Object { $_ -like 'TEST_PLACA=*' }) -replace '^TEST_PLACA=', ''))
# ponytail: solo portapapeles + navegador; autollenado con Playwright si el modo asistido se vuelve frecuente
Set-Clipboard $Placa.ToUpper()
Start-Process "https://movilidad.envigado.gov.co/portal-servicios/"
Write-Host "Placa $($Placa.ToUpper()) copiada. Pegala con Ctrl+V, resuelve el captcha y consulta."
