EventStore for windows comes as an .exe, which is great for getting started quickly, as you can just run it from command line. It is however a little bit less straightforward to run as a service. You have several options here:

## NSSM
The non-sucking service manager. Does what it says on the tin. It is by far the easiest option to get ES running as windows service.
First get youself a chocolatey package manager, if you already don't have one.

```powershell
PS C:\> iwr https://chocolatey.org/install.ps1 -UseBasicParsing | iex
```
[Other installation options](https://chocolatey.org/install)

As of version 4 (pre-release at the point of writing) EventStore is distributed as chocolatey package which simplifies things a bit. Go ahead and install NSSM and EventStore via chocolatey:

```cmd
C:\> choco install nssm eventstore-oss -y
```

 If you don't want to use chocolatey you can just grab them of the web [EventStore](https://geteventstore.com/downloads/); [NSSM](https://nssm.cc/download);

Now, echo the desired EventStore configurations to yaml file:

```cmd
C:\PATH_TO_ES> echo RunProjections: All>> config.yaml
C:\PATH_TO_ES> echo StartStandardProjections: True>> config.yaml
```
In my case PATH_TO_ES happened to be `C:\ProgramData\Chocolatey\lib\eventstore-oss\tools\`

Final bit is installing windows service.

```cmd
C:\> nssm install EventStore "C:\PATH_TO_ES\EventStore.ClusterNode.exe" AppParameters "-Config C:\PATH_TO_ES\config.yaml"
```

Navigate to `127.0.0.1:2113` to check you installation. 2113 is the default  HTTP port. Default credentials admin:changeit

NSSM is my current preferred way to run EventStore. It is very easy to incorporate into deployment process and requires very little effort. Previously I was opting for Topshelf option though, so let's have a look at how it can be done.

## Topshelf

If you want more control on how EventStore process is managed, and maybe add features like scheduled back up, you can piggy back EventStore on top of [Topshelf](http://topshelf-project.com/). This is certainly my favourite way to develop windows services in general. The below set-up is applicable to any basic windows service development.

First create console application and install Topshelf from NuGet

There are several ways to create service, the most simple one is by implementing ServiceControl.
```csharp
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
        ...
    }

    public bool Stop(HostControl hostControl)
    {
        ...
    }
}
```

The `Start` method will be invoked during windows service start-up. We are going to create and start EventStore process here:

```csharp
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
```
In the `Stop` method we need to kill the process. Don't forget to dispose of it.
```csharp
public bool Stop(HostControl hostControl)
{
    _esProcess.Refresh();
    if (_esProcess.HasExited) return true;
    _esProcess.Kill();
    _esProcess.WaitForExit(TimeSpan.FromSeconds(30).Milliseconds);
    _esProcess.Dispose();

    return true;
}
```

Lastly we need to register our service with Topshelf

```csharp
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
```
Nothing fancy here, we simply pass EventStore executable and EventStore config location from `AppSettings`
```xml
<appSettings>
  <add key="ES:ExeLocation" value="C:\ProgramData\Chocolatey\lib\eventstore-oss\tools"/>
  <add key="ES:ConfigPath" value="C:\ProgramData\Chocolatey\lib\eventstore-oss\tools\config.yaml"/>
</appSettings>
```

And this is it for the very simple set-up. We can add all sorts of things here:
* Schedule backups
* Monitor memory usage
* Restart EventStore process when it crashes
* etc.

Topshelf provides a lot of control around service start modes, recovery and identity. Refer to [Topshelf docs](https://topshelf.readthedocs.io/en/latest/configuration/config_api.html#service-configuration)

Full sample can be found on [GitHub](https://github.com/Sergej-Popov/blog-posts/tree/master/hosting-eventstore-on-windows/src)

