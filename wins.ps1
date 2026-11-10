param()

$ErrorActionPreference = 'SilentlyContinue'
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class PetForeground {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
}
"@

[void][PetForeground]::SetProcessDPIAware()
$h = [PetForeground]::GetForegroundWindow()
if ($h -eq [IntPtr]::Zero) { Write-Output '0,0,0,0'; exit 0 }
$r = New-Object PetForeground+RECT
if (-not [PetForeground]::GetWindowRect($h, [ref]$r)) { Write-Output '0,0,0,0'; exit 0 }
Write-Output "$($r.Left),$($r.Top),$($r.Right),$($r.Bottom)"
