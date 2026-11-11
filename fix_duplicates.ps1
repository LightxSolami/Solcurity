$content = Get-Content 'src/components/pumpfuntool/PumpFunAnalytics.tsx'
$newContent = $content[0..377] + $content[422..($content.Length-1)]
[System.IO.File]::WriteAllLines('src/components/pumpfuntool/PumpFunAnalytics.tsx', $newContent)