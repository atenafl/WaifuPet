Add-Type -TypeDefinition @"
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;

public class MonSz {
  [DllImport("user32.dll")] public static extern bool SetProcessDpiAwarenessContext(IntPtr value);
  [DllImport("user32.dll")] public static extern bool EnumDisplayMonitors(IntPtr hdc, IntPtr clip, CB proc, IntPtr data);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern bool GetMonitorInfo(IntPtr hMonitor, ref MONITORINFOEX info);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern bool EnumDisplayDevices(string device, uint devNum, ref DISPLAY_DEVICE dd, uint flags);

  public delegate bool CB(IntPtr hMonitor, IntPtr hdc, ref RECT rect, IntPtr data);

  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int left, top, right, bottom; }

  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  public struct MONITORINFOEX {
    public uint cbSize; public RECT rcMonitor; public RECT rcWork; public uint dwFlags;
    [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)] public string szDevice;
  }

  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  public struct DISPLAY_DEVICE {
    public uint cb;
    [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)] public string DeviceName;
    [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 128)] public string DeviceString;
    public uint StateFlags;
    [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 128)] public string DeviceID;
    [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 128)] public string DeviceKey;
  }

  static List<string> rows;

  static bool CBImpl(IntPtr hMon, IntPtr hdc, ref RECT rect, IntPtr data) {
    var mi = new MONITORINFOEX();
    mi.cbSize = (uint)Marshal.SizeOf(typeof(MONITORINFOEX));
    if (GetMonitorInfo(hMon, ref mi)) {
      string devPath = "";
      var dd = new DISPLAY_DEVICE();
      dd.cb = (uint)Marshal.SizeOf(typeof(DISPLAY_DEVICE));
      if (EnumDisplayDevices(mi.szDevice, 0, ref dd, 0)) devPath = dd.DeviceID;
      rows.Add(mi.rcMonitor.left + "," + mi.rcMonitor.top + "|" + devPath);
    }
    return true;
  }

  public static string[] List() {
    rows = new List<string>();
    SetProcessDpiAwarenessContext(new IntPtr(-4));
    EnumDisplayMonitors(IntPtr.Zero, IntPtr.Zero, CBImpl, IntPtr.Zero);
    return rows.ToArray();
  }
}
"@ -ErrorAction Stop

foreach ($line in [MonSz]::List()) {
  $bar = $line.IndexOf('|')
  $pos = $line.Substring(0, $bar).Split(',')
  $id = $line.Substring($bar + 1)
  $x = [int]$pos[0]; $y = [int]$pos[1]
  $diag = 0
  if ($id -like 'MONITOR\*') {
    $vendor = ($id -split '\\')[1]
    $vpath = "HKLM:\SYSTEM\CurrentControlSet\Enum\DISPLAY\$vendor"
    $sizes = @()
    if (Test-Path -LiteralPath $vpath) {
      foreach ($inst in Get-ChildItem -LiteralPath $vpath) {
        $ep = Join-Path $inst.PSPath 'Device Parameters'
        try {
          $edid = (Get-ItemProperty -LiteralPath $ep -ErrorAction Stop).EDID
          $w = [int]$edid[21]; $h = [int]$edid[22]
          if ($w -gt 0 -and $h -gt 0) { $sizes += [Math]::Round([Math]::Sqrt($w * $w + $h * $h), 2) }
        } catch {}
      }
    }
    $uniq = @($sizes | Sort-Object -Unique)
    if ($uniq.Count -eq 1) { $diag = $uniq[0] }
  }
  Write-Output "$x,$y,$diag"
}
