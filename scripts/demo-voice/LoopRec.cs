// Grabadora local de la salida de audio de Windows (WASAPI loopback).
// Solo para pregenerar la narracion de la demo con la voz que se oye en Edge.
// No usa red ni claves. Controlada por stdin:
//   start            -> empieza a acumular muestras
//   stop <archivo>   -> guarda lo acumulado como float32 mono (raw) y responde "saved <frames> <rate>"
//   quit
using System;
using System.Collections.Generic;
using System.IO;
using System.Runtime.InteropServices;
using System.Threading;

[ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
class MMDeviceEnumeratorCom { }

[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDeviceEnumerator {
  int EnumAudioEndpoints(int dataFlow, int stateMask, out IntPtr devices);
  int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice endpoint);
}

[Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDevice {
  int Activate(ref Guid iid, int clsCtx, IntPtr activationParams, [MarshalAs(UnmanagedType.IUnknown)] out object iface);
}

[Guid("1CB9AD4C-DBFA-4c32-B178-C2F568A703B2"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioClient {
  int Initialize(int shareMode, int streamFlags, long bufferDuration, long periodicity, IntPtr format, IntPtr sessionGuid);
  int GetBufferSize(out uint frames);
  int GetStreamLatency(out long latency);
  int GetCurrentPadding(out uint padding);
  int IsFormatSupported(int shareMode, IntPtr format, out IntPtr closest);
  int GetMixFormat(out IntPtr format);
  int GetDevicePeriod(out long def, out long min);
  int Start();
  int Stop();
  int Reset();
  int SetEventHandle(IntPtr h);
  int GetService(ref Guid iid, [MarshalAs(UnmanagedType.IUnknown)] out object iface);
}

[Guid("C8ADBD64-E71E-48a0-A4DE-185C395CD317"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioCaptureClient {
  int GetBuffer(out IntPtr data, out uint frames, out uint flags, out ulong devPos, out ulong qpcPos);
  int ReleaseBuffer(uint frames);
  int GetNextPacketSize(out uint frames);
}

static class LoopRec {
  static readonly object Gate = new object();
  static bool recording;
  static List<float> buffer = new List<float>();

  static void Check(int hr, string what) {
    if (hr != 0) throw new Exception(what + " hr=0x" + hr.ToString("X8"));
  }

  static int Main() {
    var enumerator = (IMMDeviceEnumerator)new MMDeviceEnumeratorCom();
    IMMDevice device;
    Check(enumerator.GetDefaultAudioEndpoint(0, 0, out device), "GetDefaultAudioEndpoint");
    Guid iidClient = typeof(IAudioClient).GUID;
    object o;
    Check(device.Activate(ref iidClient, 23, IntPtr.Zero, out o), "Activate");
    var client = (IAudioClient)o;
    IntPtr fmt;
    Check(client.GetMixFormat(out fmt), "GetMixFormat");
    int tag = Marshal.ReadInt16(fmt, 0);
    int channels = Marshal.ReadInt16(fmt, 2);
    int rate = Marshal.ReadInt32(fmt, 4);
    int bits = Marshal.ReadInt16(fmt, 14);
    bool isFloat = tag == 3;
    if (tag == unchecked((short)0xFFFE) || tag == 0xFFFE) {
      byte[] sub = new byte[16];
      Marshal.Copy(new IntPtr(fmt.ToInt64() + 24), sub, 0, 16);
      isFloat = sub[0] == 3;
    }
    Check(client.Initialize(0, 0x00020000, 2000000, 0, fmt, IntPtr.Zero), "Initialize");
    Guid iidCapture = typeof(IAudioCaptureClient).GUID;
    Check(client.GetService(ref iidCapture, out o), "GetService");
    var capture = (IAudioCaptureClient)o;
    Check(client.Start(), "Start");
    Console.WriteLine("ready rate=" + rate + " channels=" + channels + " bits=" + bits + " float=" + isFloat);
    Console.Out.Flush();

    bool running = true;
    var pump = new Thread(() => {
      while (running) {
        uint packet;
        capture.GetNextPacketSize(out packet);
        while (packet > 0) {
          IntPtr data; uint frames, flags; ulong dp, qp;
          capture.GetBuffer(out data, out frames, out flags, out dp, out qp);
          lock (Gate) {
            if (recording) {
              bool silent = (flags & 2) != 0;
              int bytesPerSample = bits / 8;
              for (int f = 0; f < frames; f++) {
                float sum = 0;
                if (!silent) {
                  for (int c = 0; c < channels; c++) {
                    long off = ((long)f * channels + c) * bytesPerSample;
                    if (isFloat && bits == 32) {
                      sum += BitConverter.ToSingle(BitConverter.GetBytes(Marshal.ReadInt32(data, (int)off)), 0);
                    } else if (bits == 16) {
                      sum += Marshal.ReadInt16(data, (int)off) / 32768f;
                    }
                  }
                }
                buffer.Add(sum / channels);
              }
            }
          }
          capture.ReleaseBuffer(frames);
          capture.GetNextPacketSize(out packet);
        }
        Thread.Sleep(5);
      }
    });
    pump.Start();

    string line;
    while ((line = Console.ReadLine()) != null) {
      line = line.Trim();
      if (line == "start") {
        lock (Gate) { buffer = new List<float>(); recording = true; }
        Console.WriteLine("started");
      } else if (line.StartsWith("stop ")) {
        List<float> got;
        lock (Gate) { recording = false; got = buffer; buffer = new List<float>(); }
        string path = line.Substring(5).Trim();
        using (var w = new BinaryWriter(File.Create(path))) {
          foreach (var s in got) w.Write(s);
        }
        Console.WriteLine("saved " + got.Count + " " + rate);
      } else if (line == "quit") {
        break;
      }
      Console.Out.Flush();
    }
    running = false;
    pump.Join();
    client.Stop();
    return 0;
  }
}
