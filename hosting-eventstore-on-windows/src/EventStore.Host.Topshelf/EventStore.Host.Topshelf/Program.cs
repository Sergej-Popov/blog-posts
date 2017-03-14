using System;
using System.Configuration;
using System.Diagnostics;
using System.IO;
using Topshelf;

namespace EventStore.Host.Topshelf
{
    public class EventStoreService : ServiceControl
    {
        private Process _esProcess;
        private readonly string _exeLocation;
        private readonly string _configPath;

        public EventStoreService(string exeLocation, string configPath)
        {
            _exeLocation = exeLocation;
            _configPath = configPath;
        }

        public bool Start(HostControl hostControl)
        {
            var info = new ProcessStartInfo
            {
                FileName = Path.Combine(_exeLocation, "EventStore.ClusterNode.exe"),
                Arguments = $"-Config {_configPath}",
                UseShellExecute = false
            };

            _esProcess = Process.Start(info);

            return true;
        }

        public bool Stop(HostControl hostControl)
        {
            _esProcess.Refresh();
            if (_esProcess.HasExited) return true;
            _esProcess.Kill();
            _esProcess.WaitForExit(TimeSpan.FromSeconds(30).Milliseconds);
            _esProcess.Dispose();

            return true;
        }
    }

    class Program
    {
        static void Main(string[] args)
        {
            HostFactory.Run(hostConfig =>
            {
                var exeLocation = ConfigurationManager.AppSettings["ES:ExeLocation"];
                var configPath = ConfigurationManager.AppSettings["ES:ConfigPath"];

                hostConfig.Service(() => new EventStoreService(exeLocation, configPath));

                hostConfig.SetServiceName("EventStore");
            });
        }
    }
} 