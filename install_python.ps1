Write-Host "Downloading Python 3.12.1..."
$url = "https://www.python.org/ftp/python/3.12.1/python-3.12.1-amd64.exe"
$installerPath = "$env:TEMP\python-3.12.1-amd64.exe"
Invoke-WebRequest -Uri $url -OutFile $installerPath

Write-Host "Installing Python 3.12.1... (This may take a few minutes)"
$process = Start-Process -FilePath $installerPath -ArgumentList "/quiet", "InstallAllUsers=0", "PrependPath=1", "Include_test=0" -Wait -PassThru

if ($process.ExitCode -eq 0) {
    Write-Host "Python 3.12.1 installed successfully."
} else {
    Write-Host "Installation failed with exit code $($process.ExitCode)."
}

# Clean up
if (Test-Path $installerPath) {
    Remove-Item $installerPath
}
