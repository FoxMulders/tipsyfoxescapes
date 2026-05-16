# Escape Room Builder API smoke / trial QA
$ErrorActionPreference = "Stop"
$Base = "http://127.0.0.1:3001"
$Email = "qa-trial-$(Get-Date -Format 'yyyyMMddHHmmss')@example.com"
$Pass = "QaTestPass123!"
$Results = @()

function Test-Case($id, $name, $pass, $detail) {
  $script:Results += [pscustomobject]@{ Id = $id; Name = $name; Pass = $pass; Detail = $detail }
  $mark = if ($pass) { "PASS" } else { "FAIL" }
  Write-Host "[$mark] $id - $name"
  if ($detail) { Write-Host "       $detail" }
}

try {
  $h = Invoke-RestMethod "$Base/health" -Method Get
  Test-Case "S0" "Health" ($h.ok -eq $true) ""

  $signup = Invoke-RestMethod "$Base/api/auth/signup" -Method Post -ContentType "application/json" -Body (@{
    name = "QA Trial"; email = $Email; password = $Pass; acceptedTerms = $true
  } | ConvertTo-Json)
  $token = $signup.authToken
  $hdr = @{ Authorization = "Bearer $token"; "Content-Type" = "application/json"; "X-Device-Id" = "qa-device-smoke" }
  Test-Case "T1" "Signup trial user" ($signup.user.roomAllowance -eq 0) "roomAllowance=$($signup.user.roomAllowance) billingTier=$($signup.user.billingTier)"

  $me = Invoke-RestMethod "$Base/api/me" -Headers @{ Authorization = "Bearer $token" }
  Test-Case "T2" "/api/me trial metadata" ($me.trial.fixedCatalog -eq $true -and $me.trial.curatedThemeIds.Count -eq 3) "ids=$($me.trial.curatedThemeIds -join ',')"

  $sess = Invoke-RestMethod "$Base/api/planning/session" -Method Post -Headers $hdr -Body (@{
    playersConcurrent = 4; participantsTotal = 8; sessionDurationMinutes = 60
    environmentType = "home basement"; availableItems = @("table", "flashlight")
  } | ConvertTo-Json)
  $sid = $sess.sessionId
  Test-Case "TC-02" "Create session" ([bool]$sid) "sessionId=$sid"

  $themes1 = Invoke-RestMethod "$Base/api/themes/generate" -Method Post -Headers $hdr -Body (@{ sessionId = $sid } | ConvertTo-Json)
  $ids1 = @($themes1.themes | ForEach-Object { $_.id })
  Test-Case "TC-03" "Theme count >= 3" ($themes1.themes.Count -ge 3) "count=$($themes1.themes.Count) ids=$($ids1 -join ',')"
  Test-Case "T3" "Fixed trial theme ids" (($ids1 -join ',') -eq "th_1,th_2,th_3") ""

  $themes2 = Invoke-RestMethod "$Base/api/themes/refresh" -Method Post -Headers $hdr -Body (@{ sessionId = $sid; excludeThemeIds = $ids1 } | ConvertTo-Json)
  $ids2 = @($themes2.themes | ForEach-Object { $_.id })
  Test-Case "T4" "Refresh returns same fixed set" (($ids2 -join ',') -eq "th_1,th_2,th_3") "refresh ids=$($ids2 -join ',')"

  $puz = Invoke-RestMethod "$Base/api/puzzles/generate" -Method Post -Headers $hdr -Body (@{ sessionId = $sid; themeId = "th_1" } | ConvertTo-Json)
  $cats = @($puz.puzzles | ForEach-Object { $_.category } | Select-Object -Unique)
  Test-Case "TC-05" "Puzzle variety (3 categories)" ($cats.Count -ge 3) "categories=$($cats -join ',')"
  Test-Case "TC-05b" "Puzzles have solve steps" (($puz.puzzles | Where-Object { $_.solveSteps.Count -gt 0 }).Count -eq $puz.puzzles.Count) ""

  try {
    Invoke-RestMethod "$Base/api/plans/$sid/save" -Method Post -Headers $hdr -Body (@{ name = "QA"; approvedForBuild = $true } | ConvertTo-Json) | Out-Null
    Test-Case "T5" "Save blocked on trial" $false "Expected 403 TRIAL_NO_SAVE"
  } catch {
    $code = $_.ErrorDetails.Message | ConvertFrom-Json -ErrorAction SilentlyContinue
    $c = $code.error.code
    Test-Case "T5" "Save blocked on trial" ($c -eq "TRIAL_NO_SAVE") "code=$c"
  }

  $exp = Invoke-RestMethod "$Base/api/plans/$sid/export" -Method Post -Headers $hdr -Body (@{ format = "markdown" } | ConvertTo-Json)
  Test-Case "TC-08" "Export returns content" ([bool]$exp.content) "len=$($exp.content.Length) trialConsumed=$($exp.trialConsumed)"
  Test-Case "T6" "Trial consumed on export" ($exp.trialConsumed -eq $true) ""

  try {
    Invoke-RestMethod "$Base/api/themes/generate" -Method Post -Headers $hdr -Body (@{ sessionId = $sid } | ConvertTo-Json) | Out-Null
    Test-Case "T7" "Post-trial theme blocked" $false "Expected TRIAL_USED"
  } catch {
    $code = $_.ErrorDetails.Message | ConvertFrom-Json -ErrorAction SilentlyContinue
    Test-Case "T7" "Post-trial theme blocked" ($code.error.code -eq "TRIAL_USED") ""
  }

  $plans = Invoke-RestMethod "$Base/api/billing/plans" -Method Get
  Test-Case "B1" "Billing catalog public" ($plans.plans.Count -ge 4) "plans=$($plans.plans.Count)"

} catch {
  Test-Case "FATAL" "Smoke script" $false $_.Exception.Message
}

Write-Host ""
$passed = ($Results | Where-Object Pass).Count
$failed = ($Results | Where-Object { -not $_.Pass }).Count
Write-Host "Summary: $passed passed, $failed failed, $($Results.Count) total"
if ($failed -gt 0) { exit 1 }
