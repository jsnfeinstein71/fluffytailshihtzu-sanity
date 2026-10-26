$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSHOME 'Modules/Microsoft.PowerShell.Security/Microsoft.PowerShell.Security.psd1') -ErrorAction Stop

function Get-FluffyTailMailDirectory {
    param([switch]$Fixture)
    if ($env:VERCEL -or $env:VERCEL_ENV) { throw 'Mailbox setup must run locally, outside website environments.' }
    $localData = [Environment]::GetFolderPath('LocalApplicationData')
    if (-not $localData) { throw 'A local Windows user profile is required.' }
    $folder = if ($Fixture) { 'FluffyTail/MailConnectionFixture' } else { 'FluffyTail/MailConnection' }
    return Join-Path $localData $folder
}

function Initialize-FluffyTailMailDirectory {
    param([switch]$Fixture)
    $directory = Get-FluffyTailMailDirectory -Fixture:$Fixture
    [void][IO.Directory]::CreateDirectory($directory)
    # Build only the access-rule section; copying an existing full descriptor
    # through Set-Acl can unnecessarily request the audit-security privilege.
    $acl = [Security.AccessControl.DirectorySecurity]::new()
    $acl.SetAccessRuleProtection($true, $false)
    $owner = [Security.Principal.WindowsIdentity]::GetCurrent().User
    $inherit = [Security.AccessControl.InheritanceFlags]'ContainerInherit, ObjectInherit'
    foreach ($identity in @($owner, [Security.Principal.SecurityIdentifier]'S-1-5-18')) {
        $rule = [Security.AccessControl.FileSystemAccessRule]::new($identity, 'FullControl', $inherit, 'None', 'Allow')
        $acl.SetAccessRule($rule)
    }
    [IO.Directory]::SetAccessControl($directory, $acl)
    return $directory
}

function Save-FluffyTailMailCredential {
    param([Parameter(Mandatory)][Security.SecureString]$Password, [switch]$Fixture)
    $directory = Initialize-FluffyTailMailDirectory -Fixture:$Fixture
    $profile = [ordered]@{
        version = 1
        account = 'jeanne@fluffytailshihtzu.com'
        provider = 'PairProMail'
        purpose = if ($Fixture) { 'offline-fixture' } else { 'connection-check' }
        protectedPassword = ConvertFrom-SecureString -SecureString $Password
    }
    $destination = Join-Path $directory 'connection.json'
    $temporary = Join-Path $directory 'connection.pending.json'
    [IO.File]::WriteAllText($temporary, ($profile | ConvertTo-Json), [Text.UTF8Encoding]::new($false))
    Move-Item -LiteralPath $temporary -Destination $destination -Force
}

function New-FluffyTailMailSaveAction {
    param([switch]$Fixture)
    $storeScript = Join-Path $PSScriptRoot 'credential-store.ps1'
    $fixtureMode = [bool]$Fixture
    # .NET UI callbacks may run outside the original script's function scope.
    # Capture the trusted helper path and import its functions in the callback.
    return {
        param([Parameter(Mandatory)][Security.SecureString]$Value)
        . $storeScript
        Save-FluffyTailMailCredential -Password $Value -Fixture:$fixtureMode
    }.GetNewClosure()
}
