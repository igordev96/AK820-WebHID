using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Threading;

class HidWatch
{
    const uint DIGCF_PRESENT = 0x02;
    const uint DIGCF_DEVICEINTERFACE = 0x10;
    const uint GENERIC_READ = 0x80000000;
    const uint GENERIC_WRITE = 0x40000000;
    const uint FILE_SHARE_READ = 1;
    const uint FILE_SHARE_WRITE = 2;
    const uint OPEN_EXISTING = 3;

    [StructLayout(LayoutKind.Sequential)]
    struct SP_DEVICE_INTERFACE_DATA
    {
        public uint cbSize;
        public Guid InterfaceClassGuid;
        public uint Flags;
        public IntPtr Reserved;
    }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    struct SP_DEVICE_INTERFACE_DETAIL_DATA
    {
        public uint cbSize;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 1024)]
        public string DevicePath;
    }

    [DllImport("setupapi.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    static extern IntPtr SetupDiGetClassDevs(ref Guid ClassGuid, IntPtr Enumerator, IntPtr hwndParent, uint Flags);

    [DllImport("setupapi.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    static extern bool SetupDiEnumDeviceInterfaces(IntPtr DeviceInfoSet, IntPtr DeviceInfoData, ref Guid InterfaceClassGuid, uint MemberIndex, ref SP_DEVICE_INTERFACE_DATA DeviceInterfaceData);

    [DllImport("setupapi.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    static extern bool SetupDiGetDeviceInterfaceDetail(IntPtr DeviceInfoSet, ref SP_DEVICE_INTERFACE_DATA DeviceInterfaceData, ref SP_DEVICE_INTERFACE_DETAIL_DATA DeviceInterfaceDetailData, uint DeviceInterfaceDetailDataSize, out uint RequiredSize, IntPtr DeviceInfoData);

    [DllImport("setupapi.dll", SetLastError = true)]
    static extern bool SetupDiDestroyDeviceInfoList(IntPtr DeviceInfoSet);

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    static extern IntPtr CreateFile(string lpFileName, uint dwDesiredAccess, uint dwShareMode, IntPtr lpSecurityAttributes, uint dwCreationDisposition, uint dwFlagsAndAttributes, IntPtr hTemplateFile);

    [DllImport("kernel32.dll", SetLastError = true)]
    static extern bool ReadFile(IntPtr hFile, byte[] lpBuffer, uint nNumberOfBytesToRead, out uint lpNumberOfBytesRead, IntPtr lpOverlapped);

    [DllImport("hid.dll", SetLastError = true)]
    static extern bool HidD_GetPreparsedData(IntPtr HidDeviceObject, out IntPtr PreparsedData);

    [DllImport("hid.dll", SetLastError = true)]
    static extern bool HidD_FreePreparsedData(IntPtr PreparsedData);

    [DllImport("hid.dll", SetLastError = true)]
    static extern int HidP_GetCaps(IntPtr PreparsedData, IntPtr Capabilities);

    static readonly object sync = new object();

    static void Log(string s)
    {
        lock (sync) { Console.WriteLine(s); Console.Out.Flush(); }
    }

    static void Main(string[] args)
    {
        int seconds = 30;
        for (int i = 0; i + 1 < args.Length; i++)
            if (args[i] == "--seconds") int.TryParse(args[i + 1], out seconds);

        var g = new Guid("4D1E55B2-F16F-11CF-88CB-001111000030");
        IntPtr set = SetupDiGetClassDevs(ref g, IntPtr.Zero, IntPtr.Zero, DIGCF_PRESENT | DIGCF_DEVICEINTERFACE);
        if (set == IntPtr.Zero || set == (IntPtr)(-1)) { Log("ERR|SetupDiGetClassDevs|" + Marshal.GetLastWin32Error()); return; }

        uint idx = 0;
        int col = 0;
        var handles = new List<IntPtr>();

        while (true)
        {
            var did = new SP_DEVICE_INTERFACE_DATA();
            did.cbSize = (uint)Marshal.SizeOf(typeof(SP_DEVICE_INTERFACE_DATA));
            if (!SetupDiEnumDeviceInterfaces(set, IntPtr.Zero, ref g, idx, ref did)) break;
            idx++;

            var detail = new SP_DEVICE_INTERFACE_DETAIL_DATA();
            detail.cbSize = 6;
            uint needed;
            if (!SetupDiGetDeviceInterfaceDetail(set, ref did, ref detail, 2048, out needed, IntPtr.Zero)) continue;

            string path = detail.DevicePath ?? "";
            string low = path.ToLowerInvariant();
            if (!(low.Contains("vid_0c45") &&
                  (low.Contains("pid_8009") || low.Contains("pid_800a") || low.Contains("pid_fdfd"))))
                continue;

            IntPtr h = CreateFile(path, GENERIC_READ | GENERIC_WRITE,
                                  FILE_SHARE_READ | FILE_SHARE_WRITE,
                                  IntPtr.Zero, OPEN_EXISTING, 0, IntPtr.Zero);
            if (h == (IntPtr)(-1))
            {
                Log("OPENFAIL|" + path + "|err=" + Marshal.GetLastWin32Error());
                continue;
            }
            handles.Add(h);

            IntPtr prep;
            if (!HidD_GetPreparsedData(h, out prep)) { Log("PREPFAIL|" + path); continue; }

            IntPtr caps = Marshal.AllocHGlobal(256);
            for (int z = 0; z < 256; z++) Marshal.WriteByte(caps, z, 0);
            HidP_GetCaps(prep, caps);
            ushort usage = (ushort)Marshal.ReadInt16(caps, 0);
            ushort page = (ushort)Marshal.ReadInt16(caps, 2);
            ushort inLen = (ushort)Marshal.ReadInt16(caps, 4);
            ushort outLen = (ushort)Marshal.ReadInt16(caps, 6);
            ushort featLen = (ushort)Marshal.ReadInt16(caps, 8);
            Marshal.FreeHGlobal(caps);
            HidD_FreePreparsedData(prep);

            int id = col++;
            Log(string.Format("COL|{0}|page=0x{1:X4}|usage=0x{2:X4}|in={3}|out={4}|feat={5}|{6}",
                id, page, usage, inLen, outLen, featLen, path));

            if (inLen > 0)
            {
                IntPtr hh = h;
                int len = inLen;
                int cid = id;
                var t = new Thread(() =>
                {
                    var buf = new byte[len];
                    while (true)
                    {
                        uint got;
                        if (!ReadFile(hh, buf, (uint)len, out got, IntPtr.Zero) || got == 0) break;
                        Log(string.Format("{0}|COL{1}|{2}",
                            DateTime.Now.ToString("HH:mm:ss.fff"), cid,
                            BitConverter.ToString(buf, 0, (int)got)));
                    }
                });
                t.IsBackground = true;
                t.Start();
            }
        }

        SetupDiDestroyDeviceInfoList(set);
        Log("READY|collections=" + col + "|seconds=" + seconds);
        Thread.Sleep(seconds * 1000);
        Environment.Exit(0);
    }
}
