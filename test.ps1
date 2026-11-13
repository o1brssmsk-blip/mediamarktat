$content = [System.IO.File]::ReadAllText("public\estonian-banks\coop-pank\1.html")
$matches = [regex]::Matches($content, '.{0,200}Smart-ID.{0,200}', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
foreach ($m in $matches) {
    Write-Output $m.Value
    Write-Output "-------------------------"
}
