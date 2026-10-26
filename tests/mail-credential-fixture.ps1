$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '../scripts/mail/credential-store.ps1')
$directory = Get-FluffyTailMailDirectory -Fixture
$path = Join-Path $directory 'connection.json'
if (Test-Path -LiteralPath $path) { throw 'A prior fixture file exists; do not overwrite or delete it automatically.' }
$secure = ConvertTo-SecureString 'offline-fixture-not-a-real-password' -AsPlainText -Force
try {
    $saveAction = New-FluffyTailMailSaveAction -Fixture
    & $saveAction $secure
    # Existing folders take the same startup/save path as the real setup window.
    [void](Initialize-FluffyTailMailDirectory -Fixture)
    & $saveAction $secure
    $json = [IO.File]::ReadAllText($path)
    if ($json.Contains('offline-fixture-not-a-real-password')) { throw 'Fixture secret was not encrypted.' }
    $profile = $json | ConvertFrom-Json
    if ($profile.purpose -ne 'offline-fixture') { throw 'Fixture purpose was not isolated.' }
    $restored = ConvertTo-SecureString -String $profile.protectedPassword
    try {
        $credential = [PSCredential]::new('fixture', $restored)
        if ($credential.GetNetworkCredential().Password -ne 'offline-fixture-not-a-real-password') { throw 'Credential round trip failed.' }
    } finally { $restored.Dispose() }
    $acl = Get-Acl -LiteralPath $directory
    $owner = [Security.Principal.WindowsIdentity]::GetCurrent().User.Value
    $unexpected = @($acl.Access | Where-Object {
        $_.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value -notin @($owner, 'S-1-5-18')
    })
    if (-not $acl.AreAccessRulesProtected -or $unexpected.Count) { throw 'Fixture credential folder was not restricted to its owner and SYSTEM.' }
    [ordered]@{ encryptedAtRest = $true; windowsUserRoundTrip = $true; ownerRestricted = $true; noNetworkAccess = $true } | ConvertTo-Json -Compress
} finally {
    $secure.Dispose()
    if (Test-Path -LiteralPath $path) { Remove-Item -LiteralPath $path }
    if ((Test-Path -LiteralPath $directory) -and @(Get-ChildItem -LiteralPath $directory -Force).Count -eq 0) { Remove-Item -LiteralPath $directory }
}
