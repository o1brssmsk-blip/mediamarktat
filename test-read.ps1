$text = [System.IO.File]::ReadAllText('public/estonian-banks/citadele-banka/1.html')
$matches = [regex]::Matches($text, '(?i).{0,50}<label.{0,100}</label>.{0,100}<input.{0,100}')
foreach ($m in $matches) {
    Write-Host $m.Value
}
