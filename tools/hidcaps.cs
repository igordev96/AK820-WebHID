using System;
using System.Runtime.InteropServices;

class HidCaps
{
    const uint DIGCF_PRESENT = 0x02;
    const uint DIGCF_DEVICEINTERFACE = 0x10;
    const uint OPEN_EXISTING = 3;

    [StructLayout(LayoutKind.Sequential)]
    struct SP_DEVICE_INTERFACE_DATA { public uint cbSize; public Guid InterfaceClassGuid; public uint Flags; public IntPtr Reserved; }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    struct SP_DEVICE_INTERFACE_DETAIL_DATA { public uint cbSize; [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 1024)] public string DevicePath; }

    [DllImport("setupapi.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    static extern IntPtr SetupDiGetClassDevs(ref Guid ClassGuid, IntPtr Enumerator, IntPtr hwndParent, uint Flags);
    [DllImport("setupapi.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    static extern bool SetupDiEnumDeviceInterfaces(IntPtr DeviceInfoSet, IntPtr DeviceInfoData, ref Guid InterfaceClassGuid, uint MemberIndex, ref SP_DEVICE_INTERFACE_DATA DeviceInterfaceData);
    [DllImport("setupapi.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    static extern bool SetupDiGetDeviceInterfaceDetail(IntPtr DeviceInfoSet, ref SP_DEVICE_INTERFACE_DATA DeviceInterfaceData, ref SP_DEVICE_INTERFACE_DETAIL_DATA DeviceInterfaceDetailData, uint DeviceInterfaceDetailDataSize, out uint RequiredSize, IntPtr DeviceInfoData);
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    static extern IntPtr CreateFile(string lpFileName, uint dwDesiredAccess, uint dwShareMode, IntPtr lpSecurityAttributes, uint dwCreationDisposition, uint dwFlagsAndAttributes, IntPtr hTemplateFile);
    [DllImport("hid.dll", SetLastError = true)]
    static extern bool HidD_GetPreparsedData(IntPtr HidDeviceObject, out IntPtr PreparsedData);
    [DllImport("hid.dll", SetLastError = true)]
    static extern bool HidD_FreePreparsedData(IntPtr PreparsedData);
    [DllImport("hid.dll", SetLastError = true)]
    static extern int HidP_GetCaps(IntPtr PreparsedData, IntPtr Capabilities);

    static void Main()
    {
        var g = new Guid("4D1E55B2-F16F-11CF-88CB-001111000030");
        IntPtr set = SetupDiGetClassDevs(ref g, IntPtr.Zero, IntPtr.Zero, DIGCF_PRESENT | DIGCF_DEVICEINTERFACE);
        uint idx = 0;
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
            if (!(low.Contains("vid_0c45") && (low.Contains("pid_8009") || low.Contains("pid_800a") || low.Contains("pid_fdfd")))) continue;

            IntPtr h = CreateFile(path, 0, 3, IntPtr.Zero, OPEN_EXISTING, 0, IntPtr.Zero);
            if (h == (IntPtr)(-1)) { Console.WriteLine("OPENFAIL " + Marshal.GetLastWin32Error() + " " + path); continue; }
            IntPtr prep;
            if (!HidD_GetPreparsedData(h, out prep)) { Console.WriteLine("PREPFAIL " + path); continue; }
            IntPtr caps = Marshal.AllocHGlobal(256);
            for (int z = 0; z < 256; z++) Marshal.WriteByte(caps, z, 0);
            HidP_GetCaps(prep, caps);
            ushort usage = (ushort)Marshal.ReadInt16(caps, 0);
            ushort page = (ushort)Marshal.ReadInt16(caps, 2);
            ushort inLen = (ushort)Marshal.ReadInt16(caps, 4);
            ushort outLen = (ushort)Marshal.ReadInt16(caps, 6);
            ushort featLen = (ushort)Marshal.ReadInt16(caps, 8);
            Console.WriteLine(string.Format("page=0x{0:X4} usage=0x{1:X4} in={2,-4} out={3,-4} feat={4,-4} {5}",
                page, usage, inLen, outLen, featLen, path.Substring(path.IndexOf("hid#"))));
            Marshal.FreeHGlobal(caps);
            HidD_FreePreparsedData(prep);
        }
        Environment.Exit(0);
    }
}
