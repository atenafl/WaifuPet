param(
  [Parameter(Mandatory = $true)][string]$cmd,
  [int]$x = 0,
  [int]$y = 0,
  [int]$x2 = 0,
  [int]$y2 = 0,
  [string]$button = 'left',
  [int]$amount = 1,
  [string]$keys = ''
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class PetNativeInput {
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int X, int Y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint dwFlags, uint dx, uint dy, int dwData, UIntPtr dwExtraInfo);
  [DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
}
"@

$LEFTDOWN = 0x0002; $LEFTUP = 0x0004
$RIGHTDOWN = 0x0008; $RIGHTUP = 0x0010
$MIDDLEDOWN = 0x0020; $MIDDLEUP = 0x0040
$WHEEL = 0x0800
$KEYUP = 0x0002

function Move-To([int]$px, [int]$py) {
  [void][PetNativeInput]::SetCursorPos($px, $py)
}

function Press-Button([string]$btn, [bool]$down) {
  if ($btn -eq 'right') {
    if ($down) { [PetNativeInput]::mouse_event($RIGHTDOWN, 0, 0, 0, [UIntPtr]::Zero) }
    else { [PetNativeInput]::mouse_event($RIGHTUP, 0, 0, 0, [UIntPtr]::Zero) }
  } elseif ($btn -eq 'middle') {
    if ($down) { [PetNativeInput]::mouse_event($MIDDLEDOWN, 0, 0, 0, [UIntPtr]::Zero) }
    else { [PetNativeInput]::mouse_event($MIDDLEUP, 0, 0, 0, [UIntPtr]::Zero) }
  } else {
    if ($down) { [PetNativeInput]::mouse_event($LEFTDOWN, 0, 0, 0, [UIntPtr]::Zero) }
    else { [PetNativeInput]::mouse_event($LEFTUP, 0, 0, 0, [UIntPtr]::Zero) }
  }
}

function Tap([byte]$vk) {
  [PetNativeInput]::keybd_event($vk, 0, 0, [UIntPtr]::Zero)
  Start-Sleep -Milliseconds 30
  [PetNativeInput]::keybd_event($vk, 0, $KEYUP, [UIntPtr]::Zero)
}

switch ($cmd) {
  'move' {
    Move-To $x $y
  }
  'click' {
    Move-To $x $y
    Start-Sleep -Milliseconds 50
    $times = if ($amount -gt 1) { 2 } else { 1 }
    for ($i = 0; $i -lt $times; $i++) {
      Press-Button $button $true
      Start-Sleep -Milliseconds 40
      Press-Button $button $false
      if ($times -gt 1) { Start-Sleep -Milliseconds 70 }
    }
  }
  'down' {
    Move-To $x $y
    Start-Sleep -Milliseconds 40
    Press-Button $button $true
  }
  'up' {
    Move-To $x $y
    Start-Sleep -Milliseconds 40
    Press-Button $button $false
  }
  'drag' {
    Move-To $x $y
    Start-Sleep -Milliseconds 60
    Press-Button $button $true
    Start-Sleep -Milliseconds 80
    $steps = 24
    for ($i = 1; $i -le $steps; $i++) {
      $nx = [int]($x + (($x2 - $x) * $i / $steps))
      $ny = [int]($y + (($y2 - $y) * $i / $steps))
      Move-To $nx $ny
      Start-Sleep -Milliseconds 16
    }
    Start-Sleep -Milliseconds 60
    Press-Button $button $false
  }
  'scroll' {
    $delta = 120 * $amount
    [PetNativeInput]::mouse_event($WHEEL, 0, 0, $delta, [UIntPtr]::Zero)
  }
  'sendkeys' {
    if ($keys) { [System.Windows.Forms.SendKeys]::SendWait($keys) }
  }
  'volume' {
    $vk = 0xAF
    if ($button -eq 'down') { $vk = 0xAE }
    elseif ($button -eq 'mute') { $vk = 0xAD }
    $n = [Math]::Max(1, [Math]::Min(20, $amount))
    for ($i = 0; $i -lt $n; $i++) {
      Tap ([byte]$vk)
      Start-Sleep -Milliseconds 25
    }
  }
  'showdesktop' {
    [PetNativeInput]::keybd_event(0x5B, 0, 0, [UIntPtr]::Zero)
    Start-Sleep -Milliseconds 40
    Tap ([byte]0x44)
    Start-Sleep -Milliseconds 40
    [PetNativeInput]::keybd_event(0x5B, 0, $KEYUP, [UIntPtr]::Zero)
  }
  default {
    Write-Error "Comando desconocido: $cmd"
    exit 2
  }
}
