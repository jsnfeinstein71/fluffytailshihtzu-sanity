param([switch]$PreviewOnly, [switch]$CheckWindow)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'mail/credential-store.ps1')
$credentialDirectory = Initialize-FluffyTailMailDirectory
$saveCredential = New-FluffyTailMailSaveAction
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[Windows.Forms.Application]::EnableVisualStyles()
$form = [Windows.Forms.Form]::new()
$form.Text = if ($PreviewOnly) { 'FluffyTail - Mail setup preview (no saving)' } else { 'FluffyTail - Save Jeanne''s email connection' }
$form.ClientSize = [Drawing.Size]::new(520, 330)
$form.StartPosition = 'CenterScreen'
$form.FormBorderStyle = 'FixedDialog'
$form.MaximizeBox = $false
$form.MinimizeBox = $false
$form.Font = [Drawing.Font]::new('Segoe UI', 10)

$intro = [Windows.Forms.Label]::new()
$intro.Text = "Pair Pro Mail - jeanne@fluffytailshihtzu.com`r`nSecure connection check only. No messages will be sent or opened."
$intro.Location = [Drawing.Point]::new(24, 22)
$intro.Size = [Drawing.Size]::new(475, 58)
$form.Controls.Add($intro)
$label = [Windows.Forms.Label]::new()
$label.Text = 'Jeanne''s mailbox password'
$label.Location = [Drawing.Point]::new(24, 100)
$label.Size = [Drawing.Size]::new(450, 24)
$form.Controls.Add($label)
$passwordBox = [Windows.Forms.TextBox]::new()
$passwordBox.UseSystemPasswordChar = $true
$passwordBox.Location = [Drawing.Point]::new(24, 130)
$passwordBox.Size = [Drawing.Size]::new(470, 28)
$form.Controls.Add($passwordBox)
$explanation = [Windows.Forms.Label]::new()
$explanation.Text = "Saved encrypted for this Windows user on this laptop.`r`nThe password is not copied to chat, GitHub, or the website Preview."
$explanation.Location = [Drawing.Point]::new(24, 179)
$explanation.Size = [Drawing.Size]::new(470, 48)
$form.Controls.Add($explanation)
$status = [Windows.Forms.Label]::new()
$status.Location = [Drawing.Point]::new(24, 232)
$status.Size = [Drawing.Size]::new(470, 24)
$status.ForeColor = [Drawing.Color]::DarkRed
$form.Controls.Add($status)
$save = [Windows.Forms.Button]::new()
$save.Text = 'Save connection'
$save.Location = [Drawing.Point]::new(302, 272)
$save.Size = [Drawing.Size]::new(192, 36)
$save.Enabled = $false
$form.Controls.Add($save)
$cancel = [Windows.Forms.Button]::new()
$cancel.Text = 'Cancel'
$cancel.Location = [Drawing.Point]::new(190, 272)
$cancel.Size = [Drawing.Size]::new(100, 36)
$cancel.DialogResult = [Windows.Forms.DialogResult]::Cancel
$form.Controls.Add($cancel)
$form.CancelButton = $cancel
$form.AcceptButton = $save
$passwordBox.Add_TextChanged({ $save.Enabled = -not $PreviewOnly -and $passwordBox.Text.Length -gt 0 }.GetNewClosure())
$save.Add_Click({
    $secure = $null
    try {
        $save.Enabled = $false
        $secure = [Security.SecureString]::new()
        $characters = $passwordBox.Text.ToCharArray()
        try { foreach ($character in $characters) { $secure.AppendChar($character) } }
        finally { [Array]::Clear($characters, 0, $characters.Length) }
        $secure.MakeReadOnly()
        & $saveCredential $secure
        $passwordBox.Clear()
        $form.DialogResult = [Windows.Forms.DialogResult]::OK
    } catch {
        $diagnostic = [ordered]@{ category = [string]$_.CategoryInfo.Category; exceptionType = $_.Exception.GetType().FullName; line = $_.InvocationInfo.ScriptLineNumber }
        try { [IO.File]::WriteAllText((Join-Path $credentialDirectory 'setup-status.json'), ($diagnostic | ConvertTo-Json), [Text.UTF8Encoding]::new($false)) } catch { }
        $status.Text = 'The connection could not be saved. No password was logged.'
        $save.Enabled = $passwordBox.Text.Length -gt 0
    } finally {
        if ($secure) { $secure.Dispose() }
    }
}.GetNewClosure())
$form.Add_FormClosed({ $passwordBox.Clear() }.GetNewClosure())
if ($CheckWindow) {
    $form.Dispose()
    [ordered]@{ windowConstructed = $true; saveHandlerConstructed = $true; noCredentialEntered = $true; noNetworkAccess = $true } | ConvertTo-Json -Compress
    exit 0
}
[void]$form.ShowDialog()
$form.Dispose()
